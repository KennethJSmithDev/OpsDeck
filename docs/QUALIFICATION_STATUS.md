# OpsDeck qualification status

## Current integration snapshot — 2026-10-03

- Branch: `integration/opsdeck-1.0-20261002`, tested source checkpoint `6f59680b7c5d50ab48693927bdd4786257154d09`.
- Source package version remains `0.2.3`; this work does not advance the evidence-gated product version.
- Current local JavaScript suite: **147/147 PASS** at the tested source checkpoint. The browser-rendered catalog relationship test covers `INSTALLED_NEWER` without an update recommendation. A simulated upstream HTTP 403 now renders as `DENIED`; syntax checks pass locally. The changed browser assets have not been reloaded into or qualified on the installed disposable target.
- The catalog comparison now distinguishes `INSTALLED_CURRENT`, `INSTALLED_OLDER`, `INSTALLED_NEWER`, `AVAILABLE_ONLY`, `INSTALLED_STATE_UNKNOWN`, and `INSTALLED_VERSION_UNCOMPARABLE`. This is source/test evidence, not a new live browser observation.
- The disposable `OPSDECK_08_TEST_TARGET` was observed running at loopback ports 51972 and 52774. Its OpsDeck installation was left untouched; the browser reached the login screen and no credentials were entered. Authenticated catalog rendering therefore remains unqualified.
- A read-only unauthenticated `GET /opsdeck-api/available-packages?name=opsdeck` against that target returned **401**, confirming the installed flat catalog route reaches its authentication boundary. It does not establish authenticated REST dispatch, the authenticated IRIS identity, repository-read authority, or an IPM query result.
- The live operation engine remains fixture-only. No real web-app operation, package operation, or OperationReceipt has been qualified in this continuation.
- ObjectScript Quality remains **NOT RUN** because the prescribed remote hook failed trust review; see [the gate record](OBJECTSCRIPT_QUALITY_GATE_20261003.md). This is a required hygiene gate before a human-approved mainline candidate, not a product version advancement.
- No IRIS state was changed in this continuation. No merge, tag, or release was made.

### Evidence-gated frontier

| Milestone | Current status | Remaining acceptance evidence |
|---|---|---|
| 0.5 operational visibility | **NOT ACCEPTED** | Authenticated connected-browser smoke of the live available catalog and its authority/coverage/version states; safe-demo and representation-cost acceptance record for the complete 0.5 surface. |
| 0.6 verified operations | **NOT ACCEPTED** | One real reversible operation through the shared executor, authoritative read-back, receipt, and cleanup on the disposable target. |
| 0.7 operational Evidence | **NOT ACCEPTED** | A real OperationReceipt consumed and rendered with its evidence-backed findings. |
| 0.8 package operations | **NOT ACCEPTED** | Same-executor package install/remove, DPI-I-261 completion, and unrelated-package preservation. |
| 0.9 intelligent operations | **NOT ACCEPTED** | Operational core plus owned derived storage, real Vector Search, semantic retrieval, AI boundary, morphing/responsive browser qualification, and full product lifecycle. |

The source and test improvement to catalog version relationships does not qualify the installed browser path or close any milestone by itself.

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

The target container, named data volume, pulled image, and temporary fixture files were removed after qualification. Docker returned to zero containers, volumes, and images. User-authorized Decision A fixes Evidence as session-scoped for 0.8/1.0 and defers Vector Search absent an independently owned derived-index boundary.

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
4. Preserve session-scoped Evidence for contest 0.8/1.0; durable persistence and Vector Search remain deferred by architecture decision.
5. Establish read-only available-package discovery and the exact install/update/remove contracts before enabling any package mutation path.

The accepted 0.2.0 and 0.2.1 historical evidence is preserved. The current source and qualification record were pushed to the integration branch. No Phase C continuation, 0.9 work, main merge, tag, release, registry claim, or Open Exchange action is included in this checkpoint.
