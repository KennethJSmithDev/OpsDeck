# OpsDeck 0.2.0 — shipped release record

**Published:** 2026-10-01  
**Tag:** `v0.2.0`  
**Release commit:** `23215459096cb47d255c45b1e6e86687f3d8e93a`  
**Tested package source:** `1663869af14673f027efb63a986ac5c1e50a8ac1`

## What shipped

- Native IRIS browser hosting at `/opsdeck/index.html`.
- Same-origin management reads with tab-memory authentication and explicit sign-out.
- Overview, Applications, Access, Security, Tasks, System, Logs, and Evidence routes.
- Independent web-application read-back where qualified.
- Available-width responsive layouts, compact navigation, More overflow menu, stacked inspectors, reflowing inventories, and wrapped source tabs.
- Safe deterministic demo with evaluator personas and an Evidence view.
- IPM source package `opsdeck 0.2.0`.

## Qualification

The controlled local-source lifecycle passed on native Windows IRIS 2026.2 Build 221U in `%SYS`.

The lifecycle verified:

- source load;
- package registration;
- authoritative `/opsdeck` definition;
- deployed package resource hashes;
- bounded operational HTTP behavior;
- uninstall/removal;
- unrelated proof/sibling preservation;
- clean same-source reload;
- 82/82 product regression tests.

The installed application was then exercised as `OpsDeckTest`.

Eight routes were checked at 320, 390, 600, 820, 1024, and 1440 CSS px with zero measured document horizontal overflow. A no-reload wide → narrow → wide resize preserved selected Applications state and compact navigation.

## Post-release distribution finding

A fresh Windows clone of `v0.2.0` with `core.autocrlf=true` materialized `public/app.js` and `public/styles.css` with CRLF line endings.

Their working-tree hashes differ from the lifecycle receipt. The Git object blobs match the tested source commit.

This establishes a **checkout representation variance**. It does not establish a runtime failure.

Consequences:

- do not move the published `v0.2.0` tag;
- retain the accepted local-source lifecycle evidence for its tested source identity;
- do not claim exact fresh-checkout byte parity for v0.2.0;
- normalize the checkout contract in a new patch candidate and requalify those exact bytes.

## Retained limits

The following are not claimed by v0.2.0:

- public-registry installation;
- exact core IPM version;
- audit async result retrieval;
- Messages or System Monitor log readers;
- broad mutation workflows;
- arbitrary ObjectScript/CallIn execution;
- Docker parity;
- full Management Portal parity.

For current status, see [Qualification Status](QUALIFICATION_STATUS.md).
