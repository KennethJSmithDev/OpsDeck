import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { cancelOperationPlan, createOperationPlan, executeFixturePlan, fingerprintPreState, isTerminalOperationState } from "../src/operation-engine.js";

const now = Date.parse("2026-10-02T12:00:00Z");
const input = {
  id: "op-001", intent: "Enable disposable fixture application", expectedReadback: "Enabled is true", expiresAt: now + 60_000,
  target: { domain: "applications", kind: "web-app", provider: "iris-admin-api", key: "/opsdeck-fixture", scope: "%SYS", label: "Fixture application", observedAt: "2026-10-02T11:59:00Z" },
  capability: { id: "webapp.enable", semanticAction: "enable", providerOperation: "PUT /api/admin/v2/web-app", state: "SUPPORTED", risk: "MEDIUM", requiredPrivileges: ["%Admin_Secure:U"] },
  parameters: { enabled: true }, preState: { enabled: false }, preStateEvidence: "read:fixture-prestate",
  authorityValidation: { state: "SUPPORTED", evidence: "fixture-authority-read" },
  preconditions: [{ claim: "Disposable fixture confirmed", observed: true, evidence: "fixture-setup" }],
};
const makePlan = () => createOperationPlan(input, now);

test("plans preserve canonical target/capability identity and bounded review semantics", () => {
  const plan = makePlan();
  assert.equal(plan.target.key, "/opsdeck-fixture");
  assert.equal(plan.target.scope, "%SYS");
  assert.equal(plan.capability.id, "webapp.enable");
  assert.equal(plan.capability.providerOperation, "PUT /api/admin/v2/web-app");
  assert.equal(plan.requiresConfirmation, true);
  assert.equal(plan.state, "REVIEW_REQUIRED");
  assert.equal(plan.preStateFingerprint, fingerprintPreState({ enabled: false }));
  assert.throws(() => createOperationPlan({ ...input, parameters: { apiToken: "never retain" } }, now), /Sensitive/u);
  assert.throws(() => createOperationPlan({ ...input, parameters: { enabled: true, note: "benign-looking but not policy-owned" } }, now), /policy schema/u);
  assert.throws(() => createOperationPlan({ ...input, parameters: { enabled: false } }, now), /enabled=true/u);
  assert.throws(() => createOperationPlan({ ...input, capability: { ...input.capability, risk: "LOW" } }, now), /risk\/authority\/provider policy/u);
  assert.throws(() => createOperationPlan({ ...input, capability: { ...input.capability, providerOperation: "POST /something-else" } }, now), /risk\/authority\/provider policy/u);
  assert.throws(() => createOperationPlan({ ...input, capability: { ...input.capability, requiredPrivileges: ["%All"] } }, now), /risk\/authority\/provider policy/u);
  assert.throws(() => createOperationPlan({ ...input, target: { ...input.target, provider: "some-other-provider" } }, now), /risk\/authority\/provider policy/u);
  assert.throws(() => createOperationPlan({ ...input, preState: { enabled: false, note: "not policy-owned" } }, now), /pre-state.*policy schema/u);
  assert.throws(() => createOperationPlan({ ...input, preState: { enabled: "false" } }, now), /boolean enabled/u);
  assert.throws(() => createOperationPlan({ ...input, id: "bad plan id" }, now), /stable identity/u);
  assert.throws(() => createOperationPlan({ ...input, authorityValidation: { state: "SUPPORTED", evidence: "not a ref with spaces" } }, now), /evidence reference identity/u);
  assert.throws(() => createOperationPlan({ ...input, expiresAt: now }, now), /expiry/u);
});

test("fixture execution requires exact fixture identity, fresh pre-state, supported capability and confirmation", async () => {
  const plan = makePlan();
  assert.equal((await executeFixturePlan(plan, { providerIdentity: "live-iris", currentPreState: { enabled: false }, confirmed: true })).state, "UNAVAILABLE");
  const authority = { state: "SUPPORTED", evidence: "fixture-authority" };
  assert.equal((await executeFixturePlan(plan, { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: true }, confirmed: true, authority, now })).state, "STALE");
  const blocked = await executeFixturePlan(plan, { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, authority, now });
  assert.equal(blocked.state, "BLOCKED");
  assert.equal(blocked.reason, "explicit-confirmation-required");
  const unresolvedPlan = createOperationPlan({ ...input, capability: { ...input.capability, state: "UNRESOLVED" } }, now);
  assert.equal((await executeFixturePlan(unresolvedPlan, { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, authority, now })).state, "UNAVAILABLE");
});

test("reversible web-app disable policy admits an exact plan and verifies its fixture read-back", async () => {
  const disable = createOperationPlan({
    ...input,
    id: "op-disable-001",
    intent: "Disable the disposable fixture application",
    expectedReadback: "Enabled is false",
    target: { ...input.target, observedAt: "2026-10-02T12:00:00Z" },
    capability: { ...input.capability, id: "webapp.disable", semanticAction: "disable" },
    parameters: { enabled: false },
    preState: { enabled: true },
  }, now);
  assert.equal(disable.capability.id, "webapp.disable");
  assert.equal(disable.capability.providerOperation, "PUT /api/admin/v2/web-app");
  assert.equal(disable.target.key, "/opsdeck-fixture");
  const result = await executeFixturePlan(disable, {
    providerIdentity: "opsdeck-fixture-v1",
    currentPreState: { enabled: true },
    authority: { state: "SUPPORTED", evidence: "fixture-authority" },
    confirmed: true,
    readback: { enabled: false },
    now,
  });
  assert.equal(result.state, "VERIFIED");
  assert.equal(result.receipt.verification, "VERIFIED");
  assert.deepEqual(result.receipt.requestSummary, { enabled: false });
});

test("ambiguous provider result is terminal and never retried", async () => {
  const plan = makePlan();
  const result = await executeFixturePlan(plan, { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, authority: { state: "SUPPORTED", evidence: "fixture-authority" }, outcome: "ambiguous", now });
  assert.deepEqual(result, { state: "AMBIGUOUS", reason: "provider-result-ambiguous", retryAllowed: false });
  assert.equal(isTerminalOperationState(result.state), true);
});

test("denial, cancellation, unavailability and cancellation of review remain distinct", async () => {
  const plan = makePlan();
  const base = { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, authority: { state: "SUPPORTED", evidence: "fixture-authority-observed" }, now };
  assert.equal((await executeFixturePlan(plan, { ...base, outcome: "denied" })).state, "DENIED");
  assert.equal((await executeFixturePlan(plan, { ...base, outcome: "unavailable" })).state, "UNAVAILABLE");
  assert.equal((await executeFixturePlan(plan, { ...base, outcome: "cancelled" })).state, "CANCELLED");
  assert.equal(cancelOperationPlan(plan).state, "CANCELLED");
});

test("receipt verification is policy-owned and cannot be overridden by a caller verifier", async () => {
  const plan = makePlan();
  const base = { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, authority: { state: "SUPPORTED", evidence: "fixture-authority-observed" }, now };
  assert.equal((await executeFixturePlan(plan, base)).state, "UNVERIFIED");
  const verified = await executeFixturePlan(plan, { ...base, readback: { enabled: true } });
  assert.equal(verified.state, "VERIFIED");
  assert.equal(verified.receipt.verification, "VERIFIED");
  assert.match(verified.receipt.warnings.join(" "), /does not qualify a live IRIS/u);
  const mismatch = await executeFixturePlan(plan, { ...base, readback: { enabled: false }, verify: () => true });
  assert.equal(mismatch.state, "MISMATCH");
  assert.equal(mismatch.receipt.verification, "FAILED");
  assert.equal(mismatch.receipt.verificationReason, "read-back-mismatch");
});

test("stale expiry and unestablished preconditions fail closed without inventing denial", async () => {
  const plan = makePlan();
  const authority = { state: "SUPPORTED", evidence: "fixture-authority" };
  assert.equal((await executeFixturePlan(plan, { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, authority, now: now + 60_000 })).state, "STALE");
  const unknownPlan = createOperationPlan({ ...input, preconditions: [{ claim: "fresh pre-state", observed: "unknown", evidence: "fixture-unknown" }] }, now);
  const unknown = await executeFixturePlan(unknownPlan, { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, authority, now });
  assert.equal(unknown.state, "BLOCKED");
  assert.equal(unknown.reason, "precondition-unverified");
  assert.equal(isTerminalOperationState(unknown.state), false);
  const falsePlan = createOperationPlan({ ...input, preconditions: [{ claim: "fixture absent", observed: false, evidence: "fixture-present" }] }, now);
  const failed = await executeFixturePlan(falsePlan, { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, authority, now });
  assert.equal(failed.state, "BLOCKED");
  assert.equal(failed.reason, "precondition-failed");
});

test("plans are deeply immutable and cloned/forged plans are not executable", async () => {
  const plan = makePlan();
  assert.throws(() => { plan.parameters.enabled = false; }, TypeError);
  assert.throws(() => { plan.target.key = "/other"; }, TypeError);
  assert.throws(() => { plan.preconditions.push({ claim: "later", observed: true }); }, TypeError);
  const forged = { ...plan };
  const result = await executeFixturePlan(forged, { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, authority: { state: "SUPPORTED", evidence: "fixture-authority" }, now });
  assert.deepEqual(result, { state: "UNRESOLVED", reason: "plan-not-qualified" });
  assert.equal(cancelOperationPlan(forged).state, "UNRESOLVED");
});

test("execution enforces expiry even when a caller does not supply a clock override", async () => {
  const oldPlan = createOperationPlan({ ...input, expiresAt: 2 }, 1);
  const result = await executeFixturePlan(oldPlan, { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, authority: { state: "SUPPORTED", evidence: "fixture-authority" } });
  assert.equal(result.state, "STALE");
  assert.equal(result.reason, "plan-expired");
});

test("missing or denied authority evidence never reaches fixture execution", async () => {
  const plan = makePlan();
  const base = { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, now };
  assert.equal((await executeFixturePlan(plan, { ...base, authority: { state: "UNVERIFIED" } })).state, "UNAVAILABLE");
  assert.equal((await executeFixturePlan(plan, { ...base, authority: { state: "DENIED", evidence: "fixture-denial" } })).state, "DENIED");
});


test("Node/test source path re-exports the single browser-deployed operation implementation", async () => {
  const shim = await readFile(new URL("../src/operation-engine.js", import.meta.url), "utf8");
  assert.match(shim, /export \* from "\.\.\/public\/operation-engine\.js";/u);
  assert.doesNotMatch(shim, /function createOperationPlan/u);
});
