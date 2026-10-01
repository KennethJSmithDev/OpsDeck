# Native IRIS installation — v0.2.0

## Qualified source path

The controlled local-source lifecycle passed for the tested OpsDeck 0.2.0 package source on native Windows IRIS 2026.2 Build 221U in `%SYS`.

The public `v0.2.0` tag is available and remains fixed.

Two distribution boundaries remain separate from that accepted qualification:

1. a normal Windows checkout of v0.2.0 can materialize some packaged files with CRLF while the tested source/Git blobs were LF;
2. public Package Manager / registry installation has not been independently verified.

The line-ending finding is a representation variance, not evidence of a runtime defect.

A later 0.2.1 development candidate verified an LF checkout contract under `core.autocrlf=true`, but its native lifecycle is currently unresolved and it is **not a release**.

## Prerequisites

- InterSystems IRIS; the qualified v0.2.0 lifecycle used native Windows IRIS 2026.2 Build 221U.
- IRIS Terminal and installed IPM/ZPM in `%SYS`.
- an identity authorized for package installation/web-application configuration;
- a separate appropriately scoped identity for normal OpsDeck reads.

## Protect an existing /opsdeck

Before package mutation, capture the authoritative `/opsdeck` definition and existing package-owned resources.

The package owns:

- `app.js`
- `index.html`
- `styles.css`
- `iris-provider.js`
- the `/opsdeck` web application

It does not own arbitrary CSP siblings, credentials, proof artifacts, or unrelated IRIS configuration.

## Install from source

```powershell
git clone https://github.com/KennethJSmithDev/OpsDeck.git
cd OpsDeck
git checkout v0.2.0
```

In IRIS Terminal, select `%SYS`, enter the IPM prompt, then:

```text
load C:\path\to\OpsDeck
```

Expected module identity:

```text
opsdeck 0.2.0
```

A page returning HTTP 200 does not by itself prove registration. Verify package identity, `/opsdeck`, and deployed resources.

## Open

```text
http://127.0.0.1:52773/opsdeck/index.html
```

Adjust the HTTP port for the target instance.

Credentials remain in tab memory and are cleared by Sign out.

## Uninstall

From the IPM prompt in `%SYS`:

```text
uninstall opsdeck
```

Verify:

- package registration is absent;
- `/opsdeck` is removed as expected;
- package-owned resources are removed;
- unrelated siblings/proof content remain intact.

## Public Package Manager boundary

`install opsdeck` is a different distribution path from local-source `load`.

Do not claim registry installation merely because an Open Exchange release or approval exists. Verify the exact registry/version and install it on a clean target first.

## Current 0.2.1 diagnostic boundary

The next patch candidate is frozen locally and its LF checkout representation matched Git blobs. Its lifecycle attempt did **not** qualify:

- `LOAD_INITIAL` completed Terminal transport but lacked the required exact operation marker;
- legacy recovery then attempted uninstall;
- registration and `/opsdeck` were absent afterward;
- package-owned resource bytes were restored;
- the unrelated CSP sibling inventory digest changed while retaining the same entry count;
- the pre-capture record did not retain item-level sibling rows, so the delta is not localized.

No new lifecycle attempt should run until the sibling delta and ambiguous IPM result path are resolved.

## Troubleshooting rules

- transport success is not semantic success;
- an ambiguous mutation result must not be retried automatically;
- reacquire authoritative state before deciding cleanup;
- do not broaden privileges automatically after 401/403;
- browser cache cannot explain mismatched disk bytes;
- do not weaken unrelated IRIS security/service configuration to make qualification pass.

See [Qualification Status](QUALIFICATION_STATUS.md).
