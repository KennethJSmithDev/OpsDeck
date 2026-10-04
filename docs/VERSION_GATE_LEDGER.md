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

## v0.7 — PASS, 2026-10-03

| Exact acceptance criterion | Evidence | Result |
|---|---|---|
| Real observations | Preserved qualified live providers and current-session independent application read-back. | PASS |
| Real Job observations | Preserved qualified Audit → shared Job Center → session Evidence behavior; no additional audit schema claim. | PASS |
| Real OperationPlan and impact | Edge reviewed fresh enable and disable plans for `/opsdeck-fixture` in `%SYS`, explicit availability impact, risk, expiry and confirmation. | PASS |
| Real OperationReceipt | Both browser confirmations executed the shared engine and authoritative read-back returned VERIFIED. Actual receipts rendered in session Evidence. | PASS |
| Findings tied to Evidence | Existing bounded findings retain source observation and line identity; interpretation explicitly marked INFERRED. | PASS |
| KNOWN / INFERRED / UNVERIFIED projection | Plan is UNVERIFIED; authoritative verification is KNOWN; findings are INFERRED. | PASS |
| Coherent browser-visible product behavior | Edge, same-origin Docker target, existing OpsDeckQualify saved credential. Evidence visibly contained both reviewed plans and verified receipts. | PASS |

Browser receipt completion timestamps: enable `2026-10-04T01:32:32.474Z`; disable `2026-10-04T01:33:00.213Z`. Fresh plans were confirmed individually. Setup/removal also used the shared engine. Removal receipt `iris-admin-webapp-provider-v1:receipt:fixture_delete_1791077623084` is VERIFIED; independent subsequent GET returned 404, proving absence. Credential, account, roles, grants, repositories and host IRISTesting were untouched.

Internal/package version: 0.7.0. Public identity remains Beta Release 0.2. Full JS suite: 164/164 PASS; syntax, XML parsing and diff checks PASS. Browser qualification used deployed source assets, not a new IPM package lifecycle. Package registration still describes the earlier installed version.

Representation: 241,134 JS + 38,100 CSS + 460 HTML = 279,694 uncompressed initial asset bytes. Increase over v0.6: 6,187 bytes, required for reviewed plan/impact, confirmation and session receipt rendering. Increase over the preserved 228,337-byte baseline: 51,357 bytes (22.50%). No framework, SDK, persistent Evidence or vector browser payload added. Timing/request counts not remeasured.

Debt: UI inventory does not automatically refresh after a mutation; qualification explicitly refreshed before reversal. Browser export download capture timed out, without affecting verified operation/read-back or visible Evidence; export runtime capture is not this gate's criterion. Existing generic copy and package-lifecycle prose require later cleanup. General web-application changes beyond the disposable fixture remain outside runtime-qualified scope. No neighboring-system redesign was undertaken.

V0_7_ACCEPTED

## v0.8 — active gate

| Exact acceptance criterion | Starting evidence | Remaining work |
|---|---|---|
| Generic operations real | v0.6/v0.7 shared engine passes. | Preserve. |
| Package operations real | Installed and catalog reads; exact IPM contracts documented. | Non-escalating caller-authority provider; locally controlled package install/remove through the same engine and authoritative inventory read-back. |
| DPI-I-261 complete | Read-side and correct version relationships pass. | Reviewed install/remove, receipt, cleanup and unrelated-package preservation. |
| Evidence consumes receipts | v0.7 live session behavior passes. | Consume package receipts. |
| Docker lifecycle remains sound | Earlier qualified lifecycle scope preserved. | Qualify changed package inputs when executing the integrated lifecycle. |
| Main observation domains remain healthy | Existing accepted read scope preserved. | Relevant regression gates only. |

Vector/AI work remains gated on the operational core. Do not advance version before these criteria pass.
### v0.8 preflight checkpoint — NOT ACCEPTED

The shared engine now has an independently tested live IPM provider and closed install/remove policies. Product-owned `OpsDeck.Product.PackageOperations` compiled on the disposable target, preserving `$USERNAME`, checking `%SYS` database and catalog/inventory authority, rejecting arbitrary command/modifier/path inputs and self-modification of OpsDeck/IPM. It reports ACCEPTED separately from authoritative success; exceptions after dispatch are AMBIGUOUS. The native route delegates to this provider. No package-specific execution engine was added.

The first live attempt stopped before dispatch because the filesystem catalog uses `%IPM_Repo_Filesystem.Cache_OrderedMatches`. Preparation as the protected Docker identity returned SQLCODE -99; EXECUTE is absent. The catalog now explicitly reports DENIED with `repository-cache-query-execute-required`. A separate approval for only that temporary EXECUTE permission is pending. No package install/remove was attempted and no v0.8 receipt or browser claim is made.

The human-authorized temporary `%DB_IRISSYS:WRITE` and local filesystem repository were provisioned after collision checks, then removed at this boundary. Independent read-back confirms WRITE=0, repository count=0, fixture package count=0, and fixture cache count=0. Only the fixture-owned copied files were removed; Docker copy had made them root-owned, so deletion used the Docker root identity after ownership inspection. Existing account/credential, other grants, registry and host IRISTesting are preserved. Compiled experimental product classes/routes remain on the disposable target; package ownership/lifecycle of those changed bytes is UNVERIFIED.

Full JS suite 167/167 PASS, including three new shared-engine package-provider tests for receipts, denial without dispatch, and terminal ambiguity without retry. ObjectScript compilation, JS syntax, module parsing and diff checks PASS. Internal/package version remains 0.7.0: this source is a v0.8 experiment and does not advance the accepted milestone. Browser package mutation UI and DPI-I-261 completion remain gaps. v0.9 remains gated.
