import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import * as provider from "../src/iris-provider.js";
import * as evidence from "../public/evidence-center.js";
import * as packages from "../public/packages-workspace.js";

const source = (await readFile(new URL("../public/app.js", import.meta.url), "utf8"))
  .replace(/^import[^\n]+\n/gm, "")
  .replace(/\nsetTheme\(state\.theme\);\s*render\(\);\s*restoreSession\(\);\s*$/, "\n");
const context = vm.createContext({ ...provider, ...evidence, ...packages, AbortSignal, TextEncoder, URL, btoa,
  document: { querySelector: () => ({ innerHTML: "" }), documentElement: { dataset: {}, clientWidth: 1440 } },
  location: { pathname: "/opsdeck", hash: "", origin: "http://fixture.test" },
  localStorage: { getItem: () => "dark", setItem() {} }, history: { replaceState() {} },
  matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {}, fetch: async () => ({}),
});
vm.runInContext(source, context);
const run = expression => vm.runInContext(expression, context);
const routes = ["overview", "applications", "access", "security", "tasks", "system", "logs", "evidence"];

test("capability projection uses observed provider/read-back state and retains all routes", () => {
  const state = { route: "applications", info: { privileges: { "%SYS": "superuser" } }, verification: { matched: true },
    sourceData: { restServices: [], restServicesV2: [] }, sourceErrors: {}, sourceLoading: "", selected: "/opsdeck", selectedItems: {}, sourceTabs: {} };
  const projection = run(`projectUiNavigation(${JSON.stringify(state)}, 1440, false)`);
  assert.deepEqual(Array.from(projection.items, item => item.route).sort(), [...routes].sort());
  assert.equal(projection.items.find(item => item.route === "applications").evidence.status, "SUPPORTED");
  assert.equal(projection.items.find(item => item.route === "overview").evidence.status, "SUPPORTED");
  assert.equal(projection.items.find(item => item.route === "logs").evidence.status, "UNKNOWN");
  assert.deepEqual(Array.from(projection.items.find(item => item.route === "logs").evidence.qualifications, item => item.status), ["UNQUALIFIED", "UNQUALIFIED", "UNQUALIFIED"]);
  assert.equal(projection.items.find(item => item.route === "evidence").contextual, true);
  assert.equal(projection.items.find(item => item.route === "applications").primary, true);
});

test("denial, unavailable, unknown, and valid-empty provider results remain distinct", () => {
  const model = { route: "access", sourceData: { users: [] }, sourceErrors: { roles: "HTTP 403", resources: "Connection timed out" }, sourceLoading: "", selectedItems: {}, sourceTabs: { access: "users" } };
  const evidence = run(`routeUiEvidence(${JSON.stringify(model)}, "access")`);
  assert.deepEqual(Array.from(evidence.sources, item => item.status), ["SUPPORTED", "DENIED", "UNAVAILABLE"]);
  assert.equal(evidence.status, "PARTIAL");
  const unknown = run(`providerUiEvidence({sourceData:{},sourceErrors:{},sourceLoading:""}, "users")`);
  assert.equal(unknown.status, "UNKNOWN");
  assert.equal(run(`providerUiEvidence({sourceErrors:{users:"Access denied"}}, "users")`).status, "DENIED");
  assert.equal(run(`providerUiEvidence({sourceErrors:{users:"Socket closed"}}, "users")`).status, "UNAVAILABLE");
});

test("broad and restricted profiles reflect provider evidence, while visible denied routes stay enabled", () => {
  const broad = { route: "access", sourceData: { users: [], roles: [], resources: [] }, sourceErrors: {}, sourceLoading: "", selectedItems: {}, sourceTabs: { access: "users" } };
  const restricted = { route: "access", sourceData: { users: [] }, sourceErrors: { roles: "HTTP 403", resources: "HTTP 403" }, sourceLoading: "", selectedItems: {}, sourceTabs: { access: "users" } };
  assert.equal(run(`routeUiEvidence(${JSON.stringify(broad)}, "access")`).status, "SUPPORTED");
  assert.equal(run(`routeUiEvidence(${JSON.stringify(restricted)}, "access")`).status, "PARTIAL");
  assert.deepEqual(Array.from(run(`routeUiEvidence(${JSON.stringify(restricted)}, "access")`).sources, item => item.status), ["SUPPORTED", "DENIED", "DENIED"]);
  const shell = run(`state.connected=true; state.info={username:"Fixture"}; state.route="access"; state.sourceData={users:[]}; state.sourceErrors={roles:"HTTP 403",resources:"HTTP 403"}; shell("")`);
  assert.match(shell, /data-route="access" data-capability-state="partial"/);
  assert.match(shell, /Route visibility does not grant IRIS authority/);
  assert.doesNotMatch(shell, /data-route="access"[^>]*\sdisabled(?:\s|>)/);
});

test("context promotion changes navigation priority without granting or removing route access", () => {
  const model = { route: "tasks", selectedItems: { tasks: "task-1" }, sourceErrors: { tasks: "HTTP 403" }, sourceTabs: { tasks: "tasks" }, sourceData: {} };
  const compact = run(`projectUiNavigation(${JSON.stringify(model)}, 390, true)`);
  assert.deepEqual(Array.from(compact.primaryRoutes), ["overview", "tasks", "evidence"]);
  assert.ok(compact.moreRoutes.includes("logs"));
  assert.deepEqual([...compact.primaryRoutes, ...compact.moreRoutes].sort(), [...routes].sort());
  assert.equal(compact.items.find(item => item.route === "evidence").evidence.status, "UNKNOWN");
  assert.equal(compact.items.find(item => item.route === "logs").contextual, true);
  const wide = run(`projectUiNavigation(${JSON.stringify(model)}, 1440, false)`);
  assert.equal(wide.layout, "wide");
  assert.deepEqual(Array.from(wide.moreRoutes), []);
  assert.equal(model.route, "tasks");
  assert.equal(model.selectedItems.tasks, "task-1");
});

test("same observed state projects identically for live and demo sessions without persona or privilege inference", () => {
  const observed = { route: "access", info: { username: "Any", privileges: { "%SYS": "none" } }, sourceData: { users: [] }, sourceErrors: {}, sourceLoading: "", selectedItems: {}, sourceTabs: { access: "users" } };
  const native = run(`projectUiNavigation(${JSON.stringify(observed)}, 820, true)`);
  const demo = run(`projectUiNavigation(${JSON.stringify({ ...observed, info: { ...observed.info, systemMode: "DEMO", username: "Superuser" } })}, 820, true)`);
  assert.deepEqual(JSON.parse(JSON.stringify(native)), JSON.parse(JSON.stringify(demo)));
});

test("projection is deterministic through wide to narrow to wide and preserves selection", () => {
  const model = { route: "applications", selected: "/opsdeck", sourceData: { restServices: [] }, sourceErrors: {}, selectedItems: {}, sourceTabs: {} };
  const initial = run(`projectUiNavigation(${JSON.stringify(model)}, 1440, false)`);
  const narrow = run(`projectUiNavigation(${JSON.stringify(model)}, 390, true)`);
  const wideAgain = run(`projectUiNavigation(${JSON.stringify(model)}, 1440, false)`);
  assert.equal(JSON.stringify(initial), JSON.stringify(wideAgain));
  assert.equal(narrow.items.find(item => item.route === "applications").active, true);
  assert.equal(model.selected, "/opsdeck");
});
