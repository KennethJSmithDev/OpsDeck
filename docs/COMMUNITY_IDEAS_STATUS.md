# Community ideas status

This record distinguishes Community Ideas Portal requests from adjacent product capabilities. Similarity alone is not an implementation or bonus claim.

## DPI-I-261 — Package installation from the administration portal

| Field | Status |
|---|---|
| Community status | Community Opportunity; implementation incomplete |
| Problem requested | Discover available and installed packages and install packages from the administration portal. |
| OpsDeck implementation | Live installed-package inventory and bounded exact-name configured-repository catalog projection are integrated. Package planning is a synthetic preview; package mutation is not connected to the verified executor. |
| Semantic equivalence | Inventory and catalog observations cover only discovery portions; no package installation/removal behavior is claimed. |
| Authority boundary | Existing caller authority is required. No SQL privilege or package authority was added. |
| Test | Local provider/workspace tests cover installed/available states, repository coverage, and version relationships. Live authenticated browser authority remains unqualified. |
| Representation cost | Catalog source delta was recorded in `OPSDECK_0_9_PERFORMANCE_BASELINE.md`; no global catalog preload. |
| Public demo path | Packages workspace; catalog and package operations remain explicitly scoped by their qualification state. |
| Bonus claim | Not claimed; DPI-I-261 is not complete. |

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
