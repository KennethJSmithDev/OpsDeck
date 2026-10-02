const MAX_ITEMS = 100;
const MAX_EXPORT_BYTES = 65_536;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9:._/-]{0,127}$/u;
const SECRET_FIELD = /(?:password|secret|token|authorization|private.?key|credential|cookie|rawLog|payload)/iu;
const STATES = new Set(["VERIFIED", "PARTIAL", "FAILED", "UNVERIFIED", "BLOCKED", "UNAVAILABLE", "DENIED"]);

function object(value) { return value && typeof value === "object" && !Array.isArray(value) && Object.prototype.toString.call(value) === "[object Object]"; }
function text(value, label, max = 256) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) throw new Error(`${label} is invalid.`);
  return value.trim();
}
function redact(value, depth = 0) {
  if (depth > 5) return "[omitted: depth limit]";
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return typeof value === "string" ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, "") .slice(0, 1024) : value;
  if (Array.isArray(value)) return value.slice(0, 32).map(item => redact(item, depth + 1));
  if (!object(value)) return "[omitted: unsupported value]";
  const result = {};
  for (const [key, item] of Object.entries(value).slice(0, 32)) {
    if (SECRET_FIELD.test(key)) continue;
    result[text(key, "field", 64)] = redact(item, depth + 1);
  }
  return result;
}

export function createEvidenceRef(input) {
  if (!object(input)) throw new Error("Evidence reference must be an object.");
  if (!SAFE_ID.test(input.id)) throw new Error("Evidence reference identity is invalid.");
  if (!STATES.has(input.state)) throw new Error("Evidence classification is invalid.");
  const kind = ["read-observation", "operation-plan", "operation-receipt", "qualification"].includes(input.kind) ? input.kind : "read-observation";
  const resource = input.resource == null ? null : redact(input.resource);
  const source = input.source == null ? null : redact(input.source);
  return Object.freeze({ id: input.id, kind, state: input.state, title: text(input.title, "evidence title"), observedAt: text(input.observedAt, "evidence timestamp", 64), source, resource, summary: text(input.summary, "evidence summary", 1024), evidence: input.evidence == null ? null : redact(input.evidence) });
}

export function createEvidenceCollection(records, providerState = "AVAILABLE") {
  if (!["AVAILABLE", "EMPTY", "UNAVAILABLE", "DENIED", "FAILED"].includes(providerState)) throw new Error("Evidence provider state is invalid.");
  if (!Array.isArray(records)) throw new Error("Evidence records must be an array.");
  const bounded = records.slice(0, MAX_ITEMS).map(createEvidenceRef);
  return Object.freeze({ state: bounded.length ? "AVAILABLE" : providerState, truncated: records.length > MAX_ITEMS, records: Object.freeze(bounded) });
}

export function filterEvidence(collection, query = "", state = "ALL") {
  if (!collection || !Array.isArray(collection.records)) throw new Error("Evidence collection is invalid.");
  const needle = String(query).trim().toLowerCase().slice(0, 128);
  return collection.records.filter(record => (state === "ALL" || record.state === state) && (!needle || `${record.title} ${record.summary} ${record.kind} ${record.id}`.toLowerCase().includes(needle)));
}

export function exportEvidenceJSON(collection, records = collection.records) {
  const output = JSON.stringify({ state: collection.state, truncated: collection.truncated, records }, null, 2);
  if (new TextEncoder().encode(output).byteLength > MAX_EXPORT_BYTES) throw new Error("Evidence export exceeds 64 KiB.");
  return output;
}

export function exportEvidenceMarkdown(collection, records = collection.records) {
  const body = records.map(record => `## ${record.title}\n\n- State: ${record.state}\n- Kind: ${record.kind}\n- Observed: ${record.observedAt}\n- Source: ${record.source?.identity || "not recorded"}\n- Resource: ${record.resource?.key || "not recorded"}\n\n${record.summary}`).join("\n\n");
  const output = `# OpsDeck Evidence Export\n\nCollection: ${collection.state}${collection.truncated ? " (truncated)" : ""}\n\n${body || "No evidence records."}\n`;
  if (new TextEncoder().encode(output).byteLength > MAX_EXPORT_BYTES) throw new Error("Evidence export exceeds 64 KiB.");
  return output;
}

export const EVIDENCE_LIMITS = Object.freeze({ maxItems: MAX_ITEMS, maxExportBytes: MAX_EXPORT_BYTES });
