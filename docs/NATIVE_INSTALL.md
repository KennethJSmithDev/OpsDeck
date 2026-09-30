# Native IRIS installation — 0.2.0 candidate

**Status: prepared workflow; final R3 lifecycle and public registry publication are pending. These commands are proposed and are not a successful-install claim.**

## Prerequisites

- A running native Windows InterSystems IRIS Community Edition instance. Historical selected browser reads were observed on IRIS 2026.2; other builds are not qualified.
- Supported local operator access to the IRIS Terminal and an installed InterSystems Package Manager (IPM, formerly ZPM) in `%SYS`.
- An identity authorized for package installation and web-application configuration. Use your existing administrator-approved account; this project does not require enabling Atelier or changing IRIS security.
- A separate account with the management API permissions needed for the read views you intend to inspect. Installation authority and ordinary viewing authority are different.

## Protect an existing /opsdeck installation

Before load/install/uninstall, capture the authoritative `/opsdeck` web-application definition and back up any existing `app.js`, `index.html`, `styles.css`, and `iris-provider.js`. A pre-existing application is operator-owned and may be replaced or removed by the package lifecycle. Preserve its roles, authentication, resource, path, namespace, session/cookie settings and other returned properties. Do not proceed if its ownership or restoration path is unknown.

The package declares exactly these four files under the instance CSP directory and the `/opsdeck` application in `%SYS`. It does not own `proof/`, arbitrary sibling files, credentials, IRIS configuration or management APIs. Do not recursively delete the CSP directory to uninstall OpsDeck.

## Local source installation proposal

Obtain the public source with ordinary Git, then check out the release revision identified in the release notes. The proposed source workflow requires no private qualification scripts, personal credentials, Codex tools or developer-specific directories:

```powershell
git clone https://github.com/KennethJSmithDev/OpsDeck.git
cd OpsDeck
git checkout <published-release-revision>
```

Do not use the placeholder until that revision is public. In the supported IRIS Terminal, select `%SYS` using the normal local workflow, enter the IPM prompt with `zpm`, then use:

```text
load C:\path\to\OpsDeck
list-installed opsdeck
```

The expected identity is `opsdeck 0.2.0`. `load` takes the source directory containing `module.xml`; `install opsdeck` obtains a package from a configured repository and is a separate distribution test. Do not add that registry command to this source workflow. Check load success, registered version, application configuration and deployed resource bytes; the existence of `/opsdeck` alone cannot prove installation. The controlled local qualification must validate this workflow before it is described as tested guidance. See the [official IPM command descriptions](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=AIPM).

If IPM is absent or its state is uncertain, stop and ask the instance administrator to resolve it using supported instructions. OpsDeck does not authorize automatic bootstrap, Python changes or registry reconfiguration. An existing class alone does not establish a usable package manager.

## Public package installation proposal

After a qualified 0.2.0 package is actually published, verify the intended registry contains that exact version before using its supported version selector. The future registry workflow is separate from public-source `load`. Public registry availability is not verified; an Open Exchange release announcement alone does not establish it.

## Open and authenticate

Open `http://127.0.0.1:52773/opsdeck/index.html`, adjusting the instance HTTP port. The explicit index URL is canonical; no root redirect is promised. IRIS serves the browser app directly; Node is unnecessary for native hosting.

IRIS may apply its configured web-application authentication before the browser app loads. The app then uses the account entered in its sign-in form for bounded same-origin management API reads. A successful static-page request does not prove API authority. Credentials remain in tab memory, are not intentionally saved in browser storage, and are cleared by Sign out. Use a private workstation session or appropriately configured HTTPS for non-local access; never publish management ports as part of this guide.

## Uninstall proposal

In the IPM prompt in `%SYS`:

```text
uninstall opsdeck
list-installed opsdeck
```

Verify the application and four package files are removed, the package is absent, and unrelated `proof/` artifacts survive. If you replaced a manual installation, restore its captured application definition and file bytes using supported IRIS administration. Package cache/registry recovery and hidden server-managed properties can require operator judgment; automatic rollback is not a guarantee.

## Troubleshooting boundaries

- A command failure or missing success evidence is a failed/inconclusive stage, even if the page returns HTTP 200.
- HTTP 401: check the chosen account and existing instance authentication configuration. HTTP 403: the identity may lack authority for the selected read; do not broaden privileges automatically.
- HTTP 404/static asset failure: inspect the expected `%SYS` app definition, CSP physical path and exact four target files.
- Disk hashes must match source after installation; browser cache cannot explain mismatched disk bytes.
- Do not enable Atelier, add credential transports, weaken Locked Down settings, or retry ambiguous destructive steps automatically.

Until final R3 and publication pass, the [README](../README.md) Node reference workflow and the clearly labelled safe demo remain the currently documented exploration paths.
