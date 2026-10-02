import test from "node:test";
import assert from "node:assert/strict";
import { cancelOperationPlan, createOperationPlan, executeFixturePlan, fingerprintPreState, isTerminalOperationState } from "../src/operation-engine.js";

const now = Date.parse("2026-10-02T12:00:00Z");
const input = {
  id: "op-001", intent: "Enable disposable fixture application", expectedReadback: "Enabled is true", expiresAt: now + 60_000,
  target: { domain: "applications", kind: "web-app", provider: "iris-admin-api", key: "/opsdeck-fixture", scope: "%SYS", label: "Fixture application", observedAt: "2026-10-02T11:59:00Z" },
  capability: { id: "webapp.enable", semanticAction: "enable", providerOperation: "PUT /api/admin/v2/web-apps", state: "SUPPORTED", risk: "MEDIUM", requiredPrivileges: ["%Admin_Secure:U"] },
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
  assert.equal(plan.requiresConfirmation, true);
  assert.equal(plan.state, "REVIEW_REQUIRED");
  assert.equal(plan.preStateFingerprint, fingerprintPreState({ enabled: false }));
  assert.throws(() => createOperationPlan({ ...input, parameters: { apiToken: "never retain" } }, now), /Sensitive/u);
  assert.throws(() => createOperationPlan({ ...input, capability: { ...input.capability, risk: "LOW" } }, now), /risk policy/u);
  assert.throws(() => createOperationPlan({ ...input, expiresAt: now }, now), /expiry/u);
});

test("fixture execution requires exact fixture identity, fresh pre-state, supported capability and confirmation", async () => {
  const plan = makePlan();
  assert.equal((await executeFixturePlan(plan, { providerIdentity: "live-iris", currentPreState: { enabled: false }, confirmed: true })).state, "UNAVAILABLE");
  const authority = { state: "SUPPORTED", evidence: "fixture-authority" };
  assert.equal((await executeFixturePlan(plan, { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: true }, confirmed: true, authority })).state, "STALE");
  assert.equal((await executeFixturePlan(plan, { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, authority })).reason, "explicit-confirmation-required");
  assert.equal((await executeFixturePlan({ ...plan, capability: { ...plan.capability, state: "UNRESOLVED" } }, { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, authority })).state, "UNAVAILABLE");
});

test("ambiguous provider result is terminal and never retried", async () => {
  const plan = makePlan();
  const result = await executeFixturePlan(plan, { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, authority: { state: "SUPPORTED", evidence: "fixture-authority" }, outcome: "ambiguous" });
  assert.deepEqual(result, { state: "AMBIGUOUS", reason: "provider-result-ambiguous", retryAllowed: false });
  assert.equal(isTerminalOperationState(result.state), true);
});

test("denial, cancellation, unavailability and cancellation of review remain distinct", async () => {
  const plan = makePlan();
  const base = { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, authority: { state: "SUPPORTED", evidence: "fixture-authority-observed" } };
  assert.equal((await executeFixturePlan(plan, { ...base, outcome: "denied" })).state, "DENIED");
  assert.equal((await executeFixturePlan(plan, { ...base, outcome: "unavailable" })).state, "UNAVAILABLE");
  assert.equal((await executeFixturePlan(plan, { ...base, outcome: "cancelled" })).state, "CANCELLED");
  assert.equal(cancelOperationPlan(plan).state, "CANCELLED");
});

test("receipt is emitted only after read-back and verification; mismatch is preserved", async () => {
  const plan = makePlan();
  const base = { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, authority: { state: "SUPPORTED", evidence: "fixture-authority-observed" } };
  assert.equal((await executeFixturePlan(plan, base)).state, "UNVERIFIED");
  const verified = await executeFixturePlan(plan, { ...base, readback: { enabled: true }, verify: (readback) => readback.enabled === true });
  assert.equal(verified.state, "VERIFIED");
  assert.equal(verified.receipt.verification, "VERIFIED");
  assert.match(verified.receipt.warnings.join(" "), /does not qualify a live IRIS/u);
  const mismatch = await executeFixturePlan(plan, { ...base, readback: { enabled: false }, verify: (readback) => readback.enabled === true });
  assert.equal(mismatch.state, "MISMATCH");
  assert.equal(mismatch.receipt.verification, "FAILED");
  assert.equal(mismatch.receipt.verificationReason, "read-back-mismatch");
});

test("stale expiry and unestablished preconditions fail closed", async () => {
  const plan = makePlan();
  assert.equal((await executeFixturePlan(plan, { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, authority: { state: "SUPPORTED", evidence: "fixture-authority" }, now: now + 60_000 })).state, "STALE");
  assert.equal((await executeFixturePlan({ ...plan, preconditions: [{ claim: "fresh pre-state", observed: "unknown" }] }, { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, authority: { state: "SUPPORTED", evidence: "fixture-authority" } })).state, "DENIED");
});

test("missing or denied authority evidence never reaches fixture execution", async () => {
  const plan = makePlan();
  const base = { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true };
  assert.equal((await executeFixturePlan(plan, { ...base, authority: { state: "UNVERIFIED" } })).state, "UNAVAILABLE");
  assert.equal((await executeFixturePlan(plan, { ...base, authority: { state: "DENIED", evidence: "fixture-denial" } })).state, "DENIED");
});
