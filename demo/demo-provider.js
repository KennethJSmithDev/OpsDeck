(() => {
  "use strict";

  const realFetch = window.fetch.bind(window);
  const ok = (body, status = 200) => Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  }));
  const wrapped = (result) => ({ status: { errors: [] }, result });

  const personas = {
    operations: {
      label: "Operations",
      username: "DemoOperator",
      privileges: { Secure: { use: false }, Operate: { use: true } },
      routes: ["overview", "applications", "tasks", "system", "logs"],
      groups: ["applications", "tasks", "system", "logs"],
    },
    security: {
      label: "Security Administrator",
      username: "DemoSecurity",
      privileges: { Secure: { use: true }, Operate: { use: false } },
      routes: ["overview", "applications", "access", "security", "logs"],
      groups: ["applications", "access", "security", "logs"],
    },
    applications: {
      label: "Application Administrator",
      username: "DemoAppAdmin",
      privileges: { Secure: { use: false }, Operate: { use: false } },
      routes: ["overview", "applications"],
      groups: ["applications"],
    },
    restricted: {
      label: "Restricted User",
      username: "DemoRestricted",
      privileges: { Secure: { use: false }, Operate: { use: false } },
      routes: ["overview"],
      groups: [],
    },
  };
  const personaKey = localStorage.getItem("opsdeck.demo.persona") || "operations";
  const persona = personas[personaKey] || personas.operations;
  const allowed = (group) => persona.groups.includes(group);
  const denied = () => ok({ error: "Safe demo persona does not have authority for this source." }, 403);

  const webApps = [
    { Name: "/opsdeck", Namespace: "%SYS", Enabled: true, Type: "CSP", AuthenticationMethods: ["Password"], NamespaceDefault: false, IsSystemApp: false, DispatchClass: "" },
    { Name: "/api/admin", Namespace: "%SYS", Enabled: true, Type: "REST", AuthenticationMethods: ["Password"], NamespaceDefault: false, IsSystemApp: true, DispatchClass: "%Api.Sys" },
    { Name: "/api/mgmnt", Namespace: "%SYS", Enabled: true, Type: "REST", AuthenticationMethods: ["Password"], NamespaceDefault: false, IsSystemApp: true, DispatchClass: "%Api.Mgmnt" },
  ];

  const sourceRows = {
    users: [
      { Name: "DemoOperator", FullName: "Demo Operator", Namespace: "%SYS", Routine: "", Type: "IRIS", Enabled: true },
      { Name: "DemoAuditor", FullName: "Demo Auditor", Namespace: "%SYS", Routine: "", Type: "IRIS", Enabled: true },
    ],
    roles: [
      { Name: "OpsDeckReadOnly", Description: "Sanitized demonstration role", CreatedBy: "Demo", EscalationOnly: false },
    ],
    resources: [
      { Name: "%Admin_Operate", Description: "Operations management", PublicPermission: "", ResourceType: "System", AllowDelete: false },
      { Name: "%Admin_Secure", Description: "Security management", PublicPermission: "", ResourceType: "System", AllowDelete: false },
    ],
    tasks: [
      { Id: 101, Name: "Demo maintenance task", Type: "System", Namespace: "%SYS", Description: "Sanitized scheduled task", Suspended: false, LastFinished: "2026-09-24 14:30:00", NextScheduled: "2026-09-25 02:00:00" },
    ],
    taskHistory: [
      { TaskId: 101, LastStart: "2026-09-24 14:29:55", Completed: true, Name: "Demo maintenance task", Status: "Completed", Result: "Success", Namespace: "%SYS", Routine: "Demo.Task", Pid: 4242, ErrDate: "", ErrNumber: 0, Username: "DemoOperator", LogDatetime: "2026-09-24 14:30:00" },
    ],
    systemUsage: { AllGlobalReferences: 1284500, GlobalUpdateReferences: 24110, RoutineCalls: 98420, LogicalBlockRequests: 412000, BlockReads: 1820, BlockWrites: 630, JournalEntries: 418, LastUpdate: "2026-09-24 16:42:00" },
    processes: [
      { Job: "4242", Pid: 4242, Username: "DemoOperator", Device: "|TCP|", Nspace: "%SYS", Routine: "Demo.Worker", Commands: 1842, State: "RUN", ClientName: "localhost", EXEname: "irisdb.exe", IPAddress: "127.0.0.1", CPUTime: 2.4, ElapsedTime: 85 },
    ],
    databases: [
      { Directory: "C:\\InterSystems\\IRIS\\mgr\\", MaxSize: "Unlimited", Size: "512 MB", Status: "Mounted", Resource: "%DB_IRISSYS", Encrypted: false, Mirrored: false, SFN: 1 },
      { Directory: "C:\\InterSystems\\IRIS\\mgr\\user\\", MaxSize: "Unlimited", Size: "96 MB", Status: "Mounted", Resource: "%DB_USER", Encrypted: false, Mirrored: false, SFN: 2 },
    ],
    devices: [],
    auditEnabled: { Enabled: true },
    auditEvents: [
      { EventName: "%System/%Security/Login", Enabled: true, Total: 18, Written: 18, Lost: 0 },
      { EventName: "%System/%Security/Protect", Enabled: true, Total: 4, Written: 4, Lost: 0 },
    ],
    journalFiles: [
      { Name: "20260924.001", Size: 8388608, CreationTime: "2026-09-24 12:00:00", Reason: "Normal", DataSize: 4132812 },
    ],
    messagesLog: {
      status: "available", truncated: false,
      lines: ["2026-09-24 16:40:00 INFO synthetic safe-demo event", "2026-09-24 16:41:00 ERROR synthetic sample failure marker"],
      analysis: {
        provider: "opsdeck-embedded-python-log-analysis-v1", sourceId: "messagesLog", status: "available",
        lineCount: 2, findingCount: 1, truncated: false, findingsTruncated: false,
        findings: [{ id: "log:messagesLog:line-2:explicit-error-marker", lineNumber: 2, ruleId: "explicit-error-marker", marker: "ERROR" }],
      },
    },
    systemMonitorLog: {
      status: "available", truncated: false,
      lines: ["2026-09-24 16:42:00 WARNING synthetic sample monitor marker"],
      analysis: {
        provider: "opsdeck-embedded-python-log-analysis-v1", sourceId: "systemMonitorLog", status: "available",
        lineCount: 1, findingCount: 1, truncated: false, findingsTruncated: false,
        findings: [{ id: "log:systemMonitorLog:line-1:warning-marker", lineNumber: 1, ruleId: "warning-marker", marker: "WARNING" }],
      },
    },
    restServices: [
      { name: "Demo.Management", dispatchClass: "Demo.Management.REST", namespace: "%SYS", enabled: true, swaggerSpec: "" },
    ],
    restServicesV2: [
      { name: "Demo.Management", webApplications: ["/api/mgmnt"], dispatchClass: "Demo.Management.REST", namespace: "%SYS", swaggerSpec: "" },
    ],
    walletCollections: [],
    x509Credentials: [],
    oauthResourceServers: [],
    oauthServerDefinitions: [],
    oauthServer: {},
  };

  function apiResponse(path, options) {
    if (path === "/api/session" && options?.method === "DELETE") return ok({ connected: false, demo: true });
    if (path === "/api/session") return ok({ connected: true, demo: true, persona: personaKey });
    if (path === "/api/admin/info") return ok(wrapped({
      apiVersion: 2,
      username: persona.username,
      serverVersion: "IRIS for Windows (x86-64) 2026.2 · SAFE DEMO",
      product: "InterSystems IRIS Community",
      systemMode: "DEMO",
      namespaces: [{ name: "%SYS" }, { name: "USER" }],
      privileges: persona.privileges,
    }));
    if (path === "/api/admin/v2/web-apps") return allowed("applications") ? ok(wrapped(webApps)) : denied();

    if (path.startsWith("/api/read/webAppDetail")) {
      if (!allowed("applications")) return denied();
      const name = new URL(path, location.origin).searchParams.get("name") || "/opsdeck";
      const selected = webApps.find((item) => item.Name === name) || webApps[0];
      return ok(wrapped({
        Name: selected.Name,
        NameSpace: selected.Namespace,
        Description: "Sanitized demo application",
        Enabled: selected.Enabled,
        Resource: "",
        DispatchClass: selected.DispatchClass,
        AutheEnabled: 32,
        AutoCompile: false,
        Recurse: true,
        ServeFiles: "Always",
        Timeout: 900,
        UseCookies: "Session Cookie",
        SessionScope: "Application",
      }));
    }

    if (path.startsWith("/api/read/userDetail")) {
      if (!allowed("access")) return denied();
      const name = new URL(path, location.origin).searchParams.get("name") || "DemoOperator";
      return ok(wrapped({ Name: name, Roles: ["OpsDeckReadOnly"], Resources: ["%Admin_Operate", "%Admin_Secure"] }));
    }
    if (path.startsWith("/api/read/roleDetail")) {
      if (!allowed("access")) return denied();
      return ok(wrapped({ Name: "OpsDeckReadOnly", Description: "Sanitized demonstration role", Roles: [], Resources: ["%Admin_Operate", "%Admin_Secure"] }));
    }
    if (path.startsWith("/api/read/roleOwners")) {
      if (!allowed("access")) return denied();
      return ok(wrapped([{ Name: "DemoOperator" }, { Name: "DemoAuditor" }]));
    }
    if (path.startsWith("/api/read/resourceDetail")) {
      if (!allowed("access")) return denied();
      const name = new URL(path, location.origin).searchParams.get("name") || "%Admin_Operate";
      return ok(wrapped({ Name: name, Description: "Sanitized demonstration resource", PublicPermission: "", ResourceType: "System", AllowDelete: false }));
    }
    if (path.startsWith("/api/read/taskDetail")) {
      if (!allowed("tasks")) return denied();
      return ok(wrapped(sourceRows.tasks[0]));
    }
    if (path.startsWith("/api/read/restServiceSpec")) {
      if (!allowed("applications")) return denied();
      return ok({ openapi: "3.0.0", info: { title: "Sanitized Demo Management API", version: "1.0" }, paths: { "/demo/status": { get: { summary: "Read sanitized demo status" } } } });
    }

    const sourceMatch = path.match(/^\/api\/read\/([A-Za-z0-9]+)$/);
    if (sourceMatch) {
      const id = sourceMatch[1];
      const sourceGroups = {
        restServices: "applications", restServicesV2: "applications",
        users: "access", roles: "access", resources: "access",
        walletCollections: "security", x509Credentials: "security", oauthResourceServers: "security", oauthServerDefinitions: "security", oauthServer: "security",
        tasks: "tasks", systemUsage: "system", processes: "system", databases: "system", devices: "system",
        auditEnabled: "logs", auditEvents: "logs", taskHistory: "logs", journalFiles: "logs",
        messagesLog: "logs", systemMonitorLog: "logs",
      };
      if (sourceGroups[id] && !allowed(sourceGroups[id])) return denied();
      if (id === "x509Credentials") return ok({ error: "Demo provider intentionally unavailable: no credential inventory is exposed." }, 503);
      if (!Object.prototype.hasOwnProperty.call(sourceRows, id)) return ok({ error: "Unknown safe-demo source." }, 404);
      const raw = sourceRows[id];
      if (id === "messagesLog" || id === "systemMonitorLog") return ok(raw);
      return ok(id === "restServices" || id === "restServicesV2" ? raw : wrapped(raw));
    }

    return ok({ error: "Safe demo blocks all unregistered requests." }, 404);
  }

  window.fetch = (input, options = {}) => {
    const raw = typeof input === "string" ? input : input?.url;
    if (typeof raw === "string") {
      const url = new URL(raw, location.origin);
      if (url.origin === location.origin && url.pathname.startsWith("/api/")) {
        return apiResponse(url.pathname + url.search, options);
      }
    }
    return realFetch(input, options);
  };

  function applyPersonaNavigation() {
    document.querySelectorAll("[data-route]").forEach((button) => {
      const route = button.getAttribute("data-route");
      button.hidden = route !== "evidence" && !persona.routes.includes(route);
    });
    const active = document.querySelector("[data-route].active");
    if (active && active.hidden) location.hash = "#overview";
  }

  addEventListener("DOMContentLoaded", () => {
    const banner = document.querySelector("#opsdeck-safe-demo-banner");
    const select = document.querySelector("#opsdeck-demo-persona select");
    const accessAnchor = document.querySelector("#opsdeck-demo-access-anchor");
    if (!banner || !select || !accessAnchor) return;
    select.innerHTML = Object.entries(personas).map(([key, item]) =>
      '<option value="' + key + '"' + (key === personaKey ? ' selected' : '') + '>' + item.label + '</option>',
    ).join("");
    select.addEventListener("change", (event) => {
      localStorage.setItem("opsdeck.demo.persona", event.target.value);
      location.hash = "#overview";
      location.reload();
    });

    const setPersistentAccess = (persistent) => document.body.classList.toggle("demo-access-persistent", persistent);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => setPersistentAccess(!entry.isIntersecting), { threshold: 0 })
        .observe(accessAnchor);
    } else {
      let pending = false;
      const updateAccess = () => {
        pending = false;
        setPersistentAccess(accessAnchor.getBoundingClientRect().bottom <= 0);
      };
      addEventListener("scroll", () => {
        if (!pending) {
          pending = true;
          requestAnimationFrame(updateAccess);
        }
      }, { passive: true });
      updateAccess();
    }

    const updateBannerOffset = () => document.documentElement.style.setProperty(
      "--opsdeck-safe-banner-height", banner.getBoundingClientRect().height + "px",
    );
    updateBannerOffset();
    if ("ResizeObserver" in window) new ResizeObserver(updateBannerOffset).observe(banner);

    applyPersonaNavigation();
    new MutationObserver(applyPersonaNavigation).observe(document.body, { childList: true, subtree: true });
  });
})();
