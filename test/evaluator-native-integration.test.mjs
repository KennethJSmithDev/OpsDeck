import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import * as provider from "../src/iris-provider.js";
import * as evidence from "../public/evidence-center.js";
import * as packages from "../public/packages-workspace.js";
import * as jobs from "../public/job-center.js";
import { ProductIdentity } from "../public/product-identity.js";

const source = (await readFile(new URL("../public/app.js", import.meta.url), "utf8")).replace(/^import[^\n]+\n/gm, "");
function contextFor(pathname = "/opsdeck/index.html", fetch = async () => { throw new Error("Unexpected request"); }) {
  const element = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
  const context = vm.createContext({
    ...provider, ...evidence, ...packages, ...jobs, ProductIdentity, AbortSignal, TextEncoder, URL, URLSearchParams, btoa,
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
  assert.doesNotMatch(native, /Observed IRIS system mode/u, "missing system mode stays neutral");
  const observedMode = vm.runInContext('state.info.systemMode="TEST"; shell("")', context);
  assert.match(observedMode, /Observed IRIS system mode[\s\S]*?>TEST</u);
  const demo = vm.runInContext('state.info.systemMode="DEMO"; shell("")', context);
  assert.match(demo, /Observed IRIS system mode[\s\S]*?>DEMO</u);
  assert.match(demo, /Safe demo provider active/);
  assert.doesNotMatch(demo, /Sign out|Live session|IRIS connection active/);

  const evidence = vm.runInContext('evidenceView()', context);
  assert.match(evidence, /OpsDeck · Beta Release 0\.2/u);
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

test("System About uses canonical product identity and leaves provider view intact", () => {
  const { context } = contextFor();
  const identity = vm.runInContext(`
    state.connected = true;
    state.info = { serverVersion: "IRIS Fixture 2026.2" };
    state.route = "system";
    state.systemSection = "about";
    providerDomainView("system")
  `, context);
  assert.match(identity, /Beta Release[\s\S]*OpsDeck[\s\S]*Version 0\.2/u);
  assert.match(identity, /Internal version[\s\S]*0\.6\.0/u);
  assert.match(identity, /Package version[\s\S]*0\.6\.0/u);
  assert.match(identity, /IRIS Fixture 2026\.2/u);
  assert.match(identity, /Namespace[\s\S]*%SYS/u);
  assert.match(identity, /Native IRIS CSP application/u);
  assert.match(identity, /<details class="about-details">/u);
  const providers = vm.runInContext('state.systemSection="providers"; providerDomainView("system")', context);
  assert.match(providers, /LIVE PROVIDER DATA/u);
  assert.match(providers, /System usage/u);
  vm.runInContext("ProductIdentity = undefined", context);
  const withoutAboutIdentity = vm.runInContext('providerDomainView("system")', context);
  assert.match(withoutAboutIdentity, /LIVE PROVIDER DATA/u, "removing the optional About identity dependency leaves System providers operational");
});

test("contextual IRIS help is collapsed, route-scoped, and read-only learning content", () => {
  const { context } = contextFor();
  const header = (route, tab = "web-apps") => vm.runInContext(`state.route=${JSON.stringify(route)}; state.applicationsTab=${JSON.stringify(tab)}; pageHeader("Title", "Description")`, context);

  const overview = header("overview");
  assert.match(overview, /<details class="concept-help"><summary>IRIS concepts in this view<\/summary>/u);
  assert.match(overview, /Namespace/u);
  assert.match(overview, /%SYS/u);
  assert.doesNotMatch(overview, /<details[^>]*open/u);

  const packages = header("applications", "packages");
  assert.match(packages, /IPM package state/u);
  assert.doesNotMatch(packages, /OperationReceipt|arbitrary files/u);

  const logs = header("logs");
  assert.match(logs, /Fixed log observation/u);
  assert.match(logs, /does not browse arbitrary files/u);
  assert.doesNotMatch(logs, /<script|%Execute|terminal/iu);

  const unknown = header("not-a-route");
  assert.doesNotMatch(unknown, /IRIS concepts in this view/u);
});

test("ObjectScript learning snippets load on selection as inert text and have a text-only export", () => {
  const { context } = contextFor();
  const header = vm.runInContext('state.route="overview"; pageHeader("Title", "Description")', context);
  assert.match(header, /ObjectScript snippet library/u);
  assert.match(header, /Inspect the current namespace/u);
  assert.doesNotMatch(header, /\$NAMESPACE|ex\.DisplayString|%Net\.HttpRequest/u);
  assert.doesNotMatch(header, /<script|eval\(|%Execute/iu);
  const native = source;
  assert.match(native, /nativeMode \? "\/opsdeck\/" : "\.\/"/u);
  assert.match(native, /Download \.txt/u);
  assert.match(native, /never executes snippets/u);
});

test("snippet body is fetched from its product asset only after a selection", async () => {
  const requests = [];
  const { context, element } = contextFor("/opsdeck/index.html", async (path, options) => {
    requests.push({ path, options });
    return { ok: true, status: 200, text: async () => 'write "Selected",!' };
  });
  const button = { dataset: { snippet: "namespace" }, addEventListener(type, handler) { context.snippetHandler = handler; } };
  element.querySelectorAll = (selector) => selector === "[data-snippet]" ? [button] : [];
  vm.runInContext('state.connected=true; state.info={systemMode:"DEMO"}; render()', context);
  assert.equal(requests.length, 0);
  assert.doesNotMatch(element.innerHTML, /write &quot;Selected/u);
  await vm.runInContext("snippetHandler()", context);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, "/opsdeck/snippet-namespace.txt");
  assert.equal(requests[0].options.headers.Accept, "text/plain");
  assert.match(element.innerHTML, /write &quot;Selected&quot;,!/u);
  assert.match(element.innerHTML, /<details class="concept-help snippet-library" open>/u);
  assert.match(element.innerHTML, /Text for learning and review only\. OpsDeck never executes snippets/u);
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
  assert.match(live, /Not queried for this package/u);
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

test("live Packages renders catalog version relationships without recommending a downgrade", () => {
  const { context } = contextFor();
  vm.runInContext(`
    state.connected = true;
    state.info = { username: "OpsDeckTest", systemMode: "NATIVE" };
    state.applicationsTab = "packages";
    state.availablePackageName = "opsdeck";
    state.packageInventory = mapInstalledPackageInventory({
      provider: "iris-ipm-installed-v1", namespace: "%SYS", status: "available",
      packages: [{ name: "opsdeck", installedVersion: "0.2.1" }],
    });
    state.availablePackageCatalog = mapAvailablePackageCatalog({
      provider: "iris-ipm-available-v1", namespace: "%SYS", name: "opsdeck", status: "available",
      packages: [{ name: "opsdeck", availableVersion: "0.2.0", repository: "registry" }],
      truncated: false, repositoryCount: 1, availableRepositoryCount: 1, coverage: "complete",
    });
  `, context);
  let live = vm.runInContext("applicationsView()", context);
  assert.match(live, /INSTALLED NEWER/u);
  assert.doesNotMatch(live, /UPDATE AVAILABLE/u);

  vm.runInContext(`state.availablePackageCatalog = mapAvailablePackageCatalog({
    provider: "iris-ipm-available-v1", namespace: "%SYS", name: "opsdeck", status: "available",
    packages: [{ name: "opsdeck", availableVersion: "0.2.1", repository: "registry" }],
    truncated: false, repositoryCount: 1, availableRepositoryCount: 1, coverage: "complete",
  })`, context);
  live = vm.runInContext("applicationsView()", context);
  assert.match(live, /INSTALLED CURRENT/u);

  vm.runInContext(`state.availablePackageCatalog = mapAvailablePackageCatalog({
    provider: "iris-ipm-available-v1", namespace: "%SYS", name: "opsdeck", status: "available",
    packages: [{ name: "opsdeck", availableVersion: "0.2.2", repository: "registry" }],
    truncated: false, repositoryCount: 1, availableRepositoryCount: 1, coverage: "complete",
  })`, context);
  live = vm.runInContext("applicationsView()", context);
  assert.match(live, /INSTALLED OLDER/u);
  assert.match(live, /Available<\/dt><dd>0\.2\.2<\/dd><dt>Installed<\/dt><dd>0\.2\.1/u);
});

test("live Packages preserves an upstream catalog HTTP 403 as DENIED", async () => {
  let requestedPath = "";
  const { context } = contextFor("/opsdeck/index.html", async path => {
    requestedPath = path;
    return { ok: false, status: 403, json: async () => ({ error: "Forbidden" }) };
  });
  vm.runInContext(`
    state.connected = true;
    state.info = { username: "OpsDeckTest", systemMode: "NATIVE" };
    state.applicationsTab = "packages";
    state.packageInventory = mapInstalledPackageInventory({
      provider: "iris-ipm-installed-v1", namespace: "%SYS", status: "empty", packages: [],
    });
  `, context);
  assert.deepEqual(JSON.parse(vm.runInContext("JSON.stringify([nativeMode, state.connected, state.availablePackageLoading])", context)), [true, true, false]);
  await vm.runInContext('loadAvailablePackageCatalog("opsdeck")', context);
  assert.equal(requestedPath, "/opsdeck-api/available-packages?name=opsdeck");
  const live = vm.runInContext("applicationsView()", context);
  assert.match(live, /badge warning">DENIED/u);
  assert.match(live, /not authorized to query the configured package catalog/u);
  assert.doesNotMatch(live, /badge warning">FAILED/u);
});

test("live Packages labels partial repository coverage while retaining observed rows", () => {
  const { context } = contextFor();
  vm.runInContext(`
    state.connected = true;
    state.info = { username: "OpsDeckTest", systemMode: "NATIVE" };
    state.applicationsTab = "packages";
    state.availablePackageName = "opsdeck";
    state.packageInventory = mapInstalledPackageInventory({
      provider: "iris-ipm-installed-v1", namespace: "%SYS", status: "empty", packages: [],
    });
    state.availablePackageCatalog = mapAvailablePackageCatalog({
      provider: "iris-ipm-available-v1", namespace: "%SYS", name: "opsdeck", status: "available",
      packages: [{ name: "opsdeck", availableVersion: "0.2.0", repository: "registry" }],
      truncated: false, repositoryCount: 2, availableRepositoryCount: 1, coverage: "partial",
    });
  `, context);
  const live = vm.runInContext("applicationsView()", context);
  assert.match(live, /badge warning">PARTIAL COVERAGE/u);
  assert.match(live, /opsdeck/u);
  assert.match(live, /0\.2\.0/u);
  assert.match(live, /absence is not established/u);
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
