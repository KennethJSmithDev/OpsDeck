import test from "node:test";
import assert from "node:assert/strict";
import { createPackageInventory, fixturePackageInventory, mapInstalledPackageInventory, PACKAGE_FIXTURE_SOURCE, packageResourceRef, preparePackagePlan } from "../public/packages-workspace.js";

test("fixture inventory has stable scoped Package ResourceRefs and remains visibly synthetic", () => {
  const inventory = fixturePackageInventory();
  assert.equal(inventory.synthetic, true);
  assert.equal(inventory.sourceIdentity, PACKAGE_FIXTURE_SOURCE);
  assert.equal(inventory.packages.length, 2);
  assert.deepEqual(packageResourceRef({ name: "sample-observer", namespace: "USER" }), { domain: "applications", kind: "package", provider: "opsdeck-package-fixture-v1", key: "sample-observer", scope: "USER", label: "sample-observer", observedAt: new Date(0).toISOString() });
  assert.equal(inventory.packages.find(item => item.name === "sample-observer").state, "update-available");
  assert.equal(inventory.packages.find(item => item.name === "sample-reporting-kit").state, "available");
});

test("install/update/remove planning is explicit, high risk, namespace scoped, and executor unavailable", () => {
  const inventory = fixturePackageInventory();
  const install = preparePackagePlan(inventory, "sample-reporting-kit", "install");
  assert.equal(install.plan.risk, "HIGH");
  assert.equal(install.plan.target.scope, "USER");
  assert.equal(install.plan.parameters.packageName, "sample-reporting-kit");
  assert.equal(install.plan.parameters.requestedVersion, "2.0.0");
  assert.equal(install.plan.requiresConfirmation, true);
  assert.equal(install.plan.capability.state, "UNRESOLVED");
  assert.equal(install.execution, "UNAVAILABLE");
  assert.equal(install.canExecute, false);
  assert.equal(install.executorIdentity, null);
  assert.equal(preparePackagePlan(inventory, "sample-observer", "update").plan.parameters.installedVersion, "1.0.0");
  assert.equal(preparePackagePlan(inventory, "sample-observer", "remove").plan.irreversible, true);
});

test("live or unknown inventory cannot be represented as a synthetic package provider", () => {
  const notSynthetic = createPackageInventory([], "EMPTY");
  assert.equal(notSynthetic.sourceIdentity, null);
  assert.throws(() => preparePackagePlan(notSynthetic, "package", "install"), /synthetic/u);
  assert.throws(() => preparePackagePlan(fixturePackageInventory(), "sample-observer", "install"), /update plan/u);
  assert.throws(() => preparePackagePlan(fixturePackageInventory(), "missing-package", "install"), /current inventory/u);
});

test("installed IPM projection preserves namespace and installed provenance without inventing catalog data", () => {
  const inventory = mapInstalledPackageInventory({
    provider: "iris-ipm-installed-v1",
    namespace: "%SYS",
    status: "available",
    packages: [{ name: "opsdeck", installedVersion: "0.2.1", sourcePath: "private-path", repository: "unobserved" }],
  }, "2026-10-02T12:00:00Z");

  assert.equal(inventory.state, "AVAILABLE");
  assert.equal(inventory.sourceIdentity, "iris-ipm-installed-v1");
  assert.equal(inventory.synthetic, false);
  assert.equal(inventory.namespace, "%SYS");
  assert.equal(inventory.packages.length, 1);
  assert.deepEqual(inventory.packages[0].ref, {
    domain: "applications", kind: "package", provider: "iris-ipm-installed-v1",
    key: "opsdeck", scope: "%SYS", label: "opsdeck", observedAt: "2026-10-02T12:00:00Z",
  });
  assert.equal(inventory.packages[0].installedVersion, "0.2.1");
  assert.equal(inventory.packages[0].availableVersion, null);
  assert.equal(inventory.packages[0].state, "installed");
  assert.doesNotMatch(JSON.stringify(inventory), /private-path|sourcePath|unobserved|Open Exchange/u);
  assert.match(inventory.packages[0].description, /no repository catalog was queried/u);
});

test("installed IPM projection keeps empty, unavailable, denied, and failed distinct", () => {
  for (const status of ["empty", "unavailable", "denied", "failed"]) {
    const inventory = mapInstalledPackageInventory({
      provider: "iris-ipm-installed-v1", namespace: "USER", status, packages: [],
    }, "2026-10-02T12:00:00Z");
    assert.equal(inventory.state, status.toUpperCase());
    assert.deepEqual(inventory.packages, []);
    assert.equal(inventory.synthetic, false);
  }
});

test("installed IPM projection rejects identity, state, row-cap, and truncation mismatches", () => {
  const base = { provider: "iris-ipm-installed-v1", namespace: "USER", status: "empty", packages: [] };
  assert.throws(() => mapInstalledPackageInventory({ ...base, provider: PACKAGE_FIXTURE_SOURCE }), /provider identity/u);
  assert.throws(() => mapInstalledPackageInventory({ ...base, status: "available" }), /do not match/u);
  assert.throws(() => mapInstalledPackageInventory({ ...base, status: "empty", packages: [{ name: "x", installedVersion: "1" }] }), /do not match/u);
  assert.throws(() => mapInstalledPackageInventory({ ...base, packages: Array.from({ length: 251 }, (_, i) => ({ name: `pkg-${i}`, installedVersion: "1" })), status: "available" }), /bounded contract/u);
  assert.throws(() => mapInstalledPackageInventory({ ...base, status: "truncated", truncated: true, packages: [] }), /do not match/u);
  assert.throws(() => mapInstalledPackageInventory({ ...base, packages: [{ name: "..\\private", installedVersion: "1" }], status: "available" }), /identity/u);
});

test("installed IPM projection accepts exactly 250 rows only with truncated state", () => {
  const packages = Array.from({ length: 250 }, (_, index) => ({ name: `pkg-${index}`, installedVersion: "1.0" }));
  const inventory = mapInstalledPackageInventory({
    provider: "iris-ipm-installed-v1", namespace: "USER", status: "truncated", truncated: true, packages,
  }, "2026-10-02T12:00:00Z");
  assert.equal(inventory.packages.length, 250);
  assert.equal(inventory.truncated, true);
  assert.ok(inventory.packages.every(item => item.state === "installed" && item.availableVersion === null));
});

