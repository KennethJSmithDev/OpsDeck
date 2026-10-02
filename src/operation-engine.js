const SAFE_KEY = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/u;
const SECRET_KEY = /(?:password|secret|token|authorization|private.?key|credential|cookie)/iu;
const TERMINAL = new Set(["CANCELLED", "DENIED", "UNAVAILABLE", "STALE", "AMBIGUOUS", "VERIFIED", "MISMATCH", "UNVERIFIED"]);

function plain(value) { return value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function boundedText(value, label, max = 256) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) throw new Error(`${label} is invalid.`);
  return value.trim();
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
  if (!["READ", "LOW", "MEDIUM", "HIGH", "DESTRUCTIVE"].includes(capability.risk)) throw new Error("Risk class is invalid.");
  const preState = safeProjection(input.preState);
  const id = boundedText(input.id, "plan.id", 128);
  const expiresAt = Number(input.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) throw new Error("Plan expiry must be in the future.");
  const plan = {
    id,
    intent: boundedText(input.intent, "intent"),
    target: { domain: target.domain, kind: target.kind, provider: target.provider, key: target.key, scope, label: target.label, volatile: Boolean(target.volatile), observedAt: boundedText(target.observedAt, "target.observedAt") },
    capability: { id: capability.id, semanticAction: capability.semanticAction, providerOperation: capability.providerOperation, state: capability.state, risk: capability.risk, requiredPrivileges: Array.isArray(capability.requiredPrivileges) ? capability.requiredPrivileges.map(item => boundedText(item, "required privilege", 128)) : [], verification: boundedText(input.expectedReadback, "expected read-back") },
    parameters: safeProjection(input.parameters || {}),
    preconditions: Array.isArray(input.preconditions) ? input.preconditions.slice(0, 16).map(item => ({ claim: boundedText(item.claim, "precondition claim"), observed: item.observed === true ? true : item.observed === false ? false : "unknown", evidence: item.evidence ? boundedText(item.evidence, "precondition evidence") : undefined })) : [],
    preStateFingerprint: fingerprintPreState(preState),
    preStateEvidence: input.preStateEvidence ? boundedText(input.preStateEvidence, "pre-state evidence") : undefined,
    expectedReadback: boundedText(input.expectedReadback, "expected read-back"),
    risk: capability.risk,
    requiresConfirmation: capability.risk !== "READ",
    irreversible: Boolean(input.irreversible),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    state: "REVIEW_REQUIRED",
  };
  return Object.freeze(plan);
}

export function cancelOperationPlan(plan) {
  if (!plan || plan.state !== "REVIEW_REQUIRED") return { state: "UNRESOLVED", reason: "plan-not-cancellable" };
  return { state: "CANCELLED", planId: plan.id, cancelledAt: new Date().toISOString() };
}

export async function executeFixturePlan(plan, options = {}) {
  if (!plan || plan.state !== "REVIEW_REQUIRED") return { state: "UNRESOLVED", reason: "plan-not-executable" };
  if (options.providerIdentity !== "opsdeck-fixture-v1") return { state: "UNAVAILABLE", reason: "qualified-executor-unavailable" };
  if (options.now != null && Date.parse(plan.expiresAt) <= options.now) return { state: "STALE", reason: "plan-expired" };
  if (options.currentPreState == null || fingerprintPreState(options.currentPreState) !== plan.preStateFingerprint) return { state: "STALE", reason: "pre-state-changed" };
  if (plan.capability.state !== "SUPPORTED") return { state: plan.capability.state === "UNRESOLVED" || plan.capability.state === "UNOBSERVABLE" ? "UNAVAILABLE" : "DENIED", reason: "capability-not-supported" };
  if (plan.preconditions.some(item => item.observed !== true)) return { state: "DENIED", reason: "precondition-not-established" };
  if (plan.requiresConfirmation && options.confirmed !== true) return { state: "DENIED", reason: "explicit-confirmation-required" };
  const outcome = options.outcome || "success";
  if (outcome === "ambiguous") return { state: "AMBIGUOUS", reason: "provider-result-ambiguous", retryAllowed: false };
  if (["denied", "unavailable", "cancelled"].includes(outcome)) return { state: outcome.toUpperCase(), reason: `fixture-${outcome}` };
  if (outcome !== "success") return { state: "UNRESOLVED", reason: "unsupported-fixture-outcome" };
  const readback = options.readback;
  if (readback == null) return { state: "UNVERIFIED", reason: "authoritative-read-back-required" };
  const matches = typeof options.verify === "function" ? options.verify(readback, plan) === true : false;
  const receipt = Object.freeze({
    id: `fixture-receipt:${plan.id}`,
    operationId: plan.id,
    target: plan.target,
    intent: plan.intent,
    provider: "opsdeck-fixture-v1",
    preStateFingerprint: plan.preStateFingerprint,
    requestSummary: plan.parameters,
    postStateFingerprint: fingerprintPreState(safeProjection(readback)),
    verification: matches ? "VERIFIED" : "MISMATCH",
    evidenceSources: ["fixture-provider", "fixture-readback"],
    timestamps: { completedAt: new Date(options.now ?? Date.now()).toISOString() },
    warnings: ["Fixture evidence does not qualify a live IRIS operation."],
  });
  return { state: matches ? "VERIFIED" : "MISMATCH", receipt };
}

export function isTerminalOperationState(state) { return TERMINAL.has(state); }
