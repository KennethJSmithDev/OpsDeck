# OpsDeck qualification status

## Current integration snapshot — 2026-10-03

- Branch at the start of the 2026-10-03 authenticated HTTP qualification: `integration/opsdeck-1.0-20261002`, pushed tip `65fa4a250c120b43998bb11b7734c6e83553e5c7`. The pushed follow-on checkpoints are recorded in Git; see [the authenticated catalog boundary record](OPSDECK_0_9_AUTHENTICATED_HTTP_BOUNDARY_20261003.md) for this qualification's Docker-only security changes and exact outcomes.
- Internal/package version is `0.7.0` after v0.7 acceptance; public identity remains Beta Release 0.2. See [the exact version gate ledger](VERSION_GATE_LEDGER.md).
- Current local JavaScript suite at the pushed source checkpoint: **156/156 PASS**. Browser-rendered catalog tests cover `INSTALLED_NEWER` without an update recommendation, simulated upstream HTTP 403 as `DENIED`, and partial configured-repository coverage with rows retained. Operation-engine tests exercise the provider-neutral executor using a deterministic provider. Syntax checks pass locally.
- The catalog comparison distinguishes `INSTALLED_CURRENT`, `INSTALLED_OLDER`, `INSTALLED_NEWER`, `AVAILABLE_ONLY`, `INSTALLED_STATE_UNKNOWN`, and `INSTALLED_VERSION_UNCOMPARABLE`; focused tests cover those states. In the connected live browser, both installed and available versions were shown accurately. The older installed UI's generic `INSTALLED` badge is presentation debt: it is true, does not imply an update, and does not contradict the displayed `0.2.2` installed / `0.2.0` available values. The missing explicit `INSTALLED_NEWER` label is not a written v0.5 acceptance requirement.
- The disposable `OPSDECK_08_TEST_TARGET` is running at loopback ports 51972 and 52774. Its installed `opsdeck@0.2.2` package was not updated. Authenticated HTTP and connected Edge identify `OpsDeckQualify`; the Packages workspace rendered live installed rows and the exact catalog result (`opsdeck@0.2.0`, `registry`, 1/1 configured repositories reachable) beside installed `opsdeck@0.2.2`. This is live browser evidence for the installed package version. A read-only hash comparison confirms Docker's `app.js` differs from current `public/app.js`; source-only richer label behavior is not claimed as runtime-observed.
- The authenticated catalog required the existing `%DB_IRISSYS:READ` and `%DB_%DEFAULT:READ`, plus `%Admin_Secure:USE` for IPM's SSL configuration API and SQL EXECUTE on `%IPM_Repo.Definition_SortOrder`. These changes are limited to the disposable qualification identity/role. `%Admin_Secure:USE` is not a suitable default operator grant, so live catalog qualification currently applies only at this elevated fixture scope. Edge was visibly connected as `OpsDeckQualify`; the exact mechanism that established the session is not attributed to password-manager autofill.
- v0.6 is **ACCEPTED — PASS**: the shared executor verified one real reversible disabled web-app fixture operation, emitted live receipts consumed by Evidence, and proved cleanup and unchanged sibling application definitions. Scope is the existing Docker-only qualification identity and exact fixture; see [the gate ledger](VERSION_GATE_LEDGER.md).
- ObjectScript Quality is **UNAVAILABLE UNDER ACCEPTABLE TRUST BOUNDARY** because the prescribed remote hook failed trust review; it is not a mainline-blocking OpsDeck acceptance gate. The workflow was not added or executed. Ordinary product quality gates remain required; see [the gate record](OBJECTSCRIPT_QUALITY_GATE_20261003.md).
- A connected local safe-demo browser smoke rendered Overview, Applications, Logs with the deterministic synthetic Embedded Python finding, Tasks and its synthetic Job Center entry, Packages with the synthetic `opsdeck 0.2.1` versus `0.2.0` `INSTALLED NEWER` example, and Evidence. The demo banner identified sanitized sample data/no IRIS connection; the Packages screen explicitly said it queried no registry or installed IPM inventory. This is static/demo rendering evidence only and does not qualify the live authenticated provider. The loopback server and temporary staged bundle were stopped and removed.
- A separate local IPM lifecycle fixture created and removed only its disposable `OPSDECK_STORAGE_FIXTURE` namespace/database; its marker row, package registration, class, and exact empty database/staging paths were cleaned and read back absent. `opsdeck@0.2.2` and `OpsDeck.Product.FixedLogREST` remained present. No credentials, privileges, repositories, or OpsDeck package state changed. No merge, tag, or release was made.

### Evidence-gated frontier

| Milestone | Current status | Remaining acceptance evidence |
|---|---|---|
| 0.5 operational visibility | **ACCEPTED — PASS** | All explicit v0.5 criteria passed at their qualified scope. See the v0.5 acceptance record below. The generic `INSTALLED` badge is presentation debt, not a contradictory or false state. |
| 0.6 verified operations | **ACCEPTED — PASS** | Exact fixture create/remove, shared executor, live receipt/Evidence consumption, cleanup and sibling preservation pass. |
| 0.7 operational Evidence | **NOT ACCEPTED** | A real OperationReceipt consumed and rendered with its evidence-backed findings. |
| 0.8 package operations | **NOT ACCEPTED** | Same-executor package install/remove, DPI-I-261 completion, and unrelated-package preservation. |
| 0.9 intelligent operations | **NOT ACCEPTED** | Operational core plus owned derived storage, real Vector Search, semantic retrieval, AI boundary, morphing/responsive browser qualification, and full product lifecycle. |

The live installed UI demonstrated the catalog behavior and correct version facts at its installed package scope. The current-source explicit relationship label remains source/test-qualified only.

### v0.5 acceptance record — PASS

- **Objective:** complete operational visibility through bounded live providers, Packages discovery, Jobs/Evidence projection, and capability-aware presentation.
- **Source implemented:** required read domains, fixed-log integration, Embedded Python findings, shared Job Center, Evidence view, installed IPM inventory, exact-name available catalog provider, explicit coverage/authority states, and safe deterministic demo are present. The 156-test JavaScript suite passes; all JavaScript/ES module syntax checks and `module.xml` parsing pass.
- **Runtime qualified:** connected Edge as `OpsDeckQualify` on `OPSDECK_08_TEST_TARGET` rendered live Overview, Applications, Logs/findings, Tasks/Job Center, Packages installed inventory/catalog, and Evidence. Catalog returned `opsdeck@0.2.0` from `registry`, with 1/1 configured repositories reachable; installed inventory showed `opsdeck@0.2.2`. The separate versions and `INSTALLED` state are accurate; no downgrade/update recommendation was shown. The live role's authority is Docker-fixture-only and includes `%Admin_Secure:USE`; this does not qualify ordinary operator access.
- **Publicly demonstrable:** safe demo presents synthetic packages, Jobs, Evidence, and findings with explicit synthetic labeling; live Docker smoke is qualification evidence, not a public release claim.
- **Representation cost:** current source measurement is 260,184 uncompressed browser bytes (222,152 JS, 37,584 CSS, 448 HTML), eight native initial requests, +31,847 bytes (+13.94%) versus the preserved 228,337-byte baseline. The +6,476-byte increase since the previous measurement is the bounded rotated-message-log observation path in the existing app/provider modules; it adds no asset or initial request. No framework or global catalog preload was introduced.
- **Presentation debt:** the Docker-installed `0.2.2` renderer shows the truthful generic `INSTALLED` badge, with both versions alongside it. It does not display the more informative `INSTALLED_NEWER` label present in newer source. This is not a v0.5 acceptance failure because the written gate requires correct version semantics and no false update recommendation, not that exact badge string.
- **Remaining gaps:** live web-app mutation, OperationReceipt, package install/remove, and current-source explicit relationship-label runtime observation remain for later gates. v0.6 is not yet accepted.
- **Release boundary:** `0.5.0` is prepared on the integration branch only. No main merge, tag, publication, or public release occurred.

**Current public release:** `v0.2.0`  
**Release commit:** `23215459096cb47d255c45b1e6e86687f3d8e93a`  
**Public release status:** unchanged; no newer public release or registry availability is claimed.

This document separates public release, accepted local qualification, and source-only development. Source branches do not inherit installed or live qualification.

## Accepted local qualification

### 0.2.1 distribution fidelity

- Corrected candidate: `50205ed79dbd80a768d67c2455d514c09bbc5999`
- Branch: `fix/0.2.1-responsive-inventory-reflow`
- Status: **ACCEPTED locally**
- Fresh Windows checkout / Git-blob parity: PASS
- Controlled lifecycle: PASS
- Regression suite: 82/82 PASS
- Installed-native responsive qualification: PASS
- 48 route-at-width observations and no-reload responsive transition: PASS

The failed responsive specimen `69e1215febab5008fc0542d96c0e921f638b4502` remains historical evidence. The accepted local candidate has not replaced the public `v0.2.0` release.

### 0.3 capability-aware morphing UI — first bounded slice

- Commit: `42e9f60694cc33826748e69ef8d289aac0604a6d`
- Branch: `feature/capability-aware-morphing-ui`
- Status: **FIRST BOUNDED SLICE ACCEPTED**, not full 0.3 completion
- Local regressions: 88/88 PASS
- Lifecycle and installed-native browser/responsive qualification: PASS

The accepted slice projects navigation and contextual priority from observed provider evidence without treating presentation as authority.

## Current development frontier — 2026-10-02

### Contest 0.8 continuation — 2026-10-03

| Milestone | Branch / tip | Evidence classification |
|---|---|---|
| Shared session Job Center source slice | `integration/opsdeck-1-20261002` / prior checkpoint | **SOURCE IMPLEMENTED / LOCAL TESTED 136/136 / IRIS MUTATING JOB FLOW UNQUALIFIED**. The accepted bounded audit async read is projected into one bounded session Job collection, Tasks Job Center, and session Evidence. Ambiguity is explicit and never retried. |

### Integrated native package lifecycle — 2026-10-03

The exact local-source 0.2.1 manifest was installed, uninstalled, and reinstalled in the isolated `OPSDECK_08_TEST_TARGET` (IRIS 2026.2 Build 221U, IPM 0.10.8). `OpsDeck.Product.FixedLogREST`, both OpsDeck web applications, and copied static assets were observed present after install, absent after uninstall, and restored after reinstall. During the uninstall window, an independent disposable sentinel package/class/web application and `/csp/sys` remained available; the sentinel was then uninstalled and its exact temporary CSP directory removed. Anonymous `/opsdeck-api/packages` returned 401 while installed and 404 while uninstalled. See [the detailed lifecycle record](OPSDECK_0_9_DISPOSABLE_LIFECYCLE_20261003.md).

This qualifies package ownership for the exact local-source load and test target only. It does not qualify public-registry `zpm install`, authenticated browser-provider behavior in this target, other namespace/image combinations, or a production CSP directory provisioning path. The earlier package-load permission failure and narrowly scoped target setup are recorded in [the EGEHAR record](OPSDECK_0_9_EGEHAR_20261003.md). The OpsDeck `0.2.1` source's current local regression suite passes 141/141.

For this continuation, Docker Desktop 4.93.0 / Engine 29.8.1 (Linux/amd64, WSL2) was available. An isolated `OPSDECK_08_TEST_TARGET` used the official `intersystemsdc/iris-community:2026.2-zpm` image (`sha256:68bc1d43c98ca816f2e98a185edc1250bebb6b763f8159da35c8543b09c0df70`) bound only to loopback ports 51972 and 52774. The vendor entrypoint's normal after-start wrapper failed with its `dbapi.connect` wrapper error under `ISC_DATA_DIRECTORY`; IRIS started and qualified with the vendor image's `/iris-main` entrypoint. This does not qualify the wrapper path.

The actual integration source was loaded and compiled with `zpm load /tmp/opsdeck-package`. `OpsDeck.Product.LogInterpreter` compiled and bounded 25 error fixtures to 20 findings, setting `findingsTruncated`. Authenticated `/opsdeck-api/packages`, `/messages`, and `/system-monitor` returned bounded results; anonymous package API access returned 401. The static `/opsdeck/index.html` and `/opsdeck/app.js` served successfully. The package lifecycle test installed a separate sentinel module, uninstalled OpsDeck, confirmed OpsDeck routes returned 404 while the sentinel static app and built-in system portal returned 200, then reloaded OpsDeck and confirmed its routes returned 200 and package inventory included `opsdeck@0.2.1` and the sentinel. This proves ownership only for this exact disposable runtime and local `zpm load` source path; it does not qualify public-registry `zpm install`.

At the earlier 0.8 checkpoint, the target container, named data volume, pulled image, and temporary fixture files were removed after qualification. The Docker target was later recreated for the current 0.9 continuation. That checkpoint selected session-scoped authoritative Evidence, which remains valid. Its Vector Search deferral is superseded by the current 0.9 objective: Vector Search is required for a separate, rebuildable derived index; product-owned storage is not yet implemented.

All entries below are local source work. They have not been installed into IRISTesting and do not qualify live execution or persistence.

| Milestone | Local branch / commit | Evidence classification |
|---|---|---|
| 0.4 Docker / clean-room | Current integration source | **DISPOSABLE TARGET LIFECYCLE QUALIFIED FOR LOCAL SOURCE LOAD**. The isolated 2026.2 Docker target compiled and served the product, passed uninstall/sentinel-survival/reinstall checks, and was removed. Public registry install and normal vendor wrapper startup remain unqualified. |
| 0.8 Embedded Python fixed-log interpretation | Current integration source | **SOURCE IMPLEMENTED / IRIS COMPILED / BOUNDED FIXTURE AND FIXED-ROUTE RUNTIME QUALIFIED**. Python stdlib analysis consumes only the existing fixed-source projection, returns capped rule findings without raw log values, and is attached to the existing `/messages` and `/system-monitor` responses. No Python authority or generic path/execution capability is added. |
| 0.5 audit async | `feature/bounded-read-provider-coverage-0.5` / `6f24069cb6d15799e929519cdc2de504941d667c` | Bounded source slice; maxRows=1, strict same-origin/path validation, no redirect following. Complete official result schema remains UNVERIFIED. |
| 0.5 fixed logs | `feature/fixed-log-reader-source-0.5` / `90108d61d33154ed497f19f0e3516353992c7c57` | **SOURCE PROTOTYPE / IRIS COMPILE AND PRIVILEGE CONTRACT UNQUALIFIED**. Provider-boundary tests pass. ObjectScript runtime byte accounting and denied-versus-unavailable classification require IRIS-side proof. Not packaged or installed. |
| 0.6 operation engine | `feature/verified-operation-engine-0.6` / `57b5b022641e7a24d178bc9389a2dc229944a512` | **SOURCE-READY / FIXTURE-QUALIFIED / LIVE-EXECUTOR-UNQUALIFIED**. Deterministic risk policy, explicit authority evidence, stale-plan checks, cancellation, denial/unavailable/ambiguous states, no ambiguous retry, and read-back-gated receipts. |
| 0.7 Evidence Center | `feature/durable-evidence-center-0.7` / `88f22c9537df11d1340380a446df74c146f2b9be` | **EVIDENCE-CONTRACT/UI SOURCE-READY / PERSISTENCE BACKEND UNQUALIFIED**. Bounded redacted session evidence, filtering, and JSON/Markdown export; no durable IRIS provider. |
| 0.8 Applications → Packages | `feature/applications-packages-0.8` / `ed490e94af92fce52c2d564cc95377a9f3baee38` | **WORKSPACE SOURCE-READY / PLANNING-FIXTURE FLOW QUALIFIED / LIVE IPM EXECUTION UNQUALIFIED**. Package rows are visibly synthetic; plans are HIGH risk and confirmation remains disabled. |

Local regression results at those source commits: 0.6 **95/95**, 0.7 **100/100**, and 0.8 **104/104**. The current integrated branch passes **141/141** tests, JavaScript syntax checks, module XML parsing, and `git diff --check`. Tests prove the local contracts and fixture behavior only.

## Unverified / deferred boundaries

- The exact integrated lifecycle outside this one disposable container, public-registry installation, and normal vendor entrypoint wrapper path.
- Audit async result schema beyond the observed bounded empty result.
- Cross-identity fixed-log denial mapping and minimum required privileges.
- A disposable fixture for any live 0.6 mutation and a real qualified write executor.
- A persistent, redacted IRIS-backed 0.7 Evidence provider.
- Read-only IPM available-catalog discovery, live package operation executor, and public-registry package fixture for 0.8.
- Real IPM install/update/remove result semantics and authoritative post-operation read-back.
- Public registry installation of OpsDeck, public release of 0.2.1, and Open Exchange availability.

## Next qualification sequence

1. Qualify the normal official Docker image wrapper path if its startup defect is resolved without weakening isolation.
2. Determine fixed-log denial behavior under identities with their existing authority; do not widen privileges.
3. Qualify the first real 0.6 mutation only against an isolated disposable fixture after the operation executor is reviewed.
4. Keep authoritative Evidence session-scoped while implementing the separate package-owned derived Vector Search index required for 0.9.
5. Establish read-only available-package discovery and the exact install/update/remove contracts before enabling any package mutation path.

The accepted 0.2.0 and 0.2.1 historical evidence is preserved. The 0.9 continuation is active on the integration branch. No main merge, tag, release, registry claim, or Open Exchange action has been made.

- The contextual “IRIS concepts in this view” help is a collapsed static disclosure scoped to relevant routes. Focused render assertions and the full 152-test suite pass. It does not affect authority or providers. The repository's own Pages build recipe was staged locally and the current source bundle was rendered in Edge's safe demo: Overview, Logs, and Packages showed route-specific help; the safe-demo banner and synthetic package labels remained visible. This is source browser smoke only, not connected runtime qualification. The installed disposable app was not replaced, no IRIS credentials were entered, and no IRIS state changed. Current asset sizes and delta are in the performance baseline.
