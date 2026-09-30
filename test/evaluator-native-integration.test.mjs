import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import * as provider from "../src/iris-provider.js";

const source = (await readFile(new URL("../public/app.js", import.meta.url), "utf8")).replace(/^import[^\n]+\n/, "");
function contextFor(pathname = "/opsdeck/index.html", fetch = async () => { throw new Error("Unexpected request"); }) {
  const element = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
  const context = vm.createContext({
    ...provider, AbortSignal, TextEncoder, URL, btoa,
    document: { querySelector: () => element, documentElement: { dataset: {} } },
    location: { pathname, hash: "", origin: "http://fixture.test" },
    localStorage: { getItem: () => "dark", setItem() {} },
    history: { replaceState() {} }, matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {}, fetch,
  });
  vm.runInContext(source, context);
  return { context, element };
}

test("integrated native shell keeps sign-out while demo labels exclude live-session claims", () => {
  const { context } = contextFor();
  const native = vm.runInContext('state.connected=true; state.info={username:"Fixture",serverVersion:"Fixture IRIS"}; shell("")', context);
  assert.match(native, /Sign out/);
  assert.match(native, /Same-origin session/);
  const demo = vm.runInContext('state.info.systemMode="DEMO"; shell("")', context);
  assert.match(demo, /Safe demo provider active/);
  assert.doesNotMatch(demo, /Sign out|Live session|IRIS connection active/);
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
