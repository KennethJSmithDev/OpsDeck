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
  assert.match(html, /href="\.\/styles\.css\?v=0\.1\.0"/u);
  assert.match(html, /src="\.\/app\.js\?v=0\.1\.0"/u);
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
  let authorization;
  const rendered = { html: "" };
  const passwordInput = { value: "synthetic-passphrase" };
  const usernameInput = { value: "SyntheticUser" };
  const form = {
    elements: { username: usernameInput, password: passwordInput },
    addEventListener(type, listener) { if (type === "submit") submit = listener; },
  };
  const app = {
    set innerHTML(value) { rendered.html = value; },
    querySelector(selector) { return selector === "#connect-form" ? form : null; },
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
      authorization ??= options.headers.Authorization;
      assert.equal(options.headers.Authorization, authorization);
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
  assert.equal(authorization, `Basic ${btoa("SyntheticUser:synthetic-passphrase")}`);
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
});
