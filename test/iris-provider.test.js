import test from "node:test";
import assert from "node:assert/strict";
import { mapServerInfo, mapWebApps, mapWebAppDetail, mapRestServiceSpec, mapReadOnlySource, sameWebAppState } from "../src/iris-provider.js";

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

test("maps authoritative web-app detail by its selected identity and drops unapproved fields", () => {
  const selected = { name: "/api/admin", namespace: "%SYS" };
  const detail = mapWebAppDetail(envelope({
    Name: "/api/admin", NameSpace: "%SYS", Description: "Management API", Enabled: true,
    Resource: "", JWTAuthEnabled: false, CSRFToken: true, Password: "private", SecretToken: "private", Path: "ignored",
  }), selected, "2026-09-23T00:00:00.000Z");
  assert.equal(detail.ref.key, "/api/admin");
  assert.equal(detail.ref.scope, "%SYS");
  assert.deepEqual(detail.values, {
    Description: "Management API", NameSpace: "%SYS", Enabled: true, Resource: "", JWTAuthEnabled: false, CSRFToken: true,
  });
  assert.throws(() => mapWebAppDetail(envelope({ Name: "/other", NameSpace: "%SYS" }), selected), /identity/);
  assert.throws(() => mapWebAppDetail(envelope({ Name: "/api/admin", NameSpace: "USER" }), selected), /namespace/);
  assert.throws(() => mapWebAppDetail(envelope({ Enabled: true }), selected), /namespace/);
  const malformed = mapWebAppDetail(envelope({ NameSpace: "%SYS", CSRFToken: "must-not-escape", Enabled: "yes" }), selected);
  assert.deepEqual(malformed.values, { NameSpace: "%SYS" });
});

test("reduces a live REST OpenAPI document to a compact schema-free operation summary", () => {
  const summary = mapRestServiceSpec({
    swagger: "2.0", info: { title: "Admin API", version: "1" },
    paths: {
      "/api/admin/info": { get: { summary: "Get identity", tags: ["admin"], responses: { 200: { schema: { $ref: "#/definitions/secret" } } } } },
      "/api/admin/users": { post: { parameters: [{ in: "body", schema: { $ref: "#/definitions/private" } }] } },
      "invalid": { get: { summary: "ignored" } },
    },
    definitions: { secret: { type: "string" } },
  }, { provider: "iris-management-rest", key: "/api/admin", scope: "%SYS", label: "Admin API" }, "2026-09-23T00:00:00.000Z");
  assert.equal(summary.format, "Swagger 2.0");
  assert.equal(summary.title, "Admin API");
  assert.equal(summary.operationCount, 2);
  assert.deepEqual(summary.operations[0], { path: "/api/admin/info", method: "GET", summary: "Get identity", tags: ["admin"] });
  assert.equal(JSON.stringify(summary).includes("definitions"), false);
  assert.throws(() => mapRestServiceSpec({ info: {}, paths: {} }, { key: "x", label: "x" }), /format version/);
  const bounded = mapRestServiceSpec({
    openapi: "3.0.0", info: { title: "Large API" },
    paths: Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`/path/${index}`, { get: { summary: `Operation ${index}` } }])),
  }, { provider: "iris-management-rest", key: "large", label: "Large API" });
  assert.equal(bounded.operationCount, 20);
  assert.equal(bounded.operations.length, 12);
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
  assert.deepEqual(rest.items[0].values, { name: "Example", dispatchClass: "Example.Dispatch", namespace: "USER", enabled: true, swaggerSpec: "ignored" });
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
