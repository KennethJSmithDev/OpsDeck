import { mapServerInfo, mapWebApps, mapWebAppDetail, mapSecurityUserDetail, sameSecurityUserRelationships, mapSecurityRoleDetail, sameSecurityRoleDetail, mapSecurityRoleOwners, sameSecurityRoleOwners, mapSecurityResourceDetail, sameSecurityResourceDetail, mapTaskDetail, sameTaskDetail, mapRestServiceSpec, mapReadOnlySource, sameReadOnlySource, READ_ONLY_SOURCES, sameWebAppState, inspectAuditLocation, validateAuditLocation, mapAuditAsyncResult, AUDIT_QUERY_MAX_ROWS } from "./iris-provider.js?v=native-pivot-audit-location";

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
  logs: ["auditEnabled", "auditEvents", "taskHistory", "journalFiles", "alerts"],
};
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
  sourceData: {}, sourceErrors: {}, sourceLoading: "", sourceVerification: {},
  sourceTabs: { applications: "restServices", access: "users", security: "walletCollections", tasks: "tasks", system: "systemUsage", logs: "auditEnabled" },
  selectedItems: {},
  webAppDetails: {}, webAppDetailErrors: {}, webAppDetailLoading: "",
  userDetails: {}, userDetailErrors: {}, userDetailLoading: "", userDetailVerification: {},
  roleDetails: {}, roleDetailErrors: {}, roleDetailLoading: "", roleDetailVerification: {},
  roleOwners: {}, roleOwnerErrors: {}, roleOwnerLoading: "", roleOwnerVerification: {},
  resourceDetails: {}, resourceDetailErrors: {}, resourceDetailLoading: "", resourceDetailVerification: {},
  taskDetails: {}, taskDetailErrors: {}, taskDetailLoading: "", taskDetailVerification: {},
  restSpecs: {}, restSpecErrors: {}, restSpecLoading: "",
  auditQuery: null, auditQueryBusy: false,
};

const nativeMode = location.pathname?.startsWith("/opsdeck") === true;
let nativeAuthorization = null;
const app = document.querySelector("#app");
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const fmtTime = (value) => value ? new Intl.DateTimeFormat(undefined, {
  hour: "2-digit", minute: "2-digit", second: "2-digit",
}).format(new Date(value)) : "—";

async function requestJson(path, options = {}) {
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
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new Error(`Timed out waiting for ${nativeMode ? "IRIS" : "the local OpsDeck proxy"}.`);
    }
    throw new Error(`Could not reach ${nativeMode ? "IRIS" : "the local OpsDeck proxy"}.`);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (nativeMode && response.status === 401) nativeAuthorization = null;
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

function shell(content) {
  const user = state.info ? esc(state.info.username) : "Not connected";
  const version = state.info ? esc(state.info.serverVersion) : "Local instance not verified";
  const connected = state.connected;
  const demoMode = state.info?.systemMode === "DEMO";
  return `
    <div class="shell">
      <header class="topbar">
        <a class="brand" href="#overview" aria-label="OpsDeck overview"><span class="brand-mark">OD</span><span>OpsDeck</span></a>
        <div class="instance-line"><span class="instance-label">${demoMode ? "Demo dataset" : "IRIS instance"}</span><span class="instance-value">${version}</span></div>
        <div class="top-actions">
          <span class="connection-state">${badge(connected ? (demoMode ? "Safe demo" : "Live session") : "Disconnected", connected ? (demoMode ? "warning" : "success") : "muted")}</span>
          ${connected ? `<span class="user-chip">${user}</span>` : ""}
          ${connected ? '<button class="button quiet" id="disconnect-button" type="button">Sign out</button>' : ""}
          <label class="theme-picker"><span class="sr-only">Color theme</span><select id="theme-select" aria-label="Color theme"><option value="dark" ${state.theme === "dark" ? "selected" : ""}>Dark</option><option value="light" ${state.theme === "light" ? "selected" : ""}>Light</option><option value="system" ${state.theme === "system" ? "selected" : ""}>System</option></select></label>
        </div>
      </header>
      <aside class="sidebar" aria-label="Primary navigation">
        <div class="nav-caption">WORKSPACE</div>
        ${navItems.map(([route, label], index) => {
          const active = state.route === route;
          const available = true;
          return `<button class="nav-item ${active ? "active" : ""}" data-route="${route}"><span class="nav-index">${String(index + 1).padStart(2, "0")}</span><span>${label}</span></button>`;
        }).join("")}
        <div class="sidebar-note"><span class="note-dot"></span><span>${demoMode ? "Safe demo · sanitized" : "Live reads · M1"}</span></div>
      </aside>
      <main class="workspace">${content}</main>
      <footer class="statusbar"><span><i class="status-dot ${connected ? "online" : ""}"></i>${connected ? (demoMode ? "Safe demo provider active" : "IRIS connection active") : "Connect to your local IRIS instance"}</span><span>${demoMode ? "Sanitized deterministic data · no IRIS connection" : (nativeMode ? "Same-origin session · credentials remain in tab memory" : "Loopback session · credentials are not saved")}</span><span>Last read ${fmtTime(state.lastRead)}</span></footer>
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
        <input id="username" name="username" value="${nativeMode ? "" : "_SYSTEM"}" autocomplete="off" required maxlength="128">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="off" required maxlength="512">
        <button class="button primary connect-button" type="submit" ${state.busy ? "disabled" : ""}>${state.busy ? '<span class="spinner"></span>Checking connection…' : "Connect to local IRIS"}</button>
        <div class="local-only"><span class="lock-icon" aria-hidden="true">⌑</span> ${nativeMode ? "Direct to same-origin IRIS · HTTP Basic" : "Requests stay on this computer · HTTP Basic · loopback only"}</div>
      </form>
    </section>
    <section class="gate-strip"><div><span class="gate-kicker">M0 PASSED</span><strong>Live API identity + applications</strong></div><div>${badge("M1 read-only", "accent")}</div><p>Connected sessions can browse verified M1 providers. Mutation workflows remain gated until fixture and read-back qualification.</p></section>`);
}


function safeDemoTour() {
  if (state.info?.systemMode !== "DEMO") return "";
  return `
    <section class="panel judge-tour" aria-labelledby="judge-tour-title">
      <div class="panel-head">
        <div><div class="panel-kicker">EVALUATOR SHORTCUT</div><h2 id="judge-tour-title">90-second judge tour</h2></div>
        ${badge("Safe demo", "warning")}
      </div>
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
    <section class="panel roadmap-panel"><div class="panel-head"><div><div class="panel-kicker">PRODUCT COVERAGE</div><h2>Operations workspace</h2></div>${badge(demoMode ? "Evaluator-safe surface" : "M0 reproduced · M1 in progress", demoMode ? "accent" : "warning")}</div><div class="roadmap-grid">${navItems.slice(2).map(([, title], i) => `<div class="roadmap-item"><span class="roadmap-index">${String(i + 2).padStart(2, "0")}</span><strong>${title}</strong><span>${["Users, roles and resources", "Credential metadata", "Task inventory", "System and process views", "Audit and journal sources", "Qualification and evidence receipts"][i]}</span></div>`).join("")}</div><p class="roadmap-note">Live values come from fixed read-only providers. OpsDeck does not substitute fixtures for IRIS data.</p></section>`);
}

function pageHeader(title, description) {
  return `<div class="page-header"><div><div class="eyebrow"><span class="eyebrow-rule"></span>OPSDECK WORKSPACE</div><h1>${title}</h1><p>${description}</p></div><div class="page-header-meta">${badge("IRIS 2026.2", "accent")}</div></div>`;
}

function applicationsView() {
  const selected = state.apps.find((item) => item.name === state.selected) || state.apps[0] || null;
  const rows = state.apps.map((item) => `<tr class="app-row ${selected?.name === item.name ? "selected" : ""}" tabindex="0" role="button" data-app="${esc(item.name)}" aria-label="Inspect ${esc(item.name)}"><td><span class="app-name">${esc(item.name)}</span><span class="app-sub">${esc(item.dispatchClass || item.type)}</span></td><td><code>${esc(item.namespace)}</code></td><td>${item.enabled ? badge("Enabled", "success") : badge("Disabled", "muted")}</td><td>${esc(item.type)}</td><td>${esc(item.authenticationMethods.join(", ") || "None returned")}</td></tr>`).join("");
  const detail = selected ? state.webAppDetails[selected.name] : null;
  const detailError = selected ? state.webAppDetailErrors[selected.name] : null;
  const restMatches = selected ? restServiceMatches(selected) : [];
  const detailContent = !selected ? `<div class="source-message">Select a web application.</div>` :
    state.webAppDetailLoading === selected.name ? `<div class="source-message">Loading authoritative web-app detail…</div>` :
      detailError ? `<div class="source-message source-error" role="alert"><strong>Detail unavailable</strong><p>${esc(detailError)}</p><code>GET /api/admin/v2/web-app?name=…</code></div>` :
        detail ? `<dl class="detail-grid">${Object.entries(detail.values).map(([key, value]) => `<dt>${esc(key)}</dt><dd>${cellValue(value)}</dd>`).join("")}</dl><div class="inspector-foot">GET /api/admin/v2/web-app · ${esc(detail.ref.provider)} · observed ${fmtTime(detail.ref.observedAt)}</div>` :
          `<p class="app-sub">Expanded configuration is fetched only when requested.</p><button class="button secondary" data-load-webapp-detail="${esc(selected.name)}">Load authoritative detail</button>`;
  const relationshipContent = !selected ? "" : restMatches.length ? restMatches.map(({ sourceId, item }) => {
    const specKey = `${sourceId}::${item.ref.key}::${item.ref.scope}`;
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
    <div class="app-toolbar"><div><strong>${state.apps.length}</strong><span> web applications</span><span class="toolbar-divider">·</span><span>Scope <code>All returned namespaces</code></span></div><div>${state.verification ? badge(state.verification.matched ? "Authoritative read-back matched" : "Read-back mismatch", state.verification.matched ? "success" : "error") : badge("Read-back pending", "muted")}</div></div>
    ${state.error ? `<div class="notice error" role="alert">${esc(state.error)}</div>` : ""}
    <section class="apps-layout">
      <article class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>Web application</th><th>Namespace</th><th>State</th><th>Type</th><th>Authentication</th></tr></thead><tbody>${rows || `<tr><td colspan="5" class="empty-cell">No web applications were returned by IRIS.</td></tr>`}</tbody></table></div><div class="panel-foot">Provider <code>SysAdmin API v2</code> · Updated ${fmtTime(state.lastRead)}</div></article>
      <aside class="panel inspector"><div class="panel-kicker">RESOURCE INSPECTOR</div>${selected ? `<h2 class="inspector-title"><code>${esc(selected.name)}</code></h2><p class="inspector-sub">Provider-owned identity · namespace scoped</p><dl class="detail-grid"><dt>Namespace</dt><dd><code>${esc(selected.namespace)}</code></dd><dt>Enabled</dt><dd>${selected.enabled ? "Yes" : "No"}</dd><dt>Type</dt><dd>${selected.type === null ? "Not returned" : esc(selected.type)}</dd><dt>Resource</dt><dd>${selected.resource === null ? "Not returned" : selected.resource ? `<code>${esc(selected.resource)}</code>` : "None"}</dd><dt>Authentication</dt><dd>${esc(selected.authenticationMethods.join(", ") || "None returned")}</dd><dt>Default namespace</dt><dd>${selected.namespaceDefault === null ? "Not returned" : selected.namespaceDefault ? "Yes" : "No"}</dd><dt>System application</dt><dd>${selected.isSystemApp === null ? "Not returned" : selected.isSystemApp ? "Yes" : "No"}</dd><dt>Dispatch class</dt><dd>${selected.dispatchClass === null ? "Not returned" : selected.dispatchClass ? `<code>${esc(selected.dispatchClass)}</code>` : "None"}</dd></dl><div class="inspector-foot">Key <code>${esc(selected.ref.key)}</code> · refreshed ${fmtTime(selected.ref.observedAt)}</div><section class="inspector-section"><div class="panel-kicker">AUTHORITATIVE DETAIL</div>${detailContent}</section><section class="inspector-section"><div class="panel-kicker">REST SERVICE RELATIONSHIP</div>${relationshipContent}</section>` : `<div class="empty-inspector">Select an application to inspect its observed fields.</div>`}</aside>
    </section>
    <section class="verification-banner ${state.verification?.matched ? "verified" : state.verification ? "mismatch" : "pending"}"><div class="verification-symbol">${state.verification?.matched ? "✓" : state.verification ? "!" : "·"}</div><div><strong>${state.verification?.matched ? "Read-back confirmed" : state.verification ? "Read-back requires review" : "Waiting for authoritative read-back"}</strong><p>${state.verification ? `${state.verification.count} web-app records from the rendered list were compared with a second GET response.` : "OpsDeck performs a separate read after the initial list is rendered."}</p></div><code>GET /api/admin/v2/web-apps</code></section>
    <section class="panel provider-panel"><div class="panel-head"><div><div class="panel-kicker">REST DISCOVERY</div><h2>Namespace REST services</h2></div>${badge("Live source", "accent")}</div>${sourceSelector("applications")}${sourcePanel(state.sourceTabs.applications)}</section>`);
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
  const source = READ_ONLY_SOURCES[sourceId];
  const data = state.sourceData[sourceId];
  const error = state.sourceErrors[sourceId];
  if (state.sourceLoading === sourceId) return `<div class="source-message">Loading the selected live source…</div>`;
  if (error) return `<div class="source-message source-error" role="alert"><strong>Source unavailable</strong><p>${esc(error)}</p><code>GET ${esc(source.path)}</code><button class="button quiet" data-refresh-source="${sourceId}">Retry source</button></div>`;
  if (sourceId === "alerts") {
    if (!data) return `<div class="source-message"><strong>Stateful alert feed</strong><p>IRIS returns alerts since the previous feed read. OpsDeck does not poll this source automatically; requesting a batch advances that read boundary.</p><button class="button secondary" data-load-alerts>Read alert batch</button><div class="panel-foot">GET <code>${esc(source.path)}</code> · ${esc(source.requiredPrivilege)} · iris-monitor-api</div></div>`;
    const fieldShapes = data.items.map((item) => `<li><strong>${esc(item.ref.label)}</strong><span>${item.values.observedFields.length ? item.values.observedFields.map((field) => `<code>${esc(field)}</code>`).join(" ") : "No fields returned"}</span></li>`).join("");
    return `<div class="source-toolbar"><div><strong>${data.count}</strong><span> alerts returned in this batch</span></div><button class="button quiet" data-load-alerts>Read next batch</button></div>${data.count ? `<p class="source-caveat">Alert values are withheld until the live record schema and safe display fields are qualified. These field names describe shape only.</p><ul class="relationship-list">${fieldShapes}</ul>` : `<div class="source-message" role="status">IRIS returned no alerts in this batch.</div>`}<div class="panel-foot">GET <code>${esc(source.path)}</code> · stateful feed · ${fmtTime(data.observedAt)}</div>`;
  }
  if (!data) return `<div class="source-message">Select a source to load authoritative IRIS data.</div>`;
  const items = data.items;
  const selectedKey = state.selectedItems[sourceId] || items[0]?.ref.key;
  const selected = items.find((item) => item.ref.key === selectedKey) || items[0];
  const keys = selected ? Object.keys(selected.values) : [];
  const columns = keys.slice(0, 6);
  const visibleColumns = columns.filter((key) => key !== (keys[0] || ""));
  const rows = items.map((item) => `<tr class="provider-row ${selected?.ref.key === item.ref.key ? "selected" : ""}" tabindex="0" role="button" data-item="${esc(sourceId)}::${esc(item.ref.key)}"><td><strong>${esc(item.ref.label)}</strong><span class="app-sub">${item.ref.scope ? esc(item.ref.scope) : esc(item.ref.kind)}</span></td>${visibleColumns.map((key) => `<td>${cellValue(item.values[key])}</td>`).join("")}</tr>`).join("");
  const objectMetrics = data.resultType === "object" && selected
    ? `<div class="metric-grid">${Object.entries(selected.values).map(([key, value]) => `<article class="metric-card"><span>${esc(key)}</span><strong>${cellValue(value)}</strong></article>`).join("")}</div>`
    : null;
  const detail = selected && data.resultType !== "object"
    ? `<aside class="panel inspector provider-inspector"><div class="panel-kicker">AUTHORITATIVE RESOURCE</div><h2 class="inspector-title">${esc(selected.ref.label)}</h2><p class="inspector-sub">Stable key <code>${esc(selected.ref.key)}</code>${selected.ref.scope ? ` · ${esc(selected.ref.scope)}` : ""}</p><dl class="detail-grid">${Object.entries(selected.values).map(([key, value]) => `<dt>${esc(key)}</dt><dd>${cellValue(value)}</dd>`).join("")}</dl><div class="inspector-foot">${esc(selected.ref.provider)} · observed ${fmtTime(selected.ref.observedAt)}</div>${sourceId === "users" ? userDetailContent(selected) : sourceId === "roles" ? roleDetailContent(selected) : sourceId === "resources" ? resourceDetailContent(selected) : sourceId === "tasks" ? taskDetailContent(selected) : ""}</aside>`
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
    logs: "Audit configuration, task history, journal inventory, and bounded audit search.",
  };
  const sourceId = state.sourceTabs[route] || domainSources[route]?.[0];
  const logTools = route === "logs" ? auditQueryPanel() : "";
  const caveat = route === "logs" ? `<p class="source-caveat">Messages and System Monitor files require an IRIS-owned fixed-source reader. Alerts are a stateful feed and are read only when explicitly requested.</p>` : "";
  return shell(`${pageHeader(title, descriptions[route] || "Live IRIS provider data.")}${logTools}<section class="panel provider-panel"><div class="panel-head"><div><div class="panel-kicker">LIVE PROVIDER DATA</div><h2>${esc(READ_ONLY_SOURCES[sourceId]?.label || title)}</h2></div>${badge("Read only", "accent")}</div>${sourceSelector(route)}${sourcePanel(sourceId)}${caveat}</section>`);
}

function auditQueryPanel() {
  const query = state.auditQuery;
  const locationShape = query?.locationShape ? `<div class="audit-location-shape"><div class="panel-kicker">LOCATION STRUCTURE · NO ID VALUE RETAINED</div><dl class="detail-grid">${Object.entries(query.locationShape).map(([key, value]) => `<dt>${esc(key)}</dt><dd>${esc(Array.isArray(value) ? value.join(", ") || "none" : value)}</dd>`).join("")}</dl></div>` : "";
  const records = query?.result?.length
    ? `<div class="audit-records"><div class="panel-kicker">SAFE RECORD FIELDS · ${query.resultCount} OF AT MOST ${AUDIT_QUERY_MAX_ROWS}</div>${query.result.map((record, index) => `<div class="audit-record"><strong>Record ${index + 1}</strong><dl class="detail-grid">${Object.entries(record).map(([key, value]) => `<dt>${esc(key)}</dt><dd>${cellValue(value)}</dd>`).join("") || "<dt>Fields</dt><dd>No approved display fields returned.</dd>"}</dl></div>`).join("")}</div>`
    : query?.state === "finished" ? `<p class="source-message">Finished empty. The bounded Result array contained no audit records.</p>` : "";
  const progress = query ? `<div class="audit-progress" role="status"><div class="panel-kicker">AUDIT QUERY · ${esc(query.state.toUpperCase())}</div><p>${esc(query.message)}</p>${query.stage ? `<p class="app-sub">Stage: ${esc(query.stage)}${query.httpStatus ? ` · HTTP ${query.httpStatus}` : ""}</p>` : ""}${query.task ? `<dl class="detail-grid"><dt>Task</dt><dd>${esc(query.task.TaskName || "Async audit query")}</dd><dt>Identity check</dt><dd>${query.task.idVerified ? "GUID matches Location id; id value not retained" : "Not verified"}</dd><dt>State</dt><dd>${esc(query.task.state || query.state)}</dd>${query.task.TimeQueued ? `<dt>Queued</dt><dd>${esc(query.task.TimeQueued)}</dd>` : ""}${query.task.TimeStarted ? `<dt>Started</dt><dd>${esc(query.task.TimeStarted)}</dd>` : ""}${query.task.TimeFinished ? `<dt>Finished</dt><dd>${esc(query.task.TimeFinished)}</dd>` : ""}</dl>` : ""}${locationShape}${query.failure ? `<p class="source-message source-error">${esc(query.failure)}</p>` : ""}${query.result ? `<p class="source-message">Result: ${query.resultCount === 0 ? "finished empty" : `${query.resultCount} bounded record(s)`}${query.truncatedToMaxRows ? " · provider returned rows beyond maxRows; display was capped" : ""}</p><p class="app-sub">${esc(query.classification || "Continuation fields observed: " + query.continuationFields.join(", "))}</p>` : ""}${records}</div>` : `<p class="source-message">Run one filtered audit query for the current account. It uses maxRows=1 and retains only approved display fields.</p>`;
  return `<section class="panel provider-panel audit-query-panel"><div class="panel-head"><div><div class="panel-kicker">BOUNDED ASYNC SEARCH</div><h2>Audit records</h2></div><button class="button secondary" data-run-audit-query ${state.auditQueryBusy ? "disabled" : ""}>${state.auditQueryBusy ? "Checking async task…" : "Run maxRows=1 query"}</button></div>${progress}</section>`;
}

function evidenceView() {
  const isDemo = state.info?.systemMode === "DEMO";
  const readback = state.verification
    ? (state.verification.matched
      ? { label: "VERIFIED", tone: "success", detail: `${state.verification.count} web-app identities matched on an independent second read.` }
      : { label: "MISMATCH", tone: "error", detail: "The second web-app read differed from the displayed state." })
    : { label: "PENDING", tone: "muted", detail: "No current read-back comparison is available in this session." };

  const cards = [
    {
      title: "Web application read-back",
      state: readback.label,
      tone: readback.tone,
      detail: readback.detail,
      note: isDemo ? "Demo semantics only · live IRIS verification is separately qualified." : "Current session evidence."
    },
    {
      title: "Provider state semantics",
      state: "PRESERVED",
      tone: "success",
      detail: "Valid empty collections, unavailable providers, denied access, and mapping failures remain distinct states.",
      note: "No fixture fallback is substituted for a failed live provider."
    },
    {
      title: "Audit async handoff",
      state: "BLOCKED",
      tone: "warning",
      detail: "The bounded native query reached HTTP 202, then stopped when IRIS returned a same-origin v1 async-result path while the strict client contract permits v2.",
      note: "No status GET was guessed, substituted, or followed after that mismatch."
    },
    {
      title: "IPM / ZPM lifecycle",
      state: "UNVERIFIED",
      tone: "muted",
      detail: "No package load, install, uninstall, or clean-reinstall claim is admitted yet.",
      note: "Packaging remains separate from already reproduced browser capability."
    }
  ];

  const cardHtml = cards.map((item) => `
    <article class="evidence-card">
      <div class="evidence-card-head"><strong>${esc(item.title)}</strong>${badge(item.state, item.tone)}</div>
      <p>${esc(item.detail)}</p>
      <small>${esc(item.note)}</small>
    </article>`).join("");

  return shell(`
    ${pageHeader("Evidence", "What OpsDeck can prove, what it cannot, and where qualification deliberately stops.")}
    ${isDemo ? `<div class="evidence-demo-notice"><strong>SAFE DEMO</strong><span>Sanitized deterministic data. This page demonstrates evidence semantics, not a live IRIS claim.</span></div>` : ""}
    <section class="panel evidence-flow-panel">
      <div class="panel-head"><div><div class="panel-kicker">EVIDENCE-GATED OPERATION</div><h2>Observed state stays tied to authority</h2></div>${badge("No shadow state", "accent")}</div>
      <div class="evidence-flow" aria-label="OpsDeck evidence flow">
        <div><span>01</span><strong>Request</strong><small>Known operation</small></div>
        <b>→</b>
        <div><span>02</span><strong>Bounded provider</strong><small>Allowlisted route</small></div>
        <b>→</b>
        <div><span>03</span><strong>IRIS authority</strong><small>Source of truth</small></div>
        <b>→</b>
        <div><span>04</span><strong>Rendered state</strong><small>Safe projection</small></div>
        <b>→</b>
        <div><span>05</span><strong>Read-back</strong><small>Where qualified</small></div>
      </div>
    </section>
    <section class="evidence-grid">${cardHtml}</section>
    <section class="panel evidence-legend">
      <div class="panel-head"><div><div class="panel-kicker">STATE SEMANTICS</div><h2>Absence is not failure, and failure is not absence</h2></div></div>
      <div class="state-legend-grid">
        <div>${badge("VERIFIED", "success")}<p>Independent evidence agrees with the displayed state.</p></div>
        <div>${badge("EMPTY", "accent")}<p>The authoritative provider returned a valid empty collection.</p></div>
        <div>${badge("UNAVAILABLE", "warning")}<p>The source could not provide a usable result. OpsDeck does not invent one.</p></div>
        <div>${badge("DENIED", "error")}<p>The current identity lacks authority for the source.</p></div>
        <div>${badge("UNVERIFIED", "muted")}<p>The behavior has not crossed its required qualification boundary.</p></div>
      </div>
      <div class="evidence-actions">
        <button class="button secondary" data-route="applications">Inspect applications</button>
        <button class="button secondary" data-route="access">Inspect access relationships</button>
        <button class="button secondary" data-route="security">Inspect provider boundaries</button>
      </div>
    </section>
  `);
}

function render() {
  setTheme(state.theme);
  if (!state.connected) app.innerHTML = connectView();
  else if (state.route === "applications") app.innerHTML = applicationsView();
  else if (state.route === "overview") app.innerHTML = overviewView();
  else if (state.route === "evidence") app.innerHTML = evidenceView();
  else app.innerHTML = providerDomainView(state.route);
  app.querySelector("#theme-select")?.addEventListener("change", (event) => setTheme(event.target.value));
  app.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => {
    state.route = button.dataset.route;
    location.hash = state.route;
    render();
    ensureRouteSource();
  }));
  app.querySelectorAll("[data-source]").forEach((button) => button.addEventListener("click", () => {
    const route = state.route;
    state.sourceTabs[route] = button.dataset.source;
    render();
    if (button.dataset.source !== "alerts") loadSource(button.dataset.source);
  }));
  app.querySelectorAll("[data-load-alerts]").forEach((button) => button.addEventListener("click", () => loadSource("alerts", true)));
  app.querySelectorAll("[data-run-audit-query]").forEach((button) => button.addEventListener("click", () => runAuditQuery()));
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

async function disconnect() {
  if (!nativeMode) {
    try { await requestJson("/api/logout", { method: "POST" }); } catch { /* local state is cleared even if the proxy is unavailable */ }
  }
  nativeAuthorization = null;
  state.connected = false;
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
  state.route = "overview";
  history.replaceState(null, "", "#overview");
  render();
}

async function connect(event) {
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
      if (state.connected) ensureRouteSource();
      return;
    }
    const body = {
      username: form.elements.username.value.trim(),
      password: passwordInput.value,
    };
    const result = await requestJson("/api/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
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
  } catch (error) {
    passwordInput.value = "";
    state.connected = false;
    state.busy = false;
    state.error = error.message;
    render();
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
    if (source) return source.path;
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
      const service = state.sourceData[sourceId]?.items.find((item) => item.ref.key === name && item.ref.scope === namespace);
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
  state.busy = true;
  state.error = "";
  state.verification = null;
  try {
    render();
    const infoPayload = await apiPayload("/api/admin/info");
    const listPayload = await apiPayload("/api/admin/v2/web-apps");
    state.info = mapServerInfo(infoPayload);
    state.apps = mapWebApps(listPayload);
    state.lastRead = new Date().toISOString();
    if (!state.selected || !state.apps.some((item) => item.name === state.selected)) {
      state.selected = state.apps[0]?.name || "";
    }
    render();

    if (compareReadback) {
      const firstRead = state.apps;
      const secondPayload = await apiPayload("/api/admin/v2/web-apps");
      const secondRead = mapWebApps(secondPayload);
      state.verification = {
        matched: sameWebAppState(firstRead, secondRead),
        count: firstRead.length,
        at: new Date().toISOString(),
      };
      state.lastRead = state.verification.at;
    }
  } catch (error) {
    state.error = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) {
      state.connected = false;
      state.info = null;
      state.apps = [];
      state.verification = null;
    }
  } finally {
    state.busy = false;
    render();
  }
}

async function loadSource(sourceId, force = false) {
  if (!force && (state.sourceData[sourceId] || state.sourceErrors[sourceId])) return;
  state.sourceLoading = sourceId;
  delete state.sourceErrors[sourceId];
  render();
  try {
    const payload = await readJson(`/api/read/${sourceId}`);
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
    state.sourceErrors[sourceId] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) {
      state.connected = false;
      state.info = null;
      state.apps = [];
    }
  } finally {
    state.sourceLoading = "";
    render();
  }
}

async function runAuditQuery() {
  if (state.auditQueryBusy || !state.info?.username) return;
  let stage = "submit";
  let httpStatus = null;
  let currentTask = null;
  let locationShape = null;
  state.auditQueryBusy = true;
  state.auditQuery = { state: "accepted", message: "Submitting one filtered query for the current account, bounded to maxRows=1." };
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
    httpStatus = response.status;
    if (response.status === 401 || response.status === 403) {
      state.auditQuery = { state: "denied", stage, httpStatus, message: `IRIS denied the bounded audit query (HTTP ${response.status}).` };
      return;
    }
    if (response.status !== 202) {
      state.auditQuery = { state: "unavailable", stage, httpStatus, message: `Audit query handoff was unavailable (HTTP ${response.status}).` };
      return;
    }
    stage = "validate Location";
    locationShape = inspectAuditLocation(response.headers.get("Location"), location.href);
    state.auditQuery = { state: "accepted", stage, httpStatus, locationShape, message: "IRIS accepted the query (HTTP 202). Validating the returned Location." };
    render();
    const handle = validateAuditLocation(response.headers.get("Location"), location.href);
    currentTask = { idVerified: true };
    stage = "async result read";
    state.auditQuery = { state: "queued", stage, httpStatus, locationShape, message: "IRIS accepted the query. Reading the exact same-origin async resource from Location.", task: currentTask };
    render();
    const deadline = Date.now() + 30000;
    for (let attempt = 0; attempt < 40 && Date.now() < deadline; attempt += 1) {
      const payload = await requestJson(handle.url, { signal: AbortSignal.timeout(Math.min(5000, Math.max(1, deadline - Date.now()))) });
      httpStatus = 200;
      stage = "async task contract";
      const mapped = mapAuditAsyncResult(payload, handle.id);
      currentTask = mapped.task;
      const taskState = mapped.task.state.toLowerCase();
      if (taskState === "queued" || taskState === "running") {
        state.auditQuery = {
          state: taskState, stage, httpStatus, locationShape, message: taskState === "queued" ? "Async task is queued; waiting for a live state update." : "Async task is running; waiting for a terminal state.",
          task: mapped.task,
        };
        render();
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      if (taskState === "finished") {
        state.auditQuery = { state: "finished", stage, httpStatus, locationShape, message: "Async task finished. Only the bounded Result and reviewed fields are shown.", ...mapped };
      } else if (taskState === "failed") {
        state.auditQuery = { state: "failed", stage, httpStatus, locationShape, message: "Async audit query failed.", task: mapped.task, failure: "IRIS reported a task failure." };
      } else if (taskState === "canceled") {
        state.auditQuery = { state: "canceled", stage, httpStatus, locationShape, message: "Async audit query was canceled by IRIS.", task: mapped.task };
      } else {
        state.auditQuery = { state: "unavailable", stage, httpStatus, locationShape, message: "Async task is paused; no completion is inferred.", task: mapped.task };
      }
      return;
    }
    state.auditQuery = { state: "unavailable", message: "Async task remained nonterminal during the bounded wait. No completion is inferred.", task: state.auditQuery?.task };
  } catch (error) {
    const denied = error.status === 401 || error.status === 403;
    state.auditQuery = {
      state: denied ? "denied" : "unavailable",
      message: denied ? `IRIS denied the async audit read (HTTP ${error.status}).` : "Audit query or async result is unavailable.",
      stage,
      httpStatus: error.status || httpStatus,
      task: currentTask,
      locationShape,
      failure: ["validate Location", "async task contract"].includes(stage) ? error.message : "The request did not produce a usable async result.",
    };
  } finally {
    state.auditQueryBusy = false;
    render();
  }
}

async function loadWebAppDetail(name, force = false) {
  if (!force && (state.webAppDetails[name] || state.webAppDetailErrors[name])) return;
  const selected = state.apps.find((item) => item.name === name);
  if (!selected) return;
  state.webAppDetailLoading = name;
  delete state.webAppDetailErrors[name];
  render();
  try {
    const payload = await readJson(`/api/read/webAppDetail?name=${encodeURIComponent(selected.name)}`);
    state.webAppDetails[name] = mapWebAppDetail(payload, selected);
    state.lastRead = state.webAppDetails[name].ref.observedAt;
  } catch (error) {
    state.webAppDetailErrors[name] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) {
      state.connected = false;
      state.info = null;
      state.apps = [];
    }
  } finally {
    state.webAppDetailLoading = "";
    render();
  }
}

async function loadUserDetail(name) {
  if (state.userDetailLoading) return;
  const selected = state.sourceData.users?.items.find((item) => item.ref.key === name);
  if (!selected) return;
  const previous = state.userDetails[name];
  state.userDetailLoading = name;
  delete state.userDetailErrors[name];
  render();
  try {
    const payload = await readJson(`/api/read/userDetail?name=${encodeURIComponent(selected.ref.key)}`);
    const detail = mapSecurityUserDetail(payload, selected);
    state.userDetails[name] = detail;
    if (previous) state.userDetailVerification[name] = {
      matched: sameSecurityUserRelationships(previous, detail),
      at: detail.ref.observedAt,
    };
    state.lastRead = detail.ref.observedAt;
  } catch (error) {
    state.userDetailErrors[name] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) {
      state.connected = false;
      state.info = null;
      state.apps = [];
    }
  } finally {
    state.userDetailLoading = "";
    render();
  }
}

async function loadRoleDetail(name) {
  if (state.roleDetailLoading) return;
  const selected = state.sourceData.roles?.items.find((item) => item.ref.key === name);
  if (!selected) return;
  const previous = state.roleDetails[name];
  state.roleDetailLoading = name;
  delete state.roleDetailErrors[name];
  render();
  try {
    const payload = await readJson(`/api/read/roleDetail?name=${encodeURIComponent(selected.ref.key)}`);
    const detail = mapSecurityRoleDetail(payload, selected);
    state.roleDetails[name] = detail;
    if (previous) state.roleDetailVerification[name] = { matched: sameSecurityRoleDetail(previous, detail), at: detail.ref.observedAt };
    state.lastRead = detail.ref.observedAt;
  } catch (error) {
    state.roleDetailErrors[name] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) { state.connected = false; state.info = null; state.apps = []; }
  } finally {
    state.roleDetailLoading = "";
    render();
  }
}

async function loadRoleOwners(name) {
  if (state.roleOwnerLoading) return;
  const selected = state.sourceData.roles?.items.find((item) => item.ref.key === name);
  if (!selected) return;
  const previous = state.roleOwners[name];
  state.roleOwnerLoading = name;
  delete state.roleOwnerErrors[name];
  render();
  try {
    const query = new URLSearchParams({ name: selected.ref.key, maxRows: "20" });
    const payload = await readJson(`/api/read/roleOwners?${query}`);
    const owners = mapSecurityRoleOwners(payload, selected);
    state.roleOwners[name] = owners;
    if (previous) state.roleOwnerVerification[name] = { matched: sameSecurityRoleOwners(previous, owners), at: new Date().toISOString() };
    state.lastRead = new Date().toISOString();
  } catch (error) {
    state.roleOwnerErrors[name] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) { state.connected = false; state.info = null; state.apps = []; }
  } finally {
    state.roleOwnerLoading = "";
    render();
  }
}

async function loadResourceDetail(name) {
  if (state.resourceDetailLoading) return;
  const selected = state.sourceData.resources?.items.find((item) => item.ref.key === name);
  if (!selected) return;
  const previous = state.resourceDetails[name];
  state.resourceDetailLoading = name;
  delete state.resourceDetailErrors[name];
  render();
  try {
    const payload = await readJson(`/api/read/resourceDetail?name=${encodeURIComponent(selected.ref.key)}`);
    const detail = mapSecurityResourceDetail(payload, selected);
    state.resourceDetails[name] = detail;
    if (previous) state.resourceDetailVerification[name] = { matched: sameSecurityResourceDetail(previous, detail), at: detail.ref.observedAt };
    state.lastRead = detail.ref.observedAt;
  } catch (error) {
    state.resourceDetailErrors[name] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) { state.connected = false; state.info = null; state.apps = []; }
  } finally {
    state.resourceDetailLoading = "";
    render();
  }
}

async function loadTaskDetail(id) {
  if (state.taskDetailLoading) return;
  const selected = state.sourceData.tasks?.items.find((item) => item.ref.key === id);
  if (!selected) return;
  const previous = state.taskDetails[id];
  state.taskDetailLoading = id;
  delete state.taskDetailErrors[id];
  render();
  try {
    const payload = await readJson(`/api/read/taskDetail?id=${encodeURIComponent(id)}`);
    const detail = mapTaskDetail(payload, selected);
    state.taskDetails[id] = detail;
    if (previous) state.taskDetailVerification[id] = { matched: sameTaskDetail(previous, detail), at: detail.ref.observedAt };
    state.lastRead = detail.ref.observedAt;
  } catch (error) {
    state.taskDetailErrors[id] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) { state.connected = false; state.info = null; state.apps = []; }
  } finally {
    state.taskDetailLoading = "";
    render();
  }
}

async function loadRestSpec(specKey, force = false) {
  if (!force && (state.restSpecs[specKey] || state.restSpecErrors[specKey])) return;
  const [sourceId, name, namespace] = specKey.split("::");
  const service = state.sourceData[sourceId]?.items.find((item) => item.ref.key === name && item.ref.scope === namespace);
  if (!service) return;
  state.restSpecLoading = specKey;
  delete state.restSpecErrors[specKey];
  render();
  try {
    const query = new URLSearchParams({ source: sourceId, name, namespace });
    const payload = await readJson(`/api/read/restServiceSpec?${query}`);
    state.restSpecs[specKey] = mapRestServiceSpec(payload, service.ref);
    state.lastRead = state.restSpecs[specKey].ref.observedAt;
  } catch (error) {
    state.restSpecErrors[specKey] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) {
      state.connected = false;
      state.info = null;
      state.apps = [];
    }
  } finally {
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
  if (nativeMode) {
    state.connected = false;
    state.busy = false;
    render();
    return;
  }
  try {
    await requestJson("/api/session");
    state.connected = true;
    await refreshLive(true);
    ensureRouteSource();
  } catch {
    state.connected = false;
    state.busy = false;
    state.info = null;
    state.apps = [];
    state.verification = null;
    render();
  }
}

addEventListener("hashchange", () => {
  const route = location.hash.slice(1);
  if (navItems.some(([item]) => item === route)) state.route = route;
  render();
  ensureRouteSource();
});
if (state.theme === "system") matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => setTheme("system"));
setTheme(state.theme);
render();
restoreSession();
