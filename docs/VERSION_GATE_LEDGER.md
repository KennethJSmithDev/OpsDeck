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

The first live attempt stopped before dispatch because the filesystem catalog uses `%IPM_Repo_Filesystem.Cache_OrderedMatches`. Preparation as the protected Docker identity returned SQLCODE -99; EXECUTE is absent. The catalog now explicitly reports DENIED with `repository-cache-query-execute-required`. At this historical checkpoint, approval for the exact temporary EXECUTE permission was pending and no package install/remove had been attempted. Subsequent approved qualification is recorded below.

The human-authorized temporary `%DB_IRISSYS:WRITE` and local filesystem repository were provisioned after collision checks, then removed at this boundary. Independent read-back confirms WRITE=0, repository count=0, fixture package count=0, and fixture cache count=0. Only the fixture-owned copied files were removed; Docker copy had made them root-owned, so deletion used the Docker root identity after ownership inspection. Existing account/credential, other grants, registry and host IRISTesting are preserved. Compiled experimental product classes/routes remain on the disposable target; package ownership/lifecycle of those changed bytes is UNVERIFIED.

Full JS suite 167/167 PASS, including three new shared-engine package-provider tests for receipts, denial without dispatch, and terminal ambiguity without retry. ObjectScript compilation, JS syntax, module parsing and diff checks PASS. Internal/package version remains 0.7.0: this source is a v0.8 experiment and does not advance the accepted milestone. Browser package mutation UI and DPI-I-261 completion remain gaps. v0.9 remains gated.

## v0.8 — PASS, 2026-10-03 ET / 2026-10-04 UTC

| Exact acceptance criterion | Qualified evidence | Result |
|---|---|---|
| Generic operations real | Preserved v0.6/v0.7 engine; IPM provider uses that same plan/confirmation/dispatch/read-back/receipt path. | PASS |
| Package operations real | Protected Docker identity installed and removed `opsdeck-qualification-package@0.0.1`, pinned to the approved local repository. Both results VERIFIED by authoritative inventory. | PASS |
| DPI-I-261 complete | Native Packages workspace: installed inventory, exact available lookup with 2/2 coverage, AVAILABLE ONLY, reviewed install, INSTALLED CURRENT, reviewed remove, authoritative absence. | PASS at tested scope |
| Evidence consumes receipts | Harness consumed two real receipts; Edge visibly rendered install/remove plans and VERIFIED receipts. | PASS |
| Docker lifecycle remains sound | Changed native package load compiled all four product classes; uninstall removed classes, static application and REST dispatch; both routes 404; same-source reinstall restored classes/apps and matching browser asset hashes. `%IPM.Main` and `/csp/sys` preserved. | PASS |
| Main observation domains remain healthy | Full regression suite, current authenticated identity/application reads; qualified fixed-log/Python reads preserved without repetition. | PASS at preserved scope |

Harness receipts: `iris-ipm-operations-v1:receipt:package:install:1791078962384` and `iris-ipm-operations-v1:receipt:package:remove:1791078963796`. Independent sibling package rows match; fixture absent. Edge receipt times: install `2026-10-04T01:59:01.474Z`, remove `2026-10-04T01:59:18.683Z`. Screenshot and complete harness receipts are preserved privately. Browser assets had a distinct cache identity; an initial cached read-only copy was observed and superseded before any browser dispatch.

Authority localization on IRIS 2026.2 Build 221U / IPM 0.10.8, `%SYS`, OpsDeckQualify:

- Filesystem catalog requires EXECUTE on `%IPM_Repo_Filesystem.Cache_OrderedMatches`.
- IPM dependency query requires EXECUTE on `%IPM_Storage.Module_VersionRequirements` and SELECT on `%IPM_Storage.ModuleItem_Dependencies`; read-only probe reached SQLCODE 0 after exact approved grants.
- XML import writes its mapped stream global into the IPM database, governed by `%DB_%DEFAULT`. The observed `<PROTECT>` was closed only after explicit approval of that wider temporary Docker WRITE permission.
- Activate's update-step discovery queries `%Dictionary.CompiledClass`; exact SELECT was approved and the read-only prepare/execute probe passed.
- Temporary `%DB_IRISSYS:WRITE`, `%DB_%DEFAULT:WRITE`, the four exact SQL grants and fixture-only repository were all revoked/removed. Independent checks show both database resources back to READ, each added SQL privilege absent, repo/cache count zero, fixture package absent and repository directory absent. Stable user, DPAPI credential and original grants survive. Registry configuration and host IRISTesting were untouched.

Four earlier install dispatches remain AMBIGUOUS; none was automatically retried or reclassified as success. Each subsequent plan had fresh pre-state and explicit human authorization. IPM's failed/uncommitted history records 29–32 remain as native operation history. Successful install/remove history is also retained; cleanup does not erase the authoritative audit trail. A short-lived qualification comparison node was removed after lifecycle comparison. The installed product source staging directory is retained as its local-source root.

Source correction: fixed the output-device OPEN parameter and added bounded stage/error-name diagnostics, without exception data or resolved source paths. No new executor, execution identity substitution, frontend framework, SDK or browser vector payload.

Tests: full JS suite 170/170 PASS before milestone version stamping; 171/171 PASS after stamping and adding the integrated review/confirmation/receipt/logout test. native compilation, module XML, syntax, source/deployed browser hashes and diff checks PASS. Internal/package version advances to 0.8.0 only after this acceptance. Public identity stays Beta Release 0.2. Local-source lifecycle initially tested the changed bytes with 0.7.0 metadata; subsequent 0.8.0 load verifies the milestone stamp. This is not independent public-registry release qualification.

Representation before stamping: 253,734 JS + 38,100 CSS + 458 HTML = 292,292 bytes; +12,598 bytes over accepted v0.7 and +63,955 bytes (28.01%) over the preserved 228,337-byte baseline. Increase represents the native package adapter plus reviewed package UI, with no extra initial asset or global catalog preload. Timing/request counts were not remeasured.

Debt: package update unqualified; arbitrary/third-party package mutation unqualified; ordinary operator policy not qualified. Authority endpoint's preliminary checks cannot certify every package lifecycle hook; IRIS still enforces all actual accesses under the caller. Safe demo remains visibly synthetic and review-only. Bonus eligibility/awards unconfirmed. Vector, semantic retrieval, AI and derived product storage remain the next gate.

V0_8_ACCEPTED

## v0.9 exact gate checkpoint — incomplete

| Acceptance criterion | Evidence | Status |
|---|---|---|
| Dedicated package-owned derived/rebuildable store; no authoritative state mirror | Resource, namespace/database, ownership marker, collision and foreign-data refusal; actual package uninstall/reinstall and controlled failed Configure cleanup | PASS at Docker qualification scope |
| Real IRIS Vector schema, bounded records/query, source references, drop/rebuild | VECTOR(DOUBLE,16), HNSW cosine schema; synthetic native similarity fixtures and actual fixed-log/Python pipeline; empty rebuild after uninstall | PASS at tested bounded scope; scale unverified |
| Compact semantic navigation over selected domains | Connected Edge fixed-log finding search, exact observation ref and current-source navigation | PARTIAL: fixed-log findings only |
| Capability-aware morphing across identity/authority/provider/context/width/relevance | Existing projection remains; new Edge SUPPORTED → DENIED after grant revocation, logout cleared state | PARTIAL: complete new intelligence projection not qualified |
| Provider-neutral explanation/proposal; trusted server OperationPlan reconstruction, normal confirmation/executor/read-back/receipt | Deterministic compact-context explanation and strictly observed read proposal pass tests/Edge. Existing v0.6–v0.8 generic executor preserved | INCOMPLETE: mutation candidate reconstruction/bridge absent; read proposal is not a substitute |
| Behavioral correctness and representation sanity | 184/184 suite, syntax/XML/diff, compilation/lifecycle; 302,075 browser bytes, +9,783 over v0.8 | PASS for this slice; timing/heap not remeasured |

No v0.9 acceptance, version stamp, Main merge, tag or release. The next architectural boundary is server-owned candidate-intent reconstruction integrated with the existing planner/executor, without introducing another safety engine. Source details and independent qualification are in [the retrieval record](DERIVED_SEARCH_QUALIFICATION.md).
