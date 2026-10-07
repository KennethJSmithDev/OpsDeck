# Guided contextual learning — Issue #10

## Starting identity and boundary

Accepted content substrate: `2624376dd6cdf0402e152ed62dc59766524f5eae`, tree `15ff269d7227e60b7dd584e54a7fc11b9586b299`. Fetched main: `8a808f6f14385eef7ecdd3046caf8834598ad204`. Remote feature matches accepted commit. PR #11 and Issue #10 open. Child branch: `feature/guided-contextual-learning`. No merge, push, deployment, packaging or IRIS mutation is authorized for this milestone.

## Checkpoint 1: source inventory before generalization

The 26 concepts, route mappings, snippet metadata/loading/text download and responsive disclosures already belong to `public/app.js` / `public/styles.css`. Demo supplies data, persona and provenance; it does not own learning. Definitions remain unchanged.

| Workspace | Actual objects/fields and interactions | Existing reference coverage | Missing point-of-use teaching |
| --- | --- | --- | --- |
| Overview | Server identity/account/namespaces/privilege flags; refresh and second application-list read | namespace, %SYS | Orientation; namespace/visible authority; scope of repeated read |
| Applications | Web application Namespace, Enabled, Type, Resource, Authentication, Dispatch class; authoritative detail; separate REST discovery; compare targets; availability rehearsal/workflow; exact confirmation and receipt | webapp, namespace, REST, read-back | Field help; meaning/limits of enable/disable; plan/forecast and outcome boundaries |
| Packages (Applications tab) | Installed IPM registration, namespace/version; repository offering/version comparison; pinned install/remove rehearsal and inventory read-back | IPM | Installed versus offered; install/remove effects, plan review and outcome |
| Access | User/role/resource metadata; user detail/direct roles; role detail/direct grants/holders; resource public permission; second detail reads | user, role, resource, access | Selected object/field help; direct relationships versus effective authority; read/denial explanations |
| Security | Wallet collection/X.509/OAuth metadata; source read and refusal; no secret display | wallet, X.509, OAuth, access | Orientation and selected-source meaning; visibility versus authority; denied versus unavailable |
| Tasks | Definition Name/Type/Namespace/Suspended/LastFinished/NextScheduled; detail/read-back; Job Center accepted identity/status/result | task, namespace, job, read-back | Definition versus execution; schedule fields; accepted/running/completed versus independently verified |
| System | Usage counters; process Pid/Job/Nspace/Device/State; database Directory/Resource/Status; device identity; About runtime context | namespace, database, process, usage, device | Selected object/field meaning and observation scope |
| Logs | Audit status/events/bounded async query; fixed logs/rotations; Python interpretation; task history; journal inventory; explicit stateful alert batch | logs, audit, diagnostics, history, journal, access | Source scope; stateful read effect; accepted query versus finished result; denied/unavailable/empty/truncated distinctions |
| Evidence | Current-session plans/confirmations/receipts/refusals; filters/exports; derived graph/search; candidate-intent rehearsal | evidence, certainty, read-back | Receipt type and scoped verification versus observation/inference; lifecycle explanation at result |

Classification: reference concepts **ALREADY TAUGHT**; all primary workspace orientation **NEEDS WORKSPACE ORIENTATION**; selected domain fields **NEEDS INLINE CONCEPT HELP**; existing read/rehearsal/confirmation actions **NEEDS ACTION TEACHING**; native operation/job/source outcomes **NEEDS STATE/TRANSITION TEACHING**. Search/filter/export/navigation/theme controls are **ORDINARY UI — NO TEACHING NEEDED**. Unreturned/unknown fields are **UNVERIFIED**, not assigned invented meanings. No new operations or provider fields.

Ownership traced through `applicationsView`, `webAppOperationPanel`, `planReview`, `workflowPanel`, `packagesWorkspaceView`, `sourcePanelBody`, selected-detail helpers, `providerDomainView`, `jobCenterPanel`, `auditQueryPanel`, `evidenceView`; truth remains in their existing provider/state/Evidence paths.

## Checkpoint 2: Applications vertical slice

Before generalizing: optional Learning control → Applications orientation → selected application → namespace/authentication/resource/dispatch help → enable/disable action → rehearsal with zero PUTs → REVIEW_REQUIRED / forecast → Observe Only blocks confirmation → existing exact-confirmation dialog → one existing dispatch → authoritative fixture read-back → VERIFIED explanation → existing Session Ledger receipt.

Focused integration passed 39/39 after the first slice. Learning OFF/ON make identical requests and preserve confirmation/receipt Evidence. Browser used existing `preview-operation-fixture.mjs`: native `/opsdeck` rendering, `SyntheticUX`, disposable in-memory data, explicitly **NO IRIS CONNECTION**. This proves native UI integration, not new native IRIS execution qualification.

The first 320px check found expanded field text confined to the inspector label column. Owner correction: an open teaching field and adjacent value span the detail grid's full row. Recheck: document client/scroll width 305/305; explanation width 243px. Controls remain progressive disclosures, with a 44px minimum target and contextual accessible name.

Screenshots retained outside the repository at `%TEMP%/opsdeck-guided-20261007/`: initial desktop action/result and repaired 320px field explanation. Generalization starts only after this slice passes.

## Final qualification

**PASS within the mapped product teaching scope.** This receipt does not claim to teach all IRIS behavior or qualify new native mutations.

### Ownership and representation

One product renderer resolves stable IDs through the unchanged 26-concept catalogue, plus 10 workspace orientation records, 13 action records, 17 state records and 5 field-specific records. The 45 new records explain different boundaries without owning operational state. Explicit mappings: 10 workspace contexts, 48 fields, 23 sources and 7 existing-state aliases (88 mapping entries); four action IDs are the existing qualified web-application/IPM operation IDs. Unknown fields/sources/states produce no empty controls.

The optional header **Learning ON/OFF** button uses `aria-pressed`; one boolean is initialized from browser `opsdeck.learning=on` and persisted as `on`/`off`. Storage failure while writing leaves tab state usable. No server persistence, module, request or background polling is added. Teaching cannot grant authority, change provider data, override Observe Only or confirm a plan.

OFF adds only the mode button (one element and its text) and produces no teaching cards or helper DOM. Existing concepts/examples remain available. ON renders one brief orientation with a collapsed walkthrough, then neutral native `details` disclosures at mapped boundaries. Expanded field help and its adjacent value span their owning inspector grid; collapsed field controls say **Help** with the full field name in their accessible label. No new animation is introduced; there is no reduced-motion exception. Warning, authority and evidence styling remain distinct.

### Coverage after the proven slice

| Context | Point-of-use coverage added |
| --- | --- |
| Overview | Orientation; namespaces/privileges; observation versus authority |
| Applications | Six selected application fields; authoritative-detail read; compare/workflow meanings; exact enable/disable action; rehearsal/forecast; operation result/read-back |
| Packages | Separate orientation; installed registration versus repository offering; version/repository help; existing install/remove plan and outcome |
| Access | User/role/resource source help; namespace/enabled/public permission; direct grants; detail comparison |
| Security | Selected wallet/X.509/OAuth source help; metadata versus secrets; denial/unavailability |
| Tasks | Task definition/type/namespace; suspended scheduling; intended next run versus last reported finish; task detail comparison; Job Center acceptance/running/completion distinction |
| System / About | Separate orientation; usage/source scope; process/database/device identities and namespace/resource fields; product/runtime identity separation |
| Logs | Fixed/source-specific concepts; bounded read; empty/truncated/denied/unavailable; stateful alerts; bounded async audit action and result |
| Evidence | Ledger orientation; record kind; operation receipt outcome versus read comparison; refusal state; certainty; candidate intent and derived-search limits |

The plan-review explanation includes a static ordered lifecycle: request sent → accepted is not completed → completed is not independently verified → authoritative state read again → expected state compared under operation policy. It explicitly says providers may not report every intermediate step. IN_FLIGHT does not fabricate separate acceptance/completion observations. VERIFIED teaching applies to operation receipts; verified read observations receive comparison teaching instead. DENIED remains distinct from UNAVAILABLE, visible from authorized, and installed from offered.

### Tests and browser evidence

- Focused/native integration: **43/43 PASS** (36 preserved + 7 new).
- Full `npm test`: **270/270 PASS**, zero failures/skips; final run approximately 15.9s.
- `node --check public/app.js`, working/staged `git diff --check`: **PASS**.
- Tests cover native/demo catalogue equivalence, all primary workspace mappings, valid source/field/operation IDs, ON/OFF persistence and compactness, unmapped suppression, lifecycle distinctions, source refusal/empty states, Evidence kind, immutable operational request/Evidence behavior, and existing concepts/snippets/dialogs/packages/workflows/intelligence.
- Applications OFF/ON exercise the same existing fixture operation and produce identical request sequences and confirmation/receipt Evidence. Rehearsal sends no PUT; the executor dispatches only after its existing exact confirmation. Observe Only blocks confirmation.
- Browser native mode: existing loopback `preview-operation-fixture.mjs`, `/opsdeck/index.html`, `SyntheticUX`, explicitly synthetic in-memory data. Browser demonstrated rehearsal, forecast, exact confirmation, authoritative **fixture** read-back, VERIFIED explanation and existing Session Ledger receipt. No real IRIS endpoint was contacted or state mutated.
- Safe Demo: existing `preview.mjs`, same product assets/teaching; Operations persona retained. Restricted User preserved its known identity and DENIED inventory without fixture substitution. Learning preference survived normal demo reload. Provenance/persona/provider source files unchanged.
- At **1440 / 768 / 390 / 320**, inspected OFF/ON, orientation, concepts, selected field help, action teaching, selected inert snippet text/download, Command and FX Studio. Native fixture additionally inspected rehearsal/state and final VERIFIED view. Final Tasks suspension/completion and Evidence checks reran after their content changes; final field polish reran at every width in both renderers.
- Every recorded final document check had `scrollWidth === clientWidth`: 1425/1425, 753/753, 375/375 and 305/305 respectively (15px scrollbar). No overflow masking was added. Expanded help is inline in its owning grid; existing constrained reference disclosures remain full-row/bounded.
- Keyboard Enter opened a walkthrough; Space closed it. Focus remained on `SUMMARY` with a visible solid outline. Command search and Escape worked. Teaching targets have 44px minimum height; final narrow collapsed field target measured 75×44px. No hover-only interaction or teaching modal.

Browser screenshots and `browser-checks.json` are retained outside Git in `%TEMP%/opsdeck-guided-20261007/`. Final proof families use `native-final-*` and `demo-final-*`, including `native-final-320-field-polished.png`, `demo-final-320-task-field-repaired.png`, native confirmation/VERIFIED/Ledger, and four-width Command/FX captures. Exploratory captures are also retained; final families supersede initial cropped viewport experiments. Temporary browser overrides were reset and task-created tabs closed.

### Representation cost

Git-normalized UTF-8 source bytes against the accepted parent:

| Asset | Before | After | Growth |
| --- | ---: | ---: | ---: |
| `public/app.js` | 219,522 | 242,667 | +23,145 |
| `public/styles.css` | 52,308 | 54,355 | +2,047 |

The growth carries the mapped orientation/action/state explanations, field metadata and shared renderer/integration slots; it adds no runtime dependency. Rich helper payloads are absent from OFF rendering and collapsed/latent in ON rendering. As an observed example, native Evidence contained 304 elements OFF versus 336 ON (+32), with zero versus six teaching surfaces. This is not a general DOM ceiling; counts depend on selected data and bounded Evidence records. Extra teaching requests: **0**. Snippet requests/download behavior remains existing and selection-driven. No meaningful render-time benchmark is claimed.

### Authoritative content verification

New application authentication and enable/disable teaching was checked against [InterSystems Applications](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GSA_manage_applications), including Enabled, Resource Required and Allowed Authentication Methods. New task type/suspension/scheduling/history explanations were checked against [InterSystems Task Manager](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GSA_manage_taskmgr). Existing conceptual text/links retain the accepted content milestone's verification. OpsDeck authority, plan, dispatch, read-back, job and Evidence explanations derive from the actual unchanged implementation.

### Known limits and next boundary

KNOWN: shared native/demo product ownership, bounded contextual coverage and all above behavioral/visual checks. INFERRED: the point-of-use explanations should reduce prior-knowledge requirements. UNVERIFIED: comprehension by an actual novice study, fresh real-IRIS/browser execution of this presentation change, and detailed teaching of every long-tail API field/operation.

There is no mandatory wizard, new IDE or snippet execution. Fine-grained technical properties not mapped retain ordinary rendering and official reference depth rather than invented meanings. Provider intermediate states remain unobserved where existing UI reports only IN_FLIGHT. Existing desktop concepts/examples retain their popover behavior: simultaneous expansion can overlap; individual disclosures were qualified, and this milestone does not redesign that existing boundary.

Operational providers/engine, Evidence model, target/workflow/AI authority semantics, Demo provider, package/release/install files and accepted catalogue are unchanged. Unrelated untracked Docker/helper/contest paths remain untouched. Issue #10 and PR #11 are not closed or merged; no remote push/deployment/release. Next boundary is review of this local child-branch milestone, followed only by separately authorized publication or specifically identified coverage/usability follow-up.
