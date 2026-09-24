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
      };
      if (sourceGroups[id] && !allowed(sourceGroups[id])) return denied();
      if (id === "x509Credentials") return ok({ error: "Demo provider intentionally unavailable: no credential inventory is exposed." }, 503);
      if (!Object.prototype.hasOwnProperty.call(sourceRows, id)) return ok({ error: "Unknown safe-demo source." }, 404);
      const raw = sourceRows[id];
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

  const style = document.createElement("style");
  style.textContent = `
    #opsdeck-safe-demo-banner{position:fixed;z-index:1000;left:50%;top:7px;transform:translateX(-50%);padding:6px 12px;border:1px solid #f3c56f;border-radius:999px;background:#17140c;color:#f3c56f;font:700 10px/1.2 ui-monospace,monospace;letter-spacing:.08em;box-shadow:0 4px 18px rgba(0,0,0,.35)}
    #opsdeck-demo-persona{position:fixed;z-index:1000;left:50%;top:39px;transform:translateX(-50%);display:flex;align-items:center;gap:7px;padding:5px 8px;border:1px solid rgba(243,197,111,.45);border-radius:8px;background:rgba(23,20,12,.94);color:#f3c56f;font:700 9px/1.2 ui-monospace,monospace;box-shadow:0 4px 18px rgba(0,0,0,.28)}
    #opsdeck-demo-persona select{appearance:auto;border:0;border-radius:5px;padding:3px 5px;background:#221d10;color:#f7d991;font:700 10px/1.2 ui-monospace,monospace;cursor:pointer}
    html[data-theme="light"] #opsdeck-safe-demo-banner{background:#fff8e8;color:#7a4d00}
    html[data-theme="light"] #opsdeck-demo-persona{background:rgba(255,248,232,.96);color:#7a4d00}
    html[data-theme="light"] #opsdeck-demo-persona select{background:#fff;color:#7a4d00}
  `;
  document.head.appendChild(style);
  function applyPersonaNavigation() {
    document.querySelectorAll("[data-route]").forEach((button) => {
      const route = button.getAttribute("data-route");
      button.hidden = route !== "evidence" && !persona.routes.includes(route);
    });
    const active = document.querySelector("[data-route].active");
    if (active && active.hidden) location.hash = "#overview";
  }

  addEventListener("DOMContentLoaded", () => {
    const banner = document.createElement("div");
    banner.id = "opsdeck-safe-demo-banner";
    banner.setAttribute("role", "status");
    banner.textContent = "SAFE DEMO · SANITIZED SAMPLE DATA · NO IRIS CONNECTION";
    document.body.appendChild(banner);

    const picker = document.createElement("label");
    picker.id = "opsdeck-demo-persona";
    picker.innerHTML = '<span>DEMO ACCESS:</span><select aria-label="Demo access persona">' +
      Object.entries(personas).map(([key, item]) => '<option value="' + key + '"' + (key === personaKey ? ' selected' : '') + '>' + item.label + '</option>').join("") +
      '</select>';
    picker.querySelector("select").addEventListener("change", (event) => {
      localStorage.setItem("opsdeck.demo.persona", event.target.value);
      location.hash = "#overview";
      location.reload();
    });
    document.body.appendChild(picker);

    applyPersonaNavigation();
    new MutationObserver(applyPersonaNavigation).observe(document.body, { childList: true, subtree: true });
  });
})();
