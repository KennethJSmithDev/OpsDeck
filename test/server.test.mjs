import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";

const infoPayload = {
  status: { errors: [], summary: "" },
  console: [],
  result: {
    apiVersion: 2,
    username: "_SYSTEM",
    serverVersion: "IRIS 2026.2 (Build 221U)",
    product: "iris",
    systemMode: "",
    namespaces: [{ name: "%SYS" }, { name: "USER" }],
    privileges: { Manage: { use: true } },
  },
};
const appsPayload = {
  status: { errors: [], summary: "" },
  console: [],
  result: [{
    Name: "/api/admin",
    Namespace: "%SYS",
    NamespaceDefault: false,
    Enabled: true,
    Type: "CSP",
    Resource: "",
    AuthenticationMethods: ["Password"],
    IsSystemApp: false,
    DispatchClass: "%Api.Admin",
  }],
};

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server.address().port;
}

test("local server gates the observed IRIS GET routes behind a memory session", async () => {
  const authorizationSeen = [];
  const iris = createServer((request, response) => {
    authorizationSeen.push(request.headers.authorization || "");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    if (request.url === "/api/admin/info") return response.end(JSON.stringify(infoPayload));
    if (request.url === "/api/admin/v2/web-apps") return response.end(JSON.stringify(appsPayload));
    response.writeHead(404).end();
  });
  const irisPort = await listen(iris);
  const portServer = createServer();
  const appPort = await listen(portServer);
  await new Promise((resolve) => portServer.close(resolve));

  const child = spawn(process.execPath, ["src/server.mjs"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, PORT: String(appPort), OPSDECK_IRIS_URL: `http://127.0.0.1:${irisPort}` },
    stdio: ["ignore", "ignore", "pipe"],
  });
  const origin = `http://127.0.0.1:${appPort}`;
  const base = origin;
  let stderr = "";
  child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });

  try {
    let ready = false;
    for (let attempt = 0; attempt < 50 && !ready; attempt += 1) {
      if (child.exitCode !== null) throw new Error(`OpsDeck server exited early: ${stderr}`);
      try { ready = (await fetch(base)).ok; } catch { await new Promise((resolve) => setTimeout(resolve, 40)); }
    }
    assert.equal(ready, true, `OpsDeck server did not become ready: ${stderr}`);

    const staticResponse = await fetch(`${base}/iris-provider.js`);
    assert.equal(staticResponse.status, 200);
    assert.match(staticResponse.headers.get("content-type"), /javascript/);

    const unauthorized = await fetch(`${base}/api/admin/v2/web-apps`);
    assert.equal(unauthorized.status, 401);

    const rejectedOrigin = await fetch(`${base}/api/connect`, {
      method: "POST",
      headers: { Origin: "http://example.invalid", "Content-Type": "application/json" },
      body: JSON.stringify({ username: "_SYSTEM", password: "test-only" }),
    });
    assert.equal(rejectedOrigin.status, 403);

    const connected = await fetch(`${base}/api/connect`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ username: "_SYSTEM", password: "test-only" }),
    });
    assert.equal(connected.status, 200);
    const setCookie = connected.headers.get("set-cookie");
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Strict/);
    const sessionCookie = setCookie.split(";", 1)[0];
    const identity = await connected.json();
    assert.equal(identity.connected, true);
    assert.equal(identity.info.serverVersion, "IRIS 2026.2 (Build 221U)");

    const apps = await fetch(`${base}/api/admin/v2/web-apps`, { headers: { Cookie: sessionCookie } });
    assert.equal(apps.status, 200);
    assert.match(apps.headers.get("x-opsdeck-upstream-content-type"), /application\/json/);
    assert.equal((await apps.json()).result[0].Name, "/api/admin");

    const unsupported = await fetch(`${base}/api/admin/v2/users`, { headers: { Cookie: sessionCookie } });
    assert.equal(unsupported.status, 404);

    const logout = await fetch(`${base}/api/logout`, {
      method: "POST",
      headers: { Origin: origin, Cookie: sessionCookie },
    });
    assert.equal(logout.status, 200);
    const expired = await fetch(`${base}/api/admin/info`, { headers: { Cookie: sessionCookie } });
    assert.equal(expired.status, 401);
    assert.equal(authorizationSeen.every((value) => value === `Basic ${Buffer.from("_SYSTEM:test-only").toString("base64")}`), true);
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once("exit", resolve);
      setTimeout(resolve, 2000).unref();
    });
    await new Promise((resolve) => iris.close(resolve));
  }
});
