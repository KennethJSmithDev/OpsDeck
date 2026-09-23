function requireRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value;
}

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
