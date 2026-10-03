import test from "node:test";
import assert from "node:assert/strict";
import { createJob, mapAuditJob, upsertJob, JOB_CENTER_LIMITS } from "../public/job-center.js";

const at = "2026-10-03T12:00:00.000Z";
const base = { identity: "session:job:1", provider: "iris-admin-api", operation: "POST /api/admin/v2/security/audit/records", acceptedAt: at, status: "ACCEPTED", progress: "Accepted", evidence: "session:audit-query", updatedAt: at };

test("shared Job contract keeps accepted identity and explicit terminal disposition", () => {
  const queued = createJob(base);
  assert.equal(queued.terminalDisposition, null);
  const complete = createJob({ ...base, status: "COMPLETED" });
  assert.equal(complete.terminalDisposition, "COMPLETED");
  assert.throws(() => createJob({ ...base, status: "SUCCESS" }), /not supported/u);
  assert.throws(() => createJob({ ...base, acceptedAt: "not-a-time" }), /time is invalid/u);
});

test("audit provider states map to shared jobs without inventing a task result", () => {
  const accepted = mapAuditJob({ state: "accepted", observedAt: at, jobIdentity: base.identity, message: "accepted" });
  assert.equal(accepted.status, "ACCEPTED");
  assert.equal(accepted.resultIdentity, null);
  const handle = Object.freeze({ id: "opaque-task", url: "/api/admin/v1/async-result?id=opaque-task", pathname: "/api/admin/v1/async-result" });
  const running = mapAuditJob({ state: "running", observedAt: at, jobIdentity: base.identity, resultIdentity: handle, message: "running" }, accepted);
  assert.equal(running.identity, accepted.identity);
  assert.equal(running.resultIdentity.id, handle.url);
  assert.equal(running.terminalDisposition, null);
  assert.equal(mapAuditJob({ state: "finished", observedAt: at, jobIdentity: base.identity, resultIdentity: handle }, running).terminalDisposition, "COMPLETED");
  assert.equal(mapAuditJob({ state: "failed", observedAt: at, jobIdentity: base.identity }, running).terminalDisposition, "FAILED");
  assert.equal(mapAuditJob({ state: "unavailable", observedAt: at, task: { state: "Paused" }, jobIdentity: base.identity }, running).status, "PAUSED");
  assert.equal(mapAuditJob({ state: "ambiguous", observedAt: at, jobIdentity: base.identity }).status, "AMBIGUOUS");
});

test("Job collection is bounded and replaces current observation by identity", () => {
  let jobs = [];
  for (let i = 0; i < JOB_CENTER_LIMITS.maxJobs + 2; i += 1) jobs = upsertJob(jobs, { ...base, identity: `session:job:${i}` });
  assert.equal(jobs.length, JOB_CENTER_LIMITS.maxJobs);
  const revised = upsertJob(jobs, { ...base, identity: `session:job:${JOB_CENTER_LIMITS.maxJobs + 1}`, status: "RUNNING" });
  assert.equal(revised.length, JOB_CENTER_LIMITS.maxJobs);
  assert.equal(revised.at(-1).status, "RUNNING");
});
