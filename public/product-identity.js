const PRODUCT = Object.freeze({
  name: "OpsDeck",
  releaseLabel: "Beta Release",
  publicVersion: "0.2",
  internalVersion: "0.7.0",
  packageVersion: "0.7.0",
  gitCommit: null,
  buildTimestamp: null,
  packageNamespace: "%SYS",
});

const DEPLOYMENT_TARGETS = Object.freeze({
  native: "Native IRIS CSP application",
  demo: "Safe demo bundle",
  reference: "Node reference runtime",
});

function boundedObservedText(value, fallback) {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  return text && text.length <= 128 ? text : fallback;
}

export const ProductIdentity = Object.freeze({
  resolve(runtime = {}) {
    if (!runtime || typeof runtime !== "object" || Array.isArray(runtime)) throw new Error("Product identity context is invalid.");
    const deploymentTarget = DEPLOYMENT_TARGETS[runtime.deployment];
    return Object.freeze({
      ...PRODUCT,
      gitCommit: boundedObservedText(runtime.gitCommit, "Not embedded in source package"),
      buildTimestamp: boundedObservedText(runtime.buildTimestamp, "Not embedded in source package"),
      irisVersion: boundedObservedText(runtime.irisVersion, "Not observed"),
      namespace: deploymentTarget === DEPLOYMENT_TARGETS.native
        ? PRODUCT.packageNamespace
        : deploymentTarget === DEPLOYMENT_TARGETS.demo ? "Not applicable" : "Not observed",
      deploymentTarget: deploymentTarget || "Not observed",
    });
  },
});

export const PRODUCT_IDENTITY = PRODUCT;
