import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { mapServerInfo, mapWebApps, sameWebAppState, mapReadOnlySource, READ_ONLY_SOURCES, inspectAuditLocation, validateAuditLocation, mapAuditAsyncResult, AUDIT_QUERY_MAX_ROWS } from "../src/iris-provider.js";
import * as evidence from "../public/evidence-center.js";
import * as packages from "../public/packages-workspace.js";
import * as jobs from "../public/job-center.js";

const appSource = (await readFile(new URL("../public/app.js", import.meta.url), "utf8"))
  .replace(/^import[^\n]+\n/gm, "");
const info = {
  status: { errors: [], summary: "" }, console: [],
  result: {
    apiVersion: 2, username: "_SYSTEM", serverVersion: "IRIS 2026.2 (Build 221U)", product: "iris",
    namespaces: [{ name: "%SYS" }, { name: "USER" }], privileges: { Secure: { use: true } },
  },
};

test("frontend assets resolve from the current application path", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  assert.match(html, /href="\.\/styles\.css\?v=opsdeck-0.5.0"/u);
  assert.match(html, /src="\.\/app\.js\?v=opsdeck-0.5.0"/u);
  assert.match(app, /from "\.\/iris-provider\.js\?v=opsdeck-0.5.0"/u);
  assert.match(app, /from "\.\/evidence-center\.js\?v=opsdeck-0.5.0"/u);
  assert.match(app, /from "\.\/packages-workspace\.js\?v=opsdeck-0.5.0"/u);
  assert.match(app, /from "\.\/job-center\.js\?v=opsdeck-0.5.0"/u);
  assert.match(await readFile(new URL("../public/packages-workspace.js", import.meta.url), "utf8"), /from "\.\/operation-engine\.js\?v=opsdeck-0.5.0"/u);
  const moduleXml = await readFile(new URL("../module.xml", import.meta.url), "utf8");
  assert.match(moduleXml, /Name="public\/evidence-center\.js" Target="\{\$cspdir\}opsdeck\/evidence-center\.js"/u);
  assert.match(moduleXml, /Name="public\/operation-engine\.js" Target="\{\$cspdir\}opsdeck\/operation-engine\.js"/u);
  assert.match(moduleXml, /Name="public\/packages-workspace\.js" Target="\{\$cspdir\}opsdeck\/packages-workspace\.js"/u);
  assert.match(moduleXml, /Name="public\/job-center\.js" Target="\{\$cspdir\}opsdeck\/job-center\.js"/u);
  for (const file of ["snippet-namespace.txt", "snippet-try-catch.txt", "snippet-http-read.txt"]) {
    assert.match(moduleXml, new RegExp(`Name="public/${file}" Target="\\{\\$cspdir\\}opsdeck/${file}"`, "u"));
    const content = await readFile(new URL(`../public/${file}`, import.meta.url), "utf8");
    assert.ok(content.length > 0 && content.length <= 12000, `${file} must remain a bounded text asset`);
    assert.doesNotMatch(content, /(^|\n)\s*(zpm\s+|##class\([^)]*\)\.%Execute|\$SYSTEM\.OBJ\.Load|Do \$SYSTEM\.OBJ)/iu);
  }
  const demoWorkflow = await readFile(new URL("../.github/workflows/pages-demo.yml", import.meta.url), "utf8");
  assert.match(demoWorkflow, /cp public\/snippet-\*\.txt _site\//u);
});
const apps = {
  status: { errors: [], summary: "" }, console: [],
  result: [{ Name: "/api/admin", Namespace: "%SYS", Enabled: true, Type: "CSP", AuthenticationMethods: ["Password"] }],
};

test("restored session renders a bounded loading state then leaves bootstrap", async () => {
  const rendered = { html: "" };
  const app = {
    set innerHTML(value) { rendered.html = value; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  const document = {
    querySelector(selector) { return selector === "#app" ? app : null; },
    documentElement: { dataset: {} },
  };
  const responses = new Map([
    ["/api/session", {}],
    ["/api/admin/info", info],
    ["/api/admin/v2/web-apps", apps],
  ]);
  const context = {
    ...evidence,
    ...packages,
    ...jobs,
    AbortSignal,
    Date,
    Intl,
    Object,
    String,
    document,
    location: { hash: "#overview", pathname: "/", origin: "http://localhost" },
    localStorage: { getItem: () => "dark", setItem() {} },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    fetch: async (path) => {
      const payload = responses.get(path);
      assert.ok(payload, `unexpected bootstrap request: ${path}`);
      return { ok: true, status: 200, json: async () => payload };
    },
    mapServerInfo,
    mapWebApps,
    sameWebAppState,
    mapReadOnlySource,
    READ_ONLY_SOURCES,
  };

  vm.runInNewContext(appSource, context, { filename: "public/app.js" });

  const deadline = Date.now() + 500;
  while (!rendered.html.includes("Read-back verified") && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  assert.match(rendered.html, /IRIS 2026\.2 \(Build 221U\)/);
  assert.match(rendered.html, /Read-back verified/);
  assert.doesNotMatch(rendered.html, /Checking connection…/);
  assert.deepEqual([...responses.keys()], ["/api/session", "/api/admin/info", "/api/admin/v2/web-apps"]);
});

test("native IRIS login reads same-origin APIs with in-memory Basic auth and no Node session routes", async () => {
  let submit;
  let accessClick;
  let disconnectClick;
  const authorizations = [];
  const rendered = { html: "" };
  const passwordInput = { value: "synthetic-passphrase" };
  const usernameInput = { value: "SyntheticUser" };
  const form = {
    elements: { username: usernameInput, password: passwordInput },
    addEventListener(type, listener) { if (type === "submit") submit = listener; },
  };
  const app = {
    set innerHTML(value) { rendered.html = value; },
    querySelector(selector) {
      if (selector === "#connect-form") return form;
      if (selector === "#disconnect-button" && rendered.html.includes('id="disconnect-button"')) {
        return { addEventListener(type, listener) { if (type === "click") disconnectClick = listener; } };
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector !== "[data-route]") return [];
      return [{ dataset: { route: "access" }, addEventListener(type, listener) { if (type === "click") accessClick = listener; } }];
    },
  };
  const document = {
    querySelector(selector) { return selector === "#app" ? app : null; },
    documentElement: { dataset: {} },
  };
  const responses = {
    "/api/admin/info": { ...info, result: { ...info.result, username: "SyntheticUser" } },
    "/api/admin/v2/web-apps": apps,
    "/api/admin/v2/security/users": { status: { errors: [] }, console: [], result: [] },
  };
  const requests = [];
  const context = {
    ...evidence,
    ...packages,
    ...jobs,
    AbortSignal, Date, Intl, Object, String, TextEncoder, URL, btoa,
    document,
    location: { hash: "", pathname: "/opsdeck/index.html", origin: "http://iris.test", href: "http://iris.test/opsdeck/index.html" },
    history: { replaceState() {} },
    localStorage: { getItem: () => "dark", setItem() {} },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    fetch: async (path, options) => {
      requests.push(path);
      authorizations.push(options.headers.Authorization);
      const payload = responses[path];
      assert.ok(payload, `unexpected native API request: ${path}`);
      return { ok: true, status: 200, json: async () => payload };
    },
    ...evidence, ...jobs, mapServerInfo, mapWebApps, sameWebAppState, mapReadOnlySource, READ_ONLY_SOURCES,
  };

  vm.runInNewContext(appSource, context, { filename: "public/app.js" });
  assert.equal(typeof submit, "function");
  await submit({ preventDefault() {}, currentTarget: form });

  assert.equal(passwordInput.value, "");
  assert.equal(authorizations[0], `Basic ${btoa("SyntheticUser:synthetic-passphrase")}`);
  assert.deepEqual(requests, ["/api/admin/info", "/api/admin/v2/web-apps", "/api/admin/v2/web-apps"]);
  assert.match(rendered.html, /Read-back verified/u);
  assert.match(rendered.html, /user-chip">SyntheticUser/u, "the displayed identity should come from IRIS response data");
  accessClick();
  assert.match(rendered.html, /<h1>Access<\/h1>/u, "the synthetic route control should navigate to Access");
  const deadline = Date.now() + 500;
  while (!requests.includes("/api/admin/v2/security/users") && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.ok(requests.includes("/api/admin/v2/security/users"), `native domain navigation should call IRIS directly; saw ${requests.join(", ")}`);
  assert.doesNotMatch(requests.join(" "), /\/api\/(?:connect|session)/u);

  assert.equal(typeof disconnectClick, "function", "a connected native session should expose a sign-out action");
  await disconnectClick();
  assert.doesNotMatch(rendered.html, /user-chip">SyntheticUser/u);
  assert.match(rendered.html, /Connect to IRIS/u);
  assert.equal(passwordInput.value, "");
  assert.equal(requests.includes("/api/logout"), false, "native sign-out should not call the Node proxy");

  passwordInput.value = "second-passphrase";
  await submit({ preventDefault() {}, currentTarget: form });
  assert.equal(authorizations.at(-1), `Basic ${btoa("SyntheticUser:second-passphrase")}`, "a new login should use a fresh in-memory authorization value");
});

test("native API object errors become useful text instead of [object Object]", async () => {
  let submit;
  let securityClick;
  let oauthClick;
  const rendered = { html: "" };
  const form = {
    elements: { username: { value: "SyntheticUser" }, password: { value: "synthetic-passphrase" } },
    addEventListener(type, listener) { if (type === "submit") submit = listener; },
  };
  const app = {
    set innerHTML(value) { rendered.html = value; },
    querySelector(selector) { return selector === "#connect-form" ? form : null; },
    querySelectorAll(selector) {
      if (selector === "[data-route]") return [{ dataset: { route: "security" }, addEventListener(type, listener) { if (type === "click") securityClick = listener; } }];
      if (selector === "[data-source]") return [{ dataset: { source: "oauthServer" }, addEventListener(type, listener) { if (type === "click") oauthClick = listener; } }];
      return [];
    },
  };
  const responseFor = (path) => {
    if (path === "/api/admin/info") return { ok: true, status: 200, json: async () => info };
    if (path === "/api/admin/v2/web-apps") return { ok: true, status: 200, json: async () => apps };
    if (path === "/api/admin/v2/wallet/collections") return { ok: true, status: 200, json: async () => ({ status: { errors: [] }, result: [] }) };
    if (path === "/api/admin/v2/security/oauth2/server") return { ok: false, status: 404, json: async () => ({ status: { errors: [{ code: "NotFound", message: "No matching endpoint." }] } }) };
    assert.fail(`unexpected request ${path}`);
  };
  const context = {
    ...evidence,
    ...packages,
    ...jobs,
    AbortSignal, Date, Intl, Object, String, TextEncoder, URL, btoa,
    document: { querySelector(selector) { return selector === "#app" ? app : null; }, documentElement: { dataset: {} } },
    location: { hash: "", pathname: "/opsdeck/index.html", origin: "http://iris.test" },
    history: { replaceState() {} },
    localStorage: { getItem: () => "dark", setItem() {} },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    fetch: async (path) => responseFor(path),
    ...jobs, mapServerInfo, mapWebApps, sameWebAppState, mapReadOnlySource, READ_ONLY_SOURCES,
  };
  vm.runInNewContext(appSource, context, { filename: "public/app.js" });
  await submit({ preventDefault() {}, currentTarget: form });
  securityClick();
  const deadline = Date.now() + 500;
  while (!oauthClick && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(typeof oauthClick, "function");
  oauthClick();
  const errorDeadline = Date.now() + 500;
  while (!rendered.html.includes("No matching endpoint.") && Date.now() < errorDeadline) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.match(rendered.html, /No matching endpoint\./u);
  assert.doesNotMatch(rendered.html, /\[object Object\]/u);
});

test("audit query is an explicit bounded read and displays only reviewed fields", async () => {
  let submit;
  let logsClick;
  let runAuditClick;
  const rendered = { html: "" };
  const form = {
    elements: { username: { value: "SyntheticUser" }, password: { value: "synthetic-passphrase" } },
    addEventListener(type, listener) { if (type === "submit") submit = listener; },
  };
  const calls = [];
  const app = {
    set innerHTML(value) { rendered.html = value; },
    querySelector(selector) { return selector === "#connect-form" ? form : null; },
    querySelectorAll(selector) {
      if (selector === "[data-route]") return [{ dataset: { route: "logs" }, addEventListener(type, listener) { if (type === "click") logsClick = listener; } }];
      if (selector === "[data-run-audit-query]") return [{ addEventListener(type, listener) { if (type === "click") runAuditClick = listener; } }];
      return [];
    },
  };
  const userInfo = { ...info, result: { ...info.result, username: "SyntheticUser" } };
  const context = {
    AbortSignal, Date, Intl, Object, String, TextEncoder, URL, URLSearchParams, btoa,
    document: { querySelector(selector) { return selector === "#app" ? app : null; }, documentElement: { dataset: {} } },
    location: { hash: "", pathname: "/opsdeck/index.html", origin: "http://iris.test", href: "http://iris.test/opsdeck/index.html" },
    history: { replaceState() {} },
    localStorage: { getItem: () => "dark", setItem() {} },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    fetch: async (path, options = {}) => {
      calls.push({ path, options });
      if (path === "/api/admin/info") return { ok: true, status: 200, json: async () => userInfo };
      if (path === "/api/admin/v2/web-apps") return { ok: true, status: 200, json: async () => apps };
      if (path === "/api/admin/v2/security/audit/enabled") return { ok: true, status: 200, json: async () => ({ status: { errors: [] }, result: { Enabled: true } }) };
      if (path.startsWith("/api/admin/v2/security/audit/records?")) return {
        ok: true, status: 202,
        headers: { get(name) { return name.toLowerCase() === "location" ? "/api/admin/v1/async-result?id=synthetic-task-id" : null; } },
      };
      if (path === "/api/admin/v1/async-result?id=synthetic-task-id") return {
        ok: true, status: 200, json: async () => ({ status: { errors: [] }, console: [], result: {
          TaskName: "ListAuditRecords", State: "Finished", Result: [
            { TimeStamp: "observed-time", Event: "Login", EventSource: "System", UserName: "SyntheticUser", PID: 17, Namespace: "%SYS", Description: "private audit detail must not render" },
            { Event: "extra row must be truncated" },
          ],
        } }),
      };
      assert.fail(`unexpected request ${path}`);
    },
    ...evidence, ...jobs, mapServerInfo, mapWebApps, sameWebAppState, mapReadOnlySource, READ_ONLY_SOURCES,
    inspectAuditLocation, validateAuditLocation, mapAuditAsyncResult, AUDIT_QUERY_MAX_ROWS,
  };
  vm.runInNewContext(appSource, context, { filename: "public/app.js" });
  await submit({ preventDefault() {}, currentTarget: form });
  logsClick();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(calls.filter(({ path }) => path.startsWith("/api/admin/v2/security/audit/records?")).length, 0, "opening Logs does not submit an audit query");
  assert.match(rendered.html, /Read recent records · max 1/u);
  runAuditClick();
  const deadline = Date.now() + 500;
  while (!rendered.html.includes("identity: validated-location") && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 5));
  const submitCall = calls.find(({ path }) => path.startsWith("/api/admin/v2/security/audit/records?"));
  assert.ok(submitCall);
  const query = new URL(submitCall.path, "http://iris.test").searchParams;
  assert.equal(query.get("usernames"), "SyntheticUser");
  assert.equal(query.get("maxRows"), "1");
  assert.equal(new Date(query.get("endDateTime")).getTime() - new Date(query.get("beginDateTime")).getTime(), 10 * 60 * 1000);
  assert.equal(submitCall.options.method, "POST");
  assert.equal(calls.filter(({ path }) => path === "/api/admin/v1/async-result?id=synthetic-task-id").length, 1);
  const readCall = calls.find(({ path }) => path === "/api/admin/v1/async-result?id=synthetic-task-id");
  assert.equal(readCall.options.redirect, "error");
  assert.match(rendered.html, /Task state: Finished · identity: validated-location/u);
  assert.equal(vm.runInNewContext("state.jobs.length", context), 1);
  assert.equal(vm.runInNewContext("state.jobs[0].status", context), "COMPLETED");
  assert.equal(vm.runInNewContext('state.jobs[0].resultIdentity.id', context), "/api/admin/v1/async-result?id=synthetic-task-id");
  const jobEvidence = vm.runInNewContext('currentEvidenceCollection().records.find(record => record.kind === "read-observation" && record.resource?.kind === "async-job")', context);
  assert.equal(jobEvidence.evidence.providerState, "COMPLETED");
  assert.equal(jobEvidence.evidence.identityBasis, "validated-location");
  const tasksView = vm.runInNewContext('state.route="tasks"; providerDomainView("tasks")', context);
  assert.match(tasksView, /Job Center/u);
  assert.match(tasksView, /COMPLETED/u);
  assert.match(rendered.html, /Login/u);
  assert.doesNotMatch(rendered.html, /private audit detail must not render|synthetic-task-id|extra row must be truncated/u);
});

test("alerts are opt-in stateful reads and unqualified record values stay hidden", async () => {
  let submit;
  let logsClick;
  let alertTabClick;
  let readAlertsClick;
  const rendered = { html: "" };
  const form = {
    elements: { username: { value: "SyntheticUser" }, password: { value: "synthetic-passphrase" } },
    addEventListener(type, listener) { if (type === "submit") submit = listener; },
  };
  let alertReadCount = 0;
  const responses = {
    "/api/admin/info": info,
    "/api/admin/v2/web-apps": apps,
    "/api/admin/v2/security/audit/enabled": { status: { errors: [] }, result: { Enabled: true } },
  };
  const app = {
    set innerHTML(value) { rendered.html = value; },
    querySelector(selector) { return selector === "#connect-form" ? form : null; },
    querySelectorAll(selector) {
      if (selector === "[data-route]") return [{ dataset: { route: "logs" }, addEventListener(type, listener) { if (type === "click") logsClick = listener; } }];
      if (selector === "[data-source]") return [{ dataset: { source: "alerts" }, addEventListener(type, listener) { if (type === "click") alertTabClick = listener; } }];
      if (selector === "[data-load-alerts]" && rendered.html.includes("data-load-alerts")) return [{ addEventListener(type, listener) { if (type === "click") readAlertsClick = listener; } }];
      return [];
    },
  };
  const context = {
    ...evidence,
    ...packages,
    ...jobs,
    AbortSignal, Date, Intl, Object, String, TextEncoder, URL, btoa,
    document: { querySelector(selector) { return selector === "#app" ? app : null; }, documentElement: { dataset: {} } },
    location: { hash: "", pathname: "/opsdeck/index.html", origin: "http://iris.test" },
    history: { replaceState() {} },
    localStorage: { getItem: () => "dark", setItem() {} },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    fetch: async (path) => {
      if (path === "/api/monitor/alerts") {
        alertReadCount += 1;
        return { ok: true, status: 200, json: async () => alertReadCount === 1 ? [] : [{ Message: "raw alert text must not render", Severity: "critical" }] };
      }
      const payload = responses[path];
      assert.ok(payload, `unexpected request ${path}`);
      return { ok: true, status: 200, json: async () => payload };
    },
    mapServerInfo, mapWebApps, sameWebAppState, mapReadOnlySource, READ_ONLY_SOURCES,
  };
  vm.runInNewContext(appSource, context, { filename: "public/app.js" });
  await submit({ preventDefault() {}, currentTarget: form });
  logsClick();
  await new Promise((resolve) => setTimeout(resolve, 10));
  alertTabClick();
  assert.equal(alertReadCount, 0, "opening the stateful provider tab must not consume a batch");
  assert.match(rendered.html, /OpsDeck does not poll this source automatically/u);
  readAlertsClick();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(alertReadCount, 1);
  assert.match(rendered.html, /IRIS returned no alerts in this batch/u);
  assert.doesNotMatch(rendered.html, /Second read matched/u);
  readAlertsClick();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(alertReadCount, 2);
  assert.match(rendered.html, /Message.*Severity/u);
  assert.doesNotMatch(rendered.html, /raw alert text must not render/u);
});
