import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import * as provider from "../src/iris-provider.js";
import * as evidence from "../public/evidence-center.js";
import * as packages from "../public/packages-workspace.js";

const source = (await readFile(new URL("../public/app.js", import.meta.url), "utf8")).replace(/^import[^\n]+\n/gm, "");
function contextFor(pathname = "/opsdeck/index.html", fetch = async () => { throw new Error("Unexpected request"); }) {
  const element = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
  const context = vm.createContext({
    ...provider, ...evidence, ...packages, AbortSignal, TextEncoder, URL, btoa,
    document: { querySelector: () => element, documentElement: { dataset: {} } },
    location: { pathname, hash: "", origin: "http://fixture.test" },
    localStorage: { getItem: () => "dark", setItem() {} },
    history: { replaceState() {} }, matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {}, fetch,
  });
  vm.runInContext(source, context);
  return { context, element };
}

test("integrated native shell and Evidence view report only qualified lifecycle scope", () => {
  const { context } = contextFor();
  const native = vm.runInContext('state.connected=true; state.info={username:"Fixture",serverVersion:"Fixture IRIS"}; shell("")', context);
  assert.match(native, /Sign out/);
  assert.match(native, /Same-origin session/);
  const demo = vm.runInContext('state.info.systemMode="DEMO"; shell("")', context);
  assert.match(demo, /Safe demo provider active/);
  assert.doesNotMatch(demo, /Sign out|Live session|IRIS connection active/);

  const evidence = vm.runInContext('evidenceView()', context);
  assert.match(evidence, /IPM \/ ZPM lifecycle[\s\S]*?QUALIFIED/u);
  assert.match(evidence, /Local-source load, uninstall, and clean same-source reload were reproduced for OpsDeck 0\.2\.0/u);
  assert.match(evidence, /Scope: tested local-source lifecycle only[\s\S]*?Exact core IPM version and public-registry installation remain unverified/u);
  assert.doesNotMatch(evidence, /No package load, install, uninstall, or clean-reinstall claim is admitted yet/u);
  assert.match(evidence, /Fixture receipt preview/u);
  assert.match(evidence, /SYNTHETIC FIXTURE/u);
  assert.match(evidence, /Export JSON/u);

  const packages = vm.runInContext('state.applicationsTab="packages"; applicationsView()', context);
  assert.match(packages, /APPLICATIONS → PACKAGES/u);
  assert.match(packages, /SYNTHETIC FIXTURE/u);
  vm.runInContext('state.packagePlan=preparePackagePlan(fixturePackageInventory(),"sample-reporting-kit","install")', context);
  const packageReview = vm.runInContext('applicationsView()', context);
  assert.match(packageReview, /Executor unavailable/u);
  assert.match(packageReview, /Confirm package operation · unavailable/u);
  assert.match(packageReview, /disabled aria-disabled="true"/u);
  const evidenceWithPlan = vm.runInContext('evidenceView()', context);
  assert.match(evidenceWithPlan, /Synthetic package plan preview/u);
  assert.match(evidenceWithPlan, /UNVERIFIED/u);
});

test("live Packages stays empty before an installed IPM read and never substitutes fixtures", () => {
  const { context } = contextFor();
  const live = vm.runInContext('state.connected=true; state.info={username:"OpsDeckTest",serverVersion:"Fixture IRIS"}; state.applicationsTab="packages"; applicationsView()', context);
  assert.match(live, /Installed package inventory/u);
  assert.match(live, /NOT READ/u);
  assert.match(live, /iris-ipm-installed-v1/u);
  assert.match(live, /No package rows are available/u);
  assert.doesNotMatch(live, /SYNTHETIC FIXTURE|sample-observer|sample-reporting-kit|data-package-plan/u);
  assert.doesNotMatch(live, /configured registry|Open Exchange/u);
});

test("native Packages loads installed IPM rows through its fixed same-origin route", async () => {
  const payload = {
    provider: "iris-ipm-installed-v1", namespace: "%SYS", status: "available", truncated: false,
    packages: [{ name: "opsdeck", installedVersion: "0.3.0" }],
  };
  let requestedPath = "";
  const { context } = contextFor("/opsdeck/index.html", async (path) => {
    requestedPath = path;
    return { ok: true, status: 200, json: async () => payload };
  });
  vm.runInContext(`state.connected=true; state.info={username:"hello",systemMode:"NATIVE"}; state.applicationsTab="packages"`, context);
  await vm.runInContext("loadPackageInventory()", context);
  assert.equal(requestedPath, "/opsdeck-api/packages");
  assert.equal(vm.runInContext("state.packageInventory.state", context), "AVAILABLE");
  assert.equal(vm.runInContext("state.packageInventory.packages[0].name", context), "opsdeck");
  const live = vm.runInContext("applicationsView()", context);
  assert.match(live, /opsdeck/u);
  assert.match(live, /0\.3\.0/u);
  assert.match(live, /Not observed/u);
  assert.doesNotMatch(live, /sample-observer|sample-reporting-kit|SYNTHETIC FIXTURE/u);
});

test("live Packages presents IPM authority denial distinctly without fixture substitution", () => {
  const { context } = contextFor();
  vm.runInContext(`
    state.connected = true;
    state.info = { username: "OpsDeckTest", systemMode: "NATIVE" };
    state.applicationsTab = "packages";
    state.packageInventory = mapInstalledPackageInventory({
      provider: "iris-ipm-installed-v1", namespace: "%SYS", status: "denied", packages: [],
    });
  `, context);
  const live = vm.runInContext("applicationsView()", context);
  assert.match(live, /DENIED/u);
  assert.match(live, /not authorized to read installed IPM registrations/u);
  assert.doesNotMatch(live, /sample-observer|sample-reporting-kit|SYNTHETIC FIXTURE/u);
});

test("Evidence projects bounded audit outcomes without retaining audit row values", () => {
  const { context } = contextFor();
  const serialized = vm.runInContext(`
    state.info = { systemMode: "NATIVE" };
    state.auditQuery = {
      state: "finished", observedAt: "2026-10-02T12:00:00.000Z", resultCount: 1,
      truncatedToMaxRows: false, task: { identitySource: "validated-location" },
      result: [{ TimeStamp: "private-time", Event: "private-event", UserName: "private-user" }]
    };
    JSON.stringify(currentEvidenceCollection())
  `, context);
  const collection = JSON.parse(serialized);
  const record = collection.records.find((item) => item.id === "session:audit-query");
  assert.equal(record.state, "PARTIAL");
  assert.equal(record.observedAt, "2026-10-02T12:00:00.000Z");
  assert.deepEqual(record.evidence, {
    providerState: "finished", identityBasis: "validated-location", fields: ["Event", "TimeStamp", "UserName"], count: 1, truncated: false,
  });
  assert.doesNotMatch(serialized, /private-time|private-event|private-user/u);
  const evidenceView = vm.runInContext("evidenceView()", context);
  assert.match(evidenceView, /Audit async handoff[\s\S]*?PARTIAL[\s\S]*?1 result row/u);
  assert.match(evidenceView, /full result-schema and pagination behavior are not established/u);

  for (const [providerState, expected] of [["denied", "DENIED"], ["failed", "FAILED"], ["unavailable", "UNAVAILABLE"], ["canceled", "BLOCKED"]]) {
    vm.runInContext(`state.auditQuery = { state: "${providerState}", observedAt: "2026-10-02T12:00:00.000Z" }`, context);
    const result = JSON.parse(vm.runInContext("JSON.stringify(currentEvidenceCollection())", context));
    assert.equal(result.records.find((item) => item.id === "session:audit-query").state, expected);
  }
});

test("denied native sources name IRIS authority and demo sources name persona authority", () => {
  const { context } = contextFor();
  const native = vm.runInContext('state.info={}; state.sourceErrors.users="HTTP 403"; sourcePanel("users")', context);
  assert.match(native, /Access denied by IRIS/);
  const demo = vm.runInContext('state.info.systemMode="DEMO"; sourcePanel("users")', context);
  assert.match(demo, /Access denied by persona/);
});

test("restricted demo retains its known identity when application inventory is denied", async () => {
  const { context, element } = contextFor("/", async path => ({
    ok: path !== "/api/admin/v2/web-apps", status: path === "/api/admin/v2/web-apps" ? 403 : 200,
    json: async () => path === "/api/admin/v2/web-apps" ? { error: "Persona does not have authority" } :
      path === "/api/session" ? {} : { status: { errors: [] }, result: { username: "DemoRestricted", serverVersion: "Fixture", apiVersion: 2, systemMode: "DEMO", namespaces: [], privileges: {} } },
  }));
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.match(element.innerHTML, /DemoRestricted/);
  assert.match(element.innerHTML, /does not have authority/);
  assert.doesNotMatch(element.innerHTML, /Checking connection…/);
  assert.equal(vm.runInContext('state.verification', context), null);
});

test("similarly named paths do not select native authentication mode", () => {
  const { context } = contextFor("/opsdeck-other/");
  assert.equal(vm.runInContext('nativeMode', context), false);
});
