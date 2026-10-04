import { createOperationPlan } from "./operation-engine.js?v=opsdeck-0.8.0-ipm";

const SYNTHETIC_SOURCE = "opsdeck-fixture://package-catalog";
const INSTALLED_IPM_SOURCE = "iris-ipm-installed-v1";
const AVAILABLE_IPM_SOURCE = "iris-ipm-available-v1";
const INSTALLED_IPM_SOURCE_LABEL = "IPM installed metadata; repository not observed";
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/u;
const PACKAGE_LIMIT = 250;
const FIXTURE_PACKAGES = Object.freeze([
  Object.freeze({ name: "sample-observer", namespace: "USER", installedVersion: "1.0.0", availableVersion: "1.1.0", source: "fixture-community-catalog", description: "Synthetic package row for planning-flow development.", state: "update-available" }),
  Object.freeze({ name: "sample-reporting-kit", namespace: "USER", installedVersion: null, availableVersion: "2.0.0", source: "fixture-community-catalog", description: "Synthetic available package for review-flow development.", state: "available" }),
]);

function bounded(value, label, max = 256) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) throw new Error(`${label} is invalid.`);
  return value.trim();
}

export function packageResourceRef(item, provider = "opsdeck-package-fixture-v1", observedAt = new Date(0).toISOString()) {
  if (!item || !SAFE_NAME.test(item.name) || typeof item.namespace !== "string" || !item.namespace.trim()) throw new Error("Package resource identity is incomplete.");
  return Object.freeze({ domain: "applications", kind: "package", provider, key: item.name, scope: bounded(item.namespace, "namespace", 128), label: item.name, observedAt: bounded(observedAt, "observation time", 64) });
}

export function mapInstalledPackageInventory(payload, observedAt = new Date().toISOString()) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Installed package inventory response is invalid.");
  if (payload.provider !== INSTALLED_IPM_SOURCE) throw new Error("Installed package provider identity is invalid.");
  const namespace = bounded(payload.namespace, "namespace", 128);
  const states = ["available", "empty", "unavailable", "denied", "failed", "truncated"];
  if (!states.includes(payload.status)) throw new Error("Installed package state is invalid.");
  if (!Array.isArray(payload.packages) || payload.packages.length > PACKAGE_LIMIT) throw new Error("Installed package rows exceed the bounded contract.");
  const hasRows = payload.packages.length > 0;
  if ((payload.status === "available" && !hasRows) || (payload.status === "empty" && hasRows) ||
      (["unavailable", "denied", "failed"].includes(payload.status) && hasRows) ||
      (payload.status === "truncated" && (payload.truncated !== true || payload.packages.length !== PACKAGE_LIMIT)) ||
      (payload.status !== "truncated" && payload.truncated === true)) {
    throw new Error("Installed package rows do not match their provider state.");
  }
  const packages = payload.packages.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item) || !SAFE_NAME.test(item.name)) throw new Error("Installed package identity is invalid.");
    const installedVersion = bounded(item.installedVersion, "installed version", 64);
    const ref = packageResourceRef({ name: item.name, namespace }, INSTALLED_IPM_SOURCE, observedAt);
    return Object.freeze({
      ref, name: item.name, namespace, installedVersion, availableVersion: null,
      source: INSTALLED_IPM_SOURCE_LABEL, description: "Installed IPM registration; no repository catalog was queried.",
      state: "installed", synthetic: false,
    });
  });
  return Object.freeze({
    state: payload.status.toUpperCase(), sourceIdentity: INSTALLED_IPM_SOURCE, synthetic: false,
    namespace, truncated: payload.status === "truncated", packages: Object.freeze(packages),
  });
}

function compareStableVersions(left, right) {
  const pattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
  const a = typeof left === "string" && left.match(pattern);
  const b = typeof right === "string" && right.match(pattern);
  if (!a || !b) return null;
  for (let index = 1; index <= 3; index += 1) {
    const first = BigInt(a[index]);
    const second = BigInt(b[index]);
    if (first !== second) return first > second ? 1 : -1;
  }
  return 0;
}

export function mapAvailablePackageCatalog(payload, observedAt = new Date().toISOString()) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Available package catalog response is invalid.");
  if (payload.provider !== AVAILABLE_IPM_SOURCE) throw new Error("Available package provider identity is invalid.");
  const namespace = bounded(payload.namespace, "namespace", 128);
  const name = bounded(payload.name, "package name", 128);
  if (!SAFE_NAME.test(name)) throw new Error("Package identity is invalid.");
  const states = ["available", "empty", "unavailable", "denied", "failed", "truncated"];
  if (!states.includes(payload.status)) throw new Error("Available package catalog state is invalid.");
  if (!Number.isInteger(payload.repositoryCount) || payload.repositoryCount < 0 || payload.repositoryCount > 5 ||
      !Number.isInteger(payload.availableRepositoryCount) || payload.availableRepositoryCount < 0 || payload.availableRepositoryCount > payload.repositoryCount ||
      !["unknown", "complete", "partial"].includes(payload.coverage)) throw new Error("Available package repository coverage is invalid.");
  if ((payload.coverage === "complete" && payload.availableRepositoryCount !== payload.repositoryCount) ||
      (payload.coverage === "partial" && payload.availableRepositoryCount >= payload.repositoryCount)) throw new Error("Available package repository coverage is inconsistent.");
  const truncated = payload.truncated === true || payload.truncated === 1;
  if (!truncated && payload.truncated !== false && payload.truncated !== 0) throw new Error("Available package truncation state is invalid.");
  if (!Array.isArray(payload.packages) || payload.packages.length > 50) throw new Error("Available package rows exceed the bounded contract.");
  const hasRows = payload.packages.length > 0;
  if ((payload.status === "available" && (!hasRows || payload.availableRepositoryCount < 1)) ||
      (payload.status === "empty" && (hasRows || payload.coverage !== "complete" || payload.repositoryCount < 1)) ||
      (["denied", "failed", "unavailable"].includes(payload.status) && hasRows) ||
      (payload.status === "truncated" && (!truncated || payload.packages.length !== 50)) ||
      (payload.status !== "truncated" && truncated)) throw new Error("Available package rows do not match their provider state.");
  const packages = payload.packages.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item) || item.name !== name || !SAFE_NAME.test(item.name)) throw new Error("Available package identity is invalid.");
    const availableVersion = bounded(item.availableVersion, "available version", 64);
    const repository = bounded(item.repository, "repository identity", 128);
    const ref = packageResourceRef({ name, namespace }, AVAILABLE_IPM_SOURCE, observedAt);
    return Object.freeze({
      ref, name, namespace, installedVersion: null, availableVersion, repository,
      origin: typeof item.origin === "string" && item.origin ? bounded(item.origin, "package origin", 256) : null,
      description: typeof item.description === "string" && item.description ? bounded(item.description, "package description", 512) : "Catalog description not returned.",
      state: "available", synthetic: false,
    });
  });
  const knownReasons = new Set([
    "repository-cache-query-execute-required",
    "repository-definition-read-required", "invalid-package-query", "configured-repository-limit-exceeded",
    "no-enabled-repositories", "configured-repositories-unavailable", "partial-repository-availability", "catalog-query-failed",
  ]);
  return Object.freeze({
    state: payload.status.toUpperCase(), sourceIdentity: AVAILABLE_IPM_SOURCE, synthetic: false,
    namespace, name, coverage: payload.coverage, repositoryCount: payload.repositoryCount,
    availableRepositoryCount: payload.availableRepositoryCount, truncated: payload.status === "truncated",
    reason: knownReasons.has(payload.reason) ? payload.reason : null,
    packages: Object.freeze(packages),
  });
}

export function comparePackageCatalogToInstalled(catalog, installedInventory) {
  if (!catalog || catalog.sourceIdentity !== AVAILABLE_IPM_SOURCE || !Array.isArray(catalog.packages)) throw new Error("Available package catalog is invalid.");
  const installed = installedInventory?.packages?.find((item) => item.name === catalog.name && item.namespace === catalog.namespace) || null;
  const inventoryComplete = ["AVAILABLE", "EMPTY"].includes(installedInventory?.state);
  return Object.freeze(catalog.packages.map((item) => {
    if (!installed) return Object.freeze({ ...item, state: "available", relationship: inventoryComplete ? "AVAILABLE_ONLY" : "INSTALLED_STATE_UNKNOWN", installedStateKnown: inventoryComplete });
    const comparison = compareStableVersions(item.availableVersion, installed.installedVersion);
    const relationship = comparison === null ? "INSTALLED_VERSION_UNCOMPARABLE"
      : comparison === 0 ? "INSTALLED_CURRENT"
        : comparison > 0 ? "INSTALLED_OLDER" : "INSTALLED_NEWER";
    return Object.freeze({
      ...item,
      installedVersion: installed.installedVersion,
      installedStateKnown: true,
      relationship,
      state: relationship === "INSTALLED_OLDER" ? "update-available" : "installed",
    });
  }));
}

// UI intent only. Fresh inventory, authority and confirmation remain executor-owned.
export function livePackageSelection(row) {
  if (!row || row.namespace !== "%SYS" || !SAFE_NAME.test(row.name) || ["opsdeck", "zpm"].includes(row.name) ||
      !row.installedStateKnown || !row.repository || !/^[A-Za-z0-9_.-]{1,128}$/.test(row.repository)) return null;
  const action = row.installedVersion ? "remove" : "install";
  const version = action === "remove" ? row.installedVersion : row.availableVersion;
  if (!/^\d+\.\d+\.\d+$/.test(version || "")) return null;
  return Object.freeze({ action, packageName: row.name, namespace: row.namespace, installedVersion: row.installedVersion || null, requestedVersion: version, sourceIdentity: row.repository });
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
