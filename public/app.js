import { mapServerInfo, mapWebApps, sameWebAppState } from "/iris-provider.js";

const navItems = [
  ["overview", "Overview"], ["applications", "Applications"], ["access", "Access"],
  ["security", "Security"], ["tasks", "Tasks"], ["system", "System"],
  ["logs", "Logs"], ["evidence", "Evidence"],
];
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
};

const app = document.querySelector("#app");
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const fmtTime = (value) => value ? new Intl.DateTimeFormat(undefined, {
  hour: "2-digit", minute: "2-digit", second: "2-digit",
}).format(new Date(value)) : "—";

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json", ...(options.headers || {}) },
    ...options,
  });
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
          const available = route === "overview" || route === "applications";
          return `<button class="nav-item ${active ? "active" : ""} ${available ? "" : "gated"}" data-route="${route}" ${available ? "" : 'aria-label="' + label + ', planned after M0"'}><span class="nav-index">${String(index + 1).padStart(2, "0")}</span><span>${label}</span>${available ? "" : '<span class="nav-lock" aria-hidden="true">M1</span>'}</button>`;
        }).join("")}
        <div class="sidebar-note"><span class="note-dot"></span><span>M0 live-read path</span></div>
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
        <div class="promise-list"><div><span class="promise-check">01</span><span>Credentials remain in this browser request and the local proxy process.</span></div><div><span class="promise-check">02</span><span>Only the observed identity and web-application GET routes are enabled.</span></div><div><span class="promise-check">03</span><span>A second live read checks the result shown on screen.</span></div></div>
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
    <section class="gate-strip"><div><span class="gate-kicker">M0 GATE</span><strong>Live API identity + applications</strong></div><div>${badge("Waiting for connection", "muted")}</div><p>The remaining product areas will unlock after the live M0 path is verified.</p></section>`);
}

function overviewView() {
  const info = state.info;
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
    <section class="panel roadmap-panel"><div class="panel-head"><div><div class="panel-kicker">PRODUCT COVERAGE</div><h2>Operations workspace</h2></div>${badge("M0 in progress", "warning")}</div><div class="roadmap-grid">${navItems.slice(2).map(([, title], i) => `<div class="roadmap-item"><span class="roadmap-index">${String(i + 2).padStart(2, "0")}</span><strong>${title}</strong><span>Provider binding follows M0</span></div>`).join("")}</div><p class="roadmap-note">These domains are intentionally marked as not yet live. OpsDeck does not substitute fixtures for IRIS data.</p></section>`);
}

function pageHeader(title, description) {
  return `<div class="page-header"><div><div class="eyebrow"><span class="eyebrow-rule"></span>OPSDECK WORKSPACE</div><h1>${title}</h1><p>${description}</p></div><div class="page-header-meta">${badge("IRIS 2026.2", "accent")}</div></div>`;
}

function applicationsView() {
  const selected = state.apps.find((item) => item.name === state.selected) || state.apps[0] || null;
  const rows = state.apps.map((item) => `<tr class="app-row ${selected?.name === item.name ? "selected" : ""}" tabindex="0" role="button" data-app="${esc(item.name)}" aria-label="Inspect ${esc(item.name)}"><td><span class="app-name">${esc(item.name)}</span><span class="app-sub">${esc(item.dispatchClass || item.type)}</span></td><td><code>${esc(item.namespace)}</code></td><td>${item.enabled ? badge("Enabled", "success") : badge("Disabled", "muted")}</td><td>${esc(item.type)}</td><td>${esc(item.authenticationMethods.join(", ") || "None returned")}</td></tr>`).join("");
  return shell(`
    ${pageHeader("Applications", "Live web applications from the IRIS management API.")}
    <div class="app-toolbar"><div><strong>${state.apps.length}</strong><span> web applications</span><span class="toolbar-divider">·</span><span>Scope <code>All returned namespaces</code></span></div><div>${state.verification ? badge(state.verification.matched ? "Authoritative read-back matched" : "Read-back mismatch", state.verification.matched ? "success" : "error") : badge("Read-back pending", "muted")}</div></div>
    ${state.error ? `<div class="notice error" role="alert">${esc(state.error)}</div>` : ""}
    <section class="apps-layout">
      <article class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>Web application</th><th>Namespace</th><th>State</th><th>Type</th><th>Authentication</th></tr></thead><tbody>${rows || `<tr><td colspan="5" class="empty-cell">No web applications were returned by IRIS.</td></tr>`}</tbody></table></div><div class="panel-foot">Provider <code>SysAdmin API v2</code> · Updated ${fmtTime(state.lastRead)}</div></article>
      <aside class="panel inspector"><div class="panel-kicker">RESOURCE INSPECTOR</div>${selected ? `<h2 class="inspector-title"><code>${esc(selected.name)}</code></h2><p class="inspector-sub">Provider-owned identity · namespace scoped</p><dl class="detail-grid"><dt>Namespace</dt><dd><code>${esc(selected.namespace)}</code></dd><dt>Enabled</dt><dd>${selected.enabled ? "Yes" : "No"}</dd><dt>Type</dt><dd>${selected.type === null ? "Not returned" : esc(selected.type)}</dd><dt>Resource</dt><dd>${selected.resource === null ? "Not returned" : selected.resource ? `<code>${esc(selected.resource)}</code>` : "None"}</dd><dt>Authentication</dt><dd>${esc(selected.authenticationMethods.join(", ") || "None returned")}</dd><dt>Default namespace</dt><dd>${selected.namespaceDefault === null ? "Not returned" : selected.namespaceDefault ? "Yes" : "No"}</dd><dt>System application</dt><dd>${selected.isSystemApp === null ? "Not returned" : selected.isSystemApp ? "Yes" : "No"}</dd><dt>Dispatch class</dt><dd>${selected.dispatchClass === null ? "Not returned" : selected.dispatchClass ? `<code>${esc(selected.dispatchClass)}</code>` : "None"}</dd></dl><div class="inspector-foot">Key <code>${esc(selected.ref.key)}</code> · refreshed ${fmtTime(selected.ref.observedAt)}</div>` : `<div class="empty-inspector">Select an application to inspect its observed fields.</div>`}</aside>
    </section>
    <section class="verification-banner ${state.verification?.matched ? "verified" : state.verification ? "mismatch" : "pending"}"><div class="verification-symbol">${state.verification?.matched ? "✓" : state.verification ? "!" : "·"}</div><div><strong>${state.verification?.matched ? "Read-back confirmed" : state.verification ? "Read-back requires review" : "Waiting for authoritative read-back"}</strong><p>${state.verification ? `${state.verification.count} web-app records from the rendered list were compared with a second GET response.` : "OpsDeck performs a separate read after the initial list is rendered."}</p></div><code>GET /api/admin/v2/web-apps</code></section>`);
}

function gatedView() {
  const title = navItems.find(([route]) => route === state.route)?.[1] || "Workspace";
  return shell(`${pageHeader(title, "Provider-backed views are added after the M0 path passes.")}<section class="panel gated-panel"><div class="gated-mark">M1</div><h2>Live provider not bound yet</h2><p>This area is intentionally unavailable until its IRIS provider, privilege behavior, and response shape are verified.</p><button class="button secondary" data-route="overview">Return to overview</button></section>`);
}

function render() {
  setTheme(state.theme);
  if (!state.connected) app.innerHTML = connectView();
  else if (state.route === "applications") app.innerHTML = applicationsView();
  else if (state.route === "overview") app.innerHTML = overviewView();
  else app.innerHTML = gatedView();
  app.querySelector("#theme-select")?.addEventListener("change", (event) => setTheme(event.target.value));
  app.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => {
    state.route = button.dataset.route;
    location.hash = state.route;
    render();
  }));
  app.querySelectorAll("[data-app]").forEach((row) => {
    const select = () => { state.selected = row.dataset.app; render(); };
    row.addEventListener("click", select);
    row.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } });
  });
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
  render();
  try {
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

async function restoreSession() {
  try {
    await requestJson("/api/session");
    state.connected = true;
    await refreshLive(true);
  } catch {
    state.connected = false;
    render();
  }
}

addEventListener("hashchange", () => {
  const route = location.hash.slice(1);
  if (navItems.some(([item]) => item === route)) state.route = route;
  render();
});
if (state.theme === "system") matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => setTheme("system"));
setTheme(state.theme);
render();
restoreSession();
