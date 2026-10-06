# Beginner contextual learning qualification — 2026-10-06

## State and ownership

Fetched `origin/main`: `8a808f6f14385eef7ecdd3046caf8834598ad204` (includes PR #9 examples discoverability and responsive repair). Started from local `c4d0e97f1f288ed5c9f16c23cad26b2f30a8e063`, which adds native learning regression coverage. Work branch: `feature/beginner-contextual-learning`.

KNOWN: `public/app.js` owns `IRIS_CONCEPTS`, `CONCEPTS_BY_ROUTE`, `pageHeader`, snippet metadata/loading/download. `public/styles.css` owns shared disclosure containment. Learning is not evaluator-gated. `demo/index.html` and `demo/demo-provider.js` own the safety shell, personas and sanitized provider, and are unchanged. Snippet text assets and loading/download behavior are unchanged.

ROOT CAUSE: the original nine entries often started with observation/safety qualifications before establishing what the IRIS object was. Several workspace mappings described only failure states, despite exposing substantial IRIS configuration inventories.

INFERRED: short mental models followed by an explanation of the actual workspace observation should address the evaluator's beginner-teaching concern. This is an editorial improvement, not evidence of improved beginner task completion; no new evaluator feedback or usability study was collected.

UNVERIFIED: live connected IRIS browser rendering was not exercised in this content milestone. Native-mode rendering is exercised by the existing VM integration harness; browser qualification uses the existing credential-free local Safe Demo preview. No server state was changed.

## Coverage and UI trace

All original entries were rewritten. Added entries follow the sources selected by `domainSources`, `READ_ONLY_SOURCES`, provider safe fields and the actual workspace panels.

| Workspace | Before | After | Why relevant |
|---|---|---|---|
| Overview | Namespace, %SYS (2) | Same, rewritten (2) | Identity and namespace-scoped application observations |
| Applications / web apps | Namespace, read-back (2) | Web application, Namespace, REST service/dispatch class, read-back (4) | Web-app definitions and v1/v2 REST discovery/spec inspection |
| Applications / Packages | IPM state (1) | Same, rewritten (1) | Local registrations versus exact-name repository search |
| Access | DENIED/UNAVAILABLE (1) | User, Role, Resource/permission, DENIED/UNAVAILABLE (4) | Users, roles, resources and direct relationship inspectors |
| Security | DENIED/UNAVAILABLE (1) | Wallet collection, X.509 credential, OAuth servers, DENIED/UNAVAILABLE (4) | Collection/credential/OAuth configuration metadata sources |
| Tasks | Async job, read-back (2) | Scheduled task, Namespace, Async job, read-back (4) | Task definitions and separate session Job Center |
| System providers | Namespace (1) | Namespace, Database, Process, Usage counters, Device (5) | Local database directories, process snapshot, usage and device sources |
| System / About | Namespace (1) | Namespace, rewritten (1) | Technical namespace context; no provider inventories here |
| Logs | Fixed observation, DENIED/UNAVAILABLE (2) | Fixed observation, Auditing, Diagnostics/alerts, Task history, Journal file, DENIED/UNAVAILABLE (6) | Audit status/events/query, named logs/rotations, task history, journal inventory and alert feed |
| Evidence | Receipt, certainty, read-back (3) | Same, rewritten (3) | Session Ledger and bounded verification projections |

The catalogue contains 26 entries, up from 9 (+17). Mapped counts come from IDs, not presentation constants. Unknown routes have no concept control. About retains its narrower namespace context instead of inheriting the expanded System-provider mapping.

## Authoritative verification

The catalogue uses short original explanations, not copied manual passages. IRIS concepts have optional HTTPS links to official documentation; OpsDeck-only verification/receipt/failure-state concepts do not imply that those product semantics are official IRIS features.

- [Namespaces and databases, including %SYS](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GORIENT_enviro)
- [Web applications](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GSA_manage_applications)
- [REST services](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GREST)
- [IPM](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=AIPM)
- [Users, roles, resources and permissions](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=AAUTHZ)
- [Secure Wallet](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=ROARS_secrets_mgmt)
- [X.509 credential configuration](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GSOAPSEC_common)
- [OAuth resource server and authorization-server definition](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=ROARS_iam_oauth_rserv_demo)
- [Task Manager and history](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GSA_manage_taskmgr)
- [Monitoring and process/system observations](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GCM_dashboard)
- [IRIS input/output devices](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GIOD_intro)
- [Auditing](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=AAUDIT)
- [Journaling](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GCDI_journal)

In particular, %SYS now explains server administration versus ordinary application namespaces before reminding the reader that observed context does not grant permission.

## Qualification

- Focused native/evaluator integration: 36/36 PASS.
- Full regression: 263/263 PASS, no skipped tests.
- JavaScript syntax and `git diff --check`: PASS.
- Native and demo headers expose identical learning content/counts across all mapped workspaces. Tests cover collapsed defaults, one learning control, beginner mental models, official link keys/HTTPS origin/new-tab protection, unmapped routes, About scope, and existing snippet selection/loading/text-only download.
- Browser: existing `scripts/preview.mjs`, loopback only. Logs (largest disclosure) inspected collapsed/expanded at 1440×1000, 768×1000, 390×844 and 320×844. Document clientWidth/scrollWidth respectively: 1425/1425, 753/753, 375/375, 305/305 (15px scrollbar). Expanded list stays inside the document and scrolls vertically; no Evaluator badge intersection. Desktop list right edge 857px versus badge left edge 1301px. At 768px list bottom 797px versus badge top 894px; at 390/320px badge flows below the list.
- Browser also checked expanded System content, the existing namespace snippet text/Download .txt, Command opening/closing, and FX Studio opening. No snippet execution or operational dispatch.
- Screenshots preserved locally outside the repository at `%TEMP%/opsdeck-learning-20261006/`: desktop, tablet, 390 and 320 collapsed/expanded. Browser evidence represents the local source preview, not GitHub Pages deployment.

## Representation cost and limits

`app.js`: 212,228 → 219,522 bytes (+7,294). `styles.css`: 52,113 → 52,308 bytes (+195). Catalogue/mapping source: 2,335 → 9,221 bytes. No added requests until a user follows a documentation link; existing snippet requests remain selection-driven. Only the active workspace's concept list is rendered, with a maximum six list items; text remains latent behind the existing native `<details>`. No new global state or duplicated catalogue. Concept list typography is 12px and its height is bounded by `min(440px,60dvh)`; existing container anchoring is retained. These CSS rules target concepts, not snippet content.

Scoped claim: OpsDeck now teaches the primary IRIS concepts behind its fixed workspace source families using beginner contextual explanations and official links. This is not exhaustive coverage of every field or generic SysAdmin API operation. Remaining detail includes individual authentication options, globals/routines/counter meanings, database mirroring/encryption properties, OAuth token flows, and deeper Vector Search/Embedded Python concepts. They require further bounded content mapping before a global completeness claim. No educational-content effectiveness metric is claimed.

No push, merge, Pages deployment, package rebuild, release change, IRIS configuration change or IRISTesting change. Unrelated untracked Docker/diagnostic/contest paths were left intact.
