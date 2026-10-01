# Native IRIS installation — v0.2.0 source release

## Status

The controlled local-source lifecycle passed for the tested OpsDeck 0.2.0 package source on native Windows IRIS 2026.2 Build 221U in `%SYS`.

The public `v0.2.0` source tag is available.

Two distribution boundaries remain separate from that local-source qualification:

1. **Fresh-checkout byte parity:** a Windows clone with `core.autocrlf=true` materialized two packaged JavaScript/CSS files with CRLF line endings, producing working-tree hashes different from the lifecycle receipt. Git object blobs match the tested source commit. This is checkout representation variance, not proof of a runtime failure.
2. **Public registry installation:** Open Exchange / Package Manager publication and installation have not yet been independently verified.

The published `v0.2.0` tag will not be moved. The next patch candidate normalizes the checkout contract and must requalify the exact fresh-checkout bytes.

## Prerequisites

- A running InterSystems IRIS instance. The qualified lifecycle used native Windows IRIS 2026.2 Build 221U.
- Supported local access to the IRIS Terminal and an installed InterSystems Package Manager (IPM, formerly ZPM) in `%SYS`.
- An identity authorized for package installation and web-application configuration.
- A separate least-privilege application identity for the management information you intend to inspect.

Installation authority and ordinary viewing authority are different.

## Protect an existing /opsdeck application

Before load/uninstall operations, capture the authoritative `/opsdeck` web-application definition and back up any existing package-owned files:

- `app.js`
- `index.html`
- `styles.css`
- `iris-provider.js`

A pre-existing application is operator-owned and may be replaced or removed by the package lifecycle. Do not proceed if its ownership or restoration path is unknown.

The package owns exactly those four browser resources plus the `/opsdeck` application. It does not own arbitrary siblings, credentials, proof artifacts, or unrelated IRIS configuration.

## Source workflow

Clone the repository and select the published source release:

```powershell
git clone https://github.com/KennethJSmithDev/OpsDeck.git
cd OpsDeck
git checkout v0.2.0
```

In IRIS Terminal, select `%SYS`, enter the IPM prompt with `zpm`, then load the source directory containing `module.xml`:

```text
load C:\path\to\OpsDeck
```

The expected module identity is:

```text
opsdeck 0.2.0
```

A successful page request alone does not prove package registration. Verify the installed module, `/opsdeck` definition, and deployed resources.

### Fresh Windows checkout note

The v0.2.0 tag has a known line-ending representation variance under a normal Windows checkout with `core.autocrlf=true`. The Git blobs match the tested source, but two materialized working-tree files can differ byte-for-byte from the lifecycle receipt.

Treat that as a distribution-fidelity limitation. Do not reinterpret it as evidence that the native application failed at runtime.

## Open and authenticate

Open:

```text
http://127.0.0.1:52773/opsdeck/index.html
```

Adjust the port for the local IRIS instance.

IRIS may apply its configured web-application authentication before the page loads. OpsDeck then uses the account entered in its sign-in form for bounded same-origin management reads.

Credentials remain in tab memory, are not intentionally persisted in browser storage, and are cleared by Sign out.

## Uninstall

From the IPM prompt in `%SYS`:

```text
uninstall opsdeck
```

Verify:

- package registration is absent;
- `/opsdeck` is removed as expected;
- the four package-owned resources are removed;
- unrelated sibling/proof content remains intact.

If a pre-existing manual installation was replaced, restore it from the captured pre-state using supported IRIS administration.

## Public Package Manager boundary

`install opsdeck` is a **different distribution path** from local-source `load`.

Do not claim registry installation merely because an Open Exchange release exists or publication is pending. First verify that the intended registry exposes the exact release, then install it on a clean target and preserve the resulting evidence.

## Troubleshooting boundaries

- Missing semantic success evidence is a failed/inconclusive stage even when transport succeeds.
- HTTP 401 means authentication needs investigation.
- HTTP 403 means the current identity may lack authority; do not automatically broaden privileges.
- HTTP 404/static failure should be localized to the web-application definition, physical path, and exact package resources.
- Browser cache cannot explain mismatched disk bytes.
- Do not enable unrelated services, weaken Locked Down settings, or automatically retry ambiguous destructive operations.

For the latest evidence boundary, see [Qualification Status](QUALIFICATION_STATUS.md).
