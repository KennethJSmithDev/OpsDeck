import test from "node:test";
import assert from "node:assert/strict";
import { livePackageSelection } from "../public/packages-workspace.js";

const row = { name: "qualification-package", namespace: "%SYS", installedStateKnown: true, installedVersion: null, availableVersion: "0.0.1", repository: "qualification-repo" };
test("live catalog selection creates a pinned install intent without granting authority", () => {
  assert.deepEqual(livePackageSelection(row), { action: "install", packageName: row.name, namespace: "%SYS", installedVersion: null, requestedVersion: "0.0.1", sourceIdentity: row.repository });
});
test("installed selection removes the installed version rather than the catalog version", () => {
  assert.equal(livePackageSelection({ ...row, installedVersion: "0.0.2" }).requestedVersion, "0.0.2");
  assert.equal(livePackageSelection({ ...row, installedVersion: "0.0.2" }).action, "remove");
});
test("unknown installed state, self-modification, other namespaces and unpinned versions have no intent", () => {
  for (const changes of [{ installedStateKnown: false }, { name: "opsdeck" }, { name: "zpm" }, { namespace: "USER" }, { availableVersion: "latest" }, { repository: "../arbitrary" }]) assert.equal(livePackageSelection({ ...row, ...changes }), null);
});
