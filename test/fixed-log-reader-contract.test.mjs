import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mapFixedLogResult } from "../src/iris-provider.js";

const source = await readFile(new URL("../src/iris/OpsDeck.FixedLogReader.cls", import.meta.url), "utf8");

test("IRIS reader exposes exactly two fixed semantic identities and no path parameter", () => {
  assert.match(source, /ClassMethod Read\(sourceId As %String, ByRef result/u);
  assert.match(source, /sourceId'="messagesLog"/u);
  assert.match(source, /sourceId'="systemMonitorLog"/u);
  assert.match(source, /##class\(Config\.config\)\.GetConsoleFileName/u);
  assert.match(source, /##class\(%File\)\.ManagerDirectory\(\)_"SystemMonitor\.log"/u);
  assert.doesNotMatch(source, /directory listing|glob|Execute\(|Shell\(|userPath|filePath As %String/u);
});

test("reader source encodes line and byte bounds and omits raw paths from results", () => {
  assert.match(source, /Read\(65537/u);
  assert.match(source, /65536/u);
  assert.match(source, /rowCount=250/u);
  assert.match(source, /result\.bytesReturned/u);
  assert.doesNotMatch(source, /result\.path|result\.canonicalName|result\.fileName/u);
});

test("provider boundary distinguishes valid empty, unavailable, denied, failure, and truncation", () => {
  for (const status of ["empty", "unavailable", "denied", "read-failure", "truncated"]) {
    const mapped = mapFixedLogResult("messagesLog", { status, lines: [], truncated: status === "truncated" });
    assert.equal(mapped.status, status);
    assert.equal(mapped.source, "messages.log");
    assert.deepEqual(mapped.lines, []);
  }
  assert.throws(() => mapFixedLogResult("..\\messages.log", { status: "empty", lines: [] }), /not enabled/u);
});

test("per-file UTF-8 byte cap and line cap are independently enforced", () => {
  const byteLimited = mapFixedLogResult("messagesLog", { status: "available", lines: Array.from({ length: 30 }, () => "🙂".repeat(2048)) });
  assert.equal(byteLimited.status, "truncated");
  assert.ok(byteLimited.bytesReturned <= 65_536);
  const lineLimited = mapFixedLogResult("systemMonitorLog", { status: "available", lines: Array.from({ length: 251 }, (_, i) => `line ${i}`) });
  assert.equal(lineLimited.status, "truncated");
  assert.equal(lineLimited.lines.length, 250);
});
