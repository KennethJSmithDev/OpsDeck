import { mapServerInfo, mapWebApps, mapWebAppDetail, mapRestServiceSpec, mapReadOnlySource, READ_ONLY_SOURCES, sameWebAppState } from "/iris-provider.js";

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
  logs: ["auditEnabled", "auditEvents", "taskHistory", "journalFiles"],
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
  sourceData: {}, sourceErrors: {}, sourceLoading: "",
  sourceTabs: { applications: "restServices", access: "users", security: "walletCollections", tasks: "tasks", system: "systemUsage", logs: "auditEnabled" },
  selectedItems: {},
  webAppDetails: {}, webAppDetailErrors: {}, webAppDetailLoading: "",
  restSpecs: {}, restSpecErrors: {}, restSpecLoading: "",
};

const app = document.querySelector("#app");
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const fmtTime = (value) => value ? new Intl.DateTimeFormat(undefined, {
  hour: "2-digit", minute: "2-digit", second: "2-digit",
}).format(new Date(value)) : "—";

async function requestJson(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json", ...(options.headers || {}) },
      ...options,
      signal: options.signal || AbortSignal.timeout(20000),
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new Error("Timed out waiting for the local OpsDeck proxy.");
    }
    throw new Error("Could not reach the local OpsDeck proxy.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed with HTTP ${response.status}.`);
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
  return `
    <div class="shell">
      <header class="topbar">
        <a class="brand" href="#overview" aria-label="OpsDeck overview"><span class="brand-mark">OD</span><span>OpsDeck</span></a>
        <div class="instance-line"><span class="instance-label">IRIS instance</span><span class="instance-value">${version}</span></div>
        <div class="top-actions">
          <span class="connection-state">${badge(connected ? "Live session" : "Disconnected", connected ? "success" : "muted")}</span>
          ${connected ? `<span class="user-chip">${user}</span>` : ""}
          <label class="theme-picker"><span class="sr-only">Color theme</span><select id="theme-select" aria-label="Color theme"><option value="dark" ${state.theme === "dark" ? "selected" : ""}>Dark</option><option value="light" ${state.theme === "light" ? "selected" : ""}>Light</option><option value="system" ${state.theme === "system" ? "selected" : ""}>System</option></select></label>
        </div>
      </header>
      <aside class="sidebar" aria-label="Primary navigation">
        <div class="nav-caption">WORKSPACE</div>
        ${navItems.map(([route, label], index) => {
          const active = state.route === route;
          const available = route !== "evidence";
          return `<button class="nav-item ${active ? "active" : ""} ${available ? "" : "gated"}" data-route="${route}" ${available ? "" : 'aria-label="' + label + ', planned after contest completeness"'}><span class="nav-index">${String(index + 1).padStart(2, "0")}</span><span>${label}</span>${available ? "" : '<span class="nav-lock" aria-hidden="true">M3</span>'}</button>`;
        }).join("")}
        <div class="sidebar-note"><span class="note-dot"></span><span>Live reads · M1</span></div>
      </aside>
      <main class="workspace">${content}</main>
      <footer class="statusbar"><span><i class="status-dot ${connected ? "online" : ""}"></i>${connected ? "IRIS connection active" : "Connect to your local IRIS instance"}</span><span>Loopback session · credentials are not saved</span><span>Last read ${fmtTime(state.lastRead)}</span></footer>
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
        <div class="promise-list"><div><span class="promise-check">01</span><span>Credentials remain in this browser request and the local proxy process.</span></div><div><span class="promise-check">02</span><span>Only fixed read-only IRIS source routes are enabled.</span></div><div><span class="promise-check">03</span><span>A second live read checks the result shown on screen.</span></div></div>
      </div>
      <form id="connect-form" class="connect-card" autocomplete="on">
        <div class="card-overline">SECURE LOCAL SESSION</div>
        <h2>Connect to IRIS</h2>
        <p class="card-copy">Use an account allowed to read server information and web applications.</p>
        ${error}
        <label for="username">Username</label>
        <input id="username" name="username" value="_SYSTEM" autocomplete="username" required maxlength="128">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required maxlength="512">
        <button class="button primary connect-button" type="submit" ${state.busy ? "disabled" : ""}>${state.busy ? '<span class="spinner"></span>Checking connection…' : "Connect to local IRIS"}</button>
        <div class="local-only"><span class="lock-icon" aria-hidden="true">⌑</span> Requests stay on this computer · HTTP Basic · loopback only</div>
      </form>
    </section>
    <section class="gate-strip"><div><span class="gate-kicker">M0 PASSED</span><strong>Live API identity + applications</strong></div><div>${badge("M1 read-only", "accent")}</div><p>Connected sessions can browse verified M1 providers. Mutation workflows remain gated until fixture and read-back qualification.</p></section>`);
}

function overviewView() {
  const info = state.info;
  if (!info) {
    return shell(`${pageHeader("Overview", "Loading the live identity and application state.")}<section class="panel empty-state" role="status"><div class="panel-kicker">RESTORING SESSION</div><h2>Checking IRIS state</h2><p>The session is valid. OpsDeck is reading the authoritative identity and web-application list.</p></section>`);
  }
  const privilegeCount = info.privileges ? Object.values(info.privileges).filter(Boolean).length : null;
  return shell(`
    ${pageHeader("Overview", "A verified view of the connected instance.")}
    <section class="overview-grid">
      <article class="panel identity-panel">
        <div class="panel-head"><div><div class="panel-kicker">CONNECTED INSTANCE</div><h2>Server identity</h2></div>${badge("Live", "success")}</div>
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
        <div class="panel-head"><div><div class="panel-kicker">AUTHORITATIVE READ</div><h2>Web applications</h2></div><button class="button quiet" id="refresh-button" ${state.busy ? "disabled" : ""}>Refresh</button></div>
        <div class="read-metric"><strong>${state.apps.length}</strong><span>applications returned</span></div>
        <p class="read-summary">${state.apps.length ? `First resource <code>${esc(state.apps[0].name)}</code> in namespace <code>${esc(state.apps[0].namespace)}</code>.` : "The live API returned an empty collection."}</p>
        <div class="readback-row">${state.verification ? badge(state.verification.matched ? "Read-back verified" : "Read-back mismatch", state.verification.matched ? "success" : "error") : badge("Read-back pending", "muted")}<span>${state.verification ? `${state.verification.count} entries compared at ${fmtTime(state.verification.at)}` : "A second read follows each refresh."}</span></div>
        <div class="panel-foot">List source <code>GET /api/admin/v2/web-apps</code></div>
      </article>
    </section>
    ${state.error ? `<div class="notice error" role="alert">${esc(state.error)}</div>` : ""}
    <section class="panel roadmap-panel"><div class="panel-head"><div><div class="panel-kicker">PRODUCT COVERAGE</div><h2>Operations workspace</h2></div>${badge("M0 reproduced · M1 in progress", "warning")}</div><div class="roadmap-grid">${navItems.slice(2).map(([, title], i) => `<div class="roadmap-item"><span class="roadmap-index">${String(i + 2).padStart(2, "0")}</span><strong>${title}</strong><span>${["Users, roles and resources", "Credential metadata", "Task inventory", "System and process views", "Audit and journal sources", "Deferred until completeness"][i]}</span></div>`).join("")}</div><p class="roadmap-note">Live values come from fixed read-only providers. OpsDeck does not substitute fixtures for IRIS data.</p></section>`);
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
  if (error) return `<div class="source-message source-error" role="alert"><strong>Source unavailable</strong><p>${esc(error)}</p><code>GET ${esc(source.path)}</code></div>`;
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
    ? `<aside class="panel inspector provider-inspector"><div class="panel-kicker">AUTHORITATIVE RESOURCE</div><h2 class="inspector-title">${esc(selected.ref.label)}</h2><p class="inspector-sub">Stable key <code>${esc(selected.ref.key)}</code>${selected.ref.scope ? ` · ${esc(selected.ref.scope)}` : ""}</p><dl class="detail-grid">${Object.entries(selected.values).map(([key, value]) => `<dt>${esc(key)}</dt><dd>${cellValue(value)}</dd>`).join("")}</dl><div class="inspector-foot">${esc(selected.ref.provider)} · observed ${fmtTime(selected.ref.observedAt)}</div></aside>`
    : "";
  return `<div class="source-toolbar"><div><strong>${data.count ?? 1}</strong><span> ${data.resultType === "array" ? "records returned" : "live object"}</span></div><button class="button quiet" data-refresh-source="${sourceId}">Refresh source</button></div>
    ${objectMetrics || `<div class="provider-layout"><article class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>Resource</th>${visibleColumns.map((key) => `<th>${esc(key)}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td colspan="${visibleColumns.length + 1}" class="empty-cell">IRIS returned an empty collection.</td></tr>`}</tbody></table></div></article>${detail}</div>`}
    <div class="panel-foot">GET <code>${esc(source.path)}</code> · ${esc(source.requiredPrivilege)} · ${esc(data.provider)} · ${fmtTime(data.observedAt)}</div>`;
}

function providerDomainView(route) {
  const title = navItems.find(([item]) => item === route)?.[1] || "Workspace";
  const descriptions = {
    access: "Users, roles, and resources returned by the IRIS security API.",
    security: "Credential and OAuth configuration metadata. Secret material is never rendered.",
    tasks: "Scheduled task definitions from the live IRIS management API.",
    system: "Live system usage, processes, databases, and device inventory.",
    logs: "Audit configuration, task history, and journal inventory. Event polling is not started automatically.",
  };
  const sourceId = state.sourceTabs[route] || domainSources[route]?.[0];
  const caveat = route === "logs" ? `<p class="source-caveat">Audit record search and the stateful alert feed are not polled by this view. File-backed messages and System Monitor logs remain separately qualified sources.</p>` : "";
  return shell(`${pageHeader(title, descriptions[route] || "Live IRIS provider data.")}<section class="panel provider-panel"><div class="panel-head"><div><div class="panel-kicker">LIVE PROVIDER DATA</div><h2>${esc(READ_ONLY_SOURCES[sourceId]?.label || title)}</h2></div>${badge("Read only", "accent")}</div>${sourceSelector(route)}${sourcePanel(sourceId)}${caveat}</section>`);
}

function gatedView() {
  const title = navItems.find(([route]) => route === state.route)?.[1] || "Workspace";
  return shell(`${pageHeader(title, "Local evidence is being added after contest feature completeness.")}<section class="panel gated-panel"><div class="gated-mark">M3</div><h2>Evidence Center is deferred</h2><p>Evidence views will be built after the M1 and M2 acceptance paths are complete and reproducible.</p><button class="button secondary" data-route="overview">Return to overview</button></section>`);
}

function render() {
  setTheme(state.theme);
  if (!state.connected) app.innerHTML = connectView();
  else if (state.route === "applications") app.innerHTML = applicationsView();
  else if (state.route === "overview") app.innerHTML = overviewView();
  else if (state.route === "evidence") app.innerHTML = gatedView();
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
    loadSource(button.dataset.source);
  }));
  app.querySelectorAll("[data-item]").forEach((row) => row.addEventListener("click", () => {
    const [sourceId, key] = row.dataset.item.split("::");
    state.selectedItems[sourceId] = key;
    render();
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
  app.querySelector("#refresh-button")?.addEventListener("click", () => refreshLive(true));
}

async function connect(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const passwordInput = form.elements.password;
  state.busy = true;
  state.error = "";
  render();
  try {
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
  const payload = await requestJson(path);
  return payload;
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
    if (/connect to IRIS|session|credentials/i.test(error.message)) {
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
    const payload = await requestJson(`/api/read/${sourceId}`);
    state.sourceData[sourceId] = mapReadOnlySource(sourceId, payload);
    state.lastRead = state.sourceData[sourceId].observedAt;
  } catch (error) {
    state.sourceErrors[sourceId] = error.message;
    if (/connect to IRIS|session|credentials/i.test(error.message)) {
      state.connected = false;
      state.info = null;
      state.apps = [];
    }
  } finally {
    state.sourceLoading = "";
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
    const payload = await requestJson(`/api/read/webAppDetail?name=${encodeURIComponent(selected.name)}`);
    state.webAppDetails[name] = mapWebAppDetail(payload, selected);
    state.lastRead = state.webAppDetails[name].ref.observedAt;
  } catch (error) {
    state.webAppDetailErrors[name] = error.message;
    if (/connect to IRIS|session|credentials/i.test(error.message)) {
      state.connected = false;
      state.info = null;
      state.apps = [];
    }
  } finally {
    state.webAppDetailLoading = "";
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
    const payload = await requestJson(`/api/read/restServiceSpec?${query}`);
    state.restSpecs[specKey] = mapRestServiceSpec(payload, service.ref);
    state.lastRead = state.restSpecs[specKey].ref.observedAt;
  } catch (error) {
    state.restSpecErrors[specKey] = error.message;
    if (/connect to IRIS|session|credentials/i.test(error.message)) {
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
