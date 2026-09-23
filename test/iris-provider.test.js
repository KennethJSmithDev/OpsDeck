import test from "node:test";
import assert from "node:assert/strict";
import { mapServerInfo, mapWebApps, mapReadOnlySource, sameWebAppState } from "../src/iris-provider.js";

const envelope = (result, errors = []) => ({ status: { errors, summary: "" }, console: [], result });

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

test("maps manifest-backed list envelopes into safe stable resource summaries", () => {
  const users = mapReadOnlySource("users", envelope([{
    Name: "ops", FullName: "Ops User", Namespace: "USER", Type: "IRIS", Enabled: true,
    Password: "must-not-escape", ApiToken: "must-not-escape",
  }]));
  assert.equal(users.count, 1);
  assert.equal(users.items[0].ref.key, "ops");
  assert.deepEqual(users.items[0].values, { Name: "ops", FullName: "Ops User", Namespace: "USER", Type: "IRIS", Enabled: true });
  assert.equal(users.items[0].ref.provider, "sysadmin-api-v2");

  const task = mapReadOnlySource("tasks", envelope([{ Id: 41, Name: "Fixture task", Namespace: "USER", Suspended: false }])).items[0];
  assert.equal(task.ref.key, "41");
  assert.equal(task.ref.label, "Fixture task");
});

test("maps direct REST discovery arrays and object-valued monitor results", () => {
  const rest = mapReadOnlySource("restServices", [{ name: "Example", namespace: "USER", dispatchClass: "Example.Dispatch", swaggerSpec: "ignored", enabled: true }]);
  assert.equal(rest.items[0].ref.key, "Example");
  assert.deepEqual(rest.items[0].values, { name: "Example", dispatchClass: "Example.Dispatch", namespace: "USER", enabled: true });
  const usage = mapReadOnlySource("systemUsage", envelope({ AllGlobalReferences: 12, LastUpdate: "now", SecretToken: "ignored" }));
  assert.equal(usage.resultType, "object");
  assert.deepEqual(usage.items[0].values, { AllGlobalReferences: 12, LastUpdate: "now" });
});

test("keeps empty live collections distinct and rejects failed provider envelopes", () => {
  const empty = mapReadOnlySource("walletCollections", envelope([]));
  assert.equal(empty.count, 0);
  assert.deepEqual(empty.items, []);
  assert.throws(() => mapReadOnlySource("oauthServer", envelope({ status: "error" }, ["not configured"])), /API error/);
});
