import test from "node:test";
import assert from "node:assert/strict";
import { mapServerInfo, mapWebApps, mapWebAppDetail, mapSecurityUserDetail, sameSecurityUserRelationships, mapSecurityRoleDetail, sameSecurityRoleDetail, mapSecurityRoleOwners, sameSecurityRoleOwners, mapSecurityResourceDetail, sameSecurityResourceDetail, mapTaskDetail, sameTaskDetail, mapRestServiceSpec, mapReadOnlySource, sameReadOnlySource, sameWebAppState, READ_ONLY_SOURCES } from "../src/iris-provider.js";

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

test("maps live user role relationships with selected identity and omits unrelated and sensitive fields", () => {
  const selected = { ref: { domain: "access", kind: "users", provider: "sysadmin-api-v2", key: "fixture-user", label: "Fixture user", scope: null } };
  const payload = envelope({
    NameSpace: "%SYS", Enabled: true, Roles: ["role-a", "role-b", "role-c"], EscalationRoles: [],
    EmailAddress: "private@example.invalid", PasswordNeverExpires: true, Password: "never-map",
  });
  const detail = mapSecurityUserDetail(payload, selected, "2026-09-23T00:00:00.000Z");
  assert.equal(detail.ref.key, "fixture-user");
  assert.equal(detail.ref.kind, "user-detail");
  assert.equal(detail.source, "/api/admin/v2/security/user");
  assert.deepEqual(detail.relationships.directRoles.map((ref) => [ref.kind, ref.key, ref.relation]), [
    ["roles", "role-a", "direct"], ["roles", "role-b", "direct"], ["roles", "role-c", "direct"],
  ]);
  assert.deepEqual(detail.relationships.escalationRoles, []);
  assert.equal(Object.hasOwn(detail, "values"), false);
  const reordered = mapSecurityUserDetail(envelope({ Roles: ["role-c", "role-a", "role-b"], EscalationRoles: [] }), selected);
  assert.equal(sameSecurityUserRelationships(detail, reordered), true);
  const changed = mapSecurityUserDetail(envelope({ Roles: ["role-c", "role-a"], EscalationRoles: [] }), selected);
  assert.equal(sameSecurityUserRelationships(detail, changed), false);
  assert.throws(() => mapSecurityUserDetail(envelope({ Name: "other", Roles: [], EscalationRoles: [] }), selected), /identity/);
  assert.throws(() => mapSecurityUserDetail(envelope({ Roles: ["valid", { Name: "bad" }], EscalationRoles: [] }), selected), /array of role names/);
});

test("maps observed role detail and direct resource grants using selected list identity", () => {
  const selected = { ref: { domain: "access", kind: "roles", provider: "sysadmin-api-v2", key: "%Manager", label: "%Manager", scope: null } };
  const detail = mapSecurityRoleDetail(envelope({
    Description: "Role description", GrantedRoles: ["%ManagerBase"], EscalationOnly: false,
    Resources: [{ Name: "%DB_USER", Permissions: "RW" }, { Name: "%Admin_Manage", Permissions: "R" }], NameSpace: "ignored", Password: "never-map",
  }), selected, "2026-09-23T00:00:00.000Z");
  assert.equal(detail.ref.key, "%Manager");
  assert.equal(detail.ref.kind, "role-detail");
  assert.equal(detail.description, "Role description");
  assert.equal(detail.escalationOnly, false);
  assert.deepEqual(detail.grantedRoles.map((ref) => [ref.key, ref.relation]), [["%ManagerBase", "direct"]]);
  assert.deepEqual(detail.resources.map(({ ref, permissions }) => [ref.kind, ref.key, ref.relation, permissions]), [
    ["resources", "%DB_USER", "direct", "RW"], ["resources", "%Admin_Manage", "direct", "R"],
  ]);
  assert.equal(JSON.stringify(detail).includes("Password"), false);
  const reordered = mapSecurityRoleDetail(envelope({
    Description: "Role description", GrantedRoles: ["%ManagerBase"], EscalationOnly: false,
    Resources: [{ Name: "%Admin_Manage", Permissions: "R" }, { Name: "%DB_USER", Permissions: "RW" }],
  }), selected);
  assert.equal(sameSecurityRoleDetail(detail, reordered), true);
  const changed = mapSecurityRoleDetail(envelope({ Description: "changed", GrantedRoles: [], EscalationOnly: false, Resources: [] }), selected);
  assert.equal(sameSecurityRoleDetail(detail, changed), false);
  assert.throws(() => mapSecurityRoleDetail(envelope({ Name: "other", Resources: [] }), selected), /identity/);
  assert.throws(() => mapSecurityRoleDetail(envelope({ Resources: [{ Name: "%DB_USER", Permissions: true }] }), selected), /permissions string/);
});

test("maps direct role owners without coercing string AdminOption or inferring holder types", () => {
  const selected = { ref: { kind: "roles", key: "%Manager" } };
  const rows = mapSecurityRoleOwners(envelope([{ Name: "ops-user", Type: "User", AdminOption: "Yes" }]), selected, "2026-09-23T00:00:00.000Z");
  assert.deepEqual(rows, [{ name: "ops-user", type: "User", adminOption: "Yes", roleKey: "%Manager", observedAt: "2026-09-23T00:00:00.000Z" }]);
  const reordered = mapSecurityRoleOwners(envelope([{ Name: "ops-user", Type: "User", AdminOption: "Yes" }]), selected);
  assert.equal(sameSecurityRoleOwners(rows, reordered), true);
  assert.throws(() => mapSecurityRoleOwners(envelope([{ Name: "ops-user", Type: "User", AdminOption: true }]), selected), /AdminOption must be a string/);
  assert.throws(() => mapSecurityRoleOwners(envelope({ Name: "ops-user" }), selected), /must be an array/);
});

test("maps selected resource detail by list identity and verifies authoritative read-back", () => {
  const selected = { ref: { domain: "access", kind: "resources", provider: "sysadmin-api-v2", key: "%DB_USER", label: "%DB_USER", scope: null } };
  const detail = mapSecurityResourceDetail(envelope({ Description: "Database user", PublicPermission: "R", Secret: "ignored" }), selected, "2026-09-23T00:00:00.000Z");
  assert.equal(detail.ref.key, "%DB_USER");
  assert.equal(detail.description, "Database user");
  assert.equal(detail.publicPermission, "R");
  assert.equal(JSON.stringify(detail).includes("Secret"), false);
  assert.equal(sameSecurityResourceDetail(detail, mapSecurityResourceDetail(envelope({ Description: "Database user", PublicPermission: "R" }), selected)), true);
  assert.equal(sameSecurityResourceDetail(detail, mapSecurityResourceDetail(envelope({ Description: "changed", PublicPermission: "R" }), selected)), false);
  assert.throws(() => mapSecurityResourceDetail(envelope({ Name: "other" }), selected), /identity/);
  assert.throws(() => mapSecurityResourceDetail(envelope({ PublicPermission: false }), selected), /must be a string/);
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

test("maps the stateful IRIS alert feed without exposing unqualified alert values", () => {
  assert.equal(READ_ONLY_SOURCES.alerts.path, "/api/monitor/alerts");
  const empty = mapReadOnlySource("alerts", [], "2026-09-24T12:00:00Z");
  assert.equal(empty.resultType, "stateful-alert-batch");
  assert.equal(empty.count, 0);
  assert.deepEqual(empty.items, []);

  const shaped = mapReadOnlySource("alerts", [{ AlertId: "must-not-render", Message: "must-not-render", Time: "now" }]);
  assert.deepEqual(shaped.items[0].values, { observedFields: ["AlertId", "Message", "Time"] });
  assert.equal(JSON.stringify(shaped).includes("must-not-render"), false);
  assert.equal(shaped.items[0].ref.volatile, true);
  assert.throws(() => mapReadOnlySource("alerts", { result: [] }), /must be an array/);
});

test("keeps empty live collections distinct and rejects failed provider envelopes", () => {
  const empty = mapReadOnlySource("walletCollections", envelope([]));
  assert.equal(empty.count, 0);
  assert.deepEqual(empty.items, []);
  assert.throws(() => mapReadOnlySource("oauthServer", envelope({ status: "error" }, ["not configured"])), /API error/);
});

test("compares allowlisted provider reads without observation time or row-order noise", () => {
  const first = mapReadOnlySource("tasks", envelope([
    { Id: 2, Name: "Second", Type: "System", Suspended: false },
    { Id: 1, Name: "First", Type: "System", Suspended: false },
  ]), "2026-09-23T12:00:00Z");
  const reordered = mapReadOnlySource("tasks", envelope([
    { Id: 1, Name: "First", Type: "System", Suspended: false },
    { Id: 2, Name: "Second", Type: "System", Suspended: false },
  ]), "2026-09-23T12:01:00Z");
  const changed = mapReadOnlySource("tasks", envelope([
    { Id: 1, Name: "First", Type: "System", Suspended: true },
    { Id: 2, Name: "Second", Type: "System", Suspended: false },
  ]), "2026-09-23T12:02:00Z");
  assert.equal(sameReadOnlySource(first, reordered), true);
  assert.equal(sameReadOnlySource(first, changed), false);
  assert.equal(sameReadOnlySource(first, mapReadOnlySource("walletCollections", envelope([]))), false);
});

test("maps task detail by the exact selected list identity and drops unapproved fields", () => {
  const selected = mapReadOnlySource("tasks", envelope([{
    Id: 41, Name: "Fixture task", Namespace: "USER", Type: "System", Suspended: false,
  }])).items[0];
  const payload = envelope({
    Id: 41, Name: "Fixture task", Namespace: "USER", Type: "System", Suspended: false,
    Description: "Safe description", Command: "must-not-escape", Password: "must-not-escape",
  });
  const detail = mapTaskDetail(payload, selected, "2026-09-23T12:00:00Z");
  const repeated = mapTaskDetail(payload, selected, "2026-09-23T12:01:00Z");
  assert.equal(detail.ref.key, "41");
  assert.equal(detail.ref.kind, "task-detail");
  assert.deepEqual(detail.values, {
    Name: "Fixture task", Type: "System", Namespace: "USER", Description: "Safe description", Suspended: false,
  });
  assert.equal(Object.hasOwn(detail.values, "Command"), false);
  assert.equal(Object.hasOwn(detail.values, "Password"), false);
  assert.equal(sameTaskDetail(detail, repeated), true);
  assert.throws(() => mapTaskDetail(envelope({ Id: 42, Name: "Fixture task" }), selected), /identity/);
});
