import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mapLogAnalysisResult, mapReadOnlySource, READ_ONLY_SOURCES } from "../src/iris-provider.js";

const root = new URL("../", import.meta.url);
const [interpreter, rest, reader, app, moduleXml] = await Promise.all([
  readFile(new URL("src/OpsDeck/Product/LogInterpreter.cls", root), "utf8"),
  readFile(new URL("src/OpsDeck/Product/FixedLogREST.cls", root), "utf8"),
  readFile(new URL("src/OpsDeck/Product/FixedLogReader.cls", root), "utf8"),
  readFile(new URL("public/app.js", root), "utf8"),
  readFile(new URL("module.xml", root), "utf8"),
]);

const finding = (overrides = {}) => ({
  id: "log:messagesLog:line-1:explicit-error-marker",
  lineNumber: 1,
  ruleId: "explicit-error-marker",
  marker: "ERROR",
  ...overrides,
});

const analysis = (overrides = {}) => ({
  provider: "opsdeck-embedded-python-log-analysis-v1",
  sourceId: "messagesLog",
  source: "messages.log",
  status: "available",
  truncated: false,
  lineCount: 1,
  findingCount: 1,
  findingsTruncated: false,
  findings: [finding()],
  ...overrides,
});

test("fixed-log analysis maps bounded findings with source and observation identity", () => {
  const mapped = mapLogAnalysisResult("messagesLog", analysis(), "2026-10-03T12:00:00Z");
  assert.equal(mapped.provider, "opsdeck-embedded-python-log-analysis-v1");
  assert.equal(mapped.source, "messages.log");
  assert.equal(mapped.observedAt, "2026-10-03T12:00:00Z");
  assert.equal(mapped.findings[0].lineNumber, 1);
  assert.equal(mapped.findings[0].title, "Error marker");
  assert.match(mapped.findings[0].consequence, /does not establish current system health/u);
  assert.equal(Object.hasOwn(mapped, "path"), false);
  assert.equal(Object.hasOwn(mapped.findings[0], "raw"), false);
});

test("fixed-log analysis preserves denied, unavailable, failure, empty, and truncated states", () => {
  for (const status of ["empty", "truncated", "denied", "unavailable", "read-failure", "failed"]) {
    const usable = ["empty", "truncated"].includes(status);
    const mapped = mapLogAnalysisResult("systemMonitorLog", analysis({
      sourceId: "systemMonitorLog", source: "SystemMonitor.log", status,
      lineCount: usable ? 1 : 0, findingCount: 0, findings: [],
      truncated: status === "truncated",
    }));
    assert.equal(mapped.status, status);
    assert.equal(mapped.findings.length, 0);
  }
});

test("malformed or unbounded log-analysis projections are rejected", () => {
  assert.throws(() => mapLogAnalysisResult("users", analysis()), /source is not enabled/u);
  assert.throws(() => mapLogAnalysisResult("messagesLog", analysis({ sourceId: "systemMonitorLog" })), /identity is invalid/u);
  assert.throws(() => mapLogAnalysisResult("messagesLog", analysis({ lineCount: 251 })), /exceeds its contract/u);
  assert.throws(() => mapLogAnalysisResult("messagesLog", analysis({ findings: Array.from({ length: 21 }, (_, index) => finding({ id: `log:messagesLog:line-${index + 1}:explicit-error-marker`, lineNumber: index + 1 })), lineCount: 21, findingCount: 21 })), /exceeds its contract/u);
  assert.throws(() => mapLogAnalysisResult("messagesLog", analysis({ findings: [finding({ marker: "<script>" })] })), /projection is invalid/u);
  assert.throws(() => mapLogAnalysisResult("messagesLog", analysis({ findings: [finding({ lineNumber: 2 })] })), /identity is invalid/u);
});

test("the native package interprets only fixed log observations and keeps them in one bounded response", () => {
  assert.equal(READ_ONLY_SOURCES.messagesLog.analysisPath, undefined);
  assert.match(moduleXml, /<Resource Name="OpsDeck\.Product\.PKG"\s*\/>/u);
  assert.match(interpreter, /ClassMethod Analyze\(sourceId As %String, logPayload As %String\) As %String \[ Language = python \]/u);
  assert.match(interpreter, /"messagesLog": "messages\.log"/u);
  assert.match(interpreter, /"systemMonitorLog": "SystemMonitor\.log"/u);
  assert.match(interpreter, /len\(lines\) > 250/u);
  assert.match(interpreter, /len\(findings\) < 20/u);
  assert.doesNotMatch(interpreter, /\b(?:open|exec|eval)\s*\(|subprocess|socket|os\.system/u);
  assert.match(rest, /WriteSource\("messagesLog"\)/u);
  assert.match(rest, /WriteSource\("systemMonitorLog"\)/u);
  assert.match(rest, /LogInterpreter\)\.Analyze\(sourceId,result\.%ToJSON\(\)\)/u);
  assert.match(rest, /result\.analysis=/u);
  assert.doesNotMatch(rest, /messages-analysis|system-monitor-analysis|%request\.URL|path As %String|\bXECUTE\b|Shell\(/u);
  assert.match(rest, /%request\.Data\("name",1\)/u);
  assert.match(rest, /queryKey'="name"/u);
  assert.match(reader, /lineUnits>2048/u);
  assert.match(reader, /projectionUnits\+lineUnits>6500/u);
  assert.match(app, /EMBEDDED PYTHON · RULE-BASED/u);
  assert.match(app, /Fixed markers are observations/u);
  assert.match(app, /kind: "read-observation"/u);
});

test("raw fixed-log projection can still render when analysis state is invalid", () => {
  const mapped = mapReadOnlySource("messagesLog", {
    status: "available", truncated: false, lines: ["ERROR: <script>alert(1)</script>"],
    analysis: { ...analysis(), findings: [finding({ marker: "<script>" })] },
  }, "2026-10-03T12:00:00Z");
  assert.equal(mapped.items.length, 1);
  assert.equal(mapped.analysis.status, "failed");
  assert.equal(mapped.analysis.reason, "invalid-analysis-projection");
});
