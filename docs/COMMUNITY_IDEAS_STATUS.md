# Community ideas status

This record distinguishes Community Ideas Portal requests from adjacent product capabilities. Similarity alone is not an implementation or bonus claim.

## DPI-I-261 — Package installation from the administration portal

| Field | Status |
|---|---|
| Community status | Community Opportunity; requested behavior complete at the qualified Docker fixture scope. |
| Problem requested | Discover available and installed packages and install packages from the administration portal. |
| OpsDeck implementation | Live installed inventory, bounded configured-repository discovery, version relationships, reviewed install/remove plans, confirmation, shared executor, authoritative inventory read-back and Evidence receipts. |
| Semantic equivalence | Operators discover available and installed packages and install the selected package from the Packages workspace. One locally controlled package was installed and removed through this UI. |
| Authority boundary | Current IRIS caller authority; no execution identity substitution. Qualification used individually approved temporary Docker database WRITE and exact SQL grants, all revoked afterward. This does not establish ordinary-operator authority. |
| Test | Shared-engine provider/selection tests; real authenticated HTTP and Edge install/remove with VERIFIED receipts, authoritative absence and unrelated-package preservation; see VERSION_GATE_LEDGER.md. |
| Representation cost | Catalog source delta was recorded in `OPSDECK_0_9_PERFORMANCE_BASELINE.md`; no global catalog preload. |
| Public demo path | Native Applications → Packages → exact catalog lookup → reviewed plan → confirmation → Evidence. Safe-demo data remains synthetic and review-only. |
| Bonus claim | Implementation qualified at the recorded scope; bonus eligibility, award and stacking are not confirmed or claimed. |

## IRIS Management for Humans — contextual learning capability

| Field | Status |
|---|---|
| Idea ID | No Ideas Portal ID supplied or verified; this is a product capability, not an asserted portal submission. |
| Community status | Not claimed as a Community Opportunity implementation. |
| Problem requested | Give operators concise explanations of IRIS concepts and OpsDeck's authority/evidence states where those concepts appear. |
| OpsDeck implementation | A small static, collapsed help section in selected page headers explains namespaces, `%SYS`, IPM state, denial versus unavailability, read-back, asynchronous Jobs, fixed-log scope, receipts, and certainty labels. |
| Semantic equivalence | Explanations are tied to the current workspace and clarify the same source/authority/evidence semantics presented there; they do not introduce another product subsystem. |
| Authority boundary | Static escaped educational text only. No privilege, execution, or provider behavior is added. |
| Test | Render-level test checks collapsed state, route scoping, topic content, and absence of executable-content affordances. Full JavaScript suite is run at the source checkpoint. |
| Representation cost | See the latest measured source bytes in `OPSDECK_0_9_PERFORMANCE_BASELINE.md`. Help text is shipped once in the existing app module; no request or runtime dependency is added. |
| Public demo path | Any page with a supported concept displays the collapsed “IRIS concepts in this view” disclosure. |
| Bonus claim | None. |

## DPI-I-966 — Show older messages.log rotations

| Field | Status |
|---|---|
| Idea ID | DPI-I-966 |
| Community status | Not implemented; investigation only. |
| Problem requested | Observe older rotated `messages.log` files from the administration UI. |
| OpsDeck implementation | None yet. The fixed reader currently accepts only current `messages.log` and `SystemMonitor.log`. |
| Semantic equivalence | No equivalence claimed. The intended extension remains the fixed `messages.old_*` family only, read by the existing bounded reader and interpreter. |
| Authority boundary | Existing `%Admin_Operate:Use` check must apply to listing and reads. Planned enumeration uses the canonical console-log directory and `%File.FileSet` regular-file type; no caller path or recursive browsing. |
| Test | IRIS 2026.2 disposable runtime query found zero matching rotated files; it did not read log contents or change IRIS state. Product implementation/runtime qualification remains outstanding. |
| Representation cost | Not measured; no source/assets added for this idea. |
| Public demo path | None; deferred until implementation and qualification. |
| Bonus claim | Not claimed. |

## Environment identity — shell mode badge

| Field | Status |
|---|---|
| Idea ID | None; product polish only, not a Community Opportunity claim. |
| Community status | Implemented at source/test scope. |
| Problem requested | Help operators distinguish an explicitly labeled IRIS instance mode. |
| OpsDeck implementation | The shell displays only recognized `DEVELOPMENT`, `TEST`, `LIVE`, or `FAILOVER` values supplied in observed server identity; `LIVE` is labeled “LIVE / PRODUCTION”. Synthetic `DEMO` remains clearly marked. |
| Semantic equivalence | Uses IRIS `SystemMode` as the explicitly configured identity label and projects it in the existing shell. [IRIS 2026.1 Configuration Parameter documentation](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=RACS_SystemMode) defines `LIVE`, `TEST`, and `DEVELOPMENT` presentation semantics; [the `%SYSTEM.Version` reference](https://docs.intersystems.com/irisforhealthlatest/csp/documatic/%25CSP.Documatic.cls?CLASSNAME=%25SYSTEM.Version&LIBRARY=%25SYS) documents the getter and supported modes. |
| Authority boundary | No host, port, namespace, or naming inference; absent/unrecognized modes render no badge. Read-only identity projection only. |
| Test | Mapper accepts only the five supported product/demo values and rejects arbitrary labels; render tests verify observed and missing-mode behavior. Runtime presence in `/api/admin/info` remains unverified. |
| Representation cost | Measured in `OPSDECK_0_9_PERFORMANCE_BASELINE.md`; no endpoint, asset, or new request. |
| Public demo path | Existing safe demo shell shows its synthetic `DEMO` identity. |
| Bonus claim | None. |

## Code Snippets Library — read-only learning capability

| Field | Status |
|---|---|
| Idea ID | No Ideas Portal ID supplied or verified; this is a product capability, not an asserted portal submission. |
| Community status | Not claimed as a Community Opportunity implementation. |
| Problem requested | Offer reusable IRIS/ObjectScript administration and development examples in a compact library. |
| OpsDeck implementation | A collapsed catalog exposes three snippet identities. Each body is fetched only when selected and can be downloaded as plain `.txt` for editor use. |
| Semantic equivalence | The snippets are static learning text, not an execution surface; examples cover namespace identity, exception handling, and bounded HTTP GET shape. |
| Authority boundary | No ObjectScript execution, terminal, credentials, or new IRIS endpoint is introduced. HTTP example is fixed and illustrative; users must select a reviewed endpoint/TLS configuration. |
| Test | Focused render/package assertions check collapsed catalog metadata, lazy-body behavior, inert text rendering, and declared static ownership; full JS suite passes **154/154**. |
| Representation cost | Snippet bodies are separate text assets fetched on selection; no additional initial request or framework. Current source bytes are recorded in `OPSDECK_0_9_PERFORMANCE_BASELINE.md`. |
| Public demo path | Open the safe demo and expand “ObjectScript snippet library”; select an entry to load its text. |
| Bonus claim | None. |
