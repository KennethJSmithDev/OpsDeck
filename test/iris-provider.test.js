import test from "node:test";
import assert from "node:assert/strict";
import { mapServerInfo, mapWebApps, sameWebAppState } from "../src/iris-provider.js";

const infoPayload = {
  status: { errors: [], summary: "" },
  console: [],
  result: {
    apiVersion: 2,
    username: "_SYSTEM",
    serverVersion: "IRIS 2026.2 (Build 221U)",
    product: "iris",
    systemMode: "",
    namespaces: [{ name: "%SYS" }, { name: "USER" }],
    privileges: { Secure: { use: true } },
  },
};
const appPayload = {
  status: { errors: [], summary: "" },
  console: [],
  result: [{
    Name: "/api/admin",
    Namespace: "%SYS",
    NamespaceDefault: false,
    Enabled: true,
    Type: "CSP",
    Resource: "",
    AuthenticationMethods: ["Password"],
    IsSystemApp: false,
    DispatchClass: "%Api.Admin",
  }],
};

test("maps observed server identity and privilege flags to the compact view model", () => {
  const info = mapServerInfo(infoPayload, "2026-09-23T00:00:00.000Z");
  assert.equal(info.apiVersion, 2);
  assert.equal(info.serverVersion, "IRIS 2026.2 (Build 221U)");
  assert.deepEqual(info.namespaces, [{ name: "%SYS" }, { name: "USER" }]);
  assert.equal(info.privileges.Secure, true);
});

test("maps observed web-app identity, scope, and state without changing provider names", () => {
  const [app] = mapWebApps(appPayload, "2026-09-23T00:00:00.000Z");
  assert.equal(app.ref.key, "/api/admin");
  assert.equal(app.ref.scope, "%SYS");
  assert.equal(app.enabled, true);
  assert.deepEqual(app.authenticationMethods, ["Password"]);
});

test("rejects API error envelopes and malformed web-app state", () => {
  assert.throws(() => mapServerInfo({ status: { errors: ["denied"] }, result: {} }), /API error/);
  assert.throws(() => mapWebApps({ status: { errors: [] }, result: [{ Name: "/demo" }] }), /name or namespace/);
});

test("keeps missing optional provider fields unknown instead of inventing empty or false values", () => {
  const [app] = mapWebApps({
    status: { errors: [] },
    result: [{ Name: "/custom", Namespace: "USER", Enabled: true, AuthenticationMethods: [] }],
  });
  assert.equal(app.type, null);
  assert.equal(app.resource, null);
  assert.equal(app.namespaceDefault, null);
  assert.equal(app.isSystemApp, null);
  assert.equal(app.dispatchClass, null);

  const info = mapServerInfo({ status: { errors: [] }, result: {
    apiVersion: 2, username: "readonly", serverVersion: "IRIS unknown",
  } });
  assert.equal(info.namespaces, null);
  assert.equal(info.privileges, null);
});

test("read-back comparison ignores row order but detects a changed enabled flag", () => {
  const first = mapWebApps(appPayload);
  const second = mapWebApps({ ...appPayload, result: [...appPayload.result].reverse() });
  assert.equal(sameWebAppState(first, second), true);
  second[0].enabled = false;
  assert.equal(sameWebAppState(first, second), false);
});
