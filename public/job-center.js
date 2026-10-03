const JOB_STATES = Object.freeze([
  "ACCEPTED", "QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELED",
  "PAUSED", "DENIED", "UNAVAILABLE", "AMBIGUOUS",
]);
const MAX_JOBS = 32;
const MAX_TEXT = 256;

function text(value, label, max = MAX_TEXT) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value.trim();
}

function optionalText(value, label, max = MAX_TEXT) {
  return value == null ? null : text(value, label, max);
}

export function createJob(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Job is invalid.");
  const status = text(input.status, "Job status", 32);
  if (!JOB_STATES.includes(status)) throw new Error("Job status is not supported.");
  const acceptedAt = text(input.acceptedAt, "Job accepted time", 64);
  if (!Number.isFinite(Date.parse(acceptedAt))) throw new Error("Job accepted time is invalid.");
  const resultIdentity = input.resultIdentity == null ? null : Object.freeze({
    provider: text(input.resultIdentity.provider, "Result provider", 128),
    id: text(input.resultIdentity.id, "Result identity", 512),
  });
  const terminal = ["COMPLETED", "FAILED", "CANCELED"].includes(status);
  return Object.freeze({
    identity: text(input.identity, "Job identity"),
    provider: text(input.provider, "Job provider", 128),
    operation: text(input.operation, "Job operation", 128),
    acceptedAt,
    status,
    resultIdentity,
    progress: optionalText(input.progress, "Job progress", 256),
    terminalDisposition: terminal ? status : null,
    evidence: optionalText(input.evidence, "Job evidence", 256),
    updatedAt: optionalText(input.updatedAt, "Job update time", 64),
  });
}

export function upsertJob(jobs, job) {
  if (!Array.isArray(jobs)) throw new Error("Job collection is invalid.");
  const validated = createJob(job);
  const next = jobs.filter(item => item?.identity !== validated.identity);
  next.push(validated);
  return Object.freeze(next.slice(-MAX_JOBS));
}

export function mapAuditJob(query, previous = null) {
  if (!query || typeof query !== "object") throw new Error("Audit job observation is invalid.");
  const mapping = Object.freeze({
    accepted: "ACCEPTED", queued: "QUEUED", running: "RUNNING", finished: "COMPLETED",
    failed: "FAILED", canceled: "CANCELED", denied: "DENIED", unavailable: "UNAVAILABLE",
    ambiguous: "AMBIGUOUS",
  });
  const status = query.task?.state === "Paused" ? "PAUSED" : mapping[query.state];
  if (!status) throw new Error("Audit state has no supported Job mapping.");
  const identity = previous?.identity || query.jobIdentity;
  if (!identity) throw new Error("Audit job has no session identity.");
  const resultId = query.resultIdentity?.url || previous?.resultIdentity?.id || null;
  return createJob({
    identity,
    provider: "iris-admin-api",
    operation: "POST /api/admin/v2/security/audit/records",
    acceptedAt: previous?.acceptedAt || query.observedAt,
    status,
    resultIdentity: resultId ? { provider: "iris-admin-api", id: resultId } : null,
    progress: query.message || null,
    evidence: "session:audit-query",
    updatedAt: query.observedAt,
  });
}

export const JOB_CENTER_LIMITS = Object.freeze({ maxJobs: MAX_JOBS, states: JOB_STATES });
