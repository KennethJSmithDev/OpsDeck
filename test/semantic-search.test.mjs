import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mapDerivedSearch, createContextBundle, deterministicInterpretationProvider, interpretContext, reconstructObservationIntent } from "../public/semantic-search.js";

const row = () => ({ id: `${"a".repeat(32)}:${"b".repeat(64)}`, sourceIdentity: "messagesLog", sourceTimestamp: null, text: "timeout database", fingerprint: "c".repeat(64), evidenceRef: "fixed-log:messagesLog:observed-fixture:line-1", similarity: 0.8 });
const payload = () => ({ provider: "opsdeck-derived-search-v1", model: "opsdeck-concepts-v1", username: "fixture", namespace: "%SYS", derivedNamespace: "OPSDECK", state: "SUPPORTED", results: [row()] });
const bundle = () => createContextBundle({ name: "OpsDeck", internalVersion: "0.8.0", deploymentTarget: "qualification" }, mapDerivedSearch(payload(), "fixture"));

test("derived mapping preserves exact source reference and unobserved timestamp without browser vectors", () => {
  const mapped = mapDerivedSearch(payload(), "fixture");
  assert.equal(mapped.items[0].sourceTimestamp, null);
  assert.equal(mapped.items[0].evidenceRef, row().evidenceRef);
  assert.ok(Object.isFrozen(mapped.items[0]));
  assert.equal(Object.hasOwn(mapped.items[0], "vector"), false);
});

test("derived mapping rejects identity, bounds and rich or malformed result injection", () => {
  for (const mutate of [p => p.username = "other", p => p.namespace = "USER", p => p.results = Array(6).fill(row()), p => p.results[0].vector = [1], p => p.results[0].embedding = [1], p => p.results[0].sourceIdentity = "/tmp/log", p => p.results[0].text = "arbitrary raw log", p => p.results[0].similarity = 2, p => p.results[0].evidenceRef = "unrelated-source", p => p.state = "DENIED"]) {
    const p = payload(); mutate(p); assert.throws(() => mapDerivedSearch(p, "fixture"));
  }
});

test("provider states stay distinct and supported empty results make no health claim", () => {
  for (const state of ["SUPPORTED", "DENIED", "UNAVAILABLE", "UNQUALIFIED", "FAILED"]) {
    assert.equal(mapDerivedSearch({ ...payload(), state, results: [] }, "fixture").state, state);
  }
});

test("interpretation context is compact and consumes canonical identity", () => {
  const context = bundle();
  assert.equal(context.product.internalVersion, "0.8.0");
  assert.equal(context.similarityIsProof, false);
  assert.equal(context.records.length, 1);
  assert.equal(Object.hasOwn(context.records[0], "vector"), false);
  assert.equal(Object.hasOwn(context.records[0], "fingerprint"), false);
});

test("deterministic interpretation proposes only an observed read and cannot authorize mutation", async () => {
  const result = await interpretContext(deterministicInterpretationProvider, bundle());
  assert.deepEqual(result.intent, { kind: "observe-source", sourceIdentity: "messagesLog" });
  assert.equal(result.liveExternalInference, "UNVERIFIED");
  for (const proposal of [{ kind: "execute", sourceIdentity: "messagesLog" }, { kind: "observe-source", sourceIdentity: "systemMonitorLog" }, { kind: "observe-source", sourceIdentity: "messagesLog", sql: "SELECT 1" }]) assert.throws(() => reconstructObservationIntent(proposal, bundle()));
  await assert.rejects(interpretContext({ id: "untrusted", async interpret() { return { explanation: "proposal", proposedIntent: { kind: "install", sourceIdentity: "messagesLog" } }; } }, bundle()));
});

test("empty interpretation does not fabricate source health", async () => {
  const context = createContextBundle({ name: "OpsDeck", internalVersion: "0.8.0" }, mapDerivedSearch({ ...payload(), results: [] }, "fixture"));
  const result = await interpretContext(deterministicInterpretationProvider, context);
  assert.equal(result.intent, null);
  assert.match(result.explanation, /does not establish/u);
});

test("native derived provider preserves caller scope and bounds fixed-source indexing", async () => {
  const source = await readFile(new URL("../src/OpsDeck/Product/DerivedSearch.cls", import.meta.url), "utf8");
  for (const contract of ["$username", "Content.Size>1024", "$length(query)>256", "records.%Size()>500", "source'=\"messagesLog\"", "source'=\"systemMonitorLog\"", "RecordID %STARTSWITH ?", "statement.%Execute(scope,source)"]) assert.ok(source.includes(contract), contract);
  assert.doesNotMatch(source, /Security\.(?:Users|Roles).*\.(?:Create|Modify)|\bXECUTE\b|Shell\(/iu);
});
