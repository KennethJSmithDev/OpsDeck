const SAFE_KEY = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/u;
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:._/-]{0,255}$/u;
const SAFE_PLAN_ID = /^[A-Za-z0-9][A-Za-z0-9:._/-]{0,127}$/u;
const SECRET_KEY = /(?:password|secret|token|authorization|private.?key|credential|cookie)/iu;
const TERMINAL = new Set(["CANCELLED", "DENIED", "UNAVAILABLE", "STALE", "AMBIGUOUS", "VERIFIED", "FAILED", "MISMATCH", "UNVERIFIED"]);
const validatedOperationPlans = new WeakSet();
const operationAttempts = new WeakMap();
const OPERATION_PLAN_SCHEMA = "opsdeck-operation-plan-v1";
export const OPERATION_POLICIES = Object.freeze({
  "webapp.enable": Object.freeze({
    semanticAction: "enable",
    risk: "MEDIUM",
    providerOperation: "PUT /api/admin/v2/web-app",
    requiredPrivileges: Object.freeze(["%Admin_Secure:U"]),
    targetDomain: "applications",
    targetKind: "web-app",
    targetProvider: "iris-admin-api",
    parameterKeys: Object.freeze(["enabled"]),
    preStateKeys: Object.freeze(["enabled"]),
  }),
  "webapp.disable": Object.freeze({
    semanticAction: "disable",
    risk: "MEDIUM",
    providerOperation: "PUT /api/admin/v2/web-app",
    requiredPrivileges: Object.freeze(["%Admin_Secure:U"]),
    targetDomain: "applications",
    targetKind: "web-app",
    targetProvider: "iris-admin-api",
    parameterKeys: Object.freeze(["enabled"]),
    preStateKeys: Object.freeze(["enabled"]),
  }),
  "webapp.fixture.create": Object.freeze({
    semanticAction: "create-qualification-fixture",
    risk: "HIGH",
    providerOperation: "PUT /api/admin/v2/web-app",
    requiredPrivileges: Object.freeze(["%Admin_Secure:U"]),
    targetDomain: "applications",
    targetKind: "web-app",
    targetProvider: "iris-admin-api",
    parameterKeys: Object.freeze(["authenticationMask", "enabled", "namespace", "path", "recurse", "serveFiles"]),
    preStateKeys: Object.freeze(["exists"]),
  }),
  "webapp.fixture.delete": Object.freeze({
    semanticAction: "delete-qualification-fixture",
    risk: "HIGH",
    providerOperation: "DELETE /api/admin/v2/web-app",
    requiredPrivileges: Object.freeze(["%Admin_Secure:U"]),
    targetDomain: "applications",
    targetKind: "web-app",
    targetProvider: "iris-admin-api",
    parameterKeys: Object.freeze([]),
    preStateKeys: Object.freeze(["authenticationMask", "enabled", "exists", "namespace", "path", "recurse", "serveFiles"]),
  }),
  "ipm.package.install": Object.freeze({
    semanticAction: "package-install",
    risk: "HIGH",
    providerOperation: "IPM install · UNQUALIFIED",
    requiredPrivileges: Object.freeze(["UNVERIFIED · instance/IPM-specific"]),
    targetDomain: "applications",
    targetKind: "package",
    targetProvider: "opsdeck-package-fixture-v1",
    parameterKeys: Object.freeze(["installedVersion", "namespace", "packageName", "requestedVersion", "sourceIdentity"]),
    preStateKeys: Object.freeze(["availableVersion", "installedVersion", "namespace", "sourceIdentity"]),
  }),
  "ipm.package.update": Object.freeze({
    semanticAction: "package-update",
    risk: "HIGH",
    providerOperation: "IPM update · UNQUALIFIED",
    requiredPrivileges: Object.freeze(["UNVERIFIED · instance/IPM-specific"]),
    targetDomain: "applications",
    targetKind: "package",
    targetProvider: "opsdeck-package-fixture-v1",
    parameterKeys: Object.freeze(["installedVersion", "namespace", "packageName", "requestedVersion", "sourceIdentity"]),
    preStateKeys: Object.freeze(["availableVersion", "installedVersion", "namespace", "sourceIdentity"]),
  }),
  "ipm.package.remove": Object.freeze({
    semanticAction: "package-remove",
    risk: "HIGH",
    providerOperation: "IPM remove · UNQUALIFIED",
    requiredPrivileges: Object.freeze(["UNVERIFIED · instance/IPM-specific"]),
    targetDomain: "applications",
    targetKind: "package",
    targetProvider: "opsdeck-package-fixture-v1",
    parameterKeys: Object.freeze(["installedVersion", "namespace", "packageName", "requestedVersion", "sourceIdentity"]),
    preStateKeys: Object.freeze(["availableVersion", "installedVersion", "namespace", "sourceIdentity"]),
  }),
});

function plain(value) { return value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function deepFreeze(value) {
  if (Array.isArray(value) || plain(value)) {
    for (const item of Array.isArray(value) ? value : Object.values(value)) deepFreeze(item);
    Object.freeze(value);
  }
  return value;
}
function boundedText(value, label, max = 256) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) throw new Error(`${label} is invalid.`);
  return value.trim();
}
function evidenceRef(value, label) {
  const ref = boundedText(value, label, 256);
  if (!SAFE_REF.test(ref)) throw new Error(`${label} must be an evidence reference identity.`);
  return ref;
}
function safeProjection(value, depth = 0) {
  if (depth > 4) throw new Error("Operation parameters exceed the safe nesting bound.");
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
    if (typeof value === "string" && value.length > 256) throw new Error("Operation parameter is too long.");
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Operation parameter is not finite.");
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 32) throw new Error("Operation parameter list exceeds the bound.");
    return value.map(item => safeProjection(item, depth + 1));
  }
  if (!plain(value)) throw new Error("Operation parameters must be plain JSON data.");
  const entries = Object.entries(value);
  if (entries.length > 32) throw new Error("Operation parameter object exceeds the bound.");
  const result = {};
  for (const [key, item] of entries) {
    if (!SAFE_KEY.test(key) || SECRET_KEY.test(key)) throw new Error("Sensitive or unsupported operation parameter field.");
    result[key] = safeProjection(item, depth + 1);
  }
  return result;
}
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (plain(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function sameStringList(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function exactParameterKeys(parameters, expected) {
  const keys = Object.keys(parameters).sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function validateOperationParameters(capabilityId, parameters, policy) {
  if (!exactParameterKeys(parameters, policy.parameterKeys)) {
    throw new Error("Operation parameters do not match the deterministic policy schema.");
  }
  if (capabilityId === "webapp.enable" && parameters.enabled !== true) {
    throw new Error("webapp.enable requires enabled=true.");
  }
  if (capabilityId === "webapp.disable" && parameters.enabled !== false) {
    throw new Error("webapp.disable requires enabled=false.");
  }
  if (capabilityId === "webapp.fixture.create" &&
      (parameters.authenticationMask !== 32 || parameters.enabled !== false || parameters.namespace !== "%SYS" ||
       parameters.path !== "/usr/irissys/csp/opsdeck/" || parameters.recurse !== true || parameters.serveFiles !== true)) {
    throw new Error("Qualification fixture creation must use the exact bounded disabled CSP fixture contract.");
  }
  if (capabilityId === "webapp.fixture.delete" && Object.keys(parameters).length !== 0) {
    throw new Error("Qualification fixture deletion does not accept parameters.");
  }
  if (capabilityId.startsWith("ipm.package.")) {
    for (const key of ["namespace", "packageName", "requestedVersion", "sourceIdentity"]) {
      boundedText(parameters[key], `parameters.${key}`, key === "requestedVersion" ? 64 : 128);
    }
    if (parameters.installedVersion !== null) boundedText(parameters.installedVersion, "parameters.installedVersion", 64);
    if (capabilityId === "ipm.package.install" && parameters.installedVersion !== null) {
      throw new Error("Package install requires an uninstalled pre-state.");
    }
    if (capabilityId !== "ipm.package.install" && parameters.installedVersion === null) {
      throw new Error("Package update/remove requires an installed pre-state.");
    }
    if (capabilityId === "ipm.package.remove" && parameters.requestedVersion !== parameters.installedVersion) {
      throw new Error("Package removal must bind to the observed installed version.");
    }
  }
}

function validateOperationPreState(capabilityId, preState, parameters, policy) {
  if (!exactParameterKeys(preState, policy.preStateKeys)) {
    throw new Error("Operation pre-state does not match the deterministic policy schema.");
  }
  if (capabilityId === "webapp.fixture.create") {
    if (preState.exists !== false) throw new Error("Qualification fixture creation requires an authoritative absent pre-state.");
    return;
  }
  if (capabilityId === "webapp.fixture.delete") {
    const expectedKeys = ["authenticationMask", "enabled", "exists", "namespace", "path", "recurse", "serveFiles"];
    if (preState.exists !== true || preState.enabled !== false || preState.authenticationMask !== 32 ||
        preState.namespace !== "%SYS" || preState.path !== "/usr/irissys/csp/opsdeck/" ||
        preState.recurse !== true || preState.serveFiles !== true ||
        !exactParameterKeys(preState, expectedKeys)) {
      throw new Error("Qualification fixture deletion requires the exact observed disabled fixture state.");
    }
    return;
  }
  if (capabilityId.startsWith("webapp.")) {
    if (typeof preState.enabled !== "boolean") throw new Error("Web-app pre-state requires a boolean enabled field.");
    return;
  }
  for (const key of ["namespace", "sourceIdentity"]) boundedText(preState[key], `preState.${key}`, 128);
  for (const key of ["installedVersion", "availableVersion"]) {
    if (preState[key] !== null) boundedText(preState[key], `preState.${key}`, 64);
  }
  if (preState.namespace !== parameters.namespace ||
      preState.sourceIdentity !== parameters.sourceIdentity ||
      preState.installedVersion !== parameters.installedVersion) {
    throw new Error("Package parameters are not bound to the observed pre-state.");
  }
  if (capabilityId === "ipm.package.install" && preState.installedVersion !== null) {
    throw new Error("Package install pre-state is already installed.");
  }
  if (capabilityId !== "ipm.package.install" && preState.installedVersion === null) {
    throw new Error("Package update/remove pre-state is not installed.");
  }
  if (capabilityId !== "ipm.package.remove" && preState.availableVersion !== parameters.requestedVersion) {
    throw new Error("Package requested version is not the observed available version.");
  }
  if (capabilityId === "ipm.package.remove" && preState.installedVersion !== parameters.requestedVersion) {
    throw new Error("Package removal is not bound to the observed installed version.");
  }
}

function verifyPolicyReadback(plan, readback) {
  const safeReadback = safeProjection(readback);
  if (plan.capability.id === "webapp.enable" || plan.capability.id === "webapp.disable") {
    if (!exactParameterKeys(safeReadback, ["enabled"]) || typeof safeReadback.enabled !== "boolean") {
      return { supported: true, matched: false, safeReadback };
    }
    return { supported: true, matched: safeReadback.enabled === plan.parameters.enabled, safeReadback };
  }
  if (plan.capability.id === "webapp.fixture.create") {
    const expected = { authenticationMask: 32, enabled: false, exists: true, namespace: "%SYS", path: "/usr/irissys/csp/opsdeck/", recurse: true, serveFiles: true };
    return { supported: true, matched: stable(safeReadback) === stable(expected), safeReadback };
  }
  if (plan.capability.id === "webapp.fixture.delete") {
    return { supported: true, matched: exactParameterKeys(safeReadback, ["exists"]) && safeReadback.exists === false, safeReadback };
  }
  return { supported: false, matched: false, safeReadback };
}

export function fingerprintPreState(value) {
  if (!plain(value)) throw new Error("A fresh pre-state object is required.");
  return stable(value);
}

export function createOperationPlan(input, now = Date.now()) {
  if (!plain(input) || !plain(input.target) || !plain(input.capability)) throw new Error("Operation plan identity is incomplete.");
  const target = input.target;
  for (const field of ["domain", "kind", "provider", "key", "label"]) boundedText(target[field], `target.${field}`);
  const scope = target.scope == null ? undefined : boundedText(target.scope, "target.scope");
  const capability = input.capability;
  for (const field of ["id", "semanticAction", "providerOperation"]) boundedText(capability[field], `capability.${field}`);
  if (!["SUPPORTED", "DEGRADED", "UNRESOLVED", "INCOMPATIBLE", "UNOBSERVABLE"].includes(capability.state)) throw new Error("Capability state is invalid.");
  const policy = OPERATION_POLICIES[capability.id];
  const requiredPrivileges = Array.isArray(capability.requiredPrivileges)
    ? capability.requiredPrivileges.map(item => boundedText(item, "required privilege", 128))
    : [];
  if (!policy ||
      capability.semanticAction !== policy.semanticAction ||
      capability.risk !== policy.risk ||
      capability.providerOperation !== policy.providerOperation ||
      !sameStringList(requiredPrivileges, policy.requiredPrivileges) ||
      target.domain !== policy.targetDomain ||
      target.kind !== policy.targetKind ||
      target.provider !== policy.targetProvider) {
    throw new Error("Operation does not match a deterministic risk/authority/provider policy.");
  }
  if (capability.id.startsWith("webapp.fixture.") && (target.key !== "/opsdeck-fixture" || scope !== "%SYS")) {
    throw new Error("Qualification web-app fixture operations are bound to /opsdeck-fixture in %SYS.");
  }
  const parameters = safeProjection(input.parameters || {});
  validateOperationParameters(capability.id, parameters, policy);
  const preState = safeProjection(input.preState);
  validateOperationPreState(capability.id, preState, parameters, policy);
  const id = boundedText(input.id, "plan.id", 128);
  if (!SAFE_PLAN_ID.test(id)) throw new Error("plan.id must be a stable identity.");
  const expiresAt = Number(input.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) throw new Error("Plan expiry must be in the future.");
  const plan = {
    schemaVersion: OPERATION_PLAN_SCHEMA,
    id,
    intent: boundedText(input.intent, "intent"),
    target: { domain: target.domain, kind: target.kind, provider: target.provider, key: target.key, scope, label: target.label, volatile: Boolean(target.volatile), observedAt: boundedText(target.observedAt, "target.observedAt") },
    capability: { id: capability.id, semanticAction: policy.semanticAction, providerOperation: policy.providerOperation, state: capability.state, risk: policy.risk, requiredPrivileges: [...policy.requiredPrivileges], verification: boundedText(input.expectedReadback, "expected read-back") },
    parameters,
    preconditions: Array.isArray(input.preconditions) ? input.preconditions.slice(0, 16).map(item => ({ claim: boundedText(item.claim, "precondition claim"), observed: item.observed === true ? true : item.observed === false ? false : "unknown", evidence: item.evidence ? evidenceRef(item.evidence, "precondition evidence") : undefined })) : [],
    preStateFingerprint: fingerprintPreState(preState),
    preStateEvidence: input.preStateEvidence ? evidenceRef(input.preStateEvidence, "pre-state evidence") : undefined,
    authorityValidation: { state: ["SUPPORTED", "DENIED", "UNVERIFIED"].includes(input.authorityValidation?.state) ? input.authorityValidation.state : "UNVERIFIED", evidence: input.authorityValidation?.evidence ? evidenceRef(input.authorityValidation.evidence, "authority evidence") : null },
    expectedReadback: boundedText(input.expectedReadback, "expected read-back"),
    risk: capability.risk,
    requiresConfirmation: capability.risk !== "READ",
    irreversible: Boolean(input.irreversible),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    state: "REVIEW_REQUIRED",
  };
  const frozenPlan = deepFreeze(plan);
  validatedOperationPlans.add(frozenPlan);
  return frozenPlan;
}

export function cancelOperationPlan(plan) {
  if (!plan || !validatedOperationPlans.has(plan) || plan.schemaVersion !== OPERATION_PLAN_SCHEMA || plan.state !== "REVIEW_REQUIRED") {
    return { state: "UNRESOLVED", reason: "plan-not-cancellable" };
  }
  return deepFreeze({ state: "CANCELLED", planId: plan.id, cancelledAt: new Date().toISOString() });
}

export async function executeOperationPlan(plan, provider, options = {}) {
  if (!plan || !validatedOperationPlans.has(plan) || plan.schemaVersion !== OPERATION_PLAN_SCHEMA || plan.state !== "REVIEW_REQUIRED") {
    return { state: "UNRESOLVED", reason: "plan-not-qualified" };
  }
  const priorAttempt = operationAttempts.get(plan);
  if (priorAttempt) return priorAttempt.state === "IN_FLIGHT"
    ? { state: "AMBIGUOUS", reason: "operation-plan-dispatch-in-progress", retryAllowed: false }
    : priorAttempt.result;
  let providerIdentity;
  try { providerIdentity = boundedText(provider?.identity, "provider identity", 128); }
  catch { return { state: "UNAVAILABLE", reason: "operation-provider-contract-unavailable" }; }
  if (providerIdentity !== options.providerIdentity ||
      provider.targetProvider !== plan.target.provider || typeof provider.readPreState !== "function" ||
      typeof provider.checkAuthority !== "function" || typeof provider.dispatch !== "function" ||
      typeof provider.readBack !== "function" || typeof provider.verifyReadback !== "function") {
    return { state: "UNAVAILABLE", reason: "operation-provider-contract-unavailable" };
  }
  const executionTime = options.now ?? Date.now();
  if (Date.parse(plan.expiresAt) <= executionTime) return { state: "STALE", reason: "plan-expired" };
  if (plan.capability.state !== "SUPPORTED") return { state: "UNAVAILABLE", reason: `capability-${String(plan.capability.state).toLowerCase()}` };
  let currentPreState;
  try { currentPreState = await provider.readPreState(plan); }
  catch { return { state: "UNAVAILABLE", reason: "fresh-pre-state-unavailable" }; }
  let currentFingerprint;
  try { currentFingerprint = plain(currentPreState) ? fingerprintPreState(safeProjection(currentPreState)) : null; }
  catch { currentFingerprint = null; }
  if (currentFingerprint === null) return { state: "UNAVAILABLE", reason: "fresh-pre-state-invalid" };
  if (currentFingerprint !== plan.preStateFingerprint) {
    return { state: "STALE", reason: "pre-state-changed" };
  }
  let authority;
  try { authority = await provider.checkAuthority(plan); }
  catch { return { state: "UNAVAILABLE", reason: "authority-check-unavailable" }; }
  if (authority?.state === "DENIED") return { state: "DENIED", reason: "authoritative-privilege-denied" };
  if (plan.authorityValidation.state !== "SUPPORTED" || !plan.authorityValidation.evidence ||
      authority?.state !== "SUPPORTED" || !authority?.evidence) {
    return { state: "UNAVAILABLE", reason: "authoritative-privilege-evidence-required" };
  }
  if (plan.preconditions.some(item => item.observed === false)) return { state: "BLOCKED", reason: "precondition-failed" };
  if (plan.preconditions.some(item => item.observed !== true)) return { state: "BLOCKED", reason: "precondition-unverified" };
  const confirmation = options.confirmation;
  if (plan.requiresConfirmation && (!plain(confirmation) || confirmation.planId !== plan.id ||
      confirmation.preStateFingerprint !== plan.preStateFingerprint || confirmation.confirmed !== true)) {
    return { state: "BLOCKED", reason: "explicit-confirmation-required" };
  }
  operationAttempts.set(plan, { state: "IN_FLIGHT" });
  let dispatch;
  const finishAttempt = result => { operationAttempts.set(plan, { state: "COMPLETE", result }); return result; };
  try { dispatch = await provider.dispatch(plan); }
  catch { return finishAttempt({ state: "AMBIGUOUS", reason: "dispatch-result-ambiguous", retryAllowed: false }); }
  if (dispatch?.state === "AMBIGUOUS") return finishAttempt({ state: "AMBIGUOUS", reason: "provider-result-ambiguous", retryAllowed: false });
  if (["CANCELLED", "DENIED", "UNAVAILABLE", "FAILED"].includes(dispatch?.state)) {
    return finishAttempt({ state: dispatch.state, reason: typeof dispatch.reason === "string" ? dispatch.reason : "provider-rejected-operation" });
  }
  if (dispatch?.state !== "ACCEPTED") return finishAttempt({ state: "AMBIGUOUS", reason: "dispatch-result-unclassified", retryAllowed: false });
  let readback;
  try { readback = await provider.readBack(plan, dispatch); }
  catch { return finishAttempt({ state: "AMBIGUOUS", reason: "authoritative-read-back-failed-after-dispatch", retryAllowed: false }); }
  if (readback == null) return finishAttempt({ state: "AMBIGUOUS", reason: "authoritative-read-back-missing-after-dispatch", retryAllowed: false });
  let verification;
  let safeReadback;
  try {
    safeReadback = safeProjection(readback);
    verification = await provider.verifyReadback(plan, safeReadback);
  } catch { return finishAttempt({ state: "AMBIGUOUS", reason: "read-back-verification-unavailable", retryAllowed: false }); }
  if (!plain(verification) || verification.supported !== true || typeof verification.matched !== "boolean") {
    return finishAttempt({ state: "AMBIGUOUS", reason: "read-back-policy-unavailable", retryAllowed: false });
  }
  const verified = verification.matched;
  const receipt = deepFreeze({
    id: `${providerIdentity}:receipt:${plan.id}`,
    operationId: plan.id,
    target: plan.target,
    intent: plan.intent,
    provider: providerIdentity,
    preStateFingerprint: plan.preStateFingerprint,
    requestSummary: plan.parameters,
    postStateFingerprint: fingerprintPreState(safeReadback),
    verification: verified ? "VERIFIED" : "FAILED",
    verificationReason: verified ? "read-back-matched" : "read-back-mismatch",
    providerResponseStatus: typeof dispatch.status === "string" && dispatch.status.length <= 64 ? dispatch.status : "accepted",
    evidenceSources: [providerIdentity, "authoritative-readback"],
    timestamps: { completedAt: new Date().toISOString() },
    warnings: Array.isArray(dispatch.warnings) ? dispatch.warnings.slice(0, 8).filter(value =>
      typeof value === "string" && value.length <= 256 && !/[\u0000-\u001f\u007f]/u.test(value)) : [],
  });
  return finishAttempt({ state: verified ? "VERIFIED" : "MISMATCH", receipt });
}

export async function executeFixturePlan(plan, options = {}) {
  if (options.providerIdentity !== "opsdeck-fixture-v1") return { state: "UNAVAILABLE", reason: "qualified-executor-unavailable" };
  const provider = {
    identity: "opsdeck-fixture-v1",
    targetProvider: plan?.target?.provider,
    readPreState: async () => options.currentPreState,
    checkAuthority: async () => options.authority,
    dispatch: async () => {
      const outcome = options.outcome || "success";
      if (outcome === "ambiguous") return { state: "AMBIGUOUS" };
      if (outcome === "cancelled") return { state: "CANCELLED", reason: "fixture-cancelled" };
      if (["denied", "unavailable", "cancelled"].includes(outcome)) {
        return { state: outcome.toUpperCase(), reason: `fixture-${outcome}` };
      }
      if (outcome !== "success") return { state: "FAILED", reason: "unsupported-fixture-outcome" };
      return { state: "ACCEPTED", status: "fixture-success", warnings: ["Fixture evidence does not qualify a live IRIS operation."] };
    },
    readBack: async () => options.readback,
    verifyReadback: async (currentPlan, readback) => verifyPolicyReadback(currentPlan, readback),
  };
  const confirmation = options.confirmed === true
    ? { planId: plan?.id, preStateFingerprint: plan?.preStateFingerprint, confirmed: true }
    : undefined;
  return executeOperationPlan(plan, provider, { ...options, confirmation });
}

export function isTerminalOperationState(state) { return TERMINAL.has(state); }

function webAppState(payload, expectedName) {
  if (!plain(payload) || !plain(payload.status) || (Array.isArray(payload.status.errors) && payload.status.errors.length) ||
      !plain(payload.result) || (payload.result.Name !== undefined && payload.result.Name !== expectedName)) {
    throw new Error("IRIS returned an invalid web-app result.");
  }
  const value = payload.result;
  return {
    exists: true,
    authenticationMask: Number.isInteger(value.AutheEnabled) ? value.AutheEnabled : null,
    enabled: value.Enabled === true || value.Enabled === 1,
    namespace: typeof value.NameSpace === "string" ? value.NameSpace : null,
    path: typeof value.Path === "string" ? value.Path : null,
    recurse: value.Recurse === true || value.Recurse === 1,
    serveFiles: value.ServeFiles === true || value.ServeFiles === 1 || value.ServeFiles === "Always",
  };
}

export function createWebAppOperationProvider({ requestJson, username }) {
  const observedUsername = boundedText(username, "observed IRIS username", 128);
  if (typeof requestJson !== "function") throw new Error("A same-identity IRIS request function is required.");
  const detailPath = plan => `/api/admin/v2/web-app?${new URLSearchParams({ name: plan.target.key })}`;
  const read = async plan => {
    try { return webAppState(await requestJson(detailPath(plan)), plan.target.key); }
    catch (error) {
      if (error?.status === 404) return { exists: false };
      throw error;
    }
  };
  return Object.freeze({
    identity: "iris-admin-webapp-provider-v1",
    targetProvider: "iris-admin-api",
    readPreState: async plan => {
      const current = await read(plan);
      if (current.exists === true && current.namespace !== plan.target.scope) {
        throw new Error("Web-app namespace no longer matches the planned target.");
      }
      if (plan.capability.id === "webapp.enable" || plan.capability.id === "webapp.disable") {
        if (current.exists !== true || typeof current.enabled !== "boolean") throw new Error("Selected web application is no longer present.");
        return { enabled: current.enabled };
      }
      return current;
    },
    checkAuthority: async () => {
      const payload = await requestJson("/api/admin/info");
      if (!plain(payload) || !plain(payload.status) || (Array.isArray(payload.status.errors) && payload.status.errors.length) || !plain(payload.result)) {
        return { state: "UNVERIFIED" };
      }
      if (payload.result.username !== observedUsername) return { state: "DENIED" };
      const use = payload.result.privileges?.Secure?.use;
      if (use === false) return { state: "DENIED" };
      if (use !== true) return { state: "UNVERIFIED" };
      return { state: "SUPPORTED", evidence: "iris-admin-api:security-secure-use:true" };
    },
    dispatch: async plan => {
      let method;
      let body;
      if (plan.capability.id === "webapp.fixture.create") {
        method = "PUT";
        body = {
          Enabled: false,
          NameSpace: "%SYS",
          Path: "/usr/irissys/csp/opsdeck/",
          Recurse: 1,
          ServeFiles: 1,
          AutheEnabled: 32,
        };
      } else if (plan.capability.id === "webapp.fixture.delete") {
        method = "DELETE";
      } else if (plan.capability.id === "webapp.enable" || plan.capability.id === "webapp.disable") {
        method = "PUT";
        body = { Enabled: plan.parameters.enabled };
      } else {
        return { state: "UNAVAILABLE", reason: "operation-not-supported-by-webapp-provider" };
      }
      try {
        await requestJson(detailPath(plan), {
          method,
          ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
        });
        return { state: "ACCEPTED", status: `${method.toLowerCase()}-accepted` };
      } catch (error) {
        if (error?.status === 401 || error?.status === 403) return { state: "DENIED", reason: "iris-denied-webapp-operation" };
        if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 500) return { state: "FAILED", reason: `iris-rejected-webapp-operation-${error.status}` };
        if (Number.isInteger(error?.status) && error.status >= 500) return { state: "AMBIGUOUS" };
        throw error;
      }
    },
    readBack: async plan => {
      const current = await read(plan);
      if (plan.capability.id === "webapp.enable" || plan.capability.id === "webapp.disable") {
        if (current.exists !== true || typeof current.enabled !== "boolean") throw new Error("Web-app read-back is unavailable.");
        return { enabled: current.enabled };
      }
      return current;
    },
    verifyReadback: async (plan, readback) => verifyPolicyReadback(plan, readback),
  });
}
