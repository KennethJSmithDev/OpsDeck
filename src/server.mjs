import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { mapServerInfo, unwrapIrisResult } from "./iris-provider.js";

const root = resolve(fileURLToPath(new URL("../public/", import.meta.url)));
const port = Number(process.env.PORT || 4173);
const irisOrigin = new URL(process.env.OPSDECK_IRIS_URL || "http://127.0.0.1:52773");
const sessionLifetimeMs = 30 * 60 * 1000;
const maxSessions = 8;
const sessions = new Map();
const allowedApiPaths = new Set(["/api/admin/info", "/api/admin/v2/web-apps"]);
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

async function readIrisJson(path, authorization) {
  if (!allowedApiPaths.has(path)) throw new Error("The requested IRIS path is not enabled in the M0 proxy.");
  let response;
  try {
    response = await fetch(new URL(path, irisOrigin), {
      method: "GET",
      headers: { Accept: "application/json", Authorization: authorization.toString("ascii") },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return { status: 502, value: { error: "IRIS could not be reached at the configured local endpoint." } };
  }
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
    const infoResponse = await readIrisJson("/api/admin/info", authorization);
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
  console.log(`OpsDeck M0 listening at http://127.0.0.1:${port}`);
  console.log("Only fixed IRIS GET routes are proxied; credentials stay in this process memory.");
});

function shutdown() {
  for (const session of sessions.values()) session.authorization.fill(0);
  sessions.clear();
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
