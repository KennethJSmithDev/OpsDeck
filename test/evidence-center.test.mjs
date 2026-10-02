import test from "node:test";
import assert from "node:assert/strict";
import { createEvidenceCollection, createEvidenceRef, EVIDENCE_LIMITS, exportEvidenceJSON, exportEvidenceMarkdown, filterEvidence } from "../public/evidence-center.js";

const record = (overrides = {}) => ({ id: "read:applications:1", kind: "read-observation", state: "VERIFIED", title: "Applications independent read-back", observedAt: "2026-10-02T12:00:00Z", source: { identity: "iris-admin-api", authorization: "Basic private" }, resource: { key: "/opsdeck", password: "never export" }, summary: "Selected resource matched the independent read.", evidence: { fields: ["Name", "Enabled"], accessToken: "never export" }, ...overrides });

test("bounded evidence references preserve source/resource identity with redacted projections", () => {
  const ref = createEvidenceRef(record());
  assert.equal(ref.source.identity, "iris-admin-api");
  assert.equal(ref.resource.key, "/opsdeck");
  assert.equal("authorization" in ref.source, false);
  assert.equal("password" in ref.resource, false);
  assert.equal("accessToken" in ref.evidence, false);
  assert.throws(() => createEvidenceRef(record({ id: "../private" })), /identity/u);
});

test("collection distinguishes empty, unavailable, denied and failed with bounded cardinality", () => {
  assert.equal(createEvidenceCollection([], "EMPTY").state, "EMPTY");
  assert.equal(createEvidenceCollection([], "UNAVAILABLE").state, "UNAVAILABLE");
  assert.equal(createEvidenceCollection([], "DENIED").state, "DENIED");
  assert.equal(createEvidenceCollection([], "FAILED").state, "FAILED");
  const many = Array.from({ length: EVIDENCE_LIMITS.maxItems + 1 }, (_, index) => record({ id: `e:${index}` }));
  const bounded = createEvidenceCollection(many);
  assert.equal(bounded.records.length, EVIDENCE_LIMITS.maxItems);
  assert.equal(bounded.truncated, true);
});

test("filtering supports text and classification without changing provider evidence", () => {
  const collection = createEvidenceCollection([record(), record({ id: "plan:2", kind: "operation-plan", state: "UNVERIFIED", title: "Install review", summary: "Executor unavailable" })]);
  assert.equal(filterEvidence(collection, "independent").length, 1);
  assert.equal(filterEvidence(collection, "", "UNVERIFIED")[0].id, "plan:2");
});

test("JSON and Markdown exports are compact, source-linked, and contain no secret fields", () => {
  const collection = createEvidenceCollection([record()]);
  const json = exportEvidenceJSON(collection);
  const markdown = exportEvidenceMarkdown(collection);
  assert.match(json, /iris-admin-api/u);
  assert.match(markdown, /\/opsdeck/u);
  assert.doesNotMatch(`${json}${markdown}`, /Basic private|never export/u);
  assert.ok(new TextEncoder().encode(json).byteLength <= EVIDENCE_LIMITS.maxExportBytes);
});

test("oversized exports fail closed", () => {
  const collection = createEvidenceCollection([record({ summary: "x".repeat(1024) })]);
  const many = Object.freeze({ ...collection, records: Object.freeze(Array.from({ length: 90 }, (_, index) => createEvidenceRef(record({ id: `large:${index}`, summary: "z".repeat(1024) })))) });
  assert.throws(() => exportEvidenceJSON(many), /64 KiB/u);
});
