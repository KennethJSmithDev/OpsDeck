import test from "node:test";
import assert from "node:assert/strict";
import { createPackageInventory, fixturePackageInventory, PACKAGE_FIXTURE_SOURCE, packageResourceRef, preparePackagePlan } from "../public/packages-workspace.js";

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

