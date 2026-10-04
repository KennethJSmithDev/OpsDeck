import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const vector = await readFile(new URL("../src/OpsDeck/Product/DerivedVector.cls", import.meta.url), "utf8");
const owner = await readFile(new URL("../src/OpsDeck/Product/DerivedStorage.cls", import.meta.url), "utf8");
const python = await readFile(new URL("../src/OpsDeck/Product/LogInterpreter.cls", import.meta.url), "utf8");

test("owned Vector schema uses fixed IRIS SQL/HNSW and refuses adoption", () => {
  assert.match(vector, /TableExists\("OpsDeckDerived\.VectorRecord"\)[\s\S]*?schema-collision/u);
  assert.match(vector, /VECTOR\(DOUBLE,16\)/u);
  assert.match(vector, /AS HNSW\(Distance='Cosine'\)/u);
  assert.match(owner, /InstallSchema\(\)/u);
  assert.match(owner, /storage\.DataLocation/u);
  assert.match(owner, /vectorPrefix/u);
  assert.match(vector, /DROP TABLE OpsDeckDerived\.VectorRecord/u);
});

test("native Vector query is bounded and returns references without vectors", () => {
  assert.match(vector, /SELECT TOP 5 RecordID,SourceIdentity,SourceTimestamp,NormalizedText,Fingerprint,EvidenceRef,VECTOR_COSINE/u);
  assert.match(vector, /TO_VECTOR\(\?,double,16\)/u);
  assert.match(vector, /length\(pVector,","\)'=16/u);
  assert.doesNotMatch(vector, /row\.vector|row\.embedding|%request|XECUTE|Shell\(/u);
});

test("concept normalization remains small, local and transparent", () => {
  assert.match(python, /opsdeck-concepts-v1/u);
  assert.match(python, /text\[:2048\]/u);
  assert.match(python, /not a neural embedding model/u);
  assert.doesNotMatch(python, /import (?:requests|httpx|transformers|torch|openai)/u);
});
