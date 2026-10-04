# Derived search preview qualification

Accepted product version remains **0.8.0**. This independently qualified slice is experimental integration work, not v0.9 acceptance or public release qualification.

## Ownership, authority and representation

`OpsDeck.Product.DerivedSearch` owns the closed GET `/opsdeck-api/derived-search?q=...` and POST `/opsdeck-api/derived-refresh` contracts. The existing product dispatch delegates to it. Query text is capped at 256 characters; refresh has a 1,024-byte body and accepts only the two existing fixed source identities. No caller path, SQL, vector, execution instruction or alternate user identity is accepted.

The server preserves `$USERNAME`. `%Admin_Operate:USE`, dedicated database READ and exact table SELECT are required for reads; refresh additionally requires database WRITE and exact INSERT/DELETE. Product installation grants none of these permissions to operators. Server-derived caller prefixes constrain records; they are not browser-selected. Derived data is limited to 500 records total, at most 20 bounded findings per refresh and five query results. The exact table and fixed parameterized SQL remain server-owned.

Only concept labels, identity, fingerprint and source/EvidenceRef metadata are stored. Raw logs, secrets and authoritative management state are not persisted. Source timestamp is JSON null when the source observation does not establish it. Server-local observation time is explicitly labeled. Retrieval resolves to the fixed current source for investigation; it does not reconstruct historical log bytes or prove an incident.

## Qualified observations

On OPSDECK_08_TEST_TARGET, IRIS 2026.2 Build 221U / IPM 0.10.8:

- Authenticated OpsDeckQualify without derived grants: HTTP 403, DENIED. Anonymous: HTTP 401.
- With explicitly authorized temporary database RW and exact SELECT/INSERT/DELETE: HTTP 200, SUPPORTED; an empty finding refresh indexed zero without claiming source health.
- One information-severity native console event was emitted through the official IRIS logger. It explicitly identified itself as a SYNTHETIC qualification event, no incident. The existing bounded reader/Python pipeline produced one finding; refresh stored one compact concept record.
- Query `error database` returned the exact source/ref with similarity approximately 0.7071. Connected Edge query `slow database connection` returned the same source/ref with approximately 0.866. Source time remained unobserved.
- Edge rendered deterministic local interpretation, explicitly UNVERIFIED external inference, and navigated to the current messages source. Its observed line 70 contained the synthetic event and the existing Python finding referenced that line.
- All temporary derived grants were revoked and independently read back absent. The stable fixture account/DPAPI mechanism remained unchanged. Edge then rendered DENIED/HTTP 403 and removed the earlier result/interpretation; logout returned to disconnected state.
- Actual package uninstall/reinstall rebuilt the owned schema empty. The failing-Configure qualification and correction are recorded in the storage boundary document. Unrelated `%IPM.Main` and `/csp/sys` remained present.

No host IRISTesting access or mutation. No password reset, replacement identity, repository change or public permission. Native synthetic/error/history entries remain as evidence; cleanup does not erase operational logs.

## Interpretation boundary and acceptance gap

`semantic-search.js` is loaded on explicit action. It validates bounded provider identity/results, builds compact context from canonical ProductIdentity and supports a provider-neutral interpretation interface. The deterministic provider may explain and propose an observed-source read. Unknown targets, extra executable fields and mutation proposals are rejected. No model credential, arbitrary execution or model-declared success exists.

**The full v0.9 gate is not PASS:** the required AI candidate mutation intent → server-reconstructed trusted OperationPlan → existing confirmation/executor/read-back/receipt chain is not implemented or qualified. The current accepted planner is browser-owned; adding a server reconstruction boundary requires explicit architectural implementation and qualification. The read-only interpretation preview does not substitute for that chain. Semantic retrieval currently covers fixed-log findings; broader selected-domain retrieval and the complete morphing acceptance remain incomplete. Concurrent refresh/lifecycle and index-plan selection at scale remain unqualified.

## Tests and cost

Full JavaScript suite **184/184 PASS**, zero failures/skips. JavaScript syntax, module XML parsing and `git diff --check` PASS. Native compilation and actual package Configure/uninstall/reinstall passed for deployed product classes. Tests cover identity/bounds, null timestamp, no vectors in browser projection, distinct states, compact context, malicious intent rejection and the nontransactional physical-lifecycle contract.

Shipped JS/CSS/HTML: **302,075 bytes** (JS 263,504; CSS 38,100; HTML 471). All manifest FileCopy assets including latent snippet text: 302,813 bytes. Compared with accepted v0.8 292,292: +9,783 bytes (3.35%). Compared with preserved 228,337 baseline: +73,738 bytes (32.29%). The lazy semantic module is 4,421 bytes. No new initial import, frontend framework, AI SDK, browser vector index or global rich-state preload. Current request count, cold/warm time, navigation timing, heap and Docker readiness were not remeasured; earlier baseline evidence remains unchanged.

KNOWN: runtime/schema ownership, tested caller HTTP/Edge results, exact grant cleanup and above local quality gates. INFERRED: compact concept overlap can aid investigation. UNVERIFIED: full v0.9 intelligence chain, ordinary operator deployment policy, cross-revision upgrade, concurrency/scale and live external inference.
