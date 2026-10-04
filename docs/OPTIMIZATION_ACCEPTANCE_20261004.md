# Pre-RC representation optimization — 2026-10-04

## Baseline and frozen contract

Authoritative Main solidification checkpoint: a9f3b60. All nine milestones and mutation accounting **117 / 56 / 37 / 34 / 7 / 12** remain accepted. Task Description HTTP 500 is known debt, excluded from dispatch and counts. Baseline manifest: 24 assets, 434,545 JS/CSS/HTML source bytes, 234,136 lazy JSON bytes, 669,419 total FileCopy bytes.

The operation engine, Evidence model, authority/read-back adapters, TargetRef, workflow execution, AI trust seam, existing tests/qualification evidence, FX semantics and chunky logo stayed byte-exact during optimization. Identity assertions were updated before the optimization freeze during explicitly requested solidification. Three new equivalence tests were added; no existing test was weakened, removed or optimized.

## Phase A — KEEP: lossless catalog transport

The expanded catalog is a generated operation/schema contract, not execution authority. SCAN found repeated field names, schema references, paths, methods, privileges and strings. The candidate interns strings in a dictionary and encodes JSON structure with three explicit tags: string reference, array, object. Finite numbers, booleans and null retain their JSON meaning. The runtime decoder reconstructs canonical JSON and parses it into the existing expanded DTO before command search or the explorer sees it. Invalid references, tags, duplicate fields and expansion bounds refuse.

The accepted expanded public/api-catalog.json remains byte-exact to the baseline and is retained as a reproducibility/judging input. The manifest ships public/api-catalog.compact.json at the existing api-catalog.json target plus the lazy api-catalog-codec.js. Only the shipped representation changes. The original schema compiler and mutation adapters remain unchanged; compiler branding, policy, authority and read-back retain ownership.

Every operation and schema expands exactly. All 276 operation request previews or validation errors agree. Browser/mobile exploration produced identical role planner text except fresh expiry time, disabled confirmation in Observe Only, and VERIFIED synthetic update/restore receipts. The selected synthetic page has no IRIS connection; it does not promote capability evidence.

| Metric | Baseline | Accepted representation |
|---|---:|---:|
| Shipped catalog JSON | 232,090 bytes | 170,984 bytes |
| Added lazy decoder | 0 | 1,883 bytes |
| All JS/CSS/HTML source | 434,545 bytes | 436,601 bytes |
| Lazy JSON | 234,136 bytes | 173,030 bytes |
| All manifest files | 669,419 bytes | 610,369 bytes |
| Local Node median parse/expand | 0.7971 ms | 3.0938 ms |
| Local Node p95 parse/expand | 0.9818 ms | 4.2435 ms |
| Retained expanded-catalog heap | 348,048 bytes | 348,087 bytes |

Catalog savings: **61,106 bytes (26.33%)**. Net runtime manifest savings after decoder/loader cost: **59,050 bytes (8.82%)**. Parsing costs roughly 2.3 ms more per initial catalog load in the local probe; retained expanded memory is effectively unchanged at this measurement's noise scale. This is a wire/source-density optimization, not a parse-speed claim. Catalog and decoder remain lazy. The repository/source archive retains both expanded and packed judging representations, so no source-archive size reduction is claimed.

The direct-object decoder was rejected: it saved bytes but increased retained catalog heap by about 11%. Its source and measurements are preserved privately. The accepted decoder passes through the JSON parser to retain the normal object representation. Measurements use 100 warmed Node v24.21.0 samples and retained heap deltas across 100 live catalogs after GC. They are not network transfer, production latency, RSS or browser heap. The selected automation surface did not support the attempted browser heap method; no browser-heap claim follows. Reproduce the probe with `node --expose-gc scripts/benchmark-api-catalog.mjs`.

## Phase B — SCAN, retain composition root

The conservative source scan accounts once for every app.js byte across 108 segments: 102 referenced/reachable, five lazy candidates, zero proven duplicate/dead, one unverified segment. About is an additional inline subsurface candidate. The scan partitions named top-level declarations plus adjacent initialization/bindings; lexical references are not formal reachability or dynamic coverage. An unreferenced segment is not declared dead. Full segment classifications and artifact accounting are in OPTIMIZATION_SCAN_20261004.json.

Potential projection-only lazy blocks: API explorer 3,134 bytes, FX editor 1,617, workflow review 863, graph view 1,233, AI detail 2,474, and inline About. The compiler/catalog/FX module boundaries are already lazy where established. Moving these small projections would introduce asynchronous rendering, context and confirmation seams without proven dead-code savings. No app refactor is admitted beyond the Phase A loader seam. Execution modules and semantics remain frozen.

## Phase C — REJECT shared-provider rewrite

The provider already uses SAFE_FIELDS, IDENTITY_FIELDS and LABEL_FIELDS with a shared plain-inventory projector. It preserves explicit special protocols for service discovery, logs and credential metadata. A blanket descriptor projector was tested across 90 synthetic value cases and produced 12 service-discovery counterexamples: the candidate exposed ordinary field values where the existing protocol deliberately projects metadata. Combining descriptor tables also increased their serialized representation from 2,292 to 2,463 bytes (+171). These data-table sizes are probe costs, not a full-provider bundle benchmark. No provider source change was admitted. Candidate/failure artifacts remain private.

## Phase D — classify, retain judging inputs

- **Must persist:** product source, frozen tests, native classes, canonical roadmap, logo, pinned official SysAdmin specification and other reproducibility inputs.
- **Can regenerate:** expanded catalog, inventory JSON/Markdown and representation measurement. They remain persisted for judging and exact comparison.
- **Public evidence:** scoped aggregate witnesses and accepted reader/read-back artifacts. Qualification evidence is unchanged.
- **Runtime assets:** manifest FileCopy inputs, including packed catalog, lazy decoder and capability summary. The expanded judging catalog is not copied into the runtime.
- **Private evidence:** raw qualification, fixture, browser, candidate, failed-test/probe and deployment traces, preserved outside Git by hash.

No reproducibility input or evidence was deleted.

## Final acceptance

**259/259 tests PASS**: the same 256 product tests plus three catalog-equivalence/malformed-representation tests. Capability counts remain exact. Existing frozen inputs, original expanded catalog, generated outputs, source/index/checkout manifest bytes, native HTTP assets and privacy scan are checked before commit. The optimized 25-asset package completed owned Docker load → uninstall/absence → same-source reload with ownership validation and unrelated IPM/system application preservation. Authenticated native HTTP matched **25/25** assets; delivery qualification sent zero mutations. Detailed receipts and failed experiments are private. Main and integration are advanced together only after clean acceptance; no tag, release or publication is part of this pass.
