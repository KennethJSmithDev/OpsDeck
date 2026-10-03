import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mapFixedLogResult } from "../src/iris-provider.js";

const source = await readFile(new URL("../src/OpsDeck/Product/FixedLogReader.cls", import.meta.url), "utf8");

test("IRIS reader exposes exactly two fixed semantic identities and no path parameter", () => {
  assert.match(source, /Class OpsDeck\.Product\.FixedLogReader Extends/u);
  assert.match(source, /ClassMethod Read\(sourceId As %String, ByRef result/u);
  assert.match(source, /sourceId'="messagesLog"/u);
  assert.match(source, /sourceId'="systemMonitorLog"/u);
  assert.match(source, /##class\(Config\.config\)\.GetConsoleFileName/u);
  assert.match(source, /##class\(%File\)\.ManagerDirectory\(\)_"SystemMonitor\.log"/u);
  assert.match(source, /##class\(%Stream\.FileBinary\)\.%New\(\)/u);
  assert.match(source, /file\.LinkToFile\(path\)/u);
  assert.match(source, /file\.FileBinarySize\(\)/u);
  assert.doesNotMatch(source, /##class\(%File\)\.%New\(path\)|file\.Open\("RB"\)|file\.Close\(\)/u);
  assert.match(source, /file\.MoveTo\(windowStart\)/u);
  assert.match(source, /if windowStart>1,'file\.MoveTo\(windowStart\)/u, "a fresh linked stream is already at byte 1 and must not be rewound before its first read");
  assert.match(source, /set file=""/u);
  assert.match(source, /set content=file\.Read\(\.readLimit,\.readStatus\)/u);
  assert.match(source, /if \$isobject\(file\) set file=""/u);
  assert.match(source, /do lines\.%Push\(line\)/u);
  assert.doesNotMatch(source, /result\.lines\.%Push/u);
  assert.match(source, /result\.status="read-failure", result\.reason="source-read-failed"/u);
  assert.doesNotMatch(source, /exception\.Name|exception\.Location|result\.reason=.*path/u);
  assert.match(source, /\$SYSTEM\.Security\.Check\("%Admin_Operate","USE"\)/u);
  assert.match(source, /result\.status="denied", result\.reason="admin-operate-required"/u);
  assert.doesNotMatch(source, /quit \$\$OK/u);
  assert.match(source, /quit \$\$\$OK/u);
  assert.doesNotMatch(source, /directory listing|glob|Execute\(|Shell\(|userPath|filePath As %String/u);
});

test("reader source observes a bounded tail window, keeps newest lines, and omits raw paths", () => {
  assert.match(source, /fileSize=file\.FileBinarySize\(\)/u);
  assert.match(source, /windowStart=\$select\(windowed:fileSize-65536,1:1\)/u);
  assert.match(source, /file\.MoveTo\(windowStart\)/u);
  assert.match(source, /set readLimit=65536/u);
  assert.doesNotMatch(source, /65537/u, "the reader must not request more than the 64 KiB observation bound");
  assert.match(source, /firstBreak=\$find\(content,\$char\(10\)\)/u);
  assert.match(source, /pieceCount>250/u);
  assert.match(source, /firstPiece=pieceCount-249/u);
  assert.match(source, /projectionUnits\+lineUnits>6500/u, "the JSON projection reserves space for bounded Embedded Python findings");
  assert.match(source, /if projectionUnits\+lineUnits>6500 set truncated=1 quit/u, "the budget drops only older complete rows when full");
  assert.doesNotMatch(source, /\$zlength\(line\)|result\.bytesReturned/u, "IRIS does not compute per-line byte counts with the failing runtime primitive");
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
  const shaped = mapFixedLogResult("messagesLog", { status: "available", lines: ["a\r\nb\t"] });
  assert.equal(shaped.lines[0], "a��b\t");
});
