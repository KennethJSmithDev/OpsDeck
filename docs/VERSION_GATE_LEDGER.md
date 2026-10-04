# Version acceptance ledger

## v0.6 — PASS, 2026-10-03

The v0.5 operational-visibility milestone remains accepted at its previously recorded scope. This gate adds one real reversible operation through the shared executor. It does not require a new browser operation surface, package mutation, persistent Evidence, or AI.

| Exact acceptance criterion | Evidence | Result |
|---|---|---|
| One real reversible mutation passes | Disabled `/opsdeck-fixture` creation and removal on `OPSDECK_08_TEST_TARGET`, authenticated as the existing `OpsDeckQualify` identity in `%SYS`. | PASS |
| Generic executor owns the path; no parallel per-domain executor | Live provider implements the provider interface consumed by `executeOperationPlan` in the canonical `public/operation-engine.js`. The qualification harness imports that same implementation. | PASS |
| Authoritative read-back determines success | Fresh absent pre-state, fresh authority, expiry and exact plan/fingerprint confirmation precede one dispatch. Exact created properties and subsequent absence are verified by independent GET requests. | PASS |
| Real OperationReceipt exists | Create receipt `iris-admin-webapp-provider-v1:receipt:fixture_create_1791077104080`; removal receipt `iris-admin-webapp-provider-v1:receipt:fixture_delete_1791077104163`; both VERIFIED. | PASS |
| Evidence can consume the receipt | `operationReceiptEvidence` projects both actual engine receipts into the existing bounded Evidence collection/export contract. Runtime output confirmed two consumed records. | PASS |
| Cleanup passes | Independent final GET proves absence. Canonical response hashes for `/opsdeck`, `/opsdeck-api`, and `/csp/sys` match before and after. | PASS |

The private runtime record is `opsdeck-v06-qualified-2026-10-03.json`. It retains actual receipts, projected Evidence, sibling hashes, identity, scope, reviewed impact, and confirmation basis; it contains no credential. The existing Docker-only DPAPI credential was used locally. No account, role, grant, repository, host IRISTesting state, or installed OpsDeck package was changed.

An earlier attempt remained AMBIGUOUS because the detail mapper expected fields omitted by the installed API. That result was not reclassified or automatically retried. The mapper was corrected, the fixture was separately removed, and the passing qualification used new plans with fresh absence. The observed `ServeFiles: "Always"` value is now handled explicitly.

Tests: full source suite 162/162 PASS; focused version/asset/engine/Evidence suite 35/35 PASS after the version change. Syntax, module parsing, and diff checks pass. Internal/package version is 0.6.0; public identity remains Beta Release 0.2. No Main merge, tag, or publication is part of this gate.

Representation: 234,947 JS bytes + 38,100 CSS bytes + 460 HTML bytes = 273,507 uncompressed initial asset bytes. Relative to the preserved 228,337-byte baseline: +45,170 bytes (+19.78%). Relative to the v0.5 acceptance measurement: +13,323 bytes; this includes About and the operation-provider/receipt projection additions. No framework, SDK, vector payload, or preload was added. Transfer timing was not remeasured.

Debt: current-package release lifecycle remains separate; general application enable/disable is source-only, package mutation remains unqualified, and browser rendering of real operation Evidence belongs to v0.7.

V0_6_ACCEPTED

## v0.7 — next gate

| Exact acceptance criterion | Starting evidence | Remaining work |
|---|---|---|
| Real observations | Existing live bounded read providers and session Evidence. | Preserve. |
| Real Job observations | Existing Audit-to-Job Center-to-Evidence flow. | Preserve. |
| Real OperationPlan and impact | v0.6 plans and qualification impact exist. | Project the live session plan/impact in the product. |
| Real OperationReceipt | v0.6 engine and receipt projection pass. | Consume and render the live result in session Evidence. |
| Findings tied to Evidence | Existing fixed-log findings retain source observation identity. | Preserve. |
| KNOWN / INFERRED / UNVERIFIED projection | Existing Evidence certainty concepts. | Make the live operation distinction visible. |
| Coherent browser-visible behavior | Existing read/Job/findings views qualified. | Bounded browser verification of the operation plan and receipt flow. |

Session scope is sufficient. No durable authoritative Evidence storage or health score is required.
