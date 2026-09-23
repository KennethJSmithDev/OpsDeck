function requireRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value;
}

export const READ_ONLY_SOURCES = Object.freeze({
  webApps: { path: "/api/admin/v2/web-apps", domain: "applications", label: "Web applications", requiredPrivilege: "%Admin_Secure:U" },
  restServices: { path: "/api/mgmnt/", domain: "applications", label: "REST services (v1)", requiredPrivilege: "provider-defined" },
  restServicesV2: { path: "/api/mgmnt/v2/", domain: "applications", label: "REST services (v2)", requiredPrivilege: "provider-defined" },
  users: { path: "/api/admin/v2/security/users", domain: "access", label: "Users", requiredPrivilege: "%Admin_Secure:U" },
  roles: { path: "/api/admin/v2/security/roles", domain: "access", label: "Roles", requiredPrivilege: "%Admin_Secure:U" },
  resources: { path: "/api/admin/v2/security/resources", domain: "access", label: "Resources", requiredPrivilege: "%Admin_Secure:U" },
  walletCollections: { path: "/api/admin/v2/wallet/collections", domain: "security", label: "Wallet collections", requiredPrivilege: "%Admin_Wallet:U" },
  x509Credentials: { path: "/api/admin/v2/security/x509-credentials", domain: "security", label: "X.509 credentials", requiredPrivilege: "%Admin_Secure:U" },
  oauthResourceServers: { path: "/api/admin/v2/security/oauth2/resource-servers", domain: "security", label: "OAuth resource servers", requiredPrivilege: "%Admin_Secure:U" },
  oauthServerDefinitions: { path: "/api/admin/v2/security/oauth2/client/server-definitions", domain: "security", label: "OAuth server definitions", requiredPrivilege: "%Admin_OAuth2_Client:U" },
  oauthServer: { path: "/api/admin/v2/security/oauth2/server", domain: "security", label: "OAuth authorization server", requiredPrivilege: "%Admin_OAuth2_Server:U" },
  tasks: { path: "/api/admin/v2/tasks", domain: "tasks", label: "Tasks", requiredPrivilege: "%Admin_Operate:U or %Admin_Task:U" },
  taskHistory: { path: "/api/admin/v2/task/history", domain: "logs", label: "Task history", requiredPrivilege: "%Admin_Operate:U" },
  systemUsage: { path: "/api/admin/v2/monitor/system-usage", domain: "system", label: "System usage", requiredPrivilege: "%Admin_Operate:U" },
  processes: { path: "/api/admin/v2/processes", domain: "system", label: "Processes", requiredPrivilege: "%Admin_Operate:U" },
  databases: { path: "/api/admin/v2/database-dirs", domain: "system", label: "Local databases", requiredPrivilege: "%Admin_Manage:U or %Admin_Operate:U" },
  devices: { path: "/api/admin/v2/devices", domain: "system", label: "Devices", requiredPrivilege: "%Admin_Manage:U" },
  auditEnabled: { path: "/api/admin/v2/security/audit/enabled", domain: "logs", label: "Audit status", requiredPrivilege: "%Admin_Secure:U" },
  auditEvents: { path: "/api/admin/v2/security/audit/events", domain: "logs", label: "Audit event definitions", requiredPrivilege: "%Admin_Secure:U" },
  journalFiles: { path: "/api/admin/v2/journal/files", domain: "logs", label: "Journal files", requiredPrivilege: "%Admin_Operate:U" },
});

const SAFE_FIELDS = Object.freeze({
  webApps: ["Name", "Namespace", "Enabled", "Type", "AuthenticationMethods"],
  systemUsage: ["AllGlobalReferences", "GlobalUpdateReferences", "RoutineCalls", "RoutineBufferLoadsAndSaves", "LogicalBlockRequests", "BlockReads", "BlockWrites", "WIJwrites", "JournalEntries", "JournalBlockWrites", "RoutineLines", "LastUpdate"],
  restServices: ["name", "dispatchClass", "namespace", "enabled", "swaggerSpec"],
  restServicesV2: ["name", "webApplications", "dispatchClass", "namespace", "swaggerSpec"],
  users: ["Name", "FullName", "Namespace", "Routine", "Type", "Enabled"],
  roles: ["Name", "Description", "CreatedBy", "EscalationOnly"],
  resources: ["Name", "Description", "PublicPermission", "ResourceType", "AllowDelete"],
  tasks: ["Name", "Type", "Namespace", "Description", "Suspended", "LastFinished", "NextScheduled"],
  taskHistory: ["LastStart", "Completed", "Name", "Status", "Result", "TaskId", "Namespace", "Routine", "Pid", "ErrDate", "ErrNumber", "Username", "LogDatetime"],
  processes: ["Job", "Pid", "Username", "Device", "Nspace", "Routine", "Commands", "State", "ClientName", "EXEname", "IPAddress", "CPUTime", "ElapsedTime"],
  databases: ["Directory", "MaxSize", "Size", "Status", "Resource", "Encrypted", "Mirrored", "SFN"],
  devices: ["Name", "PhysicalDevice", "Type", "SubType", "Description", "Alias"],
  auditEnabled: ["Enabled"],
  auditEvents: ["EventName", "Enabled", "Total", "Written", "Lost"],
  journalFiles: ["Name", "Size", "CreationTime", "Reason", "DataSize"],
});

const IDENTITY_FIELDS = Object.freeze({
  restServices: ["name", "namespace"], restServicesV2: ["name", "namespace"],
  users: ["Name"], roles: ["Name"], resources: ["Name"], walletCollections: ["Name"],
  x509Credentials: ["Name"], oauthResourceServers: ["Name"], oauthServerDefinitions: ["Name"],
  tasks: ["Id", "Name"], taskHistory: ["TaskId", "LastStart", "LogDatetime"],
  processes: ["Pid", "Job"], databases: ["Directory"], devices: ["Name"],
  auditEvents: ["EventName"], journalFiles: ["Name"],
});
const LABEL_FIELDS = Object.freeze({
  restServices: ["name"], restServicesV2: ["name"], users: ["Name"], roles: ["Name"], resources: ["Name"],
  walletCollections: ["Name"], x509Credentials: ["Name"], oauthResourceServers: ["Name"], oauthServerDefinitions: ["Name"],
  tasks: ["Name", "Id"], taskHistory: ["Name", "TaskId"], processes: ["Pid", "Job"], databases: ["Directory"],
  devices: ["Name"], auditEvents: ["EventName"], journalFiles: ["Name"],
});

export function unwrapIrisResult(payload) {
  requireRecord(payload, "IRIS response");
  const status = requireRecord(payload.status, "IRIS response status");
  if (Array.isArray(status.errors) && status.errors.length > 0) {
    throw new Error("IRIS reported an API error.");
  }
  if (!Object.hasOwn(payload, "result")) {
    throw new Error("IRIS response is missing its result field.");
  }
  return payload.result;
}

export function mapServerInfo(payload, observedAt = new Date().toISOString()) {
  const result = requireRecord(unwrapIrisResult(payload), "IRIS info result");
  if (typeof result.serverVersion !== "string" || typeof result.username !== "string") {
    throw new Error("IRIS info result is missing the observed server identity fields.");
  }
  if (!Number.isInteger(result.apiVersion)) {
    throw new Error("IRIS info result has an invalid API version.");
  }
  const namespaceRows = Array.isArray(result.namespaces) ? result.namespaces : null;
  const namespaces = namespaceRows === null ? null : namespaceRows.map((item) => {
    requireRecord(item, "IRIS namespace");
    if (typeof item.name !== "string") throw new Error("IRIS namespace is missing its name.");
    return { name: item.name };
  });
  let privileges = null;
  if (result.privileges !== undefined && result.privileges !== null) {
    const privilegeRows = requireRecord(result.privileges, "IRIS privileges");
    privileges = Object.fromEntries(Object.entries(privilegeRows).map(([name, value]) => {
      requireRecord(value, `IRIS privilege ${name}`);
      if (typeof value.use !== "boolean") throw new Error(`IRIS privilege ${name} has an invalid use flag.`);
      return [name, value.use];
    }));
  }

  return {
    provider: "sysadmin-api-v2",
    apiVersion: result.apiVersion,
    username: result.username,
    serverVersion: result.serverVersion,
    product: typeof result.product === "string" ? result.product : "unknown",
    systemMode: typeof result.systemMode === "string" ? result.systemMode : null,
    namespaces,
    privileges,
    observedAt,
  };
}

export function mapWebApps(payload, observedAt = new Date().toISOString()) {
  const result = unwrapIrisResult(payload);
  if (!Array.isArray(result)) throw new Error("IRIS web-app result must be an array.");
  return result.map((item) => {
    requireRecord(item, "IRIS web application");
    if (typeof item.Name !== "string" || typeof item.Namespace !== "string") {
      throw new Error("IRIS web application is missing its observed name or namespace.");
    }
    if (typeof item.Enabled !== "boolean") {
      throw new Error(`IRIS web application ${item.Name} has an invalid Enabled field.`);
    }
    if (!Array.isArray(item.AuthenticationMethods) || !item.AuthenticationMethods.every((method) => typeof method === "string")) {
      throw new Error(`IRIS web application ${item.Name} has an invalid AuthenticationMethods field.`);
    }
    return {
      ref: {
        domain: "applications",
        kind: "web-app",
        provider: "sysadmin-api-v2",
        key: item.Name,
        scope: item.Namespace,
        label: item.Name,
        volatile: false,
        observedAt,
      },
      name: item.Name,
      namespace: item.Namespace,
      namespaceDefault: typeof item.NamespaceDefault === "boolean" ? item.NamespaceDefault : null,
      enabled: item.Enabled,
      type: typeof item.Type === "string" ? item.Type : null,
      resource: typeof item.Resource === "string" ? item.Resource : null,
      authenticationMethods: [...item.AuthenticationMethods],
      isSystemApp: typeof item.IsSystemApp === "boolean" ? item.IsSystemApp : null,
      dispatchClass: typeof item.DispatchClass === "string" ? item.DispatchClass : null,
    };
  });
}

const SAFE_WEB_APP_DETAIL_TYPES = Object.freeze({
  Description: "string", NameSpace: "string", Enabled: "boolean", Resource: "string", DispatchClass: "string",
  AutheEnabled: "number", AutoCompile: "boolean", CSPZENEnabled: "boolean", DeepSeeEnabled: "boolean",
  iKnowEnabled: "boolean", InbndWebServicesEnabled: "boolean", JWTAuthEnabled: "boolean",
  JWTAccessTokenTimeout: "number", JWTRefreshTokenTimeout: "number", TwoFactorEnabled: "boolean",
  // IRIS 2026.2 exposes this setting as a boolean; never forward token-shaped strings.
  CSRFToken: "boolean", Recurse: "boolean", ServeFiles: "string", ServeFilesTimeout: "number",
  Timeout: "number", UseCookies: "string", SessionScope: "string",
});

export function mapWebAppDetail(payload, selected, observedAt = new Date().toISOString()) {
  requireRecord(selected, "Selected web application reference");
  if (typeof selected.name !== "string" || typeof selected.namespace !== "string") {
    throw new Error("Selected web application is missing its stable identity.");
  }
  const result = requireRecord(unwrapIrisResult(payload), "IRIS web-app detail result");
  if (typeof result.Name === "string" && result.Name !== selected.name) {
    throw new Error("IRIS web-app detail identity does not match the selected application.");
  }
  if (result.NameSpace !== selected.namespace) {
    throw new Error("IRIS web-app detail namespace does not match the selected application.");
  }
  const values = Object.fromEntries(Object.entries(SAFE_WEB_APP_DETAIL_TYPES)
    .filter(([key, type]) => Object.hasOwn(result, key) && (result[key] === null || typeof result[key] === type))
    .map(([key]) => [key, displayValue(result[key])]));
  return {
    ref: {
      domain: "applications", kind: "web-app-detail", provider: "sysadmin-api-v2",
      key: selected.name, scope: selected.namespace, label: selected.name, volatile: false, observedAt,
    },
    values,
  };
}

export function mapRestServiceSpec(payload, ref, observedAt = new Date().toISOString()) {
  requireRecord(ref, "Selected REST service reference");
  const spec = requireRecord(payload, "IRIS REST specification");
  const swagger = typeof spec.swagger === "string";
  const openapi = typeof spec.openapi === "string";
  if (!swagger && !openapi) throw new Error("IRIS REST specification is missing its format version.");
  const paths = requireRecord(spec.paths, "IRIS REST specification paths");
  const operations = [];
  let operationCount = 0;
  for (const [path, pathItemValue] of Object.entries(paths)) {
    if (!path.startsWith("/")) continue;
    if (!pathItemValue || typeof pathItemValue !== "object" || Array.isArray(pathItemValue)) continue;
    for (const [method, operation] of Object.entries(pathItemValue)) {
      if (!["get", "put", "post", "delete", "patch", "head", "options"].includes(method.toLowerCase())) continue;
      if (!operation || typeof operation !== "object" || Array.isArray(operation)) continue;
      operationCount += 1;
      if (operations.length < 12) {
        operations.push({
          path,
          method: method.toUpperCase(),
          summary: typeof operation.summary === "string" ? operation.summary : null,
          tags: Array.isArray(operation.tags) ? operation.tags.filter((tag) => typeof tag === "string") : [],
        });
      }
    }
  }
  return {
    ref: {
      domain: "applications", kind: "rest-service-spec", provider: ref.provider,
      key: ref.key, scope: ref.scope ?? null, label: ref.label, volatile: false, observedAt,
    },
    format: swagger ? "Swagger 2.0" : `OpenAPI ${spec.openapi}`,
    title: typeof spec.info?.title === "string" ? spec.info.title : ref.label,
    version: typeof spec.info?.version === "string" ? spec.info.version : null,
    operationCount,
    operations,
  };
}

export function sameWebAppState(left, right) {
  const snapshot = (rows) => rows
    .map((row) => ({
      name: row.name,
      namespace: row.namespace,
      namespaceDefault: row.namespaceDefault,
      enabled: row.enabled,
      type: row.type,
      resource: row.resource,
      authenticationMethods: [...row.authenticationMethods].sort(),
      isSystemApp: row.isSystemApp,
      dispatchClass: row.dispatchClass,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return JSON.stringify(snapshot(left)) === JSON.stringify(snapshot(right));
}

function displayValue(value) {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.map((item) => typeof item === "string" || typeof item === "number" ? item : "[record]");
  if (typeof value === "object") return "[record]";
  return null;
}

export function mapReadOnlySource(sourceId, payload, observedAt = new Date().toISOString()) {
  if (!Object.hasOwn(READ_ONLY_SOURCES, sourceId)) throw new Error("Unknown IRIS read source.");
  const source = READ_ONLY_SOURCES[sourceId];
  let result;
  if (source.path.startsWith("/api/admin/")) result = unwrapIrisResult(payload);
  else result = payload;

  const fields = SAFE_FIELDS[sourceId] || [];
  const identities = IDENTITY_FIELDS[sourceId] || [];
  const mapRecord = (record, index) => {
    requireRecord(record, `IRIS ${sourceId} record`);
    const values = Object.fromEntries(fields
      .filter((key) => Object.hasOwn(record, key) && !/(secret|password|token|private.?key)/i.test(key))
      .map((key) => [key, displayValue(record[key])]));
    const identity = identities.map((key) => record[key]).find((value) => typeof value === "string" || typeof value === "number");
    const label = (LABEL_FIELDS[sourceId] || identities).map((key) => record[key]).find((value) => typeof value === "string" || typeof value === "number");
    return {
      ref: {
        domain: source.domain, kind: sourceId, provider: source.path.startsWith("/api/admin/") ? "sysadmin-api-v2" : "iris-management-rest",
        key: identity === undefined ? `${sourceId}:${index}` : String(identity),
        scope: typeof record.Namespace === "string" ? record.Namespace : typeof record.namespace === "string" ? record.namespace : null,
        label: label === undefined ? identity === undefined ? `${source.label} ${index + 1}` : String(identity) : String(label),
        volatile: sourceId === "taskHistory" || sourceId === "processes", observedAt,
      },
      values,
    };
  };

  if (Array.isArray(result)) {
    return { sourceId, provider: source.path.startsWith("/api/admin/") ? "sysadmin-api-v2" : "iris-management-rest", observedAt, resultType: "array", count: result.length, items: result.map(mapRecord) };
  }
  requireRecord(result, `IRIS ${sourceId} result`);
  return { sourceId, provider: "sysadmin-api-v2", observedAt, resultType: "object", count: null, items: [mapRecord(result, 0)] };
}
