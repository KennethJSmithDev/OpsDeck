import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ProductIdentity } from "../public/product-identity.js";

test("ProductIdentity is the canonical bounded public and runtime identity", () => {
  const identity = ProductIdentity.resolve({
    irisVersion: "IRIS 2026.2 (Build 221U)",
    deployment: "native",
  });
  assert.equal(identity.name, "OpsDeck");
  assert.equal(identity.releaseLabel, "Beta Release");
  assert.equal(identity.publicVersion, "0.2");
  assert.equal(identity.internalVersion, "0.5.0");
  assert.equal(identity.packageVersion, "0.5.0");
  assert.equal(identity.gitCommit, "Not embedded in source package");
  assert.equal(identity.buildTimestamp, "Not embedded in source package");
  assert.equal(identity.irisVersion, "IRIS 2026.2 (Build 221U)");
  assert.equal(identity.namespace, "%SYS");
  assert.equal(identity.deploymentTarget, "Native IRIS CSP application");
  assert.ok(Object.isFrozen(identity));
});

test("ProductIdentity does not infer runtime values from arbitrary labels", () => {
  const identity = ProductIdentity.resolve({
    irisVersion: "x".repeat(129), deployment: "production-east", namespace: "USER",
  });
  assert.equal(identity.irisVersion, "Not observed");
  assert.equal(identity.deploymentTarget, "Not observed");
  assert.equal(identity.namespace, "Not observed", "unobserved runtime namespace is not inferred from the native manifest");
  assert.throws(() => ProductIdentity.resolve([]), /context is invalid/u);
});

test("ProductIdentity is integrated as an optional product asset", async () => {
  const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  const moduleXml = await readFile(new URL("../module.xml", import.meta.url), "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(app, /from "\.\/product-identity\.js\?v=opsdeck-0\.5\.0-about"/u);
  assert.match(moduleXml, /Name="public\/product-identity\.js" Target="\{\$cspdir\}opsdeck\/product-identity\.js"/u);
  assert.match(app, /ProductIdentity\.resolve\(/u);
  assert.match(app, /evidence-product-identity/u);
  assert.match(app, /data-system-section="about"/u);
  assert.match(moduleXml, /<Version>0\.5\.0<\/Version>/u);
  assert.equal(packageJson.version, ProductIdentity.resolve().packageVersion);
});
