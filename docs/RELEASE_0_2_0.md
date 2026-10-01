# OpsDeck 0.2.0 — release candidate notes

**Prepared 2026-10-01. Tested package source SHA:** `1663869af14673f027efb63a986ac5c1e50a8ac1`. Manifest/resource fingerprint is listed in the qualification record. This release copy is prepared for review and has not been tagged, released, or published.

## Candidate changes

- Reconciles native IRIS browser hosting and same-origin read routes with the newer evaluator tour, authority personas, Evidence view, and responsive styles.
- Preserves native tab-memory authentication, sign-out, safe-field mappings, fixed read providers, independent web-application read-back, and explicitly opt-in stateful alerts.
- Distinguishes native IRIS access denial from synthetic demo persona denial; restricted demo identity remains visible when Applications is denied.
- Packages four explicit browser assets and `/opsdeck` in `%SYS`; package identity is `opsdeck 0.2.0`.
- Uses consistent asset query versions and documents existing-app ownership, installation proposals, uninstall and recovery boundaries.

## Qualification statement

The 16-stage controlled local-source lifecycle passed for candidate SHA 1663869af14673f027efb63a986ac5c1e50a8ac1, package opsdeck 0.2.0, on IRIS 2026.2 Build 221U in %SYS. The exact four source/runtime hashes matched through load, uninstall/removal, and clean same-source reload; proof/ and CSP siblings were preserved. Bounded OpsDeckTest operational checks and 82/82 regressions passed. The installed native browser rendered the corrected Evidence card; the eight routes had zero measured document horizontal overflow at 320, 390, 600, 820, 1024, and 1440 CSS px. This is local-source qualification only. The exact core IPM version, fresh public-checkout installation, and public-registry installation remain unverified. No tag or public release exists.

**Distribution boundary:** The tested claim is local-source lifecycle qualification on the recorded IRIS build. Exact core IPM version, fresh public-checkout installation, public-registry availability, and registry installation remain unverified. Do not advertise `install opsdeck` until the intended registry and version are independently confirmed.

## Retained limits

Selected read views do not establish full Management Portal parity. Audit async result retrieval, Messages and System Monitor readers remain unqualified/deferred. No mutation workflows, ObjectScript execution bridge, CallIn, Docker parity, cross-platform compatibility or formal least-privilege proof is claimed. Demo personas are synthetic authority illustrations.
