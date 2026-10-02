import { createOperationPlan } from "./operation-engine.js";

const SYNTHETIC_SOURCE = "opsdeck-fixture://package-catalog";
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/u;
const FIXTURE_PACKAGES = Object.freeze([
  Object.freeze({ name: "sample-observer", namespace: "USER", installedVersion: "1.0.0", availableVersion: "1.1.0", source: "fixture-community-catalog", description: "Synthetic package row for planning-flow development.", state: "update-available" }),
  Object.freeze({ name: "sample-reporting-kit", namespace: "USER", installedVersion: null, availableVersion: "2.0.0", source: "fixture-community-catalog", description: "Synthetic available package for review-flow development.", state: "available" }),
]);

function bounded(value, label, max = 256) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) throw new Error(`${label} is invalid.`);
  return value.trim();
}

export function packageResourceRef(item, provider = "opsdeck-package-fixture-v1") {
  if (!item || !SAFE_NAME.test(item.name) || typeof item.namespace !== "string" || !item.namespace.trim()) throw new Error("Package resource identity is incomplete.");
  return Object.freeze({ domain: "applications", kind: "package", provider, key: item.name, scope: bounded(item.namespace, "namespace", 128), label: item.name, observedAt: new Date(0).toISOString() });
}

export function createPackageInventory(items = FIXTURE_PACKAGES, providerState = "AVAILABLE") {
  if (!Array.isArray(items) || !["AVAILABLE", "EMPTY", "UNAVAILABLE", "DENIED", "FAILED"].includes(providerState)) throw new Error("Package inventory response is invalid.");
  const packages = items.slice(0, 250).map(item => {
    if (!item || !SAFE_NAME.test(item.name)) throw new Error("Package name is invalid.");
    const namespace = bounded(item.namespace, "namespace", 128);
    const installedVersion = item.installedVersion == null ? null : bounded(item.installedVersion, "installed version", 64);
    const availableVersion = item.availableVersion == null ? null : bounded(item.availableVersion, "available version", 64);
    const source = bounded(item.source, "package source", 128);
    const state = ["installed", "update-available", "available"].includes(item.state) ? item.state : "unavailable";
    return Object.freeze({ ref: packageResourceRef({ name: item.name, namespace }), name: item.name, namespace, installedVersion, availableVersion, source, description: typeof item.description === "string" ? item.description.slice(0, 512) : "Not returned", state, synthetic: providerState === "AVAILABLE" });
  });
  return Object.freeze({ state: packages.length ? "AVAILABLE" : providerState, sourceIdentity: providerState === "AVAILABLE" ? SYNTHETIC_SOURCE : null, synthetic: providerState === "AVAILABLE", packages: Object.freeze(packages) });
}

export function fixturePackageInventory() { return createPackageInventory(FIXTURE_PACKAGES); }

export function preparePackagePlan(inventory, packageName, action = "install") {
  if (!inventory || !inventory.synthetic || inventory.sourceIdentity !== SYNTHETIC_SOURCE) throw new Error("Only visibly synthetic package metadata may prepare the source fixture plan.");
  if (!["install", "update", "remove"].includes(action)) throw new Error("Package operation is unsupported.");
  const item = inventory.packages.find(entry => entry.name === packageName);
  if (!item) throw new Error("Package identity is not in the current inventory.");
  if (action === "install" && item.installedVersion) throw new Error("Installed package requires an update plan.");
  if (action === "update" && !item.installedVersion) throw new Error("Package is not installed for update planning.");
  if (action === "remove" && !item.installedVersion) throw new Error("Package is not installed for removal planning.");
  const targetVersion = action === "remove" ? item.installedVersion : item.availableVersion;
  if (action !== "remove" && !targetVersion) throw new Error("No available version was observed.");
  const id = `package-plan:${action}:${item.namespace}:${item.name}:${targetVersion || "current"}`;
  const plan = createOperationPlan({
    id,
    intent: `${action} package ${item.name} in ${item.namespace}`,
    target: { ...item.ref, observedAt: new Date().toISOString() },
    capability: { id: `ipm.package.${action}`, semanticAction: `package-${action}`, providerOperation: `IPM ${action} · UNQUALIFIED`, state: "UNRESOLVED", risk: "HIGH", requiredPrivileges: ["UNVERIFIED · instance/IPM-specific"] },
    parameters: { namespace: item.namespace, packageName: item.name, requestedVersion: targetVersion, installedVersion: item.installedVersion, sourceIdentity: item.source },
    preState: { namespace: item.namespace, installedVersion: item.installedVersion, availableVersion: item.availableVersion, sourceIdentity: item.source },
    preStateEvidence: `synthetic-fixture:${inventory.sourceIdentity}`,
    authorityValidation: { state: "UNVERIFIED", evidence: "synthetic-fixture-does-not-establish-live-privilege" },
    preconditions: [{ claim: "Namespace is explicit", observed: true, evidence: "fixture-package-resource-scope" }, { claim: "Configured source identity is selected", observed: true, evidence: "fixture-package-source" }],
    expectedReadback: `Authoritative IPM inventory confirms ${action} result for ${item.name}`,
    expiresAt: Date.now() + 5 * 60_000,
    irreversible: action === "remove",
  });
  return Object.freeze({ plan, execution: "UNAVAILABLE", executorIdentity: null, canExecute: false, synthetic: true, reason: "Live IPM executor and disposable package fixture are not qualified." });
}

export const PACKAGE_FIXTURE_SOURCE = SYNTHETIC_SOURCE;
