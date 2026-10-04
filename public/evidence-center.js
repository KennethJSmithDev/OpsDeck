const MAX_ITEMS = 100;
const MAX_EXPORT_BYTES = 65_536;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9:._/-]{0,127}$/u;
const STATES = new Set(["VERIFIED", "PARTIAL", "FAILED", "UNVERIFIED", "BLOCKED", "UNAVAILABLE", "DENIED"]);
const KINDS = new Set(["read-observation", "operation-plan", "operation-receipt", "qualification"]);

const SOURCE_FIELDS = Object.freeze(["identity", "provider", "apiVersion", "version", "namespace", "scope", "observedAt"]);
const RESOURCE_FIELDS = Object.freeze(["domain", "kind", "provider", "key", "scope", "label", "volatile", "observedAt"]);
const EVIDENCE_FIELDS = Object.freeze({
  "read-observation": Object.freeze(["matched", "count", "fields", "providerState", "verification", "identityBasis", "continuationFields", "truncated", "bytesReturned"]),
  "operation-plan": Object.freeze(["operationId", "capability", "risk", "requiresConfirmation", "authorityState", "preStateEvidence", "expectedReadback", "execution", "executorIdentity", "canExecute", "synthetic"]),
  "operation-receipt": Object.freeze(["operationId", "verification", "verificationReason", "providerResponseStatus", "evidenceSources", "warnings"]),
  "qualification": Object.freeze(["candidate", "result", "tests", "boundary", "receiptHash", "artifactHash", "runtime"]),
});

function object(value) { return value && typeof value === "object" && !Array.isArray(value) && Object.prototype.toString.call(value) === "[object Object]"; }

function text(value, label, max = 256) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) throw new Error(`${label} is invalid.`);
  return value.trim();
}

function projectedValue(value, label) {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${label} is not finite.`);
    return value;
  }
  if (typeof value === "string") {
    return value.replace(/[\u0000-\u0008\u000a-\u001f\u007f]/gu, "").slice(0, 1024);
  }
  if (Array.isArray(value)) {
    return Object.freeze(value.slice(0, 32).map((item, index) => {
      if (item !== null && typeof item === "object") throw new Error(`${label}[${index}] must be a scalar.`);
      return projectedValue(item, `${label}[${index}]`);
    }));
  }
  throw new Error(`${label} must be a scalar or bounded scalar list.`);
}

function projectFields(value, allowedFields, label) {
  if (value == null) return null;
  if (!object(value)) throw new Error(`${label} must be an object.`);
  const result = {};
  for (const key of allowedFields) {
    if (Object.hasOwn(value, key)) result[key] = projectedValue(value[key], `${label}.${key}`);
  }
  return Object.freeze(result);
}

export function createEvidenceRef(input) {
  if (!object(input)) throw new Error("Evidence reference must be an object.");
  if (!SAFE_ID.test(input.id)) throw new Error("Evidence reference identity is invalid.");
  if (!STATES.has(input.state)) throw new Error("Evidence classification is invalid.");
  if (!KINDS.has(input.kind)) throw new Error("Evidence kind is invalid.");
  const kind = input.kind;
  const resource = projectFields(input.resource, RESOURCE_FIELDS, "resource");
  const source = projectFields(input.source, SOURCE_FIELDS, "source");
  const evidence = projectFields(input.evidence, EVIDENCE_FIELDS[kind], "evidence");
  return Object.freeze({
    id: input.id,
    kind,
    state: input.state,
    title: text(input.title, "evidence title"),
    observedAt: text(input.observedAt, "evidence timestamp", 64),
    source,
    resource,
    summary: text(input.summary, "evidence summary", 1024),
    evidence,
  });
}

export function createEvidenceCollection(records, providerState = "AVAILABLE") {
  if (!["AVAILABLE", "EMPTY", "UNAVAILABLE", "DENIED", "FAILED"].includes(providerState)) throw new Error("Evidence provider state is invalid.");
  if (!Array.isArray(records)) throw new Error("Evidence records must be an array.");
  if (records.length && providerState !== "AVAILABLE") throw new Error("Non-available evidence providers cannot publish records.");
  const bounded = records.slice(0, MAX_ITEMS).map(createEvidenceRef);
  const state = bounded.length ? "AVAILABLE" : providerState === "AVAILABLE" ? "EMPTY" : providerState;
  return Object.freeze({ state, truncated: records.length > MAX_ITEMS, records: Object.freeze(bounded) });
}

export function operationReceiptEvidence(receipt) {
  if (!object(receipt) || !["VERIFIED", "FAILED"].includes(receipt.verification) ||
      !object(receipt.target) || !object(receipt.timestamps)) {
    throw new Error("An authoritative operation receipt is required.");
  }
  return createEvidenceRef({
    id: receipt.id,
    kind: "operation-receipt",
    state: receipt.verification,
    title: receipt.intent,
    observedAt: receipt.timestamps.completedAt,
    source: { identity: receipt.provider },
    resource: receipt.target,
    summary: `Authoritative read-back ${receipt.verification === "VERIFIED" ? "matched" : "did not match"} the confirmed operation plan.`,
    evidence: receipt,
  });
}

export function filterEvidence(collection, query = "", state = "ALL") {
  if (!collection || !Array.isArray(collection.records)) throw new Error("Evidence collection is invalid.");
  if (state !== "ALL" && !STATES.has(state)) throw new Error("Evidence filter state is invalid.");
  const needle = String(query).trim().toLowerCase().slice(0, 128);
  return collection.records.filter(record => (state === "ALL" || record.state === state) && (!needle || `${record.title} ${record.summary} ${record.kind} ${record.id}`.toLowerCase().includes(needle)));
}

function exportProjection(records) {
  if (!Array.isArray(records)) throw new Error("Evidence export records must be an array.");
  return records.slice(0, MAX_ITEMS).map(createEvidenceRef);
}

export function exportEvidenceJSON(collection, records = collection.records) {
  if (!collection || !Array.isArray(collection.records)) throw new Error("Evidence collection is invalid.");
  const safeRecords = exportProjection(records);
  const output = JSON.stringify({ state: collection.state, truncated: collection.truncated || records.length > MAX_ITEMS, records: safeRecords }, null, 2);
  if (new TextEncoder().encode(output).byteLength > MAX_EXPORT_BYTES) throw new Error("Evidence export exceeds 64 KiB.");
  return output;
}

export function exportEvidenceMarkdown(collection, records = collection.records) {
  if (!collection || !Array.isArray(collection.records)) throw new Error("Evidence collection is invalid.");
  const safeRecords = exportProjection(records);
  const body = safeRecords.map(record => `## ${record.title}\n\n- State: ${record.state}\n- Kind: ${record.kind}\n- Observed: ${record.observedAt}\n- Source: ${record.source?.identity || "not recorded"}\n- Resource: ${record.resource?.key || "not recorded"}\n\n${record.summary}`).join("\n\n");
  const output = `# OpsDeck Evidence Export\n\nCollection: ${collection.state}${collection.truncated || records.length > MAX_ITEMS ? " (truncated)" : ""}\n\n${body || "No evidence records."}\n`;
  if (new TextEncoder().encode(output).byteLength > MAX_EXPORT_BYTES) throw new Error("Evidence export exceeds 64 KiB.");
  return output;
}

export const EVIDENCE_LIMITS = Object.freeze({ maxItems: MAX_ITEMS, maxExportBytes: MAX_EXPORT_BYTES });
