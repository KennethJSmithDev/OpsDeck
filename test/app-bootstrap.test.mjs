import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { mapServerInfo, mapWebApps, sameWebAppState, mapReadOnlySource, READ_ONLY_SOURCES } from "../src/iris-provider.js";

const appSource = (await readFile(new URL("../public/app.js", import.meta.url), "utf8"))
  .replace(/^import \{[^\n]+\} from "(?:\/iris-provider\.js|\.\/iris-provider\.js)";\s*/u, "");
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
  assert.match(html, /href="\.\/styles\.css\?v=native-pivot"/u);
  assert.match(html, /src="\.\/app\.js\?v=native-pivot"/u);
  assert.match(app, /from "\.\/iris-provider\.js"/u);
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
    AbortSignal, Date, Intl, Object, String, TextEncoder, URL, btoa,
    document,
    location: { hash: "", pathname: "/opsdeck/index.html", origin: "http://iris.test" },
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
    mapServerInfo, mapWebApps, sameWebAppState, mapReadOnlySource, READ_ONLY_SOURCES,
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
    AbortSignal, Date, Intl, Object, String, TextEncoder, URL, btoa,
    document: { querySelector(selector) { return selector === "#app" ? app : null; }, documentElement: { dataset: {} } },
    location: { hash: "", pathname: "/opsdeck/index.html", origin: "http://iris.test" },
    history: { replaceState() {} },
    localStorage: { getItem: () => "dark", setItem() {} },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    fetch: async (path) => responseFor(path),
    mapServerInfo, mapWebApps, sameWebAppState, mapReadOnlySource, READ_ONLY_SOURCES,
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
