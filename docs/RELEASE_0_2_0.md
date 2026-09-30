# OpsDeck 0.2.0 — release candidate notes

**Prepared 2026-09-30. Not tagged, released, published, or lifecycle-qualified.**

## Candidate changes

- Reconciles native IRIS browser hosting and same-origin read routes with the newer evaluator tour, authority personas, Evidence view, and responsive styles.
- Preserves native tab-memory authentication, sign-out, safe-field mappings, fixed read providers, independent web-application read-back, and explicitly opt-in stateful alerts.
- Distinguishes native IRIS access denial from synthetic demo persona denial; restricted demo identity remains visible when Applications is denied.
- Packages four explicit browser assets and `/opsdeck` in `%SYS`; package identity is `opsdeck 0.2.0`.
- Uses consistent asset query versions and documents existing-app ownership, installation proposals, uninstall and recovery boundaries.

## Qualification statement

Safe automated/static checks apply to this candidate tree. Historical native browser evidence applies to the previously installed bundle. R3 has been attempted and is INCONCLUSIVE. The repaired Terminal capture path now verifies authenticated identity and namespace with attempt-specific completion. Read-only inspection confirms IRIS 2026.2 Build 221U and package-manager class presence, but an IPM version call throws exception code -99; usability and prior possible partial setup remain unresolved. Final local-source materialization/registration, operational checks, uninstall/removal, clean source reinstall and source/runtime parity remain unqualified. Registry installation is a separate distribution gate.

**Conditional after a complete final R3 PASS:** the exact candidate package lifecycle and four-file parity may be described as reproduced on the receipt's IRIS build, namespace, IPM version and environment. Preserve that receipt and identify the tested SHA. This does not qualify public-registry installation until publication and a registry install are independently confirmed.

## Retained limits

Selected read views do not establish full Management Portal parity. Audit async result retrieval, Messages and System Monitor readers remain unqualified/deferred. No mutation workflows, ObjectScript execution bridge, CallIn, Docker parity, cross-platform compatibility or formal least-privilege proof is claimed. Demo personas are synthetic authority illustrations.
