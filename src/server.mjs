import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { mapServerInfo, READ_ONLY_SOURCES, unwrapIrisResult } from "./iris-provider.js";

const root = resolve(fileURLToPath(new URL("../public/", import.meta.url)));
const port = Number(process.env.PORT || 4173);
const irisOrigin = new URL(process.env.OPSDECK_IRIS_URL || "http://127.0.0.1:52773");
const sessionLifetimeMs = 30 * 60 * 1000;
const maxSessions = 8;
const sessions = new Map();
const webAppDetailPath = "/api/admin/v2/web-app";
const securityUserDetailPath = "/api/admin/v2/security/user";
const securityRoleDetailPath = "/api/admin/v2/security/role";
const securityRoleOwnersPath = "/api/admin/v2/security/role/owners";
const securityResourceDetailPath = "/api/admin/v2/security/resource";
const allowedApiPaths = new Set(["/api/admin/info", ...Object.values(READ_ONLY_SOURCES).map((source) => source.path)]);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

if (irisOrigin.protocol !== "http:" || !["localhost", "127.0.0.1", "::1"].includes(irisOrigin.hostname)) {
  throw new Error("The M0 proxy only permits an HTTP IRIS service on loopback.");
}
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("PORT must be between 1024 and 65535.");

function sendJson(response, status, value, extraHeaders = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
  });
  response.end(JSON.stringify(value));
}

function cookieValue(request, key) {
  const parts = String(request.headers.cookie || "").split(";");
  const prefix = `${key}=`;
  const item = parts.map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return item ? item.slice(prefix.length) : "";
}

function requestSession(request) {
  const id = cookieValue(request, "opsdeck_session");
  const session = sessions.get(id);
  if (!session) return null;
  if (Date.now() - session.lastUsed > sessionLifetimeMs) {
    session.authorization.fill(0);
    sessions.delete(id);
    return null;
  }
  session.lastUsed = Date.now();
  return session;
}

function sameLocalOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(parsed.hostname) &&
      parsed.host === host && parsed.port === String(port);
  } catch {
    return false;
  }
}

async function readJsonRequest(request, maxBytes = 8192) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  try { return JSON.parse(text); }
  catch { throw new Error("Request body must be JSON."); }
}

function logRequest(requestId, phase, fields = {}) {
  console.info(JSON.stringify({ requestId, phase, ...fields }));
}

function safeManagementSpecPath(path) {
  if (typeof path !== "string" || !path.startsWith("/api/mgmnt/v")) return false;
  let target;
  try { target = new URL(path, irisOrigin); }
  catch { return false; }
  if (target.origin !== irisOrigin.origin || target.search || target.hash ||
    !/^\/api\/mgmnt\/v[12]\/[%A-Za-z0-9._~/-]+$/u.test(target.pathname)) return false;
  return target.pathname.split("/").every((segment) => {
    if (!segment) return true;
    try {
      const decoded = decodeURIComponent(segment);
      return decoded !== "." && decoded !== ".." && !decoded.includes("/") && !decoded.includes("\\");
    } catch { return false; }
  });
}

async function readIrisJson(path, authorization, requestId = "untracked", query = null) {
  const webAppDetail = path === webAppDetailPath && query &&
    Object.keys(query).length === 1 && typeof query.name === "string" && query.name.startsWith("/") &&
    query.name.length <= 256 && !/[\u0000-\u001f\u007f]/u.test(query.name);
  const securityUserDetail = path === securityUserDetailPath && query &&
    Object.keys(query).length === 1 && typeof query.name === "string" && query.name.length > 0 &&
    query.name.length <= 128 && !/[\u0000-\u001f\u007f]/u.test(query.name);
  const securityNamedDetail = [securityRoleDetailPath, securityResourceDetailPath].includes(path) && query &&
    Object.keys(query).length === 1 && typeof query.name === "string" && query.name.length > 0 &&
    query.name.length <= 128 && !/[\u0000-\u001f\u007f]/u.test(query.name);
  const securityRoleOwners = path === securityRoleOwnersPath && query &&
    Object.keys(query).length === 2 && typeof query.name === "string" && query.name.length > 0 &&
    query.name.length <= 128 && typeof query.maxRows === "string" &&
    Number.isInteger(Number(query.maxRows)) && Number(query.maxRows) >= 1 && Number(query.maxRows) <= 25 &&
    !/[\u0000-\u001f\u007f]/u.test(query.name);
  if (!allowedApiPaths.has(path) && !webAppDetail && !securityUserDetail && !securityNamedDetail &&
    !securityRoleOwners && !safeManagementSpecPath(path)) {
    throw new Error("The requested IRIS path is not enabled in the M0 proxy.");
  }
  let response;
  const startedAt = Date.now();
  logRequest(requestId, "upstream_started", { path });
  try {
    const target = new URL(path, irisOrigin);
    if (query) for (const [key, value] of Object.entries(query)) target.searchParams.set(key, value);
    response = await fetch(target, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: authorization.toString("ascii") },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    logRequest(requestId, "upstream_error", {
      path,
      error: error?.name === "TimeoutError" ? "timeout" : "transport",
      elapsedMs: Date.now() - startedAt,
    });
    return { status: 502, value: { error: "IRIS could not be reached at the configured local endpoint." } };
  }
  logRequest(requestId, "upstream_response", { path, status: response.status, elapsedMs: Date.now() - startedAt });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { status: 502, value: { error: "IRIS returned a non-JSON response." } };
  }
  let body;
  try { body = await response.json(); }
  catch { return { status: 502, value: { error: "IRIS returned invalid JSON." } }; }
  return { status: response.status, contentType, value: body };
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/session") {
    const session = requestSession(request);
    return sendJson(response, session ? 200 : 401, session ? { connected: true } : { connected: false });
  }

  if (request.method === "POST" && url.pathname === "/api/connect") {
    const requestId = randomBytes(8).toString("hex");
    const startedAt = Date.now();
    logRequest(requestId, "received", { method: request.method, path: url.pathname });
    response.once("finish", () => logRequest(requestId, "downstream_completed", {
      status: response.statusCode,
      elapsedMs: Date.now() - startedAt,
    }));
    if (!sameLocalOrigin(request)) return sendJson(response, 403, { error: "Request origin is not permitted." });
    let body;
    try { body = await readJsonRequest(request); }
    catch { return sendJson(response, 400, { error: "Invalid connection request." }); }
    if (!body || typeof body.username !== "string" || typeof body.password !== "string" ||
      body.username.length < 1 || body.username.length > 128 || body.password.length < 1 || body.password.length > 512) {
      return sendJson(response, 400, { error: "Enter an IRIS username and password." });
    }

    let password = body.password;
    body.password = "";
    const credentialBytes = Buffer.from(`${body.username}:${password}`, "utf8");
    password = null;
    const authorization = Buffer.from(`Basic ${credentialBytes.toString("base64")}`, "ascii");
    credentialBytes.fill(0);
    const infoResponse = await readIrisJson("/api/admin/info", authorization, requestId);
    if (infoResponse.status < 200 || infoResponse.status >= 300) {
      authorization.fill(0);
      const status = infoResponse.status === 401 || infoResponse.status === 403 ? infoResponse.status : 502;
      const error = status === 401 ? "IRIS rejected these credentials." :
        status === 403 ? "This IRIS account cannot read server identity." :
          "OpsDeck could not verify the IRIS connection.";
      return sendJson(response, status, { error });
    }
    let info;
    try { info = mapServerInfo(infoResponse.value); }
    catch {
      authorization.fill(0);
      return sendJson(response, 502, { error: "IRIS identity response did not match the observed API contract." });
    }

    while (sessions.size >= maxSessions) {
      const [oldestId, oldest] = sessions.entries().next().value;
      oldest.authorization.fill(0);
      sessions.delete(oldestId);
    }
    const id = randomBytes(32).toString("hex");
    sessions.set(id, { authorization, lastUsed: Date.now() });
    return sendJson(response, 200, { connected: true, info }, {
      "Set-Cookie": `opsdeck_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800`,
    });
  }

  if (request.method === "POST" && url.pathname === "/api/logout") {
    if (!sameLocalOrigin(request)) return sendJson(response, 403, { error: "Request origin is not permitted." });
    const id = cookieValue(request, "opsdeck_session");
    const session = sessions.get(id);
    if (session) session.authorization.fill(0);
    sessions.delete(id);
    return sendJson(response, 200, { connected: false }, {
      "Set-Cookie": "opsdeck_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
    });
  }

  if (request.method === "GET" && url.pathname === "/api/read/webAppDetail") {
    const names = url.searchParams.getAll("name");
    if (names.length !== 1 || [...url.searchParams.keys()].some((key) => key !== "name") ||
      !names[0].startsWith("/") || names[0].length > 256 || /[\u0000-\u001f\u007f]/u.test(names[0])) {
      return sendJson(response, 400, { error: "A single web-application name from the live list is required." });
    }
    const session = requestSession(request);
    if (!session) return sendJson(response, 401, { error: "Connect to IRIS to load live data." });
    const result = await readIrisJson(webAppDetailPath, session.authorization, "untracked", { name: names[0] });
    const status = result.status >= 200 && result.status < 300 ? result.status :
      result.status === 401 || result.status === 403 || result.status === 404 ? result.status : 502;
    const contentType = result.contentType ? { "X-OpsDeck-Upstream-Content-Type": result.contentType } : {};
    return sendJson(response, status, result.value, contentType);
  }

  if (request.method === "GET" && url.pathname === "/api/read/userDetail") {
    const names = url.searchParams.getAll("name");
    if (names.length !== 1 || [...url.searchParams.keys()].some((key) => key !== "name") ||
      names[0].length < 1 || names[0].length > 128 || /[\u0000-\u001f\u007f]/u.test(names[0])) {
      return sendJson(response, 400, { error: "A single user name from the live list is required." });
    }
    const session = requestSession(request);
    if (!session) return sendJson(response, 401, { error: "Connect to IRIS to load live data." });
    const listing = await readIrisJson(READ_ONLY_SOURCES.users.path, session.authorization);
    if (listing.status < 200 || listing.status >= 300) {
      const status = listing.status === 401 || listing.status === 403 ? listing.status : 502;
      return sendJson(response, status, { error: "IRIS could not list users for detail lookup." });
    }
    let users;
    try { users = unwrapIrisResult(listing.value); }
    catch { return sendJson(response, 502, { error: "IRIS returned an invalid user list." }); }
    if (!Array.isArray(users) || !users.some((user) => user && user.Name === names[0])) {
      return sendJson(response, 404, { error: "The user is no longer present in the live list." });
    }
    const result = await readIrisJson(securityUserDetailPath, session.authorization, "untracked", { name: names[0] });
    const status = result.status >= 200 && result.status < 300 ? result.status :
      result.status === 401 || result.status === 403 || result.status === 404 ? result.status : 502;
    const contentType = result.contentType ? { "X-OpsDeck-Upstream-Content-Type": result.contentType } : {};
    return sendJson(response, status, result.value, contentType);
  }

  if (request.method === "GET" && ["/api/read/roleDetail", "/api/read/resourceDetail"].includes(url.pathname)) {
    const names = url.searchParams.getAll("name");
    if (names.length !== 1 || [...url.searchParams.keys()].some((key) => key !== "name") ||
      names[0].length < 1 || names[0].length > 128 || /[\u0000-\u001f\u007f]/u.test(names[0])) {
      return sendJson(response, 400, { error: "A single identity from the live Access list is required." });
    }
    const isRole = url.pathname === "/api/read/roleDetail";
    const listPath = isRole ? READ_ONLY_SOURCES.roles.path : READ_ONLY_SOURCES.resources.path;
    const detailPath = isRole ? securityRoleDetailPath : securityResourceDetailPath;
    const session = requestSession(request);
    if (!session) return sendJson(response, 401, { error: "Connect to IRIS to load live data." });
    const listing = await readIrisJson(listPath, session.authorization);
    if (listing.status < 200 || listing.status >= 300) {
      const status = listing.status === 401 || listing.status === 403 ? listing.status : 502;
      return sendJson(response, status, { error: "IRIS could not list Access resources for detail lookup." });
    }
    let records;
    try { records = unwrapIrisResult(listing.value); }
    catch { return sendJson(response, 502, { error: "IRIS returned an invalid Access list." }); }
    if (!Array.isArray(records) || !records.some((record) => record && record.Name === names[0])) {
      return sendJson(response, 404, { error: "The requested identity is no longer present in the live list." });
    }
    const result = await readIrisJson(detailPath, session.authorization, "untracked", { name: names[0] });
    const status = result.status >= 200 && result.status < 300 ? result.status :
      result.status === 401 || result.status === 403 || result.status === 404 ? result.status : 502;
    const contentType = result.contentType ? { "X-OpsDeck-Upstream-Content-Type": result.contentType } : {};
    return sendJson(response, status, result.value, contentType);
  }

  if (request.method === "GET" && url.pathname === "/api/read/roleOwners") {
    const names = url.searchParams.getAll("name");
    const maxRows = url.searchParams.getAll("maxRows");
    if (names.length !== 1 || maxRows.length !== 1 || [...url.searchParams.keys()].some((key) => !["name", "maxRows"].includes(key)) ||
      names[0].length < 1 || names[0].length > 128 || !/^\d+$/u.test(maxRows[0]) || Number(maxRows[0]) < 1 || Number(maxRows[0]) > 25 ||
      /[\u0000-\u001f\u007f]/u.test(names[0])) {
      return sendJson(response, 400, { error: "A listed role and bounded row limit are required." });
    }
    const session = requestSession(request);
    if (!session) return sendJson(response, 401, { error: "Connect to IRIS to load live data." });
    const listing = await readIrisJson(READ_ONLY_SOURCES.roles.path, session.authorization);
    if (listing.status < 200 || listing.status >= 300) {
      const status = listing.status === 401 || listing.status === 403 ? listing.status : 502;
      return sendJson(response, status, { error: "IRIS could not list roles for holder lookup." });
    }
    let roles;
    try { roles = unwrapIrisResult(listing.value); }
    catch { return sendJson(response, 502, { error: "IRIS returned an invalid role list." }); }
    if (!Array.isArray(roles) || !roles.some((role) => role && role.Name === names[0])) {
      return sendJson(response, 404, { error: "The requested role is no longer present in the live list." });
    }
    const result = await readIrisJson(securityRoleOwnersPath, session.authorization, "untracked", { name: names[0], maxRows: maxRows[0] });
    const status = result.status >= 200 && result.status < 300 ? result.status :
      result.status === 401 || result.status === 403 || result.status === 404 ? result.status : 502;
    const contentType = result.contentType ? { "X-OpsDeck-Upstream-Content-Type": result.contentType } : {};
    return sendJson(response, status, result.value, contentType);
  }

  if (request.method === "GET" && url.pathname === "/api/read/restServiceSpec") {
    const sourceIds = url.searchParams.getAll("source");
    const names = url.searchParams.getAll("name");
    const namespaces = url.searchParams.getAll("namespace");
    const allowedKeys = new Set(["source", "name", "namespace"]);
    if (sourceIds.length !== 1 || names.length !== 1 || namespaces.length !== 1 ||
      [...url.searchParams.keys()].some((key) => !allowedKeys.has(key)) ||
      !["restServices", "restServicesV2"].includes(sourceIds[0]) ||
      names[0].length < 1 || names[0].length > 256 || namespaces[0].length < 1 || namespaces[0].length > 128 ||
      /[\u0000-\u001f\u007f]/u.test(names[0]) || /[\u0000-\u001f\u007f]/u.test(namespaces[0])) {
      return sendJson(response, 400, { error: "A listed REST service identity is required." });
    }
    const session = requestSession(request);
    if (!session) return sendJson(response, 401, { error: "Connect to IRIS to load live data." });
    const source = READ_ONLY_SOURCES[sourceIds[0]];
    const discovery = await readIrisJson(source.path, session.authorization);
    if (discovery.status < 200 || discovery.status >= 300) {
      const status = discovery.status === 401 || discovery.status === 403 ? discovery.status : 502;
      return sendJson(response, status, { error: "IRIS could not list REST services for specification lookup." });
    }
    if (!Array.isArray(discovery.value)) return sendJson(response, 502, { error: "IRIS returned an invalid REST service list." });
    const service = discovery.value.find((item) => item && item.name === names[0] && item.namespace === namespaces[0]);
    if (!service) return sendJson(response, 404, { error: "The REST service is no longer present in the live list." });
    if (typeof service.swaggerSpec !== "string") return sendJson(response, 404, { error: "IRIS did not publish a specification for this REST service." });
    let specUrl;
    try { specUrl = new URL(service.swaggerSpec, irisOrigin); }
    catch { return sendJson(response, 502, { error: "IRIS returned an invalid REST specification link." }); }
    if (specUrl.origin !== irisOrigin.origin || !safeManagementSpecPath(specUrl.pathname) || specUrl.search || specUrl.hash) {
      return sendJson(response, 502, { error: "IRIS returned an unsafe REST specification link." });
    }
    const spec = await readIrisJson(specUrl.pathname, session.authorization);
    const status = spec.status >= 200 && spec.status < 300 ? spec.status :
      spec.status === 401 || spec.status === 403 || spec.status === 404 ? spec.status : 502;
    const contentType = spec.contentType ? { "X-OpsDeck-Upstream-Content-Type": spec.contentType } : {};
    return sendJson(response, status, spec.value, contentType);
  }

  const sourceMatch = url.pathname.match(/^\/api\/read\/([A-Za-z][A-Za-z0-9]*)$/);
  if (request.method === "GET" && sourceMatch) {
    const source = Object.hasOwn(READ_ONLY_SOURCES, sourceMatch[1]) ? READ_ONLY_SOURCES[sourceMatch[1]] : null;
    if (!source) return sendJson(response, 404, { error: "Read source is not enabled." });
    const session = requestSession(request);
    if (!session) return sendJson(response, 401, { error: "Connect to IRIS to load live data." });
    const result = await readIrisJson(source.path, session.authorization);
    const status = result.status >= 200 && result.status < 300 ? result.status :
      result.status === 401 || result.status === 403 ? result.status : 502;
    const contentType = result.contentType ? { "X-OpsDeck-Upstream-Content-Type": result.contentType } : {};
    return sendJson(response, status, result.value, contentType);
  }

  if (request.method === "GET" && allowedApiPaths.has(url.pathname)) {
    const session = requestSession(request);
    if (!session) return sendJson(response, 401, { error: "Connect to IRIS to load live data." });
    const result = await readIrisJson(url.pathname, session.authorization);
    const status = result.status >= 200 && result.status < 300 ? result.status :
      result.status === 401 || result.status === 403 ? result.status : 502;
    const contentType = result.contentType ? { "X-OpsDeck-Upstream-Content-Type": result.contentType } : {};
    return sendJson(response, status, result.value, contentType);
  }
  return sendJson(response, 404, { error: "Route not found." });
}

async function serveStatic(request, response, url) {
  if (request.method !== "GET" && request.method !== "HEAD") return sendJson(response, 405, { error: "Method not allowed." });
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { return sendJson(response, 400, { error: "Invalid path." }); }
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  // The provider adapter stays in src while this explicit alias exposes only its browser-safe module.
  const file = relative === "iris-provider.js"
    ? resolve(root, "../src/iris-provider.js")
    : resolve(root, relative);
  if (relative !== "iris-provider.js" && file !== root && !file.startsWith(root + sep)) {
    return sendJson(response, 404, { error: "Not found." });
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) return sendJson(response, 404, { error: "Not found." });
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(file).toLowerCase()] || "application/octet-stream",
      "Content-Length": info.size,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    });
    if (request.method === "HEAD") return response.end();
    createReadStream(file).pipe(response);
  } catch {
    return sendJson(response, 404, { error: "Not found." });
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
  response.setHeader("X-Content-Type-Options", "nosniff");
  try {
    if (url.pathname.startsWith("/api/")) await handleApi(request, response, url);
    else await serveStatic(request, response, url);
  } catch {
    if (!response.headersSent) sendJson(response, 500, { error: "OpsDeck could not complete this local request." });
    else response.destroy();
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`OpsDeck listening at http://127.0.0.1:${port}`);
  console.log("Only fixed read-only IRIS source routes are proxied; credentials stay in this process memory.");
});

function shutdown() {
  for (const session of sessions.values()) session.authorization.fill(0);
  sessions.clear();
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
