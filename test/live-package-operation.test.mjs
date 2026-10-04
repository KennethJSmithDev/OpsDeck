import test from "node:test";
import assert from "node:assert/strict";
import { createIPMPackageOperationProvider, createOperationPlan, executeOperationPlan, OPERATION_POLICIES } from "../public/operation-engine.js";
const name = "qualification-package";
function fixture({ denied = false, ambiguous = false } = {}) {
  let installedVersion = null;
  const calls = [];
  const requestJson = async (path, options = {}) => {
    calls.push({ path, ...options });
    if (path === "/opsdeck-api/package-authority") return { provider: "iris-ipm-operations-v1", username: "Qualifier", namespace: "%SYS", state: denied ? "DENIED" : "SUPPORTED" };
    if (path === "/opsdeck-api/packages") return { provider: "iris-ipm-installed-v1", namespace: "%SYS", status: installedVersion ? "available" : "empty", packages: installedVersion ? [{ name, installedVersion }] : [] };
    if (path.startsWith("/opsdeck-api/available-packages?")) return { provider: "iris-ipm-available-v1", namespace: "%SYS", name, status: "available", packages: [{ name, availableVersion: "0.0.1", repository: "qualification-repo" }] };
    if (ambiguous) throw new Error("uncertain-transport");
    const body = JSON.parse(options.body);
    installedVersion = body.action === "install" ? body.version : null;
    return { provider: "iris-ipm-operations-v1", username: "Qualifier", namespace: "%SYS", state: "ACCEPTED" };
  };
  return { calls, provider: createIPMPackageOperationProvider({ requestJson, username: "Qualifier" }) };
}
async function planFor(provider, action = "install") {
  const id = `ipm.live.${action}`, policy = OPERATION_POLICIES[id];
  const target = { domain: "applications", kind: "package", provider: "iris-ipm-installed-v1", key: name, label: name, scope: "%SYS", observedAt: new Date().toISOString() };
  const parameters = { packageName: name, namespace: "%SYS", requestedVersion: "0.0.1", sourceIdentity: "qualification-repo", installedVersion: action === "install" ? null : "0.0.1" };
  const preState = await provider.readPreState({ target, parameters, capability: { id } });
  return createOperationPlan({ id: `plan:${action}`, intent: `${action} ${name}`, target, parameters, capability: { id, state: "SUPPORTED", ...policy }, preState, preStateEvidence: "ipm:prestate", authorityValidation: { state: "SUPPORTED", evidence: "ipm:authority" }, preconditions: [{ claim: "Exact fixture", observed: true, evidence: "ipm:fixture" }], expectedReadback: "Authoritative installed version", expiresAt: Date.now() + 60000 });
}
const execute = (plan, provider) => executeOperationPlan(plan, provider, { providerIdentity: provider.identity, confirmation: { confirmed: true, planId: plan.id, preStateFingerprint: plan.preStateFingerprint } });
test("live IPM install/remove use the shared engine and authoritative inventory receipts", async () => {
  const { provider, calls } = fixture();
  for (const action of ["install", "remove"]) {
    const plan = await planFor(provider, action);
    const result = await execute(plan, provider);
    assert.equal(result.state, "VERIFIED");
    assert.equal(result.receipt.verification, "VERIFIED");
  }
  const dispatches = calls.filter(x => x.method === "POST");
  assert.equal(dispatches.length, 2);
  assert.deepEqual(Object.keys(JSON.parse(dispatches[0].body)).sort(), ["action", "expectedInstalledVersion", "name", "namespace", "repository", "version"]);
});
test("live IPM authority denial does not dispatch", async () => {
  const { provider, calls } = fixture({ denied: true });
  assert.equal((await execute(await planFor(provider), provider)).state, "DENIED");
  assert.equal(calls.filter(x => x.method === "POST").length, 0);
});
test("live IPM ambiguity is terminal and cannot trigger a second dispatch", async () => {
  const { provider, calls } = fixture({ ambiguous: true });
  const plan = await planFor(provider);
  assert.equal((await execute(plan, provider)).state, "AMBIGUOUS");
  await execute(plan, provider);
  assert.equal(calls.filter(x => x.method === "POST").length, 1);
});
