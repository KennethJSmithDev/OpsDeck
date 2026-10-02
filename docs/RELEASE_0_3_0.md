# OpsDeck 0.3.0 — Capability-Aware Operations

**Release status:** candidate prepared for qualification; no public release has been published by this record.  
**Previous public release:** `v0.2.0`.  
**Package identity:** `opsdeck 0.3.0`.

OpsDeck 0.3.0 is the first public capability-aware OpsDeck release. It carries forward the accepted 0.2.1 distribution-fidelity work and introduces the first bounded capability-aware UI slice: navigation and route projection respond to observed provider/capability state and current context while preserving explicit route states.

This release does **not** complete the broader internal 0.3 roadmap. Capability projection is presentation only and does not grant IRIS authority. IRIS remains authoritative for identity, authorization, and data.

## Included scope

- Native IRIS-hosted `/opsdeck` application and local-source IPM/ZPM lifecycle, with IPM/ZPM installation previously verified.
- Accepted distribution fidelity for the package inputs, including the canonical fresh-checkout representation.
- Capability-aware navigation projection for supported, denied, unavailable, partial, and unqualified provider states, with context-sensitive route emphasis.
- Responsive layouts and state preservation across width changes from the accepted foundation.
- Deterministic Safe Demo data, visibly labeled as demo data.

## Qualification boundary

The 0.2.1 distribution-fidelity and first bounded capability-aware UI slice are accepted foundations. Qualification of this exact 0.3.0 package candidate is recorded separately and must not be inferred from those prior results alone.

No claim is made here for a qualified fixed-log browser API, live operation engine, persistent Evidence Center, live package management, Vector Search, Embedded Python, Docker deployment, or public registry installation. Safe Demo data is synthetic and does not establish live IRIS behavior.

The prior public `v0.2.0` tag and its historical evidence remain unchanged.
