import { mapServerInfo, mapWebApps, mapWebAppDetail, mapSecurityUserDetail, sameSecurityUserRelationships, mapSecurityRoleDetail, sameSecurityRoleDetail, mapSecurityRoleOwners, sameSecurityRoleOwners, mapSecurityResourceDetail, sameSecurityResourceDetail, mapTaskDetail, sameTaskDetail, mapRestServiceSpec, mapReadOnlySource, sameReadOnlySource, READ_ONLY_SOURCES, sameWebAppState, inspectAuditLocation, validateAuditLocation, mapAuditAsyncResult, AUDIT_QUERY_MAX_ROWS } from "./iris-provider.js?v=opsdeck-0.6.0";
import { createEvidenceCollection, exportEvidenceJSON, exportEvidenceMarkdown, filterEvidence } from "./evidence-center.js?v=opsdeck-0.6.0";
import { comparePackageCatalogToInstalled, fixturePackageInventory, mapAvailablePackageCatalog, mapInstalledPackageInventory, preparePackagePlan } from "./packages-workspace.js?v=opsdeck-0.6.0";
import { mapAuditJob, upsertJob } from "./job-center.js?v=opsdeck-0.6.0";
import { ProductIdentity } from "./product-identity.js?v=opsdeck-0.6.0-about";

const navItems = [
  ["overview", "Overview"], ["applications", "Applications"], ["access", "Access"],
  ["security", "Security"], ["tasks", "Tasks"], ["system", "System"],
  ["logs", "Logs"], ["evidence", "Evidence"],
];
const domainSources = {
  applications: ["restServices", "restServicesV2"],
  access: ["users", "roles", "resources"],
  security: ["walletCollections", "x509Credentials", "oauthResourceServers", "oauthServerDefinitions", "oauthServer"],
  tasks: ["tasks"],
  system: ["systemUsage", "processes", "databases", "devices"],
  logs: ["auditEnabled", "auditEvents", "messagesLog", "messageRotations", "systemMonitorLog", "taskHistory", "journalFiles", "alerts"],
};

// Product qualification maturity is separate from observed IRIS authority/provider results.
const unqualifiedRouteCapabilities = Object.freeze({
  logs: Object.freeze(["Audit records", "messages.log", "SystemMonitor.log"]),
});
const navigationContextRoutes = Object.freeze({
  access: ["security"], security: ["access"], system: ["logs"], logs: ["evidence"],
});

function isAuthorityDenial(error) {
  return /does not have authority|HTTP 403|denied/i.test(String(error || ""));
}

function providerUiEvidence(model, sourceId) {
  if (sourceId === "identity") {
    if (model.info) return { status: "SUPPORTED", detail: "Identity was observed in the current session." };
    if (model.error) return { status: isAuthorityDenial(model.error) ? "DENIED" : "UNAVAILABLE", detail: model.error };
    return { status: "UNKNOWN", detail: "Identity has not been observed in this session." };
  }
  if (sourceId === "webApps") {
    if (model.verification) return model.verification.matched
      ? { status: "SUPPORTED", detail: "The current web-application result matched its independent read-back." }
      : { status: "PARTIAL", detail: "The current web-application result differed from its independent read-back." };
    if (model.error) return { status: isAuthorityDenial(model.error) ? "DENIED" : "UNAVAILABLE", detail: model.error };
    return { status: "UNKNOWN", detail: "No current web-application read-back is available." };
  }
  if (!Object.hasOwn(READ_ONLY_SOURCES, sourceId)) {
    return { status: "UNSUPPORTED", detail: "No fixed provider is registered for this source." };
  }
  if (Object.hasOwn(model.sourceData || {}, sourceId) && model.sourceData[sourceId]) {
    const state = model.sourceData[sourceId].status;
    if (state === "denied") return { status: "DENIED", detail: "IRIS denied this fixed-source read." };
    if (state === "unavailable") return { status: "UNAVAILABLE", detail: "The fixed source is unavailable." };
    if (state === "read-failure") return { status: "FAILED", detail: "The fixed-source read failed." };
    // A valid empty collection is still an observed, available provider result.
    return { status: "SUPPORTED", detail: state === "empty" ? `${READ_ONLY_SOURCES[sourceId].label} returned a valid empty result.` : `${READ_ONLY_SOURCES[sourceId].label} returned a mapped result.` };
  }
  if (Object.hasOwn(model.sourceErrors || {}, sourceId)) {
    const error = model.sourceErrors[sourceId];
    return { status: isAuthorityDenial(error) ? "DENIED" : "UNAVAILABLE", detail: String(error) };
  }
  return {
    status: "UNKNOWN",
    detail: model.sourceLoading === sourceId ? `${READ_ONLY_SOURCES[sourceId].label} is being read.` : `${READ_ONLY_SOURCES[sourceId].label} has not been read in this session.`,
  };
}

function routeUiEvidence(model, route) {
  let sourceIds;
  if (route === "overview") sourceIds = ["identity", "webApps"];
  else if (route === "applications") sourceIds = ["webApps", ...domainSources.applications];
  else if (route === "evidence") sourceIds = ["webApps"];
  else if (domainSources[route]) sourceIds = domainSources[route];
  else return { status: "UNSUPPORTED", sources: [], qualifications: [], detail: "No OpsDeck route or provider is registered for this destination." };

  const sources = sourceIds.map((id) => ({ id, label: id === "identity" ? "Server identity" : id === "webApps" ? "Web applications" : READ_ONLY_SOURCES[id]?.label || id, ...providerUiEvidence(model, id) }));
  const observed = sources.filter((source) => source.status !== "UNKNOWN");
  let status = "UNKNOWN";
  if (observed.length === sources.length && observed.every((source) => source.status === "SUPPORTED")) status = "SUPPORTED";
  else if (observed.length === sources.length && observed.length > 0 && observed.every((source) => source.status === "DENIED")) status = "DENIED";
  else if (observed.length === sources.length && observed.length > 0 && observed.every((source) => source.status === "UNAVAILABLE")) status = "UNAVAILABLE";
  else if (observed.length > 0) status = "PARTIAL";

  const qualifications = (unqualifiedRouteCapabilities[route] || []).map((label) => ({ label, status: "UNQUALIFIED" }));
  const detail = [
    ...sources.map((source) => `${source.label}: ${source.status.toLowerCase()}`),
    ...qualifications.map((item) => `${item.label}: unqualified`),
  ].join("; ");
  return { status, sources, qualifications, detail };
}

function relatedNavigationRoutes(model, route) {
  const related = [...(navigationContextRoutes[route] || [])];
  if (route === "applications" && model.selected) related.unshift("evidence");
  if (route === "access" && model.selectedItems?.[model.sourceTabs?.access]) related.unshift("security");
  if (route === "tasks" && model.selectedItems?.tasks) related.unshift("logs");
  const activeSources = domainSources[route] || [];
  if (activeSources.some((sourceId) => Object.hasOwn(model.sourceErrors || {}, sourceId))) related.unshift("evidence");
  return [...new Set(related)].filter((item) => item !== route && navItems.some(([id]) => id === item));
}

function projectUiNavigation(model, viewportWidth = 1024, compactLayout = viewportWidth <= 980) {
  const activeRoute = navItems.some(([route]) => route === model.route) ? model.route : "overview";
  const related = relatedNavigationRoutes(model, activeRoute);
  const order = [
    "overview",
    ...(activeRoute === "overview" ? [] : [activeRoute]),
    ...related,
    ...navItems.map(([route]) => route),
  ].filter((route, index, all) => all.indexOf(route) === index);
  const primaryCount = compactLayout ? 3 : order.length;
  const items = order.map((route, index) => {
    const [, label] = navItems.find(([id]) => id === route);
    const evidence = routeUiEvidence(model, route);
    return { route, label, evidence, active: route === activeRoute, contextual: related.includes(route) && route !== activeRoute, primary: index < primaryCount };
  });
  return {
    viewportWidth,
    layout: compactLayout ? "compact" : "wide",
    items,
    primaryRoutes: items.filter((item) => item.primary).map((item) => item.route),
    moreRoutes: items.filter((item) => !item.primary).map((item) => item.route),
  };
}
const state = {
  route: location.hash.slice(1) || "overview",
  theme: localStorage.getItem("opsdeck.theme") || "dark",
  connected: false,
  busy: false,
  error: "",
  info: null,
  apps: [],
  selected: "",
  lastRead: null,
  verification: null,
  sourceData: {}, sourceErrors: {}, sourceLoading: "", sourceVerification: {}, selectedRotation: "", rotationLoading: "",
  sourceTabs: { applications: "restServices", access: "users", security: "walletCollections", tasks: "tasks", system: "systemUsage", logs: "auditEnabled" },
  systemSection: "providers",
  selectedItems: {},
  evidenceFilter: "",
  evidenceStateFilter: "ALL",
  applicationsTab: "web-apps",
  packageFilter: "all",
  packagePlan: null,
  packageInventory: null,
  packageInventoryError: "",
  packageInventoryLoading: false,
  availablePackageName: "",
  availablePackageCatalog: null,
  availablePackageError: "",
  availablePackageErrorStatus: 0,
  availablePackageLoading: false,
  selectedSnippet: "",
  snippetText: "",
  snippetLoading: false,
  snippetError: "",
  webAppDetails: {}, webAppDetailErrors: {}, webAppDetailLoading: "",
  userDetails: {}, userDetailErrors: {}, userDetailLoading: "", userDetailVerification: {},
  roleDetails: {}, roleDetailErrors: {}, roleDetailLoading: "", roleDetailVerification: {},
  roleOwners: {}, roleOwnerErrors: {}, roleOwnerLoading: "", roleOwnerVerification: {},
  resourceDetails: {}, resourceDetailErrors: {}, resourceDetailLoading: "", resourceDetailVerification: {},
  taskDetails: {}, taskDetailErrors: {}, taskDetailLoading: "", taskDetailVerification: {},
  restSpecs: {}, restSpecErrors: {}, restSpecLoading: "",
  auditQuery: null, auditQueryBusy: false, jobs: [],
  mobileMoreOpen: false,
};

const nativeMode = location.pathname === "/opsdeck" || location.pathname?.startsWith("/opsdeck/") === true;
let nativeAuthorization = null;
let sessionEpoch = 0;
let nextSnapshot = 0;
const snapshotIds = new WeakMap();
function recordHandle(data, index) {
  if (!snapshotIds.has(data)) snapshotIds.set(data, ++nextSnapshot);
  return `snapshot:${snapshotIds.get(data)}:${index}`;
}
function uniqueRecord(items, predicate) {
  const matches = (items || []).filter(predicate);
  return matches.length === 1 ? matches[0] : null;
}
const app = document.querySelector("#app");
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const fmtTime = (value) => value ? new Intl.DateTimeFormat(undefined, {
  hour: "2-digit", minute: "2-digit", second: "2-digit",
}).format(new Date(value)) : "—";

const IRIS_CONCEPTS = Object.freeze({
  namespace: Object.freeze({ title: "Namespace", body: "A namespace is IRIS's logical view of code and data. A namespace shown on a row scopes that observation; it does not establish an all-namespace inventory." }),
  sys: Object.freeze({ title: "%SYS", body: "%SYS exposes system and administrative code. Seeing a %SYS row does not grant this signed-in identity any additional privilege." }),
  ipm: Object.freeze({ title: "IPM package state", body: "Installed registrations and configured-repository search are separate observations. A catalog result is not an installation, and a lower catalog version is not an update." }),
  access: Object.freeze({ title: "DENIED and UNAVAILABLE", body: "DENIED means IRIS rejected this identity's request. UNAVAILABLE means OpsDeck could not obtain a usable response. Neither state means the source is empty." }),
  readback: Object.freeze({ title: "Authoritative read-back", body: "After a request, a separate read from IRIS must show the requested state before OpsDeck can call the operation verified. An HTTP success alone is not proof." }),
  job: Object.freeze({ title: "Asynchronous Job", body: "A returned job identity means work was accepted. Completion and its result are separate observations; OpsDeck does not retry an ambiguous dispatch." }),
  logs: Object.freeze({ title: "Fixed log observation", body: "OpsDeck reads only named log sources through bounded readers. This view does not browse arbitrary files or expose the resolved source path." }),
  evidence: Object.freeze({ title: "OperationReceipt", body: "A receipt records OpsDeck's bounded before/request/after verification projection. IRIS remains the source of truth; a receipt does not replace it." }),
  certainty: Object.freeze({ title: "KNOWN / INFERRED / UNVERIFIED", body: "KNOWN is directly observed, INFERRED is a conclusion drawn from observations, and UNVERIFIED marks a claim that has not crossed its required qualification boundary." }),
});
const CONCEPTS_BY_ROUTE = Object.freeze({
  overview: ["namespace", "sys"],
  applications: { "web-apps": ["namespace", "readback"], packages: ["ipm"] },
  access: ["access"], security: ["access"], tasks: ["job", "readback"],
  system: ["namespace"], logs: ["logs", "access"], evidence: ["evidence", "certainty", "readback"],
});
const LEARNING_SNIPPETS = Object.freeze([
  Object.freeze({ id: "namespace", title: "Inspect the current namespace", file: "snippet-namespace.txt" }),
  Object.freeze({ id: "try-catch", title: "Handle an ObjectScript exception", file: "snippet-try-catch.txt" }),
  Object.freeze({ id: "http-read", title: "Make a bounded HTTP GET", file: "snippet-http-read.txt" }),
]);

async function requestJson(path, options = {}) {
  const owner = sessionEpoch;
  let response;
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  if (nativeMode && nativeAuthorization) headers.Authorization = nativeAuthorization;
  try {
    response = await fetch(path, {
      cache: "no-store",
      credentials: "same-origin",
      headers,
      ...options,
      signal: options.signal || AbortSignal.timeout(20000),
    });
  } catch (error) {
    if (owner !== sessionEpoch) throw new Error("Previous session request discarded.");
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new Error(`Timed out waiting for ${nativeMode ? "IRIS" : "the local OpsDeck proxy"}.`);
    }
    throw new Error(`Could not reach ${nativeMode ? "IRIS" : "the local OpsDeck proxy"}.`);
  }
  const data = await response.json().catch(() => ({}));
  if (owner !== sessionEpoch) throw new Error("Previous session request discarded.");
  if (!response.ok) {
    if (response.status === 401) { clearSession(); state.error = "Authentication failed (HTTP 401). Sign in again."; render(); }
    const messages = Array.isArray(data.status?.errors) ? data.status.errors
      .map((item) => typeof item === "string" ? item : item?.message || item?.error)
      .filter((item) => typeof item === "string" && item.trim()) : [];
    const message = nativeMode && response.status === 401 ? "IRIS authentication failed (HTTP 401)." : (typeof data.error === "string" && data.error.trim()) || messages.join(" ") || `Request failed with HTTP ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

function setTheme(theme) {
  state.theme = theme;
  localStorage.setItem("opsdeck.theme", theme);
  const resolved = theme === "system"
    ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : theme;
  document.documentElement.dataset.theme = resolved;
}

function badge(label, tone = "neutral") {
  return `<span class="badge ${esc(tone)}">${esc(label)}</span>`;
}

function environmentBadge(systemMode) {
  const presentation = {
    DEMO: ["DEMO", "warning"],
    DEVELOPMENT: ["DEVELOPMENT", "accent"],
    TEST: ["TEST", "warning"],
    LIVE: ["LIVE / PRODUCTION", "error"],
    FAILOVER: ["FAILOVER", "error"],
  }[systemMode];
  return presentation ? `<span class="environment-identity" aria-label="Observed IRIS system mode">${badge(presentation[0], presentation[1])}</span>` : "";
}

function shell(content) {
  const user = state.info ? esc(state.info.username) : "Not connected";
  const version = state.info ? esc(state.info.serverVersion) : "Local instance not verified";
  const connected = state.connected;
  const demoMode = state.info?.systemMode === "DEMO";
  return `
    <div class="shell">
      <header class="topbar">
        <a class="brand" href="#overview" aria-label="OpsDeck overview"><span class="brand-mark">OD</span><span>OpsDeck</span></a>
        <div class="instance-line"><span class="instance-label">${demoMode ? "Demo dataset" : "IRIS instance"}</span><span class="instance-value">${version}</span>${connected ? environmentBadge(state.info?.systemMode) : ""}</div>
        <div class="top-actions">
          <span class="connection-state">${badge(connected ? (demoMode ? "Safe demo" : "Live session") : "Disconnected", connected ? (demoMode ? "warning" : "success") : "muted")}</span>
          ${connected ? `<span class="user-chip">${user}</span>` : ""}
          ${connected && !demoMode ? '<button class="button quiet" id="disconnect-button" type="button">Sign out</button>' : ""}
          <label class="theme-picker"><span class="sr-only">Color theme</span><select id="theme-select" aria-label="Color theme"><option value="dark" ${state.theme === "dark" ? "selected" : ""}>Dark</option><option value="light" ${state.theme === "light" ? "selected" : ""}>Light</option><option value="system" ${state.theme === "system" ? "selected" : ""}>System</option></select></label>
        </div>
      </header>
      <aside class="sidebar ${state.mobileMoreOpen ? "more-open" : ""}" id="mobile-secondary-nav" aria-label="Primary navigation">
        <div class="nav-caption">WORKSPACE</div>
        ${(() => {
          const projection = projectUiNavigation(state, document.documentElement.clientWidth || 1024, compactNavigationQuery.matches);
          return projection.items.map((item, index) => {
            const stateClass = item.evidence.status.toLowerCase().replaceAll("_", "-");
            const qualification = item.evidence.qualifications.length ? item.evidence.qualifications.map((entry) => entry.label).join(", ") : "";
            const statusText = `${item.label}: ${item.evidence.status}${qualification ? ` · unqualified: ${qualification}` : ""}`;
            return `<button class="nav-item ${item.primary ? "nav-primary" : "nav-secondary"} ${item.active ? "active" : ""} ${item.contextual ? "nav-contextual" : ""}" data-route="${item.route}" data-capability-state="${item.evidence.status.toLowerCase()}" data-context-priority="${item.contextual}" aria-label="${esc(`${item.label}. ${statusText}. Route visibility does not grant IRIS authority.`)}" title="${esc(`${statusText}. ${item.evidence.detail}`)}" ${item.active ? 'aria-current="page"' : ""}><span class="nav-index">${String(navItems.findIndex(([route]) => route === item.route) + 1).padStart(2, "0")}</span><span class="nav-label">${esc(item.label)}</span><span class="nav-capability badge ${item.evidence.status === "SUPPORTED" ? "success" : ["DENIED", "UNAVAILABLE"].includes(item.evidence.status) ? "error" : ["PARTIAL", "UNQUALIFIED"].includes(item.evidence.status) || qualification ? "warning" : "muted"}"><span class="nav-capability-dot" aria-hidden="true"></span><span class="nav-capability-label">${esc(item.evidence.status)}</span></span>${qualification ? `<span class="nav-qualification badge warning" title="${esc(`${qualification} remains unqualified`)}"><span class="nav-qualification-label">Unqualified</span></span>` : ""}</button>`;
          }).join("");
        })()}
        ${compactNavigationQuery.matches ? `<button class="nav-item nav-more" id="mobile-more" type="button" aria-expanded="${state.mobileMoreOpen}" aria-controls="mobile-secondary-nav">More</button>` : ""}
        <div class="sidebar-note"><span class="note-dot"></span><span>${demoMode ? "Safe demo · sanitized" : "Live reads · M1"}</span></div>
      </aside>
      <main class="workspace">${content}</main>
      <footer class="statusbar"><span><i class="status-dot ${connected ? "online" : ""}"></i>${connected ? (demoMode ? "Safe demo provider active" : "IRIS connection active") : "Connect to your local IRIS instance"}</span><span>${demoMode ? "Sanitized deterministic data · no IRIS connection" : nativeMode ? "Same-origin session · credentials remain in tab memory" : "Loopback session · credentials are not saved"}</span><span>Last read ${fmtTime(state.lastRead)}</span></footer>
    </div>`;
}

function connectView() {
  const error = state.error ? `<div class="notice error" role="alert">${esc(state.error)}</div>` : "";
  return shell(`
    <section class="connect-layout">
      <div class="intro-block">
        <div class="eyebrow"><span class="eyebrow-rule"></span>LIVE ENVIRONMENT · LOCAL ONLY</div>
        <h1>Operations,<br><span>with evidence.</span></h1>
        <p>Connect to the local IRIS instance to load its identity and web applications from the authoritative SysAdmin API.</p>
        <div class="promise-list"><div><span class="promise-check">01</span><span>${nativeMode ? "Credentials stay in this tab's memory and are sent directly to same-origin IRIS APIs." : "Credentials remain in this browser request and the local proxy process."}</span></div><div><span class="promise-check">02</span><span>Only fixed read-only IRIS source routes are enabled.</span></div><div><span class="promise-check">03</span><span>A second live read checks the result shown on screen.</span></div></div>
      </div>
      <form id="connect-form" class="connect-card" autocomplete="off">
        <div class="card-overline">SECURE LOCAL SESSION</div>
        <h2>Connect to IRIS</h2>
        <p class="card-copy">Use an account allowed to read server information and web applications.</p>
        ${error}
        <label for="username">Username</label>
        <input id="username" name="username" autocomplete="username" required maxlength="128">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="off" required maxlength="512">
        <button class="button primary connect-button" type="submit" ${state.busy ? "disabled" : ""}>${state.busy ? '<span class="spinner"></span>Checking connection…' : "Connect to local IRIS"}</button>
        <div class="local-only"><span class="lock-icon" aria-hidden="true">⌑</span> ${nativeMode ? "Direct to same-origin IRIS · HTTP Basic" : "Requests stay on this computer · HTTP Basic · loopback only"}</div>
      </form>
    </section>
    <section class="gate-strip"><div><span class="gate-kicker">M0 PASSED</span><strong>Live API identity + applications</strong></div><div>${badge("M1 read-only", "accent")}</div><p>Connected sessions can browse verified M1 providers. Mutation workflows remain gated until fixture and read-back qualification.</p></section>`);
}



function demoPersonaProfile() {
  if (state.info?.systemMode !== "DEMO") return null;
  const profiles = {
    DemoOperator: {
      label: "Operations",
      mission: "Inspect runtime health, scheduled work, applications, and operational logs without security-administration access.",
      allowed: ["Applications", "Tasks", "System", "Logs"],
      withheld: ["Access", "Security"],
    },
    DemoSecurity: {
      label: "Security Administrator",
      mission: "Inspect identities, roles, resources, credential metadata, applications, and security-relevant logs.",
      allowed: ["Applications", "Access", "Security", "Logs"],
      withheld: ["Tasks", "System"],
    },
    DemoAppAdmin: {
      label: "Application Administrator",
      mission: "Inspect application registration and REST relationships while unrelated administrative domains remain outside the persona.",
      allowed: ["Applications"],
      withheld: ["Access", "Security", "Tasks", "System", "Logs"],
    },
    DemoRestricted: {
      label: "Restricted User",
      mission: "Demonstrate that insufficient authority is visible as an access boundary rather than being misreported as empty operational state.",
      allowed: ["Overview"],
      withheld: ["Applications", "Access", "Security", "Tasks", "System", "Logs"],
    },
  };
  return profiles[state.info.username] || null;
}

function demoPersonaCard() {
  const profile = demoPersonaProfile();
  if (!profile) return "";
  const chips = (items, tone) => items.map((item) => badge(item, tone)).join("");
  return `
    <section class="panel persona-story" aria-labelledby="persona-story-title">
      <div class="persona-story-main">
        <div class="panel-kicker">CURRENT DEMO PERSONA</div>
        <h2 id="persona-story-title">${esc(profile.label)}</h2>
        <p>${esc(profile.mission)}</p>
      </div>
      <div class="persona-scope">
        <div><strong>In scope</strong><span class="persona-chips">${chips(profile.allowed, "success")}</span></div>
        <div><strong>Withheld by persona</strong><span class="persona-chips">${chips(profile.withheld, "muted")}</span></div>
      </div>
      <p class="persona-hint">Use the <strong>DEMO ACCESS</strong> selector above to switch identities. The dataset stays deterministic; only authority changes.</p>
    </section>`;
}

function safeDemoTour() {
  if (state.info?.systemMode !== "DEMO") return "";
  return `
    <section class="panel judge-tour" aria-labelledby="judge-tour-title">
      <div class="panel-head"><div><div class="panel-kicker">EVALUATOR SHORTCUT</div><h2 id="judge-tour-title">90-second judge tour</h2></div>${badge("Safe demo", "warning")}</div>
      <p class="judge-tour-copy">This demo uses deterministic sanitized sample data, but exercises the same UI, mapping, access-boundary, and evidence semantics as OpsDeck. It does not claim a live IRIS connection.</p>
      <div class="judge-tour-steps">
        <button class="tour-step" data-route="applications"><span>01</span><strong>Applications</strong><small>Inspect application identity and read-back semantics.</small></button>
        <button class="tour-step" data-route="access"><span>02</span><strong>Access</strong><small>Follow user, role, resource, and ownership relationships.</small></button>
        <button class="tour-step" data-route="security"><span>03</span><strong>Boundaries</strong><small>See valid empty and deliberately unavailable sources stay distinct.</small></button>
        <button class="tour-step" data-route="evidence"><span>04</span><strong>Evidence</strong><small>See what is verified, unavailable, blocked, or still unqualified.</small></button>
      </div>
    </section>`;
}

function overviewView() {
  const info = state.info;
  if (!info) {
    return shell(`${pageHeader("Overview", "Loading the live identity and application state.")}<section class="panel empty-state" role="status"><div class="panel-kicker">RESTORING SESSION</div><h2>Checking IRIS state</h2><p>The session is valid. OpsDeck is reading the authoritative identity and web-application list.</p></section>`);
  }
  const privilegeCount = info.privileges ? Object.values(info.privileges).filter(Boolean).length : null;
  const demoMode = info.systemMode === "DEMO";
  return shell(`
    ${pageHeader("Overview", demoMode ? "Explore the evaluator-safe dataset and OpsDeck evidence semantics." : "A verified view of the connected instance.")}
    <section class="overview-grid">
      <article class="panel identity-panel">
        <div class="panel-head"><div><div class="panel-kicker">${demoMode ? "SANITIZED DEMO IDENTITY" : "CONNECTED INSTANCE"}</div><h2>Server identity</h2></div>${badge(demoMode ? "Demo" : "Live", demoMode ? "warning" : "success")}</div>
        <dl class="identity-grid">
          <dt>Server</dt><dd>${esc(info.serverVersion)}</dd>
          <dt>Product</dt><dd>${esc(info.product)}</dd>
          <dt>API</dt><dd>SysAdmin v${esc(info.apiVersion)}</dd>
          <dt>Account</dt><dd>${esc(info.username)}</dd>
          <dt>Namespaces</dt><dd>${info.namespaces ? (info.namespaces.map((item) => `<span class="inline-code">${esc(item.name)}</span>`).join(" ") || "None returned") : "Not returned"}</dd>
          <dt>Privileges</dt><dd>${privilegeCount === null ? "Not returned" : `${privilegeCount} enabled flags reported · Secure ${Object.hasOwn(info.privileges, "Secure") ? (info.privileges.Secure ? "available" : "not available") : "not returned"}`}</dd>
        </dl>
        <div class="panel-foot">Identity source <code>GET /api/admin/info</code> · ${fmtTime(info.observedAt)}</div>
      </article>
      <article class="panel read-panel">
        <div class="panel-head"><div><div class="panel-kicker">${demoMode ? "DEMO CONTRACT READ" : "AUTHORITATIVE READ"}</div><h2>Web applications</h2></div><button class="button quiet" id="refresh-button" ${state.busy ? "disabled" : ""}>Refresh</button></div>
        <div class="read-metric"><strong>${state.apps.length}</strong><span>applications returned</span></div>
        <p class="read-summary">${state.apps.length ? `First resource <code>${esc(state.apps[0].name)}</code> in namespace <code>${esc(state.apps[0].namespace)}</code>.` : "The live API returned an empty collection."}</p>
        <div class="readback-row">${state.verification ? badge(state.verification.matched ? (demoMode ? "Demo repeat matched" : "Read-back verified") : "Read-back mismatch", state.verification.matched ? "success" : "error") : badge("Read-back pending", "muted")}<span>${state.verification ? `${state.verification.count} entries compared at ${fmtTime(state.verification.at)}` : "A second read follows each refresh."}</span></div>
        <div class="panel-foot">List source <code>GET /api/admin/v2/web-apps</code></div>
      </article>
    </section>
    ${state.error ? `<div class="notice error" role="alert">${esc(state.error)}</div>` : ""}
    ${safeDemoTour()}
    ${demoPersonaCard()}
    <section class="panel roadmap-panel"><div class="panel-head"><div><div class="panel-kicker">PRODUCT COVERAGE</div><h2>Operations workspace</h2></div>${badge(demoMode ? "Evaluator-safe surface" : "M0 reproduced · M1 in progress", demoMode ? "accent" : "warning")}</div><div class="roadmap-grid">${navItems.slice(2).map(([, title], i) => `<div class="roadmap-item"><span class="roadmap-index">${String(i + 2).padStart(2, "0")}</span><strong>${title}</strong><span>${["Users, roles and resources", "Credential metadata", "Task inventory", "System and process views", "Audit and journal sources", "Qualification and evidence receipts"][i]}</span></div>`).join("")}</div><p class="roadmap-note">${demoMode ? "Evaluator mode uses a deterministic demo provider. Live OpsDeck uses fixed read-only providers and never substitutes demo records for failed IRIS reads." : "Live values come from fixed read-only providers. OpsDeck does not substitute fixtures for IRIS data."}</p></section>`);
}

function pageHeader(title, description) {
  const demoMode = state.info?.systemMode === "DEMO";
  const routeHelp = CONCEPTS_BY_ROUTE[state.route];
  const conceptIds = Array.isArray(routeHelp) ? routeHelp : routeHelp?.[state.applicationsTab] || [];
  const help = conceptIds.length ? `<details class="concept-help"><summary>IRIS concepts in this view</summary><ul>${conceptIds.map((id) => `<li><strong>${esc(IRIS_CONCEPTS[id].title)}:</strong> ${esc(IRIS_CONCEPTS[id].body)}</li>`).join("")}</ul></details>` : "";
  const snippetBody = state.selectedSnippet ? `<div class="snippet-body"><pre><code>${esc(state.snippetText || "")}</code></pre>${state.snippetLoading ? '<p role="status">Loading text…</p>' : ""}${state.snippetError ? `<p class="snippet-error" role="alert">${esc(state.snippetError)}</p>` : ""}${state.snippetText ? `<button class="button quiet" type="button" data-download-snippet="${esc(state.selectedSnippet)}">Download .txt</button>` : ""}<p class="snippet-note">Text for learning and review only. OpsDeck never executes snippets.</p></div>` : "";
  const snippets = `<details class="concept-help snippet-library" ${state.selectedSnippet ? "open" : ""}><summary>ObjectScript snippet library</summary><p class="snippet-note">Small read-only examples. Select one to load its text.</p><ul>${LEARNING_SNIPPETS.map(item => `<li><button class="snippet-select" type="button" data-snippet="${esc(item.id)}">${esc(item.title)}</button></li>`).join("")}</ul>${snippetBody}</details>`;
  return `<div class="page-header"><div><div class="eyebrow"><span class="eyebrow-rule"></span>OPSDECK WORKSPACE</div><h1>${title}</h1><p>${description}</p></div><div class="page-header-meta">${demoMode ? badge("Evaluator mode", "warning") : badge("IRIS 2026.2", "accent")}${help}${snippets}</div></div>`;
}

function applicationsView() {
  if (state.applicationsTab === "packages") {
    const description = state.info?.systemMode === "DEMO"
      ? "Review a visibly synthetic package planning fixture."
      : "Inspect installed packages when a bounded live IPM provider is qualified.";
    return shell(`${pageHeader("Applications", description)}${applicationsTabs()}${packagesWorkspaceView()}`);
  }
  const selected = state.apps.find((item, index) => recordHandle(state.apps, index) === state.selected) || state.apps[0] || null;
  const rows = state.apps.map((item, index) => `<tr class="app-row ${selected === item ? "selected" : ""}" tabindex="0" role="button" data-app="${recordHandle(state.apps, index)}" aria-label="Inspect ${esc(item.name)}"><td data-label="Web application"><span class="app-name">${esc(item.name)}</span><span class="app-sub">${esc(item.dispatchClass || item.type)}</span></td><td data-label="Namespace"><code>${esc(item.namespace)}</code></td><td data-label="State">${item.enabled ? badge("Enabled", "success") : badge("Disabled", "muted")}</td><td data-label="Type">${esc(item.type)}</td><td data-label="Authentication">${esc(item.authenticationMethods.join(", ") || "None returned")}</td></tr>`).join("");
  const detail = selected ? state.webAppDetails[selected.name] : null;
  const detailError = selected ? state.webAppDetailErrors[selected.name] : null;
  const restMatches = selected ? restServiceMatches(selected) : [];
  const detailContent = !selected ? `<div class="source-message">Select a web application.</div>` :
    !uniqueRecord(state.apps, item => item.name === selected.name) ? `<div class="source-message">Detail requires an unambiguous provider name. A scoped detail request is not qualified.</div>` :
    state.webAppDetailLoading === selected.name ? `<div class="source-message">Loading authoritative web-app detail…</div>` :
      detailError ? `<div class="source-message source-error" role="alert"><strong>Detail unavailable</strong><p>${esc(detailError)}</p><code>GET /api/admin/v2/web-app?name=…</code></div>` :
        detail ? `<dl class="detail-grid">${Object.entries(detail.values).map(([key, value]) => `<dt>${esc(key)}</dt><dd>${cellValue(value)}</dd>`).join("")}</dl><div class="inspector-foot">GET /api/admin/v2/web-app · ${esc(detail.ref.provider)} · observed ${fmtTime(detail.ref.observedAt)}</div>` :
          `<p class="app-sub">Expanded configuration is fetched only when requested.</p><button class="button secondary" data-load-webapp-detail="${esc(selected.name)}">Load authoritative detail</button>`;
  const relationshipContent = !selected ? "" : restMatches.length ? restMatches.map(({ sourceId, item }) => {
    const specKey = JSON.stringify([sourceId, item.ref.key, item.ref.scope]);
    const spec = state.restSpecs[specKey];
    const specError = state.restSpecErrors[specKey];
    const specContent = state.restSpecLoading === specKey ? `<div class="source-message">Loading the authoritative REST specification…</div>` :
      specError ? `<div class="source-message source-error" role="alert">${esc(specError)}</div>` :
        spec ? `<div class="spec-summary"><div>${esc(spec.format)} · ${spec.operationCount} operations</div><strong>${esc(spec.title)}${spec.version ? ` · ${esc(spec.version)}` : ""}</strong><ul>${spec.operations.slice(0, 12).map((operation) => `<li><code>${esc(operation.method)} ${esc(operation.path)}</code>${operation.summary ? ` · ${esc(operation.summary)}` : ""}</li>`).join("")}</ul>${spec.operationCount > 12 ? `<p>Showing 12 of ${spec.operationCount} operations.</p>` : ""}</div>` :
          item.values.swaggerSpec ? `<button class="button quiet" data-load-rest-spec="${esc(specKey)}">Retrieve live specification</button>` : `<span class="app-sub">IRIS did not publish a specification link.</span>`;
    return `<div class="relationship-item"><div><strong>${esc(item.ref.label)}</strong><span>${esc(item.values.dispatchClass || "REST service")} · ${esc(sourceId === "restServices" ? "management REST v1" : "management REST v2")}</span></div>${specContent}</div>`;
  }).join("") : `<div class="source-message">No exact REST-service link has been observed for this web application. Check both live discovery sources; OpsDeck does not infer a relationship from dispatch-class names.</div>`;
  return shell(`
    ${pageHeader("Applications", "Live web applications from the IRIS management API.")}
    ${applicationsTabs()}
    <div class="app-toolbar"><div><strong>${state.apps.length}</strong><span> web applications</span><span class="toolbar-divider">·</span><span>Scope <code>All returned namespaces</code></span></div><div>${state.verification ? badge(state.verification.matched ? "Authoritative read-back matched" : "Read-back mismatch", state.verification.matched ? "success" : "error") : badge("Read-back pending", "muted")}</div></div>
    ${state.error ? `<div class="notice error" role="alert">${esc(state.error)}</div>` : ""}
    <section class="apps-layout">
      <article class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>Web application</th><th>Namespace</th><th>State</th><th>Type</th><th>Authentication</th></tr></thead><tbody>${rows || `<tr><td colspan="5" class="empty-cell">No web applications were returned by IRIS.</td></tr>`}</tbody></table></div><div class="panel-foot">Provider <code>SysAdmin API v2</code> · Updated ${fmtTime(state.lastRead)}</div></article>
      <aside class="panel inspector"><div class="panel-kicker">RESOURCE INSPECTOR</div>${selected ? `<h2 class="inspector-title"><code>${esc(selected.name)}</code></h2><p class="inspector-sub">Provider-owned identity · namespace scoped</p><dl class="detail-grid"><dt>Namespace</dt><dd><code>${esc(selected.namespace)}</code></dd><dt>Enabled</dt><dd>${selected.enabled ? "Yes" : "No"}</dd><dt>Type</dt><dd>${selected.type === null ? "Not returned" : esc(selected.type)}</dd><dt>Resource</dt><dd>${selected.resource === null ? "Not returned" : selected.resource ? `<code>${esc(selected.resource)}</code>` : "None"}</dd><dt>Authentication</dt><dd>${esc(selected.authenticationMethods.join(", ") || "None returned")}</dd><dt>Default namespace</dt><dd>${selected.namespaceDefault === null ? "Not returned" : selected.namespaceDefault ? "Yes" : "No"}</dd><dt>System application</dt><dd>${selected.isSystemApp === null ? "Not returned" : selected.isSystemApp ? "Yes" : "No"}</dd><dt>Dispatch class</dt><dd>${selected.dispatchClass === null ? "Not returned" : selected.dispatchClass ? `<code>${esc(selected.dispatchClass)}</code>` : "None"}</dd></dl><div class="inspector-foot">Key <code>${esc(selected.ref.key)}</code> · refreshed ${fmtTime(selected.ref.observedAt)}</div><section class="inspector-section"><div class="panel-kicker">AUTHORITATIVE DETAIL</div>${detailContent}</section><section class="inspector-section"><div class="panel-kicker">REST SERVICE RELATIONSHIP</div>${relationshipContent}</section>` : `<div class="empty-inspector">Select an application to inspect its observed fields.</div>`}</aside>
    </section>
    <section class="verification-banner ${state.verification?.matched ? "verified" : state.verification ? "mismatch" : "pending"}"><div class="verification-symbol">${state.verification?.matched ? "✓" : state.verification ? "!" : "·"}</div><div><strong>${state.verification?.matched ? "Read-back confirmed" : state.verification ? "Read-back requires review" : "Waiting for authoritative read-back"}</strong><p>${state.verification ? `${state.verification.count} web-app records from the rendered list were compared with a second GET response.` : "OpsDeck performs a separate read after the initial list is rendered."}</p></div><code>GET /api/admin/v2/web-apps</code></section>
    <section class="panel provider-panel"><div class="panel-head"><div><div class="panel-kicker">REST DISCOVERY</div><h2>Namespace REST services</h2></div>${badge("Live source", "accent")}</div>${sourceSelector("applications")}${sourcePanel(state.sourceTabs.applications)}</section>`);
}

function applicationsTabs() {
  return `<div class="source-tabs application-tabs" role="tablist" aria-label="Applications workspace"><button class="source-tab ${state.applicationsTab === "web-apps" ? "active" : ""}" role="tab" aria-selected="${state.applicationsTab === "web-apps"}" data-application-tab="web-apps">Web applications</button><button class="source-tab ${state.applicationsTab === "packages" ? "active" : ""}" role="tab" aria-selected="${state.applicationsTab === "packages"}" data-application-tab="packages">Packages</button></div>`;
}

function packagesWorkspaceView() {
  const isDemo = state.info?.systemMode === "DEMO";
  if (!isDemo) {
    const inventory = state.packageInventory;
    const rows = inventory?.packages.filter(item => state.packageFilter === "all" || item.state === "installed") || [];
    const stateLabel = state.packageInventoryLoading ? "LOADING" : state.packageInventoryError ? "FAILED" : inventory?.state || "NOT READ";
    const stateStyle = inventory?.state === "AVAILABLE" ? "accent" : "warning";
    const catalogResult = state.availablePackageCatalog;
    const catalog = catalogResult?.coverage === "partial" && ["AVAILABLE", "TRUNCATED"].includes(catalogResult.state)
      ? { ...catalogResult, state: "PARTIAL COVERAGE" } : catalogResult;
    const catalogRows = catalog ? comparePackageCatalogToInstalled(catalog, inventory) : [];
    const catalogErrorState = state.availablePackageErrorStatus === 403 ? "DENIED" : "FAILED";
    const catalogBadge = state.availablePackageLoading ? "LOADING" : state.availablePackageError ? catalogErrorState : catalog?.state || "NOT QUERIED";
    const catalogBody = state.availablePackageError
      ? state.availablePackageErrorStatus === 403
        ? `<p class="source-message source-error" role="status">The current IRIS identity is not authorized to query the configured package catalog.</p>`
        : `<p class="source-message source-error" role="alert">${esc(state.availablePackageError)}</p>`
      : catalog?.state === "DENIED" ? `<p class="source-message source-error" role="status">The current IRIS identity is not authorized to read configured IPM repository definitions.</p>`
        : catalog?.state === "FAILED" ? `<p class="source-message source-error" role="alert">The IPM catalog query failed. No available version is inferred.</p>`
          : catalog?.state === "UNAVAILABLE" ? `<p class="source-message" role="status">Configured catalog coverage is unavailable${catalog.reason ? ` (${esc(catalog.reason)}).` : "."}</p>`
            : catalog?.state === "EMPTY" ? `<p class="source-message" role="status">No matching package was returned by all observed enabled repositories.</p>`
              : catalogRows.length ? `<div class="package-list">${catalogRows.map(item => `<article class="package-card"><div class="package-card-head"><div><strong>${esc(item.name)}</strong><small>${esc(item.description)}</small></div>${badge((item.relationship || item.state).replaceAll("_", " ").replaceAll("-", " "), ["INSTALLED_OLDER", "INSTALLED_NEWER"].includes(item.relationship) ? "warning" : item.relationship === "INSTALLED_VERSION_UNCOMPARABLE" || item.relationship === "INSTALLED_STATE_UNKNOWN" ? "muted" : "accent")}</div><dl class="detail-grid"><dt>Available</dt><dd>${esc(item.availableVersion)}</dd><dt>Installed</dt><dd>${esc(item.installedVersion || (item.installedStateKnown ? "Not installed in this namespace" : "Not observed"))}</dd><dt>Repository</dt><dd><code>${esc(item.repository)}</code></dd>${item.origin ? `<dt>Origin</dt><dd>${esc(item.origin)}</dd>` : ""}</dl><p class="source-message">Read-only catalog observation. Package install/update is not enabled.</p></article>`).join("")}</div>`
                : `<p class="source-message">Enter one exact package identity to query configured repositories.</p>`;
    return `<section class="panel packages-workspace"><div class="panel-head"><div><div class="panel-kicker">APPLICATIONS → PACKAGES</div><h2>Installed package inventory</h2></div>${badge(stateLabel, stateStyle)}</div><p class="source-message">Installed rows come from IPM registrations in the current namespace. Catalog lookup is a separate bounded exact-name query through configured repositories.</p><div class="evidence-toolbar"><label>Inventory <select id="package-filter"><option value="all" ${state.packageFilter === "all" ? "selected" : ""}>All installed</option><option value="installed" ${state.packageFilter === "installed" ? "selected" : ""}>Installed</option></select></label><span class="package-source">Source identity <code>${esc(inventory?.sourceIdentity || "iris-ipm-installed-v1")}</code>${inventory?.namespace ? ` · Namespace <code>${esc(inventory.namespace)}</code>` : ""}</span><button class="button secondary" data-refresh-packages ${state.packageInventoryLoading ? "disabled" : ""}>Refresh</button></div>${state.packageInventoryError ? `<p class="source-message source-error" role="alert">${esc(state.packageInventoryError)}</p>` : ""}${inventory?.state === "DENIED" ? `<p class="source-message source-error" role="status">The current IRIS identity is not authorized to read installed IPM registrations.</p>` : ""}${inventory?.state === "FAILED" ? `<p class="source-message source-error" role="alert">The installed package provider could not return inventory.</p>` : ""}<div class="package-list">${rows.map(item => `<article class="package-card"><div class="package-card-head"><div><strong>${esc(item.name)}</strong><small>Installed IPM registration</small></div>${badge("INSTALLED", "accent")}</div><dl class="detail-grid"><dt>Namespace</dt><dd><code>${esc(item.namespace)}</code></dd><dt>Installed</dt><dd>${esc(item.installedVersion)}</dd><dt>Available</dt><dd>Not queried for this package</dd><dt>Source</dt><dd>${esc(item.source)}</dd></dl></article>`).join("") || `<p class="source-message">${inventory?.state === "EMPTY" ? "No installed package registrations were returned." : state.packageInventoryLoading ? "Reading installed package registrations…" : "No package rows are available."}</p>`}</div>${inventory?.truncated ? `<p class="source-message">Showing the first 250 registrations. Inventory is truncated.</p>` : ""}</section><section class="panel packages-workspace"><div class="panel-head"><div><div class="panel-kicker">CONFIGURED REPOSITORIES</div><h2>Available package lookup</h2></div>${badge(catalogBadge, catalog?.state === "AVAILABLE" || catalog?.state === "TRUNCATED" ? "accent" : "warning")}</div><form class="evidence-toolbar" data-available-package-form><label>Exact package name <input id="available-package-name" name="name" maxlength="128" pattern="[A-Za-z0-9][A-Za-z0-9_.-]{0,127}" value="${esc(state.availablePackageName)}" autocomplete="off" required></label><button class="button secondary" type="submit" ${state.availablePackageLoading ? "disabled" : ""}>${state.availablePackageLoading ? "Searching…" : "Search configured repositories"}</button><span class="package-source">Provider <code>iris-ipm-available-v1</code>${catalog ? ` · ${catalog.availableRepositoryCount}/${catalog.repositoryCount} repositories reachable` : ""}</span></form>${catalogBody}${catalog?.coverage === "partial" && !["UNAVAILABLE", "DENIED", "FAILED"].includes(catalog.state) ? `<p class="source-message">Only ${catalog.availableRepositoryCount} of ${catalog.repositoryCount} configured repositories responded. Results are partial; absence is not established.</p>` : ""}${catalog?.truncated ? `<p class="source-message">Catalog rows reached the 50-row cap.</p>` : ""}</section>`;
  }
  const inventory = fixturePackageInventory();
  const items = inventory.packages.filter(item => state.packageFilter === "all" || (state.packageFilter === "installed" ? Boolean(item.installedVersion) : !item.installedVersion));
  const review = state.packagePlan;
  const plan = review?.plan;
  return `<section class="panel packages-workspace"><div class="panel-head"><div><div class="panel-kicker">APPLICATIONS → PACKAGES</div><h2>Package inventory preview</h2></div>${badge("SYNTHETIC FIXTURE", "warning")}</div><p class="source-message">These package rows are synthetic development fixtures. No configured registry, installed IPM inventory, or Open Exchange availability was queried.</p><div class="evidence-toolbar"><label>Inventory <select id="package-filter"><option value="all" ${state.packageFilter === "all" ? "selected" : ""}>Installed and available</option><option value="installed" ${state.packageFilter === "installed" ? "selected" : ""}>Installed</option><option value="available" ${state.packageFilter === "available" ? "selected" : ""}>Available</option></select></label><span class="package-source">Source identity <code>${esc(inventory.sourceIdentity)}</code></span></div><div class="package-list">${items.map(item => `<article class="package-card"><div class="package-card-head"><div><strong>${esc(item.name)}</strong><small>${esc(item.description)}</small></div>${badge(item.state.toUpperCase(), item.state === "update-available" ? "warning" : "accent")}</div><dl class="detail-grid"><dt>Namespace</dt><dd><code>${esc(item.namespace)}</code></dd><dt>Installed</dt><dd>${esc(item.installedVersion || "Not installed")}</dd><dt>Available</dt><dd>${esc(item.availableVersion || "Not observed")}</dd><dt>Source</dt><dd>${esc(item.source)}</dd></dl><div class="package-actions">${item.installedVersion ? `<button class="button secondary" data-package-plan="update" data-package-name="${esc(item.name)}" ${item.availableVersion ? "" : "disabled"}>Prepare update plan</button><button class="button quiet" data-package-plan="remove" data-package-name="${esc(item.name)}">Prepare removal plan</button>` : `<button class="button secondary" data-package-plan="install" data-package-name="${esc(item.name)}">Prepare installation plan</button>`}</div></article>`).join("") || `<p class="source-message">No synthetic package rows match this filter.</p>`}</div><section class="panel package-catalog-example"><div class="panel-head"><div><div class="panel-kicker">CATALOG COMPARISON · SYNTHETIC</div><h3>opsdeck</h3></div>${badge("INSTALLED NEWER", "warning")}</div><p class="source-message">Demo scenario only: installed 0.2.1 is newer than the synthetic configured-catalog version 0.2.0. This is not a live registry observation or update recommendation.</p><dl class="detail-grid"><dt>Installed</dt><dd>0.2.1</dd><dt>Available example</dt><dd>0.2.0</dd><dt>Source</dt><dd>synthetic safe-demo fixture</dd></dl></section>${plan ? `<section class="package-plan-review"><div class="panel-kicker">OPERATION PLAN · REVIEW ONLY</div><h3>${esc(plan.intent)}</h3><div class="package-plan-facts"><p><strong>Risk</strong> ${esc(plan.risk)} · explicit confirmation required</p><p><strong>Target</strong> ${esc(plan.target.key)} · namespace <code>${esc(plan.target.scope)}</code></p><p><strong>Operation</strong> ${esc(plan.capability.providerOperation)}</p><p><strong>Source</strong> ${esc(plan.parameters.sourceIdentity)} · requested version ${esc(plan.parameters.requestedVersion || "current")}</p><p><strong>Current version</strong> ${esc(plan.parameters.installedVersion || "not installed")}</p><p><strong>Pre-state</strong> ${esc(plan.preStateEvidence)} · plan expires ${esc(plan.expiresAt)}</p><p><strong>Authority</strong> ${esc(plan.authorityValidation.state)} · ${esc(plan.authorityValidation.evidence)}</p><p><strong>Expected read-back</strong> ${esc(plan.expectedReadback)}</p></div><div class="notice warning"><strong>Executor unavailable.</strong> The plan is synthetic and review-only. Real IPM execution requires a qualified 0.6 executor and disposable package fixture.</div><button class="button secondary" disabled aria-disabled="true">Confirm package operation · unavailable</button></section>` : ""}</section>`;
}

function restServiceMatches(webApp) {
  const matches = [];
  for (const sourceId of domainSources.applications) {
    const data = state.sourceData[sourceId];
    if (!data || data.resultType !== "array") continue;
    for (const item of data.items) {
      const linked = sourceId === "restServices"
        ? item.ref.key === webApp.name && item.ref.scope === webApp.namespace
        : (Array.isArray(item.values.webApplications)
          ? item.values.webApplications.includes(webApp.name)
          : item.values.webApplications === webApp.name);
      if (linked) matches.push({ sourceId, item });
    }
  }
  return matches;
}

function sourceSelector(route) {
  return `<div class="source-tabs" role="tablist" aria-label="${esc(route)} sources">${(domainSources[route] || []).map((id) => {
    const source = READ_ONLY_SOURCES[id];
    return `<button class="source-tab ${state.sourceTabs[route] === id ? "active" : ""}" role="tab" aria-selected="${state.sourceTabs[route] === id}" data-source="${id}">${esc(source.label)}</button>`;
  }).join("")}</div>`;
}

function cellValue(value) {
  if (value === null || value === undefined) return "Not returned";
  if (typeof value === "boolean") return value ? badge("Yes", "success") : badge("No", "muted");
  if (Array.isArray(value)) return esc(value.join(", ") || "None");
  if (typeof value === "object") return "[record]";
  return esc(value);
}

function sourcePanel(sourceId) {
  const isRotation = /^messagesRotation:[0-9A-F]{64}$/u.test(sourceId);
  const source = READ_ONLY_SOURCES[sourceId] || (isRotation ? { label: "messages.log rotation", path: "/opsdeck-api/message-rotation" } : null);
  const data = state.sourceData[sourceId];
  const error = state.sourceErrors[sourceId];
  if (state.sourceLoading === sourceId) return `<div class="source-message">Loading the selected live source…</div>`;
  if (error) {
    const denied = isAuthorityDenial(error);
    return `<div class="source-message source-error ${denied ? "source-denied" : ""}" role="alert"><strong>${denied ? (state.info?.systemMode === "DEMO" ? "Access denied by persona" : "Access denied by IRIS") : "Source unavailable"}</strong><p>${esc(error)}</p><code>GET ${esc(source.path)}</code><button class="button quiet" data-refresh-source="${sourceId}">Retry source</button></div>`;
  }
  if (sourceId === "alerts") {
    if (!data) return `<div class="source-message"><strong>Stateful alert feed</strong><p>IRIS returns alerts since the previous feed read. OpsDeck does not poll this source automatically; requesting a batch advances that read boundary.</p><button class="button secondary" data-load-alerts>Read alert batch</button><div class="panel-foot">GET <code>${esc(source.path)}</code> · ${esc(source.requiredPrivilege)} · iris-monitor-api</div></div>`;
    const fieldShapes = data.items.map((item) => `<li><strong>${esc(item.ref.label)}</strong><span>${item.values.observedFields.length ? item.values.observedFields.map((field) => `<code>${esc(field)}</code>`).join(" ") : "No fields returned"}</span></li>`).join("");
    return `<div class="source-toolbar"><div><strong>${data.count}</strong><span> alerts returned in this batch</span></div><button class="button quiet" data-load-alerts>Read next batch</button></div>${data.count ? `<p class="source-caveat">Alert values are withheld until the live record schema and safe display fields are qualified. These field names describe shape only.</p><ul class="relationship-list">${fieldShapes}</ul>` : `<div class="source-message" role="status">IRIS returned no alerts in this batch.</div>`}<div class="panel-foot">GET <code>${esc(source.path)}</code> · stateful feed · ${fmtTime(data.observedAt)}</div>`;
  }
  if (sourceId === "messageRotations") {
    if (!data) return `<div class="source-message">Select the fixed rotation family to list bounded identities.</div>`;
    const labels = { available: "Observed", empty: "No rotations", truncated: "Partial coverage", denied: "Denied", unavailable: "Unavailable", failed: "Failed" };
    const items = data.rotations.map((item) => `<li class="owner-row"><span><strong>${esc(item.sourceTimestamp)}</strong><span class="app-sub">${item.size} bytes · <code>${esc(item.sourceIdentity)}</code></span></span><button class="button quiet" data-read-rotation="${esc(item.sourceIdentity)}" ${state.rotationLoading ? "disabled" : ""}>Read bounded observation</button></li>`).join("");
    const selected = state.selectedRotation ? sourcePanel(state.selectedRotation) : "";
    return `<div class="source-toolbar"><div>${badge(labels[data.status] || "Unresolved", data.status === "available" ? "success" : data.status === "denied" || data.status === "failed" ? "error" : "warning")} <strong>${data.count}</strong><span> fixed-family files · ${data.scannedCount} entries scanned</span></div><button class="button quiet" data-refresh-source="messageRotations">Rescan fixed family</button></div>${data.coverage === "partial" || data.truncated ? `<p class="source-caveat">Coverage is partial. The bounded scan may omit family members.</p>` : ""}${items ? `<ul class="relationship-list">${items}</ul>` : `<div class="source-message" role="status">${data.status === "empty" ? "No approved messages.log rotations were observed." : data.status === "denied" ? "IRIS denied fixed-family enumeration for this identity." : "The fixed-family inventory is unavailable; it is not treated as an empty catalog."}</div>`}${selected}<div class="panel-foot">GET <code>${esc(source.path)}</code> · nonrecursive · max 250 entries / 20 identities · no paths returned · ${fmtTime(data.observedAt)}</div>`;
  }
  if (sourceId === "messagesLog" || sourceId === "systemMonitorLog" || isRotation) {
    if (!data) return `<div class="source-message">Select the fixed source to read its bounded recent observation.</div>`;
    const labels = { available: "Available", empty: "Valid empty", truncated: "Truncated", unavailable: "Unavailable", denied: "Denied", "read-failure": "Read failure" };
    const tone = data.status === "available" ? "success" : data.status === "empty" ? "accent" : ["denied", "read-failure"].includes(data.status) ? "error" : "warning";
    const rows = data.items.map((item) => `<li id="log-${sourceId}-${esc(item.ref.key.slice(5))}"><span class="log-line-number">${esc(item.ref.key.slice(5))}</span><code>${esc(item.values.line)}</code></li>`).join("");
    const analysis = data.analysis;
    const analysisLabels = { available: "Observed", empty: "No markers", truncated: "Partial", unavailable: "Unavailable", denied: "Denied", "read-failure": "Read failure", failed: "Analysis failed" };
    const analysisTone = analysis?.status === "available" ? "accent" : analysis?.status === "empty" ? "muted" : ["denied", "read-failure", "failed"].includes(analysis?.status) ? "error" : "warning";
    const findings = analysis?.findings?.map((finding) => `<li class="log-finding"><div class="log-finding-head"><strong>${esc(finding.title)}</strong>${badge(`Line ${finding.lineNumber}`, "muted")}</div><p>${esc(finding.summary)} Marker <code>${esc(finding.marker)}</code>.</p><p><strong>Consequence:</strong> ${esc(finding.consequence)}</p><p><strong>Next step:</strong> ${esc(finding.nextAction)}</p></li>`).join("") || "";
    const analysisPanel = analysis ? `<section class="log-analysis" aria-label="Embedded Python log interpretation"><div class="log-analysis-head"><div><div class="panel-kicker">EMBEDDED PYTHON · RULE-BASED</div><h3>Interpretation of this observation</h3></div>${badge(analysisLabels[analysis.status] || "Unresolved", analysisTone)}</div><p class="source-caveat">Fixed markers are observations from these returned lines. They do not establish overall system health or an IRIS authorization decision.</p>${findings ? `<ol class="log-findings">${findings}</ol>` : `<div class="source-message" role="status">${analysis.status === "empty" ? "The source contained no lines in this observation." : ["available", "truncated"].includes(analysis.status) ? "No configured markers were found in this bounded observation." : "The log lines remain available, but this interpretation did not complete."}</div>`}${analysis.findingsTruncated ? `<div class="source-message" role="status">The interpretation is limited to the first 20 matching lines.</div>` : ""}<div class="panel-foot">${esc(analysis.provider)} · ${analysis.lineCount} lines reviewed${analysis.truncated ? " · source observation truncated" : ""} · session only</div></section>` : "";
    const stateMessage = {
      empty: "The source was read successfully and contained no lines in the bounded observation.",
      unavailable: "IRIS could not locate or open this fixed source.",
      denied: "The current IRIS process lacks the required log-inspection authority.",
      "read-failure": "IRIS failed while reading this fixed source.",
    }[data.status] || "";
    const refresh = isRotation ? `<button class="button quiet" data-read-rotation="${esc(sourceId)}">Read again</button>` : `<button class="button quiet" data-refresh-source="${sourceId}">Read again</button>`;
    return `<div class="source-toolbar"><div>${badge(labels[data.status] || "Unresolved", tone)} <strong>${data.count}</strong><span> complete lines returned${data.truncated ? " · recent observation is truncated" : ""}</span></div>${refresh}</div>${stateMessage ? `<div class="source-message" role="status">${esc(stateMessage)}</div>` : ""}${rows ? `<ol class="fixed-log-lines" aria-label="${esc(source.label)} recent lines">${rows}</ol>` : ""}${analysisPanel}<div class="panel-foot">GET <code>${esc(source.path)}${isRotation ? "?id=…" : ""}</code> · ${esc(data.provider)} · at most 64 KiB / 250 complete lines · ${fmtTime(data.observedAt)}${isRotation ? ` · source ${esc(data.sourceIdentity || sourceId)} · ${esc(data.sourceTimestamp || "timestamp unavailable")}` : ""}</div>`;
  }
  if (!data) return `<div class="source-message">Select a source to load authoritative IRIS data.</div>`;
  const items = data.items;
  const selectedKey = state.selectedItems[sourceId];
  const selectedIndex = items.findIndex((item, index) => recordHandle(data, index) === selectedKey || (!String(selectedKey).startsWith("snapshot:") && item.ref.key === selectedKey));
  const selected = items[selectedIndex < 0 ? 0 : selectedIndex];
  const keys = selected ? Object.keys(selected.values) : [];
  const columns = keys.slice(0, 6);
  const visibleColumns = sourceId === "tasks"
    ? ["Type", "Namespace", "Suspended", ...columns.filter((key) => ![keys[0], "Type", "Namespace", "Suspended"].includes(key))].filter((key) => keys.includes(key)).slice(0, 5)
    : columns.filter((key) => key !== (keys[0] || ""));
  const rows = items.map((item, index) => `<tr class="provider-row ${selected === item ? "selected" : ""}" tabindex="0" role="button" data-item="${esc(sourceId)}::${recordHandle(data, index)}"><td data-label="Resource"><strong>${esc(item.ref.label)}</strong><span class="app-sub">${item.ref.scope ? esc(item.ref.scope) : esc(item.ref.kind)}</span></td>${visibleColumns.map((key) => `<td data-label="${esc(key)}">${cellValue(item.values[key])}</td>`).join("")}</tr>`).join("");
  const objectMetrics = data.resultType === "object" && selected
    ? `<div class="metric-grid">${Object.entries(selected.values).map(([key, value]) => `<article class="metric-card"><span>${esc(key)}</span><strong>${cellValue(value)}</strong></article>`).join("")}</div>`
    : null;
  const detail = selected && data.resultType !== "object"
    ? `<aside class="panel inspector provider-inspector"><div class="panel-kicker">AUTHORITATIVE RESOURCE</div><h2 class="inspector-title">${esc(selected.ref.label)}</h2><p class="inspector-sub">Provider key <code>${esc(selected.ref.key)}</code>${selected.ref.scope ? ` · ${esc(selected.ref.scope)}` : ""}</p><dl class="detail-grid">${Object.entries(selected.values).map(([key, value]) => `<dt>${esc(key)}</dt><dd>${cellValue(value)}</dd>`).join("")}</dl><div class="inspector-foot">${esc(selected.ref.provider)} · observed ${fmtTime(selected.ref.observedAt)}</div>${["users", "roles", "resources", "tasks"].includes(sourceId) && items.filter(item => item.ref.key === selected.ref.key).length !== 1 ? "<p class=\"app-sub\">Detail requires an unambiguous provider key; no scoped detail request is qualified.</p>" : sourceId === "users" ? userDetailContent(selected) : sourceId === "roles" ? roleDetailContent(selected) : sourceId === "resources" ? resourceDetailContent(selected) : sourceId === "tasks" ? taskDetailContent(selected) : ""}</aside>`
    : "";
  const verification = state.sourceVerification[sourceId];
  return `<div class="source-toolbar"><div><strong>${data.count ?? 1}</strong><span> ${data.resultType === "array" ? "records returned" : "live object"}</span></div><div>${verification ? badge(verification.matched ? "Second read matched" : "Second read differed", verification.matched ? "success" : "error") : ""} <button class="button quiet" data-refresh-source="${sourceId}">Refresh source</button></div></div>
    ${objectMetrics || `<div class="provider-layout"><article class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>Resource</th>${visibleColumns.map((key) => `<th>${esc(key)}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td colspan="${visibleColumns.length + 1}" class="empty-cell">IRIS returned an empty collection.</td></tr>`}</tbody></table></div></article>${detail}</div>`}
    <div class="panel-foot">GET <code>${esc(source.path)}</code> · ${esc(source.requiredPrivilege)} · ${esc(data.provider)} · ${fmtTime(data.observedAt)}${verification ? ` · repeated ${fmtTime(verification.at)}` : ""}</div>`;
}

function relationList(title, refs, relationKind = "role") {
  if (refs === null) return `<div class="relationship-block"><strong>${esc(title)}</strong><p class="source-message">IRIS did not return this relationship.</p></div>`;
  return `<div class="relationship-block"><strong>${esc(title)} <span class="app-sub">${refs.length} returned</span></strong>${refs.length ? `<ul class="relationship-list">${refs.map((ref) => `<li><button class="link-button" data-related-${relationKind}="${esc(ref.key)}"><code>${esc(ref.label)}</code></button></li>`).join("")}</ul>` : `<p class="source-message">None returned.</p>`}</div>`;
}

function userDetailContent(selected) {
  const key = selected.ref.key;
  const detail = state.userDetails[key];
  const error = state.userDetailErrors[key];
  const verification = state.userDetailVerification[key];
  const content = state.userDetailLoading === key
    ? `<div class="source-message">Loading authoritative user detail…</div>`
    : error
      ? `<div class="source-message source-error" role="alert"><strong>User detail unavailable</strong><p>${esc(error)}</p></div>`
      : detail
        ? `${relationList("Direct roles", detail.relationships.directRoles)}${relationList("Escalation roles", detail.relationships.escalationRoles)}<div class="inspector-foot">GET <code>${esc(detail.source)}?name=…</code> · ${esc(detail.ref.provider)} · observed ${fmtTime(detail.ref.observedAt)}${verification ? ` · ${verification.matched ? "Second read matched" : "Second read differed"} at ${fmtTime(verification.at)}` : ""}</div>`
        : `<p class="app-sub">Expanded user relationships are fetched only when requested.</p>`;
  const button = state.userDetailLoading === key ? "" : `<button class="button secondary" data-load-user-detail="${esc(key)}">${detail ? "Refresh and verify relationships" : "Load authoritative detail"}</button>`;
  return `<section class="inspector-section"><div class="panel-kicker">DIRECT USER RELATIONSHIPS</div>${content}${button}</section>`;
}

function roleDetailContent(selected) {
  const key = selected.ref.key;
  const detail = state.roleDetails[key];
  const error = state.roleDetailErrors[key];
  const verification = state.roleDetailVerification[key];
  const owners = state.roleOwners[key];
  const ownerError = state.roleOwnerErrors[key];
  const content = state.roleDetailLoading === key
    ? `<div class="source-message">Loading authoritative role detail…</div>`
    : error
      ? `<div class="source-message source-error" role="alert"><strong>Role detail unavailable</strong><p>${esc(error)}</p></div>`
      : detail
        ? `<dl class="detail-grid"><dt>Description</dt><dd>${detail.description === null ? "Not returned" : esc(detail.description)}</dd><dt>Escalation only</dt><dd>${detail.escalationOnly === null ? "Not returned" : cellValue(detail.escalationOnly)}</dd></dl>${relationList("Direct granted roles", detail.grantedRoles, "role")}${resourcePermissionList(detail.resources)}<div class="inspector-foot">GET <code>/api/admin/v2/security/role?name=…</code> · ${esc(detail.ref.provider)} · observed ${fmtTime(detail.ref.observedAt)}${verification ? ` · ${verification.matched ? "Second read matched" : "Second read differed"} at ${fmtTime(verification.at)}` : ""}</div>`
        : `<p class="app-sub">Role detail and direct resource grants are fetched only when requested.</p>`;
  const load = state.roleDetailLoading === key ? "" : `<button class="button secondary" data-load-role-detail="${esc(key)}">${detail ? "Refresh and verify role" : "Load authoritative detail"}</button>`;
  const ownersContent = state.roleOwnerLoading === key
    ? `<div class="source-message">Loading bounded role holders…</div>`
    : ownerError
      ? `<div class="source-message source-error" role="alert"><strong>Role holders unavailable</strong><p>${esc(ownerError)}</p></div>`
      : owners
        ? `<strong>Direct holders <span class="app-sub">${owners.length} returned · maxRows=20</span></strong>${owners.length ? `<ul class="relationship-list">${owners.map((owner) => `<li class="owner-row"><code>${esc(owner.name)}</code><span>${esc(owner.type)}</span><span>AdminOption: ${esc(owner.adminOption)}</span></li>`).join("")}</ul>` : `<p class="source-message">None returned.</p>`}<div class="inspector-foot">GET <code>/api/admin/v2/security/role/owners?name=…&amp;maxRows=20</code> · ${state.roleOwnerVerification[key] ? (state.roleOwnerVerification[key].matched ? "Second read matched" : "Second read differed") : "Direct holder records; no closure inferred"}</div>`
        : `<p class="app-sub">Direct role holders are fetched separately, bounded to 20 rows.</p>`;
  const ownerButton = state.roleOwnerLoading === key ? "" : `<button class="button quiet" data-load-role-owners="${esc(key)}">${owners ? "Refresh holders" : "Load direct holders"}</button>`;
  return `<section class="inspector-section"><div class="panel-kicker">ROLE DETAIL · DIRECT RELATIONSHIPS</div>${content}${load}</section><section class="inspector-section"><div class="panel-kicker">ROLE HOLDERS</div>${ownersContent}${ownerButton}</section>`;
}

function resourcePermissionList(resources) {
  if (resources === null) return `<div class="relationship-block"><strong>Direct resource grants</strong><p class="source-message">IRIS did not return this relationship.</p></div>`;
  return `<div class="relationship-block"><strong>Direct resource grants <span class="app-sub">${resources.length} returned</span></strong>${resources.length ? `<ul class="relationship-list">${resources.map((resource) => `<li><button class="link-button" data-related-resource="${esc(resource.ref.key)}"><code>${esc(resource.ref.label)}</code></button><span>Permissions: ${esc(resource.permissions)}</span></li>`).join("")}</ul>` : `<p class="source-message">None returned.</p>`}</div>`;
}

function resourceDetailContent(selected) {
  const key = selected.ref.key;
  const detail = state.resourceDetails[key];
  const error = state.resourceDetailErrors[key];
  const verification = state.resourceDetailVerification[key];
  const content = state.resourceDetailLoading === key
    ? `<div class="source-message">Loading authoritative resource detail…</div>`
    : error
      ? `<div class="source-message source-error" role="alert"><strong>Resource detail unavailable</strong><p>${esc(error)}</p></div>`
      : detail
        ? `<dl class="detail-grid"><dt>Description</dt><dd>${detail.description === null ? "Not returned" : esc(detail.description)}</dd><dt>Public permission</dt><dd>${detail.publicPermission === null ? "Not returned" : esc(detail.publicPermission)}</dd></dl><div class="inspector-foot">GET <code>/api/admin/v2/security/resource?name=…</code> · ${esc(detail.ref.provider)} · observed ${fmtTime(detail.ref.observedAt)}${verification ? ` · ${verification.matched ? "Second read matched" : "Second read differed"} at ${fmtTime(verification.at)}` : ""}</div>`
        : `<p class="app-sub">Resource detail is fetched only when requested.</p>`;
  const button = state.resourceDetailLoading === key ? "" : `<button class="button secondary" data-load-resource-detail="${esc(key)}">${detail ? "Refresh and verify resource" : "Load authoritative detail"}</button>`;
  return `<section class="inspector-section"><div class="panel-kicker">RESOURCE DETAIL</div>${content}${button}</section>`;
}

function taskDetailContent(selected) {
  const key = selected.ref.key;
  const detail = state.taskDetails[key];
  const error = state.taskDetailErrors[key];
  const verification = state.taskDetailVerification[key];
  const content = state.taskDetailLoading === key
    ? `<div class="source-message">Loading authoritative task detail…</div>`
    : error
      ? `<div class="source-message source-error" role="alert"><strong>Task detail unavailable</strong><p>${esc(error)}</p></div>`
      : detail
        ? `<dl class="detail-grid">${Object.entries(detail.values).map(([field, value]) => `<dt>${esc(field)}</dt><dd>${cellValue(value)}</dd>`).join("")}</dl><div class="inspector-foot">GET <code>/api/admin/v2/task?id=…</code> · ${esc(detail.ref.provider)} · observed ${fmtTime(detail.ref.observedAt)}${verification ? ` · ${verification.matched ? "Second read matched" : "Second read differed"} at ${fmtTime(verification.at)}` : ""}</div>`
        : `<p class="app-sub">Expanded task configuration is fetched only when requested.</p>`;
  const button = state.taskDetailLoading === key ? "" : `<button class="button secondary" data-load-task-detail="${esc(key)}">${detail ? "Refresh and verify task" : "Load authoritative detail"}</button>`;
  return `<section class="inspector-section"><div class="panel-kicker">AUTHORITATIVE TASK DETAIL</div>${content}${button}</section>`;
}

function providerDomainView(route) {
  const title = navItems.find(([item]) => item === route)?.[1] || "Workspace";
  const descriptions = {
    access: "Users, roles, and resources returned by the IRIS security API.",
    security: "Credential and OAuth configuration metadata. Secret material is never rendered.",
    tasks: "Scheduled task definitions from the live IRIS management API.",
    system: "Live system usage, processes, databases, and device inventory.",
    logs: "Audit configuration, bounded fixed log observations, task history, and journal inventory. Each reader remains qualified only within its recorded scope.",
  };
  const sourceId = state.sourceTabs[route] || domainSources[route]?.[0];
  const systemNavigation = route === "system" ? `<div class="system-sections" role="tablist" aria-label="System sections"><button class="source-tab ${state.systemSection === "providers" ? "active" : ""}" role="tab" aria-selected="${state.systemSection === "providers"}" data-system-section="providers">System providers</button><button class="source-tab ${state.systemSection === "about" ? "active" : ""}" role="tab" aria-selected="${state.systemSection === "about"}" data-system-section="about">About</button></div>` : "";
  if (route === "system" && state.systemSection === "about") {
    const identity = ProductIdentity.resolve({
      irisVersion: state.info?.serverVersion,
      deployment: state.info?.systemMode === "DEMO" ? "demo" : nativeMode ? "native" : "reference",
    });
    return shell(`${pageHeader("About", "OpsDeck product identity and runtime context.")}${systemNavigation}<section class="panel about-panel"><div class="panel-kicker">${esc(identity.releaseLabel)}</div><h2>${esc(identity.name)}</h2><p class="about-version">Version ${esc(identity.publicVersion)}</p><p class="source-message">OpsDeck presents observed IRIS context separately from its public product identity. Runtime fields are shown only when supplied by the active product context.</p><details class="about-details"><summary>Technical details</summary><dl class="detail-grid"><dt>Internal version</dt><dd>${esc(identity.internalVersion)}</dd><dt>Package version</dt><dd>${esc(identity.packageVersion)}</dd><dt>Git commit</dt><dd><code>${esc(identity.gitCommit || "Not embedded in source package")}</code></dd><dt>Build timestamp</dt><dd>${esc(identity.buildTimestamp || "Not embedded in source package")}</dd><dt>IRIS version</dt><dd>${esc(identity.irisVersion)}</dd><dt>Namespace</dt><dd><code>${esc(identity.namespace)}</code></dd><dt>Deployment target</dt><dd>${esc(identity.deploymentTarget)}</dd></dl></details></section>`);
  }
  const logTools = route === "logs" ? auditQueryPanel() : "";
  const jobs = route === "tasks" ? jobCenterPanel() : "";
  const caveat = route === "logs" ? `<p class="source-caveat">Fixed log routes accept only the two semantic source identities. Returned lines preserve legitimate log text; the resolved filesystem location is never returned. Alerts are a stateful feed and are read only when explicitly requested.</p>` : "";
  return shell(`${pageHeader(title, descriptions[route] || "Live IRIS provider data.")}${systemNavigation}${jobs}${logTools}<section class="panel provider-panel"><div class="panel-head"><div><div class="panel-kicker">LIVE PROVIDER DATA</div><h2>${esc(READ_ONLY_SOURCES[sourceId]?.label || title)}</h2></div>${badge("Read only", "accent")}</div>${sourceSelector(route)}${sourcePanel(sourceId)}${caveat}</section>`);
}

function jobCenterPanel() {
  const jobs = visibleJobs();
  const tone = status => ({ COMPLETED: "success", FAILED: "error", DENIED: "error", CANCELED: "muted", UNAVAILABLE: "warning", AMBIGUOUS: "error" })[status] || "accent";
  const rows = jobs.slice().reverse().map(job => `<article class="job-row"><div><strong>${esc(job.operation)}</strong><small>${esc(job.provider)} · accepted ${fmtTime(job.acceptedAt)}</small></div><div>${badge(job.status, tone(job.status))}<p>${esc(job.progress || "No progress detail was returned.")}</p>${job.resultIdentity ? `<small>Result <code>${esc(job.resultIdentity.id)}</code></small>` : ""}</div></article>`).join("");
  return `<section class="panel job-center"><div class="panel-head"><div><div class="panel-kicker">SESSION-SCOPED ASYNC WORK</div><h2>Job Center</h2></div>${badge(`${jobs.length} JOB${jobs.length === 1 ? "" : "S"}`, jobs.length ? "accent" : "muted")}</div><p class="source-message">Jobs appear only when IRIS returns an accepted asynchronous identity. Unknown or incomplete outcomes stay visible as unresolved; OpsDeck does not retry dispatch.</p>${rows ? `<div class="job-list">${rows}</div>` : `<p class="source-message">No asynchronous jobs have been observed in this session.</p>`}</section>`;
}

function visibleJobs() {
  if (state.info?.systemMode === "DEMO" && !(state.jobs || []).length) return [{
    identity: "fixture:job:maintenance-01", operation: "Synthetic maintenance task",
    provider: "opsdeck-demo-v1", acceptedAt: "2026-10-02T12:00:00Z",
    updatedAt: "2026-10-02T12:00:08Z", status: "COMPLETED",
    progress: "Synthetic completed job shown to demonstrate Job Center projection; no IRIS task was run.",
    resultIdentity: null,
  }];
  return state.jobs || [];
}

function auditQueryPanel() {
  const query = state.auditQuery;
  const tone = query?.state === "denied" || query?.state === "failed" ? "error" :
    query?.state === "finished" ? "success" : query ? "warning" : "muted";
  const safeFields = ["TimeStamp", "Event", "EventSource", "UserName", "PID", "Namespace"];
  const result = Array.isArray(query?.result)
    ? query.result.length
      ? `<div class="table-wrap"><table><thead><tr>${safeFields.map((field) => `<th>${esc(field)}</th>`).join("")}</tr></thead><tbody>${query.result.map((record) => `<tr>${safeFields.map((field) => `<td>${Object.hasOwn(record, field) ? esc(record[field]) : "—"}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
      : `<p class="source-message">No audit records matched this bounded query.</p>`
    : "";
  const task = query?.task ? `<small>Task state: ${esc(query.task.state)} · identity: ${esc(query.task.identitySource || "unverified")}</small>` : "";
  return `<section class="panel provider-panel audit-query-panel"><div class="panel-head"><div><div class="panel-kicker">READ ONLY · BOUNDED</div><h2>Audit records</h2></div><button class="button quiet" data-run-audit-query ${state.auditQueryBusy ? "disabled" : ""}>${state.auditQueryBusy ? "Reading…" : "Read recent records · max 1"}</button></div><p class="source-message">Reads one record at most for the signed-in user over the last 10 minutes. Only reviewed audit fields are displayed.</p>${query ? `<p class="source-message"><strong>${badge(query.state.toUpperCase(), tone)}</strong> ${esc(query.message)}</p>${task}${result}` : ""}</section>`;
}

function evidenceView() {
  const isDemo = state.info?.systemMode === "DEMO";
  const productIdentity = ProductIdentity.resolve({
    irisVersion: state.info?.serverVersion,
    deployment: isDemo ? "demo" : nativeMode ? "native" : "reference",
  });
  const audit = isDemo ? null : state.auditQuery;
  const readback = state.verification
    ? (state.verification.matched
      ? { label: "VERIFIED", tone: "success", detail: `${state.verification.count} web-app identities matched on an independent second read.` }
      : { label: "MISMATCH", tone: "error", detail: "The second web-app read differed from the displayed state." })
    : { label: "PENDING", tone: "muted", detail: "No current read-back comparison is available in this session." };
  const auditState = { accepted: "UNVERIFIED", queued: "PARTIAL", running: "PARTIAL", finished: "PARTIAL", failed: "FAILED", canceled: "BLOCKED", denied: "DENIED", unavailable: "UNAVAILABLE", ambiguous: "UNVERIFIED" }[audit?.state] || "PENDING";
  const auditCount = Number.isInteger(audit?.resultCount) ? `${audit.resultCount} result row${audit.resultCount === 1 ? "" : "s"}` : "an unknown number of result rows";
  const auditDetail = audit?.state === "finished"
    ? `A bounded audit task finished with ${auditCount}. The response remains partial evidence; full result-schema and pagination behavior are not established.`
    : audit ? `The bounded audit task is ${audit.state}. Its state is retained in this session without raw task identifiers or unreviewed result values.`
      : "IRIS 2026.2 returned one finished empty result through the exact same-origin v1 async-result resource. Full result-schema and pagination behavior remain unverified.";
  const auditTone = ["FAILED", "DENIED"].includes(auditState) ? "error" : ["PENDING", "UNVERIFIED", "PARTIAL", "BLOCKED", "UNAVAILABLE"].includes(auditState) ? "warning" : "muted";
  const cards = [
    { title: "Web application read-back", state: readback.label, tone: readback.tone, detail: readback.detail, note: isDemo ? "Demo semantics only · live IRIS verification is separately qualified." : "Current session evidence." },
    { title: "Provider state semantics", state: "PRESERVED", tone: "success", detail: "Valid empty collections, unavailable providers, denied access, and mapping failures remain distinct states.", note: "No fixture fallback is substituted for a failed live provider." },
    { title: "Audit async handoff", state: auditState, tone: auditTone, detail: auditDetail, note: "Current-session observation only; the query is bounded to maxRows=1 and does not establish a complete audit-result schema." },
    { title: "IPM / ZPM lifecycle", state: "QUALIFIED", tone: "success", detail: "Local-source load, uninstall, and clean same-source reload were reproduced for OpsDeck 0.2.0. Registration, /opsdeck, deployed asset hashes, operational HTTP behavior, cleanup, and unrelated-state preservation were verified.", note: "Scope: tested local-source lifecycle only. Exact core IPM version and public-registry installation remain unverified." }
  ];
  const evidenceCollection = currentEvidenceCollection();
  const visibleEvidence = filterEvidence(evidenceCollection, state.evidenceFilter || "", state.evidenceStateFilter || "ALL");
  const evidencePanel = `<section class="panel durable-evidence-panel"><div class="panel-head"><div><div class="panel-kicker">BOUNDED EVIDENCE CENTER</div><h2>${isDemo ? "Fixture receipt preview" : "Current-session evidence"}</h2></div>${badge(isDemo ? "SYNTHETIC FIXTURE" : "SESSION ONLY", "warning")}</div><p class="source-message">${isDemo ? "Synthetic fixture data only. It demonstrates redacted receipt browsing and export, not IRIS execution." : "Evidence is held in session memory. No persistent IRIS evidence provider is attached; exports are explicit and bounded."}</p><div class="evidence-toolbar"><label>Filter <input id="evidence-filter" type="search" value="${esc(state.evidenceFilter || "")}" maxlength="128" placeholder="Find evidence"></label><label>State <select id="evidence-state-filter">${["ALL", "VERIFIED", "PARTIAL", "FAILED", "UNVERIFIED", "BLOCKED", "UNAVAILABLE", "DENIED"].map(item => `<option value="${item}" ${(state.evidenceStateFilter || "ALL") === item ? "selected" : ""}>${item}</option>`).join("")}</select></label><button class="button secondary" data-export-evidence="json" ${visibleEvidence.length ? "" : "disabled"}>Export JSON</button><button class="button secondary" data-export-evidence="markdown" ${visibleEvidence.length ? "" : "disabled"}>Export Markdown</button></div>${visibleEvidence.length ? `<div class="evidence-record-list">${visibleEvidence.map(item => `<article class="evidence-record"><div><strong>${esc(item.title)}</strong>${badge(item.state, item.state === "VERIFIED" ? "success" : "warning")}</div><small>${esc(item.kind)} · ${esc(item.observedAt)} · source ${esc(item.source?.identity || "unknown")} · resource ${esc(item.resource?.key || "unknown")}</small><p>${esc(item.summary)}</p></article>`).join("")}</div>` : `<p class="source-message">${evidenceCollection.state === "EMPTY" ? "No evidence records are available in this session." : `No records match the selected filter · ${evidenceCollection.state}.`}</p>`}</section>`;
  const cardHtml = cards.map((item) => `<article class="evidence-card"><div class="evidence-card-head"><strong>${esc(item.title)}</strong>${badge(item.state, item.tone)}</div><p>${esc(item.detail)}</p><small>${esc(item.note)}</small></article>`).join("");
  return shell(`
    ${pageHeader("Evidence", "What OpsDeck can prove, what it cannot, and where qualification deliberately stops.")}
    <p class="source-message evidence-product-identity">${esc(productIdentity.name)} · ${esc(productIdentity.releaseLabel)} ${esc(productIdentity.publicVersion)}</p>
    ${isDemo ? `<div class="evidence-demo-notice"><strong>SAFE DEMO</strong><span>Sanitized deterministic data. This page demonstrates evidence semantics, not a live IRIS claim.</span></div>` : ""}
    <section class="panel evidence-flow-panel"><div class="panel-head"><div><div class="panel-kicker">EVIDENCE-GATED OPERATION</div><h2>Observed state stays tied to authority</h2></div>${badge("No shadow state", "accent")}</div>
      <div class="evidence-flow" aria-label="OpsDeck evidence flow"><div><span>01</span><strong>Request</strong><small>Known operation</small></div><b>→</b><div><span>02</span><strong>Bounded provider</strong><small>Allowlisted route</small></div><b>→</b><div><span>03</span><strong>IRIS authority</strong><small>Source of truth</small></div><b>→</b><div><span>04</span><strong>Rendered state</strong><small>Safe projection</small></div><b>→</b><div><span>05</span><strong>Read-back</strong><small>Where qualified</small></div></div>
    </section>
    <section class="evidence-grid">${cardHtml}</section>
    ${evidencePanel}
    <section class="panel evidence-legend"><div class="panel-head"><div><div class="panel-kicker">STATE SEMANTICS</div><h2>Absence is not failure, and failure is not absence</h2></div></div>
      <div class="state-legend-grid"><div>${badge("VERIFIED", "success")}<p>Independent evidence agrees with the displayed state.</p></div><div>${badge("EMPTY", "accent")}<p>The authoritative provider returned a valid empty collection.</p></div><div>${badge("UNAVAILABLE", "warning")}<p>The source could not provide a usable result. OpsDeck does not invent one.</p></div><div>${badge("DENIED", "error")}<p>The current identity lacks authority for the source.</p></div><div>${badge("UNVERIFIED", "muted")}<p>The behavior has not crossed its required qualification boundary.</p></div></div>
      <div class="evidence-actions"><button class="button secondary" data-route="applications">Inspect applications</button><button class="button secondary" data-route="access">Inspect access relationships</button><button class="button secondary" data-route="security">Inspect provider boundaries</button></div>
    </section>`);
}

function currentEvidenceCollection() {
  const isDemo = state.info?.systemMode === "DEMO";
  const records = isDemo ? [{ id: "fixture:operation:application-enable", kind: "operation-receipt", state: "VERIFIED", title: "Fixture application enable", observedAt: "2026-10-02T12:00:00Z", source: { identity: "opsdeck-fixture-v1" }, resource: { key: "/opsdeck-fixture", scope: "%SYS" }, summary: "Synthetic fixture plan completed with fixture read-back; this does not qualify a live IRIS operation.", evidence: { operationId: "fixture-op-001", verification: "fixture-readback" } }] : state.verification ? [{ id: "session:applications-readback", kind: "read-observation", state: state.verification.matched ? "VERIFIED" : "FAILED", title: "Applications independent read-back", observedAt: state.verification.at, source: { identity: "iris-admin-api" }, resource: { key: "web-app-inventory", scope: "%SYS" }, summary: state.verification.matched ? `${state.verification.count} web-application identities matched the independent second read.` : "The independent second read differed from the current web-application inventory.", evidence: { matched: state.verification.matched, count: state.verification.count } }] : [];
  const audit = isDemo ? null : state.auditQuery;
  if (audit?.observedAt) {
    const states = { accepted: "UNVERIFIED", queued: "PARTIAL", running: "PARTIAL", finished: "PARTIAL", failed: "FAILED", canceled: "BLOCKED", denied: "DENIED", unavailable: "UNAVAILABLE" };
    const safeFields = ["Event", "EventSource", "Namespace", "PID", "TimeStamp", "UserName"];
    const fields = Array.isArray(audit.result) && audit.result.length
      ? Object.keys(audit.result[0]).filter((field) => safeFields.includes(field)).sort()
      : [];
    const count = Number.isInteger(audit.resultCount) && audit.resultCount >= 0 && audit.resultCount <= AUDIT_QUERY_MAX_ROWS ? audit.resultCount : null;
    const evidence = { providerState: typeof audit.state === "string" ? audit.state : "unverified", identityBasis: audit.task?.identitySource || "unverified", fields };
    if (count !== null) evidence.count = count;
    if (typeof audit.truncatedToMaxRows === "boolean") evidence.truncated = audit.truncatedToMaxRows;
    records.push({
      id: "session:audit-query",
      kind: "read-observation",
      state: states[audit.state] || "UNVERIFIED",
      title: "Bounded audit query",
      observedAt: audit.observedAt,
      source: { identity: "iris-admin-api" },
      resource: { domain: "security", kind: "audit-query", provider: "iris-admin-api", key: "bounded-audit-records", label: "Bounded audit records", observedAt: audit.observedAt },
      summary: count === null ? `Bounded audit query state: ${audit.state}.` : `Bounded audit query state: ${audit.state}; ${count} reviewed row${count === 1 ? "" : "s"} returned.`,
      evidence,
    });
  }
  for (const job of visibleJobs()) {
    const states = { ACCEPTED: "UNVERIFIED", QUEUED: "PARTIAL", RUNNING: "PARTIAL", COMPLETED: "PARTIAL", FAILED: "FAILED", CANCELED: "BLOCKED", PAUSED: "PARTIAL", DENIED: "DENIED", UNAVAILABLE: "UNAVAILABLE", AMBIGUOUS: "UNVERIFIED" };
    records.push({
      id: job.identity,
      kind: "read-observation",
      state: states[job.status] || "UNVERIFIED",
      title: "Asynchronous job observation",
      observedAt: job.updatedAt || job.acceptedAt,
      source: { identity: job.provider },
      resource: { domain: "tasks", kind: "async-job", provider: job.provider, key: job.identity, label: job.operation, observedAt: job.updatedAt || job.acceptedAt },
      summary: `${job.operation}: ${job.status}. ${job.progress || "No additional progress was returned."}`,
      evidence: { providerState: job.status, identityBasis: job.resultIdentity ? "validated-location" : "session-correlation" },
    });
  }
  const logObservations = Object.entries(state.sourceData).filter(([sourceId]) =>
    ["messagesLog", "systemMonitorLog"].includes(sourceId) || /^messagesRotation:[0-9A-F]{64}$/u.test(sourceId));
  for (const [sourceId, observation] of logObservations) {
    const analysis = observation?.analysis;
    for (const finding of analysis?.findings || []) {
      records.push({
        id: finding.id,
        kind: "read-observation",
        state: "PARTIAL",
        title: finding.title,
        observedAt: observation.observedAt,
        source: { identity: observation.provider, provider: analysis.provider },
        resource: { domain: "logs", kind: sourceId, provider: observation.provider, key: `line:${finding.lineNumber}`, label: `${analysis.source} line ${finding.lineNumber}`, observedAt: observation.observedAt },
        summary: `${finding.summary} ${finding.consequence} Suggested next step: ${finding.nextAction}`,
        evidence: { providerState: analysis.status, fields: ["ruleId", "lineNumber", "marker"], identityBasis: "bounded-fixed-log-line", truncated: observation.truncated, bytesReturned: observation.bytesReturned },
      });
    }
  }
  if (state.packagePlan?.plan) {
    const plan = state.packagePlan.plan;
    records.push({ id: plan.id, kind: "operation-plan", state: "UNVERIFIED", title: plan.intent, observedAt: plan.createdAt, source: { identity: state.packagePlan.executorIdentity || "not-attached" }, resource: { key: plan.target.key, scope: plan.target.scope }, summary: "Synthetic package plan preview. No package operation was executed; live IPM execution remains unavailable.", evidence: { risk: plan.risk, capability: plan.capability.id, preStateEvidence: plan.preStateEvidence } });
  }
  return createEvidenceCollection(records, records.length ? "AVAILABLE" : "EMPTY");
}

function render() {
  setTheme(state.theme);
  if (!state.connected) app.innerHTML = connectView();
  else if (state.route === "applications") app.innerHTML = applicationsView();
  else if (state.route === "overview") app.innerHTML = overviewView();
  else if (state.route === "evidence") app.innerHTML = evidenceView();
  else app.innerHTML = providerDomainView(state.route);
  app.querySelector("#theme-select")?.addEventListener("change", (event) => setTheme(event.target.value));
  app.querySelector("#mobile-more")?.addEventListener("click", () => {
    state.mobileMoreOpen = !state.mobileMoreOpen;
    app.querySelector(".sidebar")?.classList.toggle("more-open", state.mobileMoreOpen);
    app.querySelector("#mobile-more").setAttribute("aria-expanded", String(state.mobileMoreOpen));
  });
  app.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => {
    state.route = button.dataset.route;
    state.mobileMoreOpen = false;
    location.hash = state.route;
    render();
    ensureRouteSource();
  }));
  app.querySelectorAll("[data-snippet]").forEach((button) => button.addEventListener("click", async () => {
    const item = LEARNING_SNIPPETS.find(entry => entry.id === button.dataset.snippet);
    if (!item) return;
    state.selectedSnippet = item.id;
    state.snippetText = "";
    state.snippetError = "";
    state.snippetLoading = true;
    render();
    try {
      const base = nativeMode ? "/opsdeck/" : "./";
      const response = await fetch(`${base}${encodeURIComponent(item.file)}`, { headers: { Accept: "text/plain" }, cache: "force-cache" });
      if (state.selectedSnippet !== item.id) return;
      if (!response.ok) throw new Error(`Snippet text unavailable (HTTP ${response.status}).`);
      state.snippetText = (await response.text()).slice(0, 12000);
    } catch (error) {
      if (state.selectedSnippet !== item.id) return;
      state.snippetError = error.message || "Snippet text unavailable.";
    } finally {
      if (state.selectedSnippet === item.id) {
        state.snippetLoading = false;
        render();
      }
    }
  }));
  app.querySelectorAll("[data-download-snippet]").forEach((button) => button.addEventListener("click", () => {
    if (!state.snippetText || button.dataset.downloadSnippet !== state.selectedSnippet) return;
    const item = LEARNING_SNIPPETS.find(entry => entry.id === state.selectedSnippet);
    if (!item) return;
    const blob = new Blob([state.snippetText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = item.file;
    anchor.click();
    URL.revokeObjectURL(url);
  }));
  app.querySelectorAll("[data-source]").forEach((button) => button.addEventListener("click", () => {
    const route = state.route;
    state.sourceTabs[route] = button.dataset.source;
    render();
    if (button.dataset.source !== "alerts") loadSource(button.dataset.source);
  }));
  app.querySelectorAll("[data-system-section]").forEach((button) => button.addEventListener("click", () => {
    state.systemSection = button.dataset.systemSection;
    render();
  }));
  app.querySelectorAll("[data-load-alerts]").forEach((button) => button.addEventListener("click", () => loadSource("alerts", true)));
  app.querySelectorAll("[data-read-rotation]").forEach((button) => button.addEventListener("click", () => loadMessageRotation(button.dataset.readRotation)));
  app.querySelectorAll("[data-run-audit-query]").forEach((button) => button.addEventListener("click", () => runAuditQuery()));
  app.querySelectorAll("[data-application-tab]").forEach((button) => button.addEventListener("click", () => { state.applicationsTab = button.dataset.applicationTab; render(); if (button.dataset.applicationTab === "packages" && !state.packageInventory) loadPackageInventory(); }));
  app.querySelector("[data-refresh-packages]")?.addEventListener("click", () => loadPackageInventory(true));
  app.querySelector("[data-available-package-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = app.querySelector("#available-package-name")?.value?.trim() || "";
    state.availablePackageName = name;
    loadAvailablePackageCatalog(name);
  });
  app.querySelector("#package-filter")?.addEventListener("change", (event) => { state.packageFilter = event.target.value; render(); });
  app.querySelectorAll("[data-package-plan]").forEach((button) => button.addEventListener("click", () => {
    state.packagePlan = preparePackagePlan(fixturePackageInventory(), button.dataset.packageName, button.dataset.packagePlan);
    render();
  }));
  app.querySelector("#evidence-filter")?.addEventListener("change", (event) => { state.evidenceFilter = event.target.value.slice(0, 128); render(); });
  app.querySelector("#evidence-state-filter")?.addEventListener("change", (event) => { state.evidenceStateFilter = event.target.value; render(); });
  app.querySelectorAll("[data-export-evidence]").forEach((button) => button.addEventListener("click", () => {
    const collection = currentEvidenceCollection();
    const records = filterEvidence(collection, state.evidenceFilter, state.evidenceStateFilter);
    const markdown = button.dataset.exportEvidence === "markdown";
    const content = markdown ? exportEvidenceMarkdown(collection, records) : exportEvidenceJSON(collection, records);
    const blob = new Blob([content], { type: markdown ? "text/markdown;charset=utf-8" : "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = markdown ? "opsdeck-evidence.md" : "opsdeck-evidence.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }));
  app.querySelectorAll("[data-item]").forEach((row) => row.addEventListener("click", () => {
    const [sourceId, key] = row.dataset.item.split("::");
    state.selectedItems[sourceId] = key;
    render();
  }));
  app.querySelectorAll("[data-load-user-detail]").forEach((button) => button.addEventListener("click", () => loadUserDetail(button.dataset.loadUserDetail)));
  app.querySelectorAll("[data-load-role-detail]").forEach((button) => button.addEventListener("click", () => loadRoleDetail(button.dataset.loadRoleDetail)));
  app.querySelectorAll("[data-load-role-owners]").forEach((button) => button.addEventListener("click", () => loadRoleOwners(button.dataset.loadRoleOwners)));
  app.querySelectorAll("[data-load-resource-detail]").forEach((button) => button.addEventListener("click", () => loadResourceDetail(button.dataset.loadResourceDetail)));
  app.querySelectorAll("[data-load-task-detail]").forEach((button) => button.addEventListener("click", () => loadTaskDetail(button.dataset.loadTaskDetail)));
  app.querySelectorAll("[data-related-role]").forEach((button) => button.addEventListener("click", () => {
    state.route = "access";
    state.sourceTabs.access = "roles";
    state.selectedItems.roles = button.dataset.relatedRole;
    location.hash = "access";
    render();
    loadSource("roles");
  }));
  app.querySelectorAll("[data-related-resource]").forEach((button) => button.addEventListener("click", () => {
    state.route = "access";
    state.sourceTabs.access = "resources";
    state.selectedItems.resources = button.dataset.relatedResource;
    location.hash = "access";
    render();
    loadSource("resources");
  }));
  app.querySelectorAll("[data-refresh-source]").forEach((button) => button.addEventListener("click", () => loadSource(button.dataset.refreshSource, true)));
  app.querySelectorAll("[data-app]").forEach((row) => {
    const select = () => { state.selected = row.dataset.app; render(); };
    row.addEventListener("click", select);
    row.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } });
  });
  app.querySelectorAll("[data-load-webapp-detail]").forEach((button) => button.addEventListener("click", () => loadWebAppDetail(button.dataset.loadWebappDetail, true)));
  app.querySelectorAll("[data-load-rest-spec]").forEach((button) => button.addEventListener("click", () => loadRestSpec(button.dataset.loadRestSpec, true)));
  app.querySelector("#connect-form")?.addEventListener("submit", connect);
  app.querySelector("#disconnect-button")?.addEventListener("click", disconnect);
  app.querySelector("#refresh-button")?.addEventListener("click", () => refreshLive(true));
}

function clearSession() {
  sessionEpoch += 1;
  nativeAuthorization = null;
  state.connected = false;
  state.auditQuery = null;
  state.jobs = [];
  state.auditQueryBusy = false;
  state.busy = false;
  state.error = "";
  state.info = null;
  state.apps = [];
  state.selected = "";
  state.lastRead = null;
  state.verification = null;
  for (const key of [
    "sourceData", "sourceErrors", "sourceVerification", "selectedItems", "webAppDetails", "webAppDetailErrors",
    "userDetails", "userDetailErrors", "userDetailVerification", "roleDetails", "roleDetailErrors",
    "roleDetailVerification", "roleOwners", "roleOwnerErrors", "roleOwnerVerification", "resourceDetails",
    "resourceDetailErrors", "resourceDetailVerification", "taskDetails", "taskDetailErrors", "taskDetailVerification",
    "restSpecs", "restSpecErrors",
  ]) state[key] = {};
  for (const key of ["sourceLoading", "webAppDetailLoading", "userDetailLoading", "roleDetailLoading", "roleOwnerLoading", "resourceDetailLoading", "taskDetailLoading", "restSpecLoading"]) state[key] = "";
  state.sourceTabs = { applications: "restServices", access: "users", security: "walletCollections", tasks: "tasks", system: "systemUsage", logs: "auditEnabled" };
  state.applicationsTab = "web-apps";
  state.packageFilter = "all";
  state.packagePlan = null;
  state.packageInventory = null;
  state.packageInventoryError = "";
  state.packageInventoryLoading = false;
  state.availablePackageName = "";
  state.availablePackageCatalog = null;
  state.availablePackageError = "";
  state.availablePackageErrorStatus = 0;
  state.availablePackageLoading = false;
  state.evidenceFilter = "";
  state.evidenceStateFilter = "ALL";
  state.route = "overview";
  history.replaceState(null, "", "#overview");
}

function expireSession(message) {
  clearSession();
  state.error = message;
  render();
}

async function disconnect() {
  clearSession();
  render();
  if (!nativeMode) {
    try { await requestJson("/api/logout", { method: "POST" }); } catch { /* state was cleared before the remote request */ }
  }
}

async function connect(event) {
  clearSession();
  const owner = sessionEpoch;
  event.preventDefault();
  const form = event.currentTarget;
  const passwordInput = form.elements.password;
  state.busy = true;
  state.error = "";
  render();
  try {
    if (nativeMode) {
      const username = form.elements.username.value.trim();
      const password = passwordInput.value;
      const bytes = new TextEncoder().encode(`${username}:${password}`);
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      nativeAuthorization = `Basic ${btoa(binary)}`;
      passwordInput.value = "";
      state.sourceData = {};
      state.sourceErrors = {};
      state.webAppDetails = {};
      state.webAppDetailErrors = {};
      state.restSpecs = {};
      state.restSpecErrors = {};
      state.connected = true;
      state.route = "overview";
      history.replaceState(null, "", "#overview");
      state.busy = false;
      render();
      await refreshLive(true);
      if (owner !== sessionEpoch) return;
      if (state.connected) ensureRouteSource();
      return;
    }
    const body = {
      username: form.elements.username.value.trim(),
      password: passwordInput.value,
    };
    passwordInput.value = "";
    const result = await requestJson("/api/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (owner !== sessionEpoch) return;
    passwordInput.value = "";
    state.sourceData = {};
    state.sourceErrors = {};
    state.webAppDetails = {};
    state.webAppDetailErrors = {};
    state.restSpecs = {};
    state.restSpecErrors = {};
    state.connected = true;
    // /api/connect validates and maps the observed info envelope server-side.
    state.info = result.info;
    state.route = "overview";
    history.replaceState(null, "", "#overview");
    state.busy = false;
    render();
    await refreshLive(true);
    if (owner !== sessionEpoch) return;
  } catch (error) {
    if (owner !== sessionEpoch) return;
    passwordInput.value = "";
    expireSession(error.message);
    document.querySelector("#username")?.focus();
  }
}

async function apiPayload(path) {
  return requestJson(nativeMode ? nativeApiPath(path) : path);
}

async function readJson(path) {
  return requestJson(nativeMode ? nativeApiPath(path) : path);
}

function nativeApiPath(path) {
  if (path.startsWith("/api/read/")) {
    const url = new URL(path, location.origin || "http://localhost");
    const route = url.pathname.slice("/api/read/".length);
    const source = READ_ONLY_SOURCES[route];
    if (source && route !== "availablePackages") return source.path;
    if (route === "availablePackages") {
      const names = url.searchParams.getAll("name");
      if (names.length !== 1 || [...url.searchParams.keys()].some((key) => key !== "name") || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/u.test(names[0])) {
        throw new Error("Enter one exact package identity for catalog lookup.");
      }
      return `${source.path}?name=${encodeURIComponent(names[0])}`;
    }
    if (route === "packages") return "/opsdeck-api/packages";
    const details = {
      webAppDetail: ["/api/admin/v2/web-app", "name"],
      userDetail: ["/api/admin/v2/security/user", "name"],
      roleDetail: ["/api/admin/v2/security/role", "name"],
      roleOwners: ["/api/admin/v2/security/role/owners", "name"],
      resourceDetail: ["/api/admin/v2/security/resource", "name"],
      taskDetail: ["/api/admin/v2/task", "id"],
    }[route];
    if (details) return `${details[0]}?${details[1]}=${encodeURIComponent(url.searchParams.get(details[1]) || "")}${route === "roleOwners" ? `&maxRows=${encodeURIComponent(url.searchParams.get("maxRows") || "20")}` : ""}`;
    if (route === "restServiceSpec") {
      const sourceId = url.searchParams.get("source");
      const name = url.searchParams.get("name");
      const namespace = url.searchParams.get("namespace");
      const service = uniqueRecord(state.sourceData[sourceId]?.items, (item) => item.ref.key === name && item.ref.scope === namespace);
      if (!service || typeof service.values.swaggerSpec !== "string") throw new Error("IRIS did not publish a specification for this discovered service.");
      const origin = location.origin || "http://localhost";
      const spec = new URL(service.values.swaggerSpec, origin);
      if (spec.origin !== origin || !spec.pathname.startsWith("/api/mgmnt/")) throw new Error("IRIS returned a specification URL outside the same-origin management API.");
      return spec.pathname;
    }
    throw new Error("This native IRIS read route is not enabled.");
  }
  return path;
}

async function refreshLive(compareReadback) {
  if (!state.connected) return;
  const owner = sessionEpoch;
  state.busy = true;
  state.error = "";
  state.verification = null;
  try {
    render();
    const infoPayload = await apiPayload("/api/admin/info");
    if (owner !== sessionEpoch) return;
    state.info = mapServerInfo(infoPayload);
    const listPayload = await apiPayload("/api/admin/v2/web-apps");
    if (owner !== sessionEpoch) return;
    state.apps = mapWebApps(listPayload);
    state.lastRead = new Date().toISOString();
    if (!state.selected || !state.apps.some((item, index) => recordHandle(state.apps, index) === state.selected)) {
      state.selected = state.apps.length ? recordHandle(state.apps, 0) : "";
    }
    render();

    if (compareReadback) {
      const firstRead = state.apps;
      const secondPayload = await apiPayload("/api/admin/v2/web-apps");
    if (owner !== sessionEpoch) return;
      const secondRead = mapWebApps(secondPayload);
      state.verification = {
        matched: sameWebAppState(firstRead, secondRead),
        count: firstRead.length,
        at: new Date().toISOString(),
      };
      state.lastRead = state.verification.at;
    }
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.error = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) {
      expireSession(error.message);
    }
  } finally {
    if (owner !== sessionEpoch) return;
    state.busy = false;
    render();
  }
}

async function loadSource(sourceId, force = false) {
  if (!state.connected) return;
  const owner = sessionEpoch;
  if (!force && (state.sourceData[sourceId] || state.sourceErrors[sourceId])) return;
  state.sourceLoading = sourceId;
  delete state.sourceErrors[sourceId];
  render();
  try {
    const payload = await readJson(`/api/read/${sourceId}`);
    if (owner !== sessionEpoch) return;
    const previous = state.sourceData[sourceId];
    const current = mapReadOnlySource(sourceId, payload);
    state.sourceData[sourceId] = current;
    if (previous && sourceId !== "alerts") state.sourceVerification[sourceId] = {
      matched: sameReadOnlySource(previous, current),
      at: current.observedAt,
    };
    delete state.sourceErrors[sourceId];
    state.lastRead = state.sourceData[sourceId].observedAt;
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.sourceErrors[sourceId] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) {
      expireSession(error.message);
    }
  } finally {
    if (owner !== sessionEpoch) return;
    state.sourceLoading = "";
    render();
  }
}

async function loadMessageRotation(identity) {
  if (!state.connected || !/^messagesRotation:[0-9A-F]{64}$/u.test(identity) || state.rotationLoading) return;
  const owner = sessionEpoch;
  state.rotationLoading = identity;
  render();
  try {
    const payload = await readJson(`/api/read/messageRotation?id=${encodeURIComponent(identity)}`);
    if (owner !== sessionEpoch) return;
    state.sourceData[identity] = mapReadOnlySource(identity, payload);
    state.selectedRotation = identity;
    state.lastRead = state.sourceData[identity].observedAt;
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.sourceErrors[identity] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) expireSession(error.message);
  } finally {
    if (owner !== sessionEpoch) return;
    state.rotationLoading = "";
    render();
  }
}

async function loadPackageInventory(force = false) {
  if (!state.connected || (state.packageInventoryLoading && !force)) return;
  const owner = sessionEpoch;
  state.packageInventoryLoading = true;
  state.packageInventoryError = "";
  render();
  try {
    const payload = await readJson("/api/read/packages");
    if (owner !== sessionEpoch) return;
    state.packageInventory = mapInstalledPackageInventory(payload);
    state.lastRead = new Date().toISOString();
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.packageInventoryError = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) expireSession(error.message);
  } finally {
    if (owner !== sessionEpoch) return;
    state.packageInventoryLoading = false;
    render();
  }
}

async function loadAvailablePackageCatalog(name) {
  if (!state.connected || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/u.test(name) || state.availablePackageLoading) return;
  const owner = sessionEpoch;
  state.availablePackageLoading = true;
  state.availablePackageError = "";
  state.availablePackageErrorStatus = 0;
  state.availablePackageCatalog = null;
  render();
  try {
    const query = new URLSearchParams({ name });
    const payload = await readJson(`/api/read/availablePackages?${query}`);
    if (owner !== sessionEpoch) return;
    state.availablePackageCatalog = mapAvailablePackageCatalog(payload);
    state.lastRead = new Date().toISOString();
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.availablePackageError = error.message;
    state.availablePackageErrorStatus = Number(error.status) || 0;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) expireSession(error.message);
  } finally {
    if (owner !== sessionEpoch) return;
    state.availablePackageLoading = false;
    render();
  }
}

async function runAuditQuery() {
  if (!state.connected) return;
  const owner = sessionEpoch;
  if (state.auditQueryBusy || !state.info?.username) return;
  let stage = "submit";
  let httpStatus = null;
  let currentTask = null;
  let locationShape = null;
  let jobIdentity = null;
  let resultIdentity = null;
  const observedAt = new Date().toISOString();
  const publishAuditQuery = (query) => {
    const fullQuery = { ...query, observedAt };
    if (fullQuery.jobIdentity) jobIdentity = fullQuery.jobIdentity;
    else if (jobIdentity) fullQuery.jobIdentity = jobIdentity;
    if (fullQuery.resultIdentity) resultIdentity = fullQuery.resultIdentity;
    else if (resultIdentity) fullQuery.resultIdentity = resultIdentity;
    state.auditQuery = fullQuery;
    if (fullQuery.jobIdentity) {
      try { state.jobs = upsertJob(state.jobs, mapAuditJob(fullQuery, state.jobs.find(job => job.identity === fullQuery.jobIdentity))); } catch { /* keep the source observation visible if its Job projection is incomplete */ }
    }
  };
  state.auditQueryBusy = true;
  publishAuditQuery({ state: "accepted", message: "Submitting one filtered query for the current account, bounded to maxRows=1." });
  render();
  try {
    const now = Date.now();
    const query = new URLSearchParams({
      usernames: state.info.username,
      beginDateTime: new Date(now - 10 * 60 * 1000).toISOString(),
      endDateTime: new Date(now).toISOString(),
      maxRows: String(AUDIT_QUERY_MAX_ROWS),
    });
    const headers = { Accept: "application/json" };
    if (nativeMode && nativeAuthorization) headers.Authorization = nativeAuthorization;
    const response = await fetch(`/api/admin/v2/security/audit/records?${query}`, {
      method: "POST", cache: "no-store", credentials: "same-origin", headers,
      signal: AbortSignal.timeout(20000),
    });
    if (owner !== sessionEpoch) return;
    if (response.status === 401) { clearSession(); state.error = "Authentication failed (HTTP 401). Sign in again."; render(); return; }
    httpStatus = response.status;
    if (response.status === 401 || response.status === 403) {
      publishAuditQuery({ state: "denied", stage, httpStatus, message: `IRIS denied the bounded audit query (HTTP ${response.status}).` });
      return;
    }
    if (response.status !== 202) {
      publishAuditQuery({ state: "unavailable", stage, httpStatus, message: `Audit query handoff was unavailable (HTTP ${response.status}).` });
      return;
    }
    stage = "validate Location";
    locationShape = inspectAuditLocation(response.headers.get("Location"), location.href);
    jobIdentity = `session:audit-job:${observedAt}`;
    publishAuditQuery({ state: "accepted", stage, httpStatus, locationShape, jobIdentity, message: "IRIS accepted the query (HTTP 202). Validating the returned Location." });
    render();
    const handle = validateAuditLocation(response.headers.get("Location"), location.href);
    resultIdentity = handle;
    currentTask = { idVerified: true };
    stage = "async result read";
    publishAuditQuery({ state: "queued", stage, httpStatus, locationShape, jobIdentity, resultIdentity: handle, message: "IRIS accepted the query. Reading the exact same-origin async resource from Location.", task: currentTask });
    render();
    const deadline = Date.now() + 30000;
    for (let attempt = 0; attempt < 40 && Date.now() < deadline; attempt += 1) {
      const payload = await requestJson(handle.url, { redirect: "error", signal: AbortSignal.timeout(Math.min(5000, Math.max(1, deadline - Date.now()))) });
    if (owner !== sessionEpoch) return;
      httpStatus = 200;
      stage = "async task contract";
      const mapped = mapAuditAsyncResult(payload, handle);
      currentTask = mapped.task;
      const taskState = mapped.task.state.toLowerCase();
      if (taskState === "queued" || taskState === "running") {
        publishAuditQuery({
          state: taskState, stage, httpStatus, locationShape, jobIdentity, resultIdentity: handle, message: taskState === "queued" ? "Async task is queued; waiting for a live state update." : "Async task is running; waiting for a terminal state.",
          task: mapped.task,
        });
        render();
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (owner !== sessionEpoch) return;
        continue;
      }
      if (taskState === "finished") {
        publishAuditQuery({ state: "finished", stage, httpStatus, locationShape, jobIdentity, resultIdentity: handle, message: "Async task finished. Only the bounded Result and reviewed fields are shown.", ...mapped });
      } else if (taskState === "failed") {
        publishAuditQuery({ state: "failed", stage, httpStatus, locationShape, jobIdentity, resultIdentity: handle, message: "Async audit query failed.", task: mapped.task, failure: "IRIS reported a task failure." });
      } else if (taskState === "canceled") {
        publishAuditQuery({ state: "canceled", stage, httpStatus, locationShape, jobIdentity, resultIdentity: handle, message: "Async audit query was canceled by IRIS.", task: mapped.task });
      } else {
        publishAuditQuery({ state: "unavailable", stage, httpStatus, locationShape, jobIdentity, resultIdentity: handle, message: "Async task is paused; no completion is inferred.", task: mapped.task });
      }
      return;
    }
    publishAuditQuery({ state: "unavailable", jobIdentity, resultIdentity, message: "Async task remained nonterminal during the bounded wait. No completion is inferred.", task: state.auditQuery?.task });
  } catch (error) {
    if (owner !== sessionEpoch) return;
    const denied = error.status === 401 || error.status === 403;
    const ambiguous = httpStatus === 202 && ["validate Location", "async result read", "async task contract"].includes(stage);
    publishAuditQuery({
      state: denied ? "denied" : ambiguous ? "ambiguous" : "unavailable",
      message: denied ? `IRIS denied the async audit read (HTTP ${error.status}).` : ambiguous ? "IRIS accepted the query, but its async identity or result could not be verified. No retry was attempted." : "Audit query or async result is unavailable.",
      stage,
      httpStatus: error.status || httpStatus,
      task: currentTask,
      locationShape,
      failure: ["validate Location", "async task contract"].includes(stage) ? error.message : "The request did not produce a usable async result.",
    });
  } finally {
    if (owner !== sessionEpoch) return;
    state.auditQueryBusy = false;
    render();
  }
}

async function loadWebAppDetail(name, force = false) {
  if (!state.connected) return;
  const owner = sessionEpoch;
  if (!force && (state.webAppDetails[name] || state.webAppDetailErrors[name])) return;
  const selected = uniqueRecord(state.apps, (item) => item.name === name);
  if (!selected) return;
  state.webAppDetailLoading = name;
  delete state.webAppDetailErrors[name];
  render();
  try {
    const payload = await readJson(`/api/read/webAppDetail?name=${encodeURIComponent(selected.name)}`);
    if (owner !== sessionEpoch) return;
    state.webAppDetails[name] = mapWebAppDetail(payload, selected);
    state.lastRead = state.webAppDetails[name].ref.observedAt;
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.webAppDetailErrors[name] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) {
      expireSession(error.message);
    }
  } finally {
    if (owner !== sessionEpoch) return;
    state.webAppDetailLoading = "";
    render();
  }
}

async function loadUserDetail(name) {
  if (!state.connected) return;
  const owner = sessionEpoch;
  if (state.userDetailLoading) return;
  const selected = uniqueRecord(state.sourceData.users?.items, (item) => item.ref.key === name);
  if (!selected) return;
  const previous = state.userDetails[name];
  state.userDetailLoading = name;
  delete state.userDetailErrors[name];
  render();
  try {
    const payload = await readJson(`/api/read/userDetail?name=${encodeURIComponent(selected.ref.key)}`);
    if (owner !== sessionEpoch) return;
    const detail = mapSecurityUserDetail(payload, selected);
    state.userDetails[name] = detail;
    if (previous) state.userDetailVerification[name] = {
      matched: sameSecurityUserRelationships(previous, detail),
      at: detail.ref.observedAt,
    };
    state.lastRead = detail.ref.observedAt;
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.userDetailErrors[name] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) {
      expireSession(error.message);
    }
  } finally {
    if (owner !== sessionEpoch) return;
    state.userDetailLoading = "";
    render();
  }
}

async function loadRoleDetail(name) {
  if (!state.connected) return;
  const owner = sessionEpoch;
  if (state.roleDetailLoading) return;
  const selected = uniqueRecord(state.sourceData.roles?.items, (item) => item.ref.key === name);
  if (!selected) return;
  const previous = state.roleDetails[name];
  state.roleDetailLoading = name;
  delete state.roleDetailErrors[name];
  render();
  try {
    const payload = await readJson(`/api/read/roleDetail?name=${encodeURIComponent(selected.ref.key)}`);
    if (owner !== sessionEpoch) return;
    const detail = mapSecurityRoleDetail(payload, selected);
    state.roleDetails[name] = detail;
    if (previous) state.roleDetailVerification[name] = { matched: sameSecurityRoleDetail(previous, detail), at: detail.ref.observedAt };
    state.lastRead = detail.ref.observedAt;
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.roleDetailErrors[name] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) { expireSession(error.message); }
  } finally {
    if (owner !== sessionEpoch) return;
    state.roleDetailLoading = "";
    render();
  }
}

async function loadRoleOwners(name) {
  if (!state.connected) return;
  const owner = sessionEpoch;
  if (state.roleOwnerLoading) return;
  const selected = uniqueRecord(state.sourceData.roles?.items, (item) => item.ref.key === name);
  if (!selected) return;
  const previous = state.roleOwners[name];
  state.roleOwnerLoading = name;
  delete state.roleOwnerErrors[name];
  render();
  try {
    const query = new URLSearchParams({ name: selected.ref.key, maxRows: "20" });
    const payload = await readJson(`/api/read/roleOwners?${query}`);
    if (owner !== sessionEpoch) return;
    const owners = mapSecurityRoleOwners(payload, selected);
    state.roleOwners[name] = owners;
    if (previous) state.roleOwnerVerification[name] = { matched: sameSecurityRoleOwners(previous, owners), at: new Date().toISOString() };
    state.lastRead = new Date().toISOString();
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.roleOwnerErrors[name] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) { expireSession(error.message); }
  } finally {
    if (owner !== sessionEpoch) return;
    state.roleOwnerLoading = "";
    render();
  }
}

async function loadResourceDetail(name) {
  if (!state.connected) return;
  const owner = sessionEpoch;
  if (state.resourceDetailLoading) return;
  const selected = uniqueRecord(state.sourceData.resources?.items, (item) => item.ref.key === name);
  if (!selected) return;
  const previous = state.resourceDetails[name];
  state.resourceDetailLoading = name;
  delete state.resourceDetailErrors[name];
  render();
  try {
    const payload = await readJson(`/api/read/resourceDetail?name=${encodeURIComponent(selected.ref.key)}`);
    if (owner !== sessionEpoch) return;
    const detail = mapSecurityResourceDetail(payload, selected);
    state.resourceDetails[name] = detail;
    if (previous) state.resourceDetailVerification[name] = { matched: sameSecurityResourceDetail(previous, detail), at: detail.ref.observedAt };
    state.lastRead = detail.ref.observedAt;
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.resourceDetailErrors[name] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) { expireSession(error.message); }
  } finally {
    if (owner !== sessionEpoch) return;
    state.resourceDetailLoading = "";
    render();
  }
}

async function loadTaskDetail(id) {
  if (!state.connected) return;
  const owner = sessionEpoch;
  if (state.taskDetailLoading) return;
  const selected = uniqueRecord(state.sourceData.tasks?.items, (item) => item.ref.key === id);
  if (!selected) return;
  const previous = state.taskDetails[id];
  state.taskDetailLoading = id;
  delete state.taskDetailErrors[id];
  render();
  try {
    const payload = await readJson(`/api/read/taskDetail?id=${encodeURIComponent(id)}`);
    if (owner !== sessionEpoch) return;
    const detail = mapTaskDetail(payload, selected);
    state.taskDetails[id] = detail;
    if (previous) state.taskDetailVerification[id] = { matched: sameTaskDetail(previous, detail), at: detail.ref.observedAt };
    state.lastRead = detail.ref.observedAt;
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.taskDetailErrors[id] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) { expireSession(error.message); }
  } finally {
    if (owner !== sessionEpoch) return;
    state.taskDetailLoading = "";
    render();
  }
}

async function loadRestSpec(specKey, force = false) {
  if (!state.connected) return;
  const owner = sessionEpoch;
  if (!force && (state.restSpecs[specKey] || state.restSpecErrors[specKey])) return;
  const [sourceId, name, namespace] = JSON.parse(specKey);
  const service = uniqueRecord(state.sourceData[sourceId]?.items, (item) => item.ref.key === name && item.ref.scope === namespace);
  if (!service) return;
  state.restSpecLoading = specKey;
  delete state.restSpecErrors[specKey];
  render();
  try {
    const query = new URLSearchParams({ source: sourceId, name, namespace });
    const payload = await readJson(`/api/read/restServiceSpec?${query}`);
    if (owner !== sessionEpoch) return;
    state.restSpecs[specKey] = mapRestServiceSpec(payload, service.ref);
    state.lastRead = state.restSpecs[specKey].ref.observedAt;
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.restSpecErrors[specKey] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) {
      expireSession(error.message);
    }
  } finally {
    if (owner !== sessionEpoch) return;
    state.restSpecLoading = "";
    render();
  }
}

function ensureRouteSource() {
  const route = state.route;
  if (route === "applications" || domainSources[route]) {
    const sourceId = state.sourceTabs[route] || domainSources[route]?.[0];
    if (sourceId) loadSource(sourceId);
  }
}

async function restoreSession() {
  const owner = sessionEpoch;
  if (nativeMode) {
    state.connected = false;
    state.busy = false;
    render();
    return;
  }
  try {
    await requestJson("/api/session");
    if (owner !== sessionEpoch) return;
    state.connected = true;
    await refreshLive(true);
    if (owner !== sessionEpoch) return;
    ensureRouteSource();
  } catch {
    if (owner !== sessionEpoch) return;
    clearSession();
    render();
  }
}

addEventListener("hashchange", () => {
  const route = location.hash.slice(1);
  if (navItems.some(([item]) => item === route)) {
    state.route = route;
    // The active route is promoted into the visible primary set by the projection.
    state.mobileMoreOpen = false;
  }
  render();
  ensureRouteSource();
});
const compactNavigationQuery = matchMedia("(max-width: 980px)");
compactNavigationQuery.addEventListener("change", (event) => {
  if (!event.matches) state.mobileMoreOpen = false;
  render();
});
if (state.theme === "system") matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => setTheme("system"));
setTheme(state.theme);
render();
restoreSession();
