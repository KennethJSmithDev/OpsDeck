import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { mapServerInfo, mapWebApps, sameWebAppState, mapReadOnlySource, READ_ONLY_SOURCES } from "../src/iris-provider.js";

const appSource = (await readFile(new URL("../public/app.js", import.meta.url), "utf8"))
  .replace(/^import \{[^\n]+\} from "\/iris-provider\.js";\s*/u, "");
const info = {
  status: { errors: [], summary: "" }, console: [],
  result: {
    apiVersion: 2, username: "_SYSTEM", serverVersion: "IRIS 2026.2 (Build 221U)", product: "iris",
    namespaces: [{ name: "%SYS" }, { name: "USER" }], privileges: { Secure: { use: true } },
  },
};
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
    location: { hash: "#overview" },
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
