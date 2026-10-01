# OpsDeck 0.2.0 — shipped release record

**Published:** 2026-10-01  
**Tag:** `v0.2.0`  
**Release commit:** `23215459096cb47d255c45b1e6e86687f3d8e93a`  
**Tested package source:** `1663869af14673f027efb63a986ac5c1e50a8ac1`

## What shipped

- native IRIS hosting at `/opsdeck/index.html`;
- same-origin management reads with tab-memory authentication and sign-out;
- Overview, Applications, Access, Security, Tasks, System, Logs, and Evidence;
- independent web-application read-back where qualified;
- available-width responsive layouts and compact **More** navigation;
- safe deterministic demo with authority personas;
- IPM source package `opsdeck 0.2.0`.

## Qualification

The local-source lifecycle passed on native Windows IRIS 2026.2 Build 221U in `%SYS`.

Verified:

- source load and registration;
- authoritative `/opsdeck`;
- deployed resource hashes;
- bounded HTTP behavior;
- uninstall/removal;
- unrelated proof/sibling preservation;
- clean same-source reload;
- 82/82 product regressions.

The installed application was exercised as `OpsDeckTest`.

Eight routes were checked at 320, 390, 600, 820, 1024, and 1440 CSS px with zero measured document horizontal overflow. A no-reload wide → narrow → wide sequence preserved selected Applications state.

## Post-release distribution finding

A normal Windows checkout can materialize some package-input files with CRLF while the tested source/Git blobs are LF.

That establishes checkout-representation variance, not a runtime failure.

The published tag remains unchanged. The correction is being handled in a later patch candidate with its own qualification boundary.

## Retained limits

v0.2.0 does not claim:

- public-registry installation;
- exact core IPM version;
- audit async result retrieval;
- Messages/System Monitor log readers;
- broad mutation workflows;
- arbitrary ObjectScript/CallIn execution;
- Docker parity;
- full Management Portal parity.

See [Qualification Status](QUALIFICATION_STATUS.md).
