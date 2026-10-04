const sources = new Set(["messagesLog", "systemMonitorLog"]);
const states = new Set(["SUPPORTED", "DENIED", "UNAVAILABLE", "UNQUALIFIED", "FAILED"]);
const concepts = new Set("timeout denied error warning retry network database namespace package task application authentication memory cpu restart security".split(" "));
const text = (value, max) => typeof value === "string" && value.length > 0 && value.length <= max;

export function mapDerivedSearch(payload, username) {
  if (!payload || payload.provider !== "opsdeck-derived-search-v1" || payload.model !== "opsdeck-concepts-v1" || payload.username !== username || payload.namespace !== "%SYS" || payload.derivedNamespace !== "OPSDECK" || !states.has(payload.state) || !Array.isArray(payload.results) || payload.results.length > 5) throw new Error("Derived search identity or bounds are invalid.");
  const items = payload.results.map(row => {
    const similarity = Number(row.similarity);
    if (!/^[a-f0-9]{32}:[a-f0-9]{64}$/u.test(row.id || "") || !sources.has(row.sourceIdentity) || !text(row.text, 512) || row.text.split(" ").some(word => !concepts.has(word)) || !/^[a-f0-9]{64}$/u.test(row.fingerprint || "") || !text(row.evidenceRef, 256) || !row.evidenceRef.startsWith(`fixed-log:${row.sourceIdentity}:observed-`) || (row.sourceTimestamp !== null && !text(row.sourceTimestamp, 40)) || !Number.isFinite(similarity) || similarity < -1 || similarity > 1 || Object.hasOwn(row, "vector") || Object.hasOwn(row, "embedding")) throw new Error("Derived search result is invalid.");
    return Object.freeze({ id: row.id, sourceIdentity: row.sourceIdentity, sourceTimestamp: row.sourceTimestamp, text: row.text, fingerprint: row.fingerprint, evidenceRef: row.evidenceRef, similarity });
  });
  if (payload.state !== "SUPPORTED" && items.length) throw new Error("Unavailable search cannot contain results.");
  return Object.freeze({ state: payload.state, provider: payload.provider, model: payload.model, items, reason: typeof payload.reason === "string" ? payload.reason.slice(0, 128) : "" });
}

export function createContextBundle(productIdentity, search) {
  if (!productIdentity || !text(productIdentity.name, 128) || !text(productIdentity.internalVersion, 64) || !search || !states.has(search.state) || search.items.length > 5) throw new Error("Interpretation context is invalid.");
  return Object.freeze({ schema: "opsdeck-context-v1", product: { name: productIdentity.name, internalVersion: productIdentity.internalVersion, deploymentTarget: productIdentity.deploymentTarget }, state: search.state, model: search.model, similarityIsProof: false, records: search.items.map(({ id, sourceIdentity, text: normalizedText, evidenceRef, similarity }) => ({ id, sourceIdentity, normalizedText, evidenceRef, similarity })) });
}

export const deterministicInterpretationProvider = Object.freeze({
  id: "deterministic-local-v1",
  async interpret(bundle) {
    const first = bundle.records[0];
    return { explanation: first ? `Concept overlap points toward ${first.normalizedText}. Inspect the authorized source before drawing a conclusion. Similarity is not proof of an incident.` : "No indexed result is available. This does not establish that the source is healthy or empty.", proposedIntent: first ? { kind: "observe-source", sourceIdentity: first.sourceIdentity } : null };
  },
});

export function reconstructObservationIntent(candidate, bundle) {
  if (candidate === null) return null;
  if (!candidate || Object.keys(candidate).length !== 2 || candidate.kind !== "observe-source" || !sources.has(candidate.sourceIdentity) || !bundle.records.some(record => record.sourceIdentity === candidate.sourceIdentity)) throw new Error("Untrusted intent is outside the observed source boundary.");
  return Object.freeze({ kind: "observe-source", sourceIdentity: candidate.sourceIdentity });
}

export async function interpretContext(provider, bundle) {
  if (!provider || typeof provider.interpret !== "function" || !text(provider.id, 64)) throw new Error("Interpretation provider is invalid.");
  const response = await provider.interpret(bundle);
  if (!response || !text(response.explanation, 1024)) throw new Error("Interpretation response is invalid.");
  return Object.freeze({ provider: provider.id, explanation: response.explanation, intent: reconstructObservationIntent(response.proposedIntent ?? null, bundle), liveExternalInference: "UNVERIFIED" });
}
