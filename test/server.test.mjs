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
const restServices = [
  { name: "/api/admin", namespace: "%SYS", dispatchClass: "%Api.Admin", swaggerSpec: "/api/mgmnt/v1/%25SYS/spec/api/admin", enabled: true },
  { name: "/api/denied", namespace: "%SYS", dispatchClass: "Fixture.Denied", swaggerSpec: "/api/mgmnt/v1/%25SYS/spec/api/denied", enabled: true },
  { name: "/api/unsafe", namespace: "%SYS", dispatchClass: "Fixture.Unsafe", swaggerSpec: "https://example.invalid/spec", enabled: true },
];

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
    if (request.url === "/api/admin/v2/web-app?name=%2Fapi%2Fadmin") return response.end(JSON.stringify({ status: { errors: [] }, console: [], result: { Name: "/api/admin", NameSpace: "%SYS", Enabled: true, JWTAuthEnabled: false } }));
    if (request.url === "/api/admin/v2/web-app?name=%2Fdenied") return response.writeHead(403).end(JSON.stringify({ status: { errors: ["denied"] }, result: null }));
    if (request.url === "/api/mgmnt/") return response.end(JSON.stringify(restServices));
    if (request.url === "/api/mgmnt/v1/%25SYS/spec/api/admin") return response.end(JSON.stringify({ swagger: "2.0", info: { title: "Admin API", version: "1" }, paths: { "/api/admin/info": { get: { summary: "Get identity", responses: { 200: { schema: { $ref: "#/definitions/private" } } } } }, "/api/admin/users": { post: {} } }, definitions: { private: { type: "string" } } }));
    if (request.url === "/api/mgmnt/v1/%25SYS/spec/api/denied") return response.writeHead(403).end(JSON.stringify({ error: "denied" }));
    if (request.url === "/api/admin/v2/web-app?name=%2Fmissing") return response.writeHead(404).end(JSON.stringify({ error: "missing" }));
    if (request.url === "/api/admin/v2/security/users") return response.end(JSON.stringify({ status: { errors: [] }, result: [{ Name: "fixture-user" }] }));
    if (request.url === "/api/admin/v2/security/user?name=fixture-user") return response.end(JSON.stringify({ status: { errors: [] }, console: [], result: { User: { Name: "fixture-user" }, Roles: [], EscalationRoles: [] } }));
    if (request.url === "/api/admin/v2/security/roles") return response.end(JSON.stringify({ status: { errors: [] }, result: [{ Name: "fixture-role" }, { Name: "denied-role" }] }));
    if (request.url === "/api/admin/v2/security/role?name=fixture-role") return response.end(JSON.stringify({ status: { errors: [] }, console: [], result: { Name: "fixture-role", GrantedRoles: [], Resources: [] } }));
    if (request.url === "/api/admin/v2/security/role?name=denied-role") return response.writeHead(403).end(JSON.stringify({ status: { errors: ["denied"] }, result: null }));
    if (request.url === "/api/admin/v2/security/role/owners?name=fixture-role&maxRows=20") return response.end(JSON.stringify({ status: { errors: [] }, result: [{ Name: "fixture-user", Type: "User", AdminOption: false }] }));
    if (request.url === "/api/admin/v2/security/resources") return response.end(JSON.stringify({ status: { errors: [] }, result: [{ Name: "fixture-resource" }] }));
    if (request.url === "/api/admin/v2/security/resource?name=fixture-resource") return response.end(JSON.stringify({ status: { errors: [] }, console: [], result: { Name: "fixture-resource", Description: "Fixture resource", PublicPermission: "None" } }));
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
    assert.equal((await fetch(`${base}/api/read/webAppDetail?name=%2Fapi%2Fadmin`)).status, 401);
    assert.equal((await fetch(`${base}/api/read/restServiceSpec?source=restServices&name=%2Fapi%2Fadmin&namespace=%25SYS`)).status, 401);
    assert.equal((await fetch(`${base}/api/read/webAppDetail`)).status, 400);
    assert.equal((await fetch(`${base}/api/read/webAppDetail?name=%2Fapi%2Fadmin&name=%2Fother`)).status, 400);
    assert.equal((await fetch(`${base}/api/read/userDetail?name=fixture-user`)).status, 401);
    assert.equal((await fetch(`${base}/api/read/userDetail?name=fixture-user&name=other`)).status, 400);
    assert.equal((await fetch(`${base}/api/read/roleDetail?name=fixture-role`)).status, 401);
    assert.equal((await fetch(`${base}/api/read/resourceDetail?name=fixture-resource`)).status, 401);
    assert.equal((await fetch(`${base}/api/read/roleOwners?name=fixture-role&maxRows=20`)).status, 401);
    assert.equal((await fetch(`${base}/api/read/roleOwners?name=fixture-role&maxRows=26`)).status, 400);

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

    const detail = await fetch(`${base}/api/read/webAppDetail?name=%2Fapi%2Fadmin`, { headers: { Cookie: sessionCookie } });
    assert.equal(detail.status, 200);
    assert.equal((await detail.json()).result.NameSpace, "%SYS");
    assert.equal(authorizationSeen.at(-1), `Basic ${Buffer.from("_SYSTEM:test-only").toString("base64")}`);
    const notFoundDetail = await fetch(`${base}/api/read/webAppDetail?name=%2Fmissing`, { headers: { Cookie: sessionCookie } });
    assert.equal(notFoundDetail.status, 404);
    const deniedDetail = await fetch(`${base}/api/read/webAppDetail?name=%2Fdenied`, { headers: { Cookie: sessionCookie } });
    assert.equal(deniedDetail.status, 403);

    const spec = await fetch(`${base}/api/read/restServiceSpec?source=restServices&name=%2Fapi%2Fadmin&namespace=%25SYS`, { headers: { Cookie: sessionCookie } });
    assert.equal(spec.status, 200);
    const specPayload = await spec.json();
    assert.equal(specPayload.swagger, "2.0");
    assert.equal(specPayload.definitions.private.type, "string");
    const listedServices = await fetch(`${base}/api/read/restServices`, { headers: { Cookie: sessionCookie } });
    const listedServiceNames = (await listedServices.json()).map((item) => item.name);
    assert.ok(listedServiceNames.includes("/api/denied"), JSON.stringify(listedServiceNames));
    const unknownService = await fetch(`${base}/api/read/restServiceSpec?source=restServices&name=%2Fmissing&namespace=%25SYS`, { headers: { Cookie: sessionCookie } });
    assert.equal(unknownService.status, 404);
    const deniedSpec = await fetch(`${base}/api/read/restServiceSpec?source=restServices&name=%2Fapi%2Fdenied&namespace=%25SYS`, { headers: { Cookie: sessionCookie } });
    const deniedSpecBody = await deniedSpec.text();
    assert.equal(deniedSpec.status, 403, deniedSpecBody);
    const unsafeSpec = await fetch(`${base}/api/read/restServiceSpec?source=restServices&name=%2Fapi%2Funsafe&namespace=%25SYS`, { headers: { Cookie: sessionCookie } });
    assert.equal(unsafeSpec.status, 502);
    const invalidSource = await fetch(`${base}/api/read/restServiceSpec?source=webApps&name=%2Fapi%2Fadmin&namespace=%25SYS`, { headers: { Cookie: sessionCookie } });
    assert.equal(invalidSource.status, 400);
    assert.equal(authorizationSeen.some((value) => value.includes("test-only")), false);

    const users = await fetch(`${base}/api/read/users`, { headers: { Cookie: sessionCookie } });
    assert.equal(users.status, 200);
    assert.equal((await users.json()).result[0].Name, "fixture-user");
    const userDetail = await fetch(`${base}/api/read/userDetail?name=fixture-user`, { headers: { Cookie: sessionCookie } });
    assert.equal(userDetail.status, 200);
    assert.deepEqual((await userDetail.json()).result, { User: { Name: "fixture-user" }, Roles: [], EscalationRoles: [] });
    const missingUserDetail = await fetch(`${base}/api/read/userDetail?name=missing`, { headers: { Cookie: sessionCookie } });
    assert.equal(missingUserDetail.status, 404);
    const roleDetail = await fetch(`${base}/api/read/roleDetail?name=fixture-role`, { headers: { Cookie: sessionCookie } });
    assert.equal(roleDetail.status, 200);
    assert.equal((await roleDetail.json()).result.Name, "fixture-role");
    const missingRoleDetail = await fetch(`${base}/api/read/roleDetail?name=missing`, { headers: { Cookie: sessionCookie } });
    assert.equal(missingRoleDetail.status, 404);
    const deniedRoleDetail = await fetch(`${base}/api/read/roleDetail?name=denied-role`, { headers: { Cookie: sessionCookie } });
    assert.equal(deniedRoleDetail.status, 403);
    const resourceDetail = await fetch(`${base}/api/read/resourceDetail?name=fixture-resource`, { headers: { Cookie: sessionCookie } });
    assert.equal(resourceDetail.status, 200);
    assert.equal((await resourceDetail.json()).result.Name, "fixture-resource");
    const roleOwners = await fetch(`${base}/api/read/roleOwners?name=fixture-role&maxRows=20`, { headers: { Cookie: sessionCookie } });
    assert.equal(roleOwners.status, 200);
    assert.equal((await roleOwners.json()).result[0].Type, "User");
    const missingRoleOwners = await fetch(`${base}/api/read/roleOwners?name=missing&maxRows=20`, { headers: { Cookie: sessionCookie } });
    assert.equal(missingRoleOwners.status, 404);
    const unknownSource = await fetch(`${base}/api/read/arbitrary`, { headers: { Cookie: sessionCookie } });
    assert.equal(unknownSource.status, 404);
    const inheritedSource = await fetch(`${base}/api/read/constructor`, { headers: { Cookie: sessionCookie } });
    assert.equal(inheritedSource.status, 404);

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

test("connection bootstrap returns a bounded transport error when IRIS never responds", async () => {
  const iris = createServer(() => {});
  const irisPort = await listen(iris);
  const portServer = createServer();
  const appPort = await listen(portServer);
  await new Promise((resolve) => portServer.close(resolve));
  const child = spawn(process.execPath, ["src/server.mjs"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, PORT: String(appPort), OPSDECK_IRIS_URL: `http://127.0.0.1:${irisPort}` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const origin = `http://127.0.0.1:${appPort}`;
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
  child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });

  try {
    let ready = false;
    for (let attempt = 0; attempt < 50 && !ready; attempt += 1) {
      if (child.exitCode !== null) throw new Error(`OpsDeck server exited early: ${stderr}`);
      try { ready = (await fetch(origin)).ok; } catch { await new Promise((resolve) => setTimeout(resolve, 40)); }
    }
    assert.equal(ready, true, `OpsDeck server did not become ready: ${stderr}`);

    const startedAt = Date.now();
    const response = await fetch(`${origin}/api/connect`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ username: "_SYSTEM", password: "test-only" }),
    });
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /could not verify/i);
    assert.ok(Date.now() - startedAt < 17_000, "connection bootstrap exceeded its 15-second upstream bound");
    await new Promise((resolve) => setTimeout(resolve, 50));
    const events = stdout.trim().split(/\r?\n/).filter((line) => line.startsWith("{")).map((line) => JSON.parse(line));
    assert.deepEqual(events.map((event) => event.phase), ["received", "upstream_started", "upstream_error", "downstream_completed"]);
    assert.equal(events[2].error, "timeout");
    assert.equal(events[3].status, 502);
    assert.equal(stdout.includes("test-only"), false);
    assert.equal(stdout.toLowerCase().includes("authorization"), false);
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once("exit", resolve);
      setTimeout(resolve, 2000).unref();
    });
    iris.closeAllConnections();
    await new Promise((resolve) => iris.close(resolve));
  }
});
