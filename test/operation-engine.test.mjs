import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { cancelOperationPlan, createOperationPlan, createWebAppOperationProvider, executeFixturePlan, executeOperationPlan, fingerprintPreState, isTerminalOperationState, setObserveOnly } from "../src/operation-engine.js";
import { createEvidenceCollection, exportEvidenceJSON, operationReceiptEvidence } from "../public/evidence-center.js";

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

test('Observe Only enforces executor refusal even with an exact confirmation and permits plan construction',async()=>{
  setObserveOnly(true);
  try {
    const plan=makePlan();
    const result=await executeFixturePlan(plan,{providerIdentity:'opsdeck-fixture-v1',currentPreState:{enabled:false},confirmed:true,authority:{state:'SUPPORTED',evidence:'authority:1'},now,observeOnly:false});
    assert.equal(plan.state,'REVIEW_REQUIRED');
    assert.equal(result.reason,'observe-only-policy');
    assert.equal(result.dispatchAllowed,false);
  } finally {setObserveOnly(false);}
});
test('enabling Observe Only during an awaited authority check prevents subsequent dispatch',async()=>{
  let dispatches=0;
  const provider={identity:'race-provider',targetProvider:'iris-admin-api',readPreState:async()=>({enabled:false}),
    checkAuthority:async()=>{setObserveOnly(true);return{state:'SUPPORTED',evidence:'authority:1'};},
    dispatch:async()=>{dispatches++;return{state:'ACCEPTED'};},readBack:async()=>({enabled:true}),verifyReadback:async()=>({supported:true,matched:true})};
  const plan=makePlan();
  try {
    const result=await executeOperationPlan(plan,provider,{providerIdentity:provider.identity,now,confirmation:{confirmed:true,planId:plan.id,preStateFingerprint:plan.preStateFingerprint}});
    assert.equal(result.reason,'observe-only-policy');assert.equal(dispatches,0);
  }finally{setObserveOnly(false);}
});

test('invalidating the confirmed operation context during authority checking cancels before dispatch',async()=>{
  let current=true,dispatches=0;
  const provider={identity:'context-race-provider',targetProvider:'iris-admin-api',readPreState:async()=>({enabled:false}),
    checkAuthority:async()=>{current=false;return{state:'SUPPORTED',evidence:'authority:1'};},
    dispatch:async()=>{dispatches++;return{state:'ACCEPTED'};},readBack:async()=>({enabled:true}),verifyReadback:async()=>({supported:true,matched:true})};
  const plan=makePlan();
  const result=await executeOperationPlan(plan,provider,{providerIdentity:provider.identity,now,isCurrent:()=>current,confirmation:{confirmed:true,planId:plan.id,preStateFingerprint:plan.preStateFingerprint}});
  assert.equal(result.state,'CANCELLED');assert.equal(result.reason,'operation-context-changed');assert.equal(dispatches,0);
});

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

test("generic executor runs one provider through fresh state, authority, confirmation, dispatch, read-back and receipt", async () => {
  const plan = makePlan();
  const calls = [];
  const provider = {
    identity: "fixture-webapp-provider-v1",
    targetProvider: "iris-admin-api",
    readPreState: async () => { calls.push("pre-state"); return { enabled: false }; },
    checkAuthority: async () => { calls.push("authority"); return { state: "SUPPORTED", evidence: "fixture-authority" }; },
    dispatch: async () => { calls.push("dispatch"); return { state: "ACCEPTED", status: "201" }; },
    readBack: async () => { calls.push("read-back"); return { enabled: true }; },
    verifyReadback: async (_plan, current) => { calls.push("verify"); return { supported: true, matched: current.enabled === true }; },
  };
  const confirmation = { planId: plan.id, preStateFingerprint: plan.preStateFingerprint, confirmed: true };
  const result = await executeOperationPlan(plan, provider, { providerIdentity: provider.identity, confirmation, now });
  assert.equal(result.state, "VERIFIED");
  assert.deepEqual(calls, ["pre-state", "authority", "dispatch", "read-back", "verify"]);
  assert.equal(result.receipt.provider, provider.identity);
  assert.equal(result.receipt.providerResponseStatus, "201");
  assert.equal((await executeOperationPlan(plan, provider, { providerIdentity: provider.identity, confirmation, now })).state, "VERIFIED");
  assert.equal(calls.filter(call => call === "dispatch").length, 1, "a dispatched plan cannot be executed a second time");
});

test("generic executor binds confirmation to exact plan and pre-state before dispatch", async () => {
  const plan = makePlan();
  let dispatchCount = 0;
  const provider = {
    identity: "fixture-webapp-provider-v1",
    targetProvider: "iris-admin-api",
    readPreState: async () => ({ enabled: false }),
    checkAuthority: async () => ({ state: "SUPPORTED", evidence: "fixture-authority" }),
    dispatch: async () => { dispatchCount += 1; return { state: "ACCEPTED" }; },
    readBack: async () => ({ enabled: true }),
    verifyReadback: async () => ({ supported: true, matched: true }),
  };
  const result = await executeOperationPlan(plan, provider, {
    providerIdentity: provider.identity,
    confirmation: { planId: plan.id, preStateFingerprint: "different-pre-state", confirmed: true },
    now,
  });
  assert.equal(result.state, "BLOCKED");
  assert.equal(result.reason, "explicit-confirmation-required");
  assert.equal(dispatchCount, 0);
});

test("generic executor marks a thrown dispatch ambiguous and does not invoke it twice", async () => {
  const plan = makePlan();
  let dispatchCount = 0;
  const provider = {
    identity: "fixture-webapp-provider-v1",
    targetProvider: "iris-admin-api",
    readPreState: async () => ({ enabled: false }),
    checkAuthority: async () => ({ state: "SUPPORTED", evidence: "fixture-authority" }),
    dispatch: async () => { dispatchCount += 1; throw new Error("connection closed after request write"); },
    readBack: async () => ({ enabled: true }),
    verifyReadback: async () => ({ supported: true, matched: true }),
  };
  const confirmation = { planId: plan.id, preStateFingerprint: plan.preStateFingerprint, confirmed: true };
  const first = await executeOperationPlan(plan, provider, { providerIdentity: provider.identity, confirmation, now });
  const second = await executeOperationPlan(plan, provider, { providerIdentity: provider.identity, confirmation, now });
  assert.deepEqual(first, { state: "AMBIGUOUS", reason: "dispatch-result-ambiguous", retryAllowed: false });
  assert.deepEqual(second, first);
  assert.equal(dispatchCount, 1);
  assert.equal(isTerminalOperationState(first.state), true);
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
  const evidence = createEvidenceCollection([operationReceiptEvidence(result.receipt)]);
  assert.equal(evidence.records[0].kind, "operation-receipt");
  assert.equal(evidence.records[0].state, "VERIFIED");
  assert.equal(evidence.records[0].resource.key, "/opsdeck-fixture");
  assert.equal(evidence.records[0].evidence.operationId, disable.id);
  assert.doesNotMatch(exportEvidenceJSON(evidence), /requestSummary|preStateFingerprint|authenticationMask/u);
  assert.deepEqual(result.receipt.requestSummary, { enabled: false });
});

test("live web-app fixture creation is fixed-scope, confirmed, authority-checked, and read-back verified", async () => {
  const plan = createOperationPlan({
    id: "fixture-create-001", intent: "Create disabled OpsDeck qualification fixture",
    expectedReadback: "Exact disabled CSP fixture properties match", expiresAt: now + 60_000,
    target: { ...input.target, observedAt: "2026-10-03T12:00:00Z" },
    capability: { ...input.capability, id: "webapp.fixture.create", semanticAction: "create-qualification-fixture", risk: "HIGH" },
    parameters: { authenticationMask: 32, enabled: false, namespace: "%SYS", path: "/usr/irissys/csp/opsdeck/", recurse: true, serveFiles: true },
    preState: { exists: false }, preStateEvidence: "iris-admin-api:fixture-absent",
    authorityValidation: { state: "SUPPORTED", evidence: "iris-admin-api:security-secure-use:true" },
    preconditions: [{ claim: "Exact fixture is absent", observed: true, evidence: "iris-admin-api:fixture-absent" }],
  }, now);
  const calls = [];
  let created = null;
  const provider = createWebAppOperationProvider({
    username: "OpsDeckQualify",
    requestJson: async (path, options = {}) => {
      calls.push({ path, options });
      if (path === "/api/admin/info") return { status: { errors: [] }, result: { username: "OpsDeckQualify", privileges: { Secure: { use: true } } } };
      if (options.method === "PUT") { created = { status: { errors: [] }, result: { Name: "/opsdeck-fixture" } }; return created; }
      if (!created) { const error = new Error("not found"); error.status = 404; throw error; }
      return { status: { errors: [] }, result: {
        Name: "/opsdeck-fixture", Enabled: false, NameSpace: "%SYS", Path: "/usr/irissys/csp/opsdeck/",
        Recurse: 1, ServeFiles: 1, AutheEnabled: 32, Type: "CSP",
      } };
    },
  });
  const result = await executeOperationPlan(plan, provider, {
    providerIdentity: provider.identity, now,
    confirmation: { planId: plan.id, preStateFingerprint: plan.preStateFingerprint, confirmed: true },
  });
  assert.equal(result.state, "VERIFIED");
  assert.equal(result.receipt.verification, "VERIFIED");
  assert.deepEqual(calls.map(({ path, options }) => options.method ? `${options.method} ${path}` : `GET ${path}`), [
    "GET /api/admin/v2/web-app?name=%2Fopsdeck-fixture",
    "GET /api/admin/info",
    "PUT /api/admin/v2/web-app?name=%2Fopsdeck-fixture",
    "GET /api/admin/v2/web-app?name=%2Fopsdeck-fixture",
  ]);
  assert.deepEqual(JSON.parse(calls[2].options.body), {
    Enabled: false, NameSpace: "%SYS", Path: "/usr/irissys/csp/opsdeck/", Recurse: 1, ServeFiles: 1, AutheEnabled: 32,
  });
});

test("live fixture deletion requires exact disabled state and verifies authoritative absence", async () => {
  const fixtureState = { authenticationMask: 32, enabled: false, exists: true, namespace: "%SYS", path: "/usr/irissys/csp/opsdeck/", recurse: true, serveFiles: true };
  const plan = createOperationPlan({
    id: "fixture-delete-001", intent: "Remove the exact disabled OpsDeck qualification fixture",
    expectedReadback: "Exact fixture is absent", expiresAt: now + 60_000,
    target: { ...input.target, observedAt: "2026-10-03T12:00:00Z" },
    capability: { ...input.capability, id: "webapp.fixture.delete", semanticAction: "delete-qualification-fixture", providerOperation: "DELETE /api/admin/v2/web-app", risk: "HIGH" },
    parameters: {}, preState: fixtureState, preStateEvidence: "iris-admin-api:fixture-present",
    authorityValidation: { state: "SUPPORTED", evidence: "iris-admin-api:security-secure-use:true" },
    preconditions: [{ claim: "Fixture is disabled and matches the exact created contract", observed: true, evidence: "iris-admin-api:fixture-present" }],
  }, now);
  let present = true;
  const calls = [];
  const provider = createWebAppOperationProvider({
    username: "OpsDeckQualify",
    requestJson: async (path, options = {}) => {
      calls.push({ path, options });
      if (path === "/api/admin/info") return { status: { errors: [] }, result: { username: "OpsDeckQualify", privileges: { Secure: { use: true } } } };
      if (options.method === "DELETE") { present = false; return { status: { errors: [] }, result: {} }; }
      if (!present) { const error = new Error("not found"); error.status = 404; throw error; }
      return { status: { errors: [] }, result: {
        Name: "/opsdeck-fixture", Enabled: false, NameSpace: "%SYS", Path: "/usr/irissys/csp/opsdeck/",
        Recurse: 1, ServeFiles: 1, AutheEnabled: 32, Type: "CSP",
      } };
    },
  });
  const result = await executeOperationPlan(plan, provider, {
    providerIdentity: provider.identity, now,
    confirmation: { planId: plan.id, preStateFingerprint: plan.preStateFingerprint, confirmed: true },
  });
  assert.equal(result.state, "VERIFIED");
  assert.deepEqual(calls.map(({ path, options }) => options.method ? `${options.method} ${path}` : `GET ${path}`), [
    "GET /api/admin/v2/web-app?name=%2Fopsdeck-fixture",
    "GET /api/admin/info",
    "DELETE /api/admin/v2/web-app?name=%2Fopsdeck-fixture",
    "GET /api/admin/v2/web-app?name=%2Fopsdeck-fixture",
  ]);
});

test("ambiguous provider result is terminal and never retried", async () => {
  const plan = makePlan();
  const result = await executeFixturePlan(plan, { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, authority: { state: "SUPPORTED", evidence: "fixture-authority" }, outcome: "ambiguous", now });
  assert.deepEqual(result, { state: "AMBIGUOUS", reason: "provider-result-ambiguous", retryAllowed: false });
  assert.equal(isTerminalOperationState(result.state), true);
});

test("a changed read-back does not close an ambiguous dispatch into a receipt", async () => {
  const plan = createOperationPlan({ ...input, id: "fixture_7f3c91a4d2" }, now);
  const changedReadback = { enabled: true };
  const result = await executeFixturePlan(plan, {
    providerIdentity: "opsdeck-fixture-v1",
    currentPreState: { enabled: false },
    confirmed: true,
    authority: { state: "SUPPORTED", evidence: "fixture-authority" },
    outcome: "ambiguous",
    readback: changedReadback,
    now,
  });

  assert.equal(plan.preStateFingerprint, fingerprintPreState({ enabled: false }));
  assert.equal(plan.parameters.enabled, true);
  assert.equal(changedReadback.enabled, true);
  assert.equal(result.state, "AMBIGUOUS");
  assert.equal(result.retryAllowed, false);
  assert.equal(Object.hasOwn(result, "receipt"), false);
  assert.equal(isTerminalOperationState(result.state), true);
});

test("denial, cancellation, unavailability and cancellation of review remain distinct", async () => {
  const base = { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, authority: { state: "SUPPORTED", evidence: "fixture-authority-observed" }, now };
  assert.equal((await executeFixturePlan(makePlan(), { ...base, outcome: "denied" })).state, "DENIED");
  assert.equal((await executeFixturePlan(makePlan(), { ...base, outcome: "unavailable" })).state, "UNAVAILABLE");
  assert.equal((await executeFixturePlan(makePlan(), { ...base, outcome: "cancelled" })).state, "CANCELLED");
  const plan = makePlan();
  assert.equal(cancelOperationPlan(plan).state, "CANCELLED");
});

test("receipt verification is policy-owned and cannot be overridden by a caller verifier", async () => {
  const base = { providerIdentity: "opsdeck-fixture-v1", currentPreState: { enabled: false }, confirmed: true, authority: { state: "SUPPORTED", evidence: "fixture-authority-observed" }, now };
  const unknown = await executeFixturePlan(makePlan(), base);
  assert.equal(unknown.state, "AMBIGUOUS");
  assert.equal(unknown.retryAllowed, false);
  assert.equal(Object.hasOwn(unknown, "receipt"), false);
  const verified = await executeFixturePlan(makePlan(), { ...base, readback: { enabled: true } });
  assert.equal(verified.state, "VERIFIED");
  assert.equal(verified.receipt.verification, "VERIFIED");
  assert.match(verified.receipt.warnings.join(" "), /does not qualify a live IRIS/u);
  const mismatch = await executeFixturePlan(makePlan(), { ...base, readback: { enabled: false }, verify: () => true });
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
