import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mapReadOnlySource, READ_ONLY_SOURCES } from "../src/iris-provider.js";

const moduleXml = await readFile(new URL("../module.xml", import.meta.url), "utf8");
const restClass = await readFile(new URL("../src/OpsDeck/Product/FixedLogREST.cls", import.meta.url), "utf8");
const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");

test("native class package owns a reserved product namespace and a separate API app", () => {
  assert.match(moduleXml, /<SourcesRoot>src<\/SourcesRoot>/u);
  assert.match(moduleXml, /<Resource Name="OpsDeck\.Product\.PKG"\s*\/>/u);
  assert.match(moduleXml, /Name="\/opsdeck-api"[\s\S]*?DispatchClass="OpsDeck\.Product\.FixedLogREST"[\s\S]*?ServeFiles="0"/u);
  assert.match(moduleXml, /Name="\/opsdeck"[\s\S]*?ServeFiles="1"/u);
  assert.match(moduleXml, /AutheEnabled="32"/gu);
  assert.equal([...moduleXml.matchAll(/<Resource Name=/gu)].length, 1);
});

test("REST class exposes only fixed semantic routes and never accepts a path", () => {
  assert.match(restClass, /Extends %CSP\.REST/u);
  assert.match(restClass, /XData UrlMap\s*\[\s*XMLNamespace\s*=\s*"http:\/\/www\.intersystems\.com\/urlmap"\s*\]/u);
  assert.match(restClass, /Url="\/messages" Method="GET" Call="MessagesLog"/u);
  assert.match(restClass, /Url="\/system-monitor" Method="GET" Call="SystemMonitorLog"/u);
  assert.match(restClass, /Url="\/packages" Method="GET" Call="InstalledPackages"/u);
  assert.match(restClass, /Url="\/available-packages" Method="GET" Call="AvailablePackages"/u);
  assert.match(restClass, /GetListModules\(\$namespace,"\*",\.modules\)/u);
  assert.match(restClass, /count>250/u);
  assert.match(restClass, /SearchRepositoriesForModule\(criteria,\.matches\)/u);
  assert.match(restClass, /CheckPrivilege\(\$USERNAME,1,"%IPM_Repo\.Definition","s",\$NAMESPACE\)/u);
  assert.match(restClass, /repositoryCount>5/u);
  assert.match(restClass, /result\.packages\.%Size\(\)=50/u);
  assert.match(restClass, /WriteSource\("messagesLog"\)/u);
  assert.match(restClass, /WriteSource\("systemMonitorLog"\)/u);
  assert.match(restClass, /%request\.Data\("name",1\)/u);
  assert.doesNotMatch(restClass, /%request\.URL|path As %String|\bXECUTE\b|Shell\(/iu);
  assert.equal(READ_ONLY_SOURCES.messagesLog.path, "/opsdeck-api/messages");
  assert.equal(READ_ONLY_SOURCES.systemMonitorLog.path, "/opsdeck-api/system-monitor");
  assert.equal(READ_ONLY_SOURCES.messagesLog.nativeOnly, true);
  assert.equal(READ_ONLY_SOURCES.availablePackages.path, "/opsdeck-api/available-packages");
  assert.match(app, /route === "packages"\) return "\/opsdeck-api\/packages"/u);
  assert.match(app, /loadPackageInventory\(\)/u);
  assert.match(app, /mapInstalledPackageInventory\(payload\)/u);
  assert.match(app, /route === "availablePackages"/u);
  assert.match(app, /loadAvailablePackageCatalog\(name\)/u);
  assert.match(app, /mapAvailablePackageCatalog\(payload\)/u);
});

test("provider mapping preserves source states while omitting resolved paths", () => {
  for (const status of ["available", "empty", "truncated", "unavailable", "denied", "read-failure"]) {
    const result = mapReadOnlySource("messagesLog", {
      status,
      lines: status === "available" ? ["logged C:\\service\\config.xml"] : [],
      truncated: status === "truncated",
      path: "C:\\private\\messages.log",
    }, "2026-10-02T00:00:00Z");
    assert.equal(result.status, status);
    assert.equal(result.provider, "opsdeck-native-fixed-log-v1");
    assert.equal(Object.hasOwn(result, "path"), false);
    assert.equal(Object.hasOwn(result, "resolvedPath"), false);
    if (status === "available") assert.equal(result.items[0].values.line, "logged C:\\service\\config.xml");
  }
});

test("log view escapes and wraps ordinary log text and states its observation bounds", () => {
  assert.match(app, /data-refresh-source="\$\{sourceId\}"/u);
  assert.match(app, /esc\(item\.values\.line\)/u);
  assert.match(app, /64 KiB \/ 250 complete lines/u);
  assert.match(app, /resolved filesystem location is never returned/u);
  assert.match(styles, /\.fixed-log-lines[\s\S]*?overflow-wrap:anywhere/u);
  assert.match(styles, /\.fixed-log-lines li[\s\S]*?minmax\(0,1fr\)/u);
});
