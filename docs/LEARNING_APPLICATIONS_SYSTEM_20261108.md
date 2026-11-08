# Applications, REST and System learning validation

Date: 2026-11-08. Scope: beginner field lessons and mode-aware walkthroughs.

Added 24 shared field lessons with definitions, illustrative examples, observation exercises and official documentation links. Applications now explains Type, Enabled, default/system flags and REST API descriptions. System explains all 12 usage fields and selected process/database fields. Walkthroughs distinguish demo, live and disconnected sessions and require no configuration changes. Learning OFF remains compact.

## Validation

- Full JavaScript regression: 274/274 passed, zero failures or skips.
- Authenticated native IRIS 2026.2 quick-start backend: real identity, repeated application reads, REST discovery and usage reads returned HTTP 200. All 12 usage fields were observed.
- Applications field Help and example, REST description Help, live walkthrough, counter Help/refresh, Learning OFF/ON, persistence across reload, reauthentication and sign-out passed.
- Headless Edge 157.0.4341.42: expanded counter Help at widths 1440, 768, 390 and 320; no document horizontal overflow. No page errors or API mutation requests were recorded. Observe Only remained ON.
- All 25 original static assets were restored byte-for-byte and the initially stopped test instance was stopped again.

Exact current app.js, index.html, styles.css and product-identity.js presentation assets were temporarily served by the existing native backend. This qualifies these learning changes against live IRIS; it is not a package upgrade, full release qualification, novice comprehension study or IRIS for Health qualification. No API responses were mocked. Existing quick-start directory routing requires the explicit index.html entrypoint.

Private browser evidence, request-path/status records and restoration hashes remain outside the repository. Initial harness attempts encountered the directory-entrypoint 404, an expected login loss after reload, and server readiness after restart; these were corrected in the harness before the final passing run. No product authentication or server configuration was changed.
