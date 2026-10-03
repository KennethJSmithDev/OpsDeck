# OpsDeck 1.0 architecture decision checkpoint

**Branch:** `integration/opsdeck-1.0-20261002`  
**Starting tip:** `d42438c0a8bff3949bd0c7fe69b74abf02d99820`  
**Status:** read-only architecture decision record; not a release candidate.

**Superseding decision:** the contest 0.8 build request now explicitly fixes authoritative Evidence as session-scoped for 0.8/1.0. That human decision replaces the provisional persistence choice below; it does not authorize a database, namespace, mapping, persistent class, or Vector Search index. The request also authorizes one isolated Docker target only when a usable Docker engine is available; the current host engine is not running, so no target has been created.

This record extends the product integration checkpoint with available-package discovery, operation contracts, storage options, and artifact ownership. It records facts separately from source-level inferences. No IRIS state, package, repository, privilege, database, namespace, or mapping was changed during this investigation.

## Available catalog discovery

### Owner and API

The authoritative owner is IPM's configured repository registry, not the installed-module inventory. Official IRIS 2026.2 documentation distinguishes `search` (configured registry) from `list-installed` (current namespace). The documented command contract also provides repository listing and module search commands. This confirms the conceptual source and read-only command surface, but not a browser-safe callable API for this installation.

Current upstream IPM source (which is not proof of the installed implementation) places `Search` in `IPM.Main`; it queries `%IPM_Repo.Definition` and delegates module enumeration to `IPM.Utils.Module.GetModuleList`. The latter returns projected fields including module name, version, repository, description, origin, and version/platform metadata. It consults configured repository services and calls `ListModules`. This is useful reconnaissance, but must not be silently treated as the installed IRIS 2026.2 contract.

The host has one running IRIS 2026.2 instance (`IRISTesting`). The available portal tab is unauthenticated. Installed class/source metadata and current repository identity therefore could not be read under an authenticated session. No repository query was sent. The configured repository identity, installed method signature, exact result schema, namespace dependence, current-user authorization, and network behavior remain unverified. No bounded runtime query or available-catalog provider was added.

**Status:** authoritative catalog owner is IPM/repository configuration; documented CLI discovery exists; product provider is unavailable pending exact installed-contract and authority inspection. Do not fabricate versions or repository identities. The UI must distinguish unknown catalog state from installed rows.

### DPI-I-261 acceptance matrix

The preserved Community Opportunity describes seeing available packages, seeing installed packages, and installing packages from the administration portal. The matrix is intentionally not satisfied by a Packages page alone.

| Idea requirement | Source implemented | Runtime qualified | Publicly demonstrable | Remaining gap |
|---|---|---|---|---|
| See installed packages | `OpsDeck.Product.FixedLogREST.InstalledPackages`; live Packages workspace | **PARTIAL/PASS** only for the previously qualified `%SYS` scope and identities with existing `%IPM_Storage.ModuleItem` `SELECT` | Conditionally, on an authorized live instance; public safe demo uses synthetic data | Other identities can be DENIED; broader namespace and integrated package lifecycle are unqualified |
| See available Open Exchange/configured repository packages, versions, and source | No live catalog provider; live mode does not synthesize available versions | **NO** | No; synthetic catalog remains explicitly demo-only | Inspect installed IPM methods, repository identity/configuration, result schema, and authority; then make one bounded query if safe |
| Install selected packages from the administration experience | Source has planning UI only; no live package executor | **NO** | No | Exact operation contract, authority, qualified general executor, safe absent fixture, read-back, receipt, and cleanup |
| Preserve package-manager authority and state | Installed endpoint preserves observed allow/deny distinction | **PARTIAL** for installed inventory only | DENIED can be demonstrated | Catalog and write authority remain unqualified; package ownership is separate from IRIS grants |

DPI-I-261 is **not complete**. Its install requirement remains a product gap.

## Web-app PUT contract

| Contract field | Finding |
|---|---|
| Owner | **Unknown for installed runtime.** The OpenAPI route is `PUT /api/admin/v2/web-app`; installed UrlMap/dispatch/source metadata could not be read in the unauthenticated portal session. |
| Exact payload | **Unknown.** The generic string schema does not establish body decoding, required or optional fields, or target identity semantics. No neighboring route was used to guess. |
| Enable/disable semantics | **Unknown.** |
| Result/status semantics | **Unknown.** |
| Authoritative read-back | **Unknown.** Must be established from the implementation or a documented read endpoint before mutation. |
| Disposable execution readiness | **NOT READY.** No PUT issued and no fixture contract recorded. |

The next safe step is authenticated read-only inspection of installed route mapping, dispatch implementation, method metadata/source, and candidate read-back. Even after that, execution requires the existing operation engine's preconditions and a proven disposable target.

## Existing runtime availability

Read-only Windows service and IRIS instance inventory found one IRIS instance: `IRISTesting`, IRIS 2026.2 Build 221U. It is the accepted runtime and contains accepted `/opsdeck` state. `%SYS` and `USER` exist in its configuration, but neither is established as a disposable target. There is no observed second installed, stopped, or sanctioned test instance. No unrelated instance was started or stopped.

**Classification:** `EXACT_INTEGRATED_LIFECYCLE_REQUIRES_TEST_TARGET_DECISION`. Do not overwrite the accepted app or infer that `USER` is product-owned/disposable.

## Durable Evidence storage option matrix

No durable OpsDeck state seam currently exists in product source. This is a design investigation only; no database, namespace, mapping, persistent class/table, or global was created.

| Option | Ownership and isolation | Install, upgrade, uninstall | Privileges and `%SYS` API interaction | Persistence, backup, classes, Vector Search | Complexity, migration, risk, support-pattern assessment |
|---|---|---|---|---|---|
| **A. Dedicated `OPSDECK` namespace/database** | Clear product boundary when dedicated and explicitly product-owned; strongest namespace isolation | Installer must provision/configure namespace/database or declare a pre-created prerequisite; upgrades version product schema; uninstall needs explicit retain/purge policy | REST currently runs in `%SYS`; crossing into the namespace requires a defined supported access path and authority model. Package ownership does not grant database privileges. | Supports persistent classes/tables and a future vector-capable IRIS deployment if licensed/version-supported. Backup is a separate database/namespace boundary. | High operational complexity and migration burden; strong isolation. Official deployment patterns support namespaces/databases, but no evidence establishes this as the already-owned OpsDeck pattern. **Human decision required.** |
| **B. Dedicated product data database mapped into current runtime namespace** | Separate physical storage, but logical code/data remain reachable from `%SYS`; product ownership must be explicit | Provision DB and namespace mappings; upgrades must version schema and preserve mapping; uninstall must remove mappings only when owned and decide whether to retain DB | REST sees mapped globals/classes only through configured mappings; these are instance configuration and can change code/data resolution. No privilege expansion is implicit or appropriate. | Can hold persistent globals/tables; vector availability depends on IRIS version/license/schema. DB backup can be isolated. | Medium-high complexity; mappings introduce collision/configuration risk and migration coupling. Official IRIS mapping mechanisms exist, but are not an automatic IPM ownership model. **Human decision required.** |
| **C. Existing non-system namespace/database (`USER`)** | Existing does not mean OpsDeck-owned. No evidence shows semantic ownership or that unrelated data may be co-located. | Would require product namespace/mapping and schema lifecycle rules; uninstall must preserve unrelated contents. | `%SYS` REST would still need an explicit access path; being non-system does not confer authority. | Existing DB may support tables and backups, but its ownership, capacity, vector support, and backup policy are unverified. | Lowest initial provisioning, highest ownership ambiguity and data-collision risk. Do not select merely because it exists. **Human decision required.** |
| **D. No durable Evidence in 1.0; session Evidence only** | OpsDeck owns only in-memory/session projection behavior; no persistent IRIS data ownership | No DB/schema lifecycle. Future durable version needs an explicit migration and retention design. | No new database privilege or `%SYS` cross-namespace access required. | No cross-session persistence or vector substrate; raw logs remain unpersisted. | Lowest complexity and risk now; defers durable receipts, qualifications, observations, and vector search. **Recommended interim 1.0 boundary**, provided the product owner accepts that durable Evidence is out of 1.0. Human decision required if durable persistence is a 1.0 requirement. |

**Current decision:** Option D is selected for contest 0.8/1.0: authoritative Evidence remains session-scoped. A/B/C are out of scope for this contest. Vector Search remains deferred unless a separately owned, rebuildable derived-index boundary is identified; it must not change this Evidence decision.

## Product package ownership inventory

This is the proposed manifest ownership boundary, not proof of installed lifecycle behavior. The `module.xml` on this branch defines eight individual `FileCopy` resources, the `OpsDeck.Product.PKG` class resource, `/opsdeck-api`, and `/opsdeck`. A prior temporary-module cleanup removed its temporary app and test classes while leaving accepted `/opsdeck` intact; that is only a cleanup control, not proof of `opsdeck` module uninstall semantics.

| Artifact | Who creates it? | Owner | Who upgrades/removes it? | What must survive uninstall? |
|---|---|---|---|---|
| Static assets: `app.js`, `index.html`, `styles.css`, `iris-provider.js`, `evidence-center.js`, `operation-engine.js`, `packages-workspace.js`, `job-center.js` copied to `{$cspdir}opsdeck/` | IPM activation `FileCopy` resources | `opsdeck` module, subject to collision check | IPM updates/removes module resources; exact uninstall behavior for individual file targets still requires lifecycle proof | All unrelated CSP files/directories and any pre-existing file not demonstrably owned by this module. Capture target pre-state before install; never claim overwrite/removal is safe without read-back. |
| ObjectScript classes `OpsDeck.Product.FixedLogReader` and `OpsDeck.Product.FixedLogREST` | IPM imports/compiles `OpsDeck.Product.PKG` from `src` | `opsdeck` module for these exact classes | IPM package resource on update/uninstall, pending integrated proof | Other classes and packages, including unrelated `OpsDeck.*` classes. A class/package collision must be a blocker, not force cleanup. |
| `/opsdeck-api` authenticated REST app in `%SYS` | IPM `WebApplication` resource | `opsdeck` module definition | IPM module upgrade/uninstall, pending integrated proof | Other web apps and routes. Preserve or reject pre-existing `/opsdeck-api` state; do not overwrite silently. |
| `/opsdeck` authenticated static app in `%SYS` | IPM `WebApplication` resource | `opsdeck` module definition | IPM module upgrade/uninstall, pending integrated proof | Accepted `/opsdeck` bytes and unrelated application state until exact lifecycle target is authorized; all other apps survive. This accepted runtime state cannot be used as a destructive test target. |
| Persistent data, tables, globals, database, namespace, mappings | None in current supported 1.0 manifest | None | None | All existing data/configuration. No persistent OpsDeck data is currently defined. |
| IPM module registration and repository configuration | IPM/platform creates and owns registration/configuration | IPM/platform, not OpsDeck app data | IPM manages module registration; OpsDeck uninstall must not remove repositories or IPM itself | All repository definitions, credentials, unrelated modules and IPM state. |

The IPM manifest docs establish resource declaration patterns, not sufficient byte-level uninstall guarantees for this exact installed IPM build. Product ownership and IRIS security remain separate: this manifest does not grant user, role, resource, SQL, or database privileges.

## Package install, update, and remove contract reconnaissance

Official IPM documentation describes `install`, `update`, and `uninstall` commands and their configured-repository/module lifecycle. Current upstream source locates command handling in the `IPM` package (including `IPM.Main.Install` and storage uninstall helpers), but this source is not authenticated evidence of the host's installed version. The documented commands are namespace/configuration-sensitive and can perform dependency resolution and resource lifecycle effects.

| Operation | Public command-level shape | Installed implementation / response contract | Namespace/source behavior | Read-back and executor status |
|---|---|---|---|---|
| Install | `install <module> [version]` | Exact installed method/API, result classes, status and ambiguous-result contract **unverified** | Resolves configured repositories/dependencies; command runs in an IPM namespace context; exact target namespace semantics on this runtime **unverified** | Use authoritative fresh installed inventory in target namespace; existing general executor is unqualified; no operation |
| Update | `update <module> [version]` | Exact installed method/API, downgrade/force semantics, result/ambiguity **unverified** | Uses installed state plus configured repository/dependency resolution; exact scope **unverified** | Fresh installed inventory/version read-back required; no operation |
| Remove/uninstall | `uninstall <module>` with documented force/recurse/purge options depending on CLI | Exact installed storage removal behavior and data-purge semantics **unverified** | Can affect module-owned resources and dependencies; purge can affect persistent data. Exact installed behavior **unverified** | Fresh inventory plus resource/data ownership read-back required; no operation |

Do not use the interactive `Shell` as a bridge: current upstream source includes general command execution behavior, which is broader than a narrow package endpoint. No second mutation engine is permitted. Package operations remain blocked until exact installed contracts and the already-designed general operation executor are qualified.

## Fixed logs and product API

Product source owns the fixed semantic `/messages` and `/system-monitor` routes through `OpsDeck.Product.FixedLogREST` and `FixedLogReader`. Their isolated compile/dispatch and bounded response behavior were qualified earlier; this checkpoint does not repeat those reads. Keep route names fixed, source observation bounded to at most 250 lines, preserve state distinctions, expose no resolved source path as metadata, and retain legitimate path-shaped text in log content. Package lifecycle and browser routing remain part of the integrated product qualification gate.

## Evidence and test status

- **IRIS tests this checkpoint:** none; no source/runtime mutation was performed and the user explicitly excluded repetition of qualified reads.
- **Host/source reconnaissance:** read-only service/instance inventory and public documentation/upstream-source inspection only. No new runtime qualification is claimed.
- **IRIS state changes:** none.
- **Cleanup:** none needed; no temporary fixture, package, or resource was created.
- **Installed-package evidence:** retain the previously accepted `%SYS`/identity-bounded qualification; it was not repeated.

## Contest 0.8 continuation source milestone

- Added one bounded session Job model for accepted async identities and their observed IRIS states.
- The qualified-source audit query is the first consumer. HTTP 202 creates a session correlation identity; only a validated same-origin `Location` attaches a result identity. Queued/running/completed/failed/canceled/paused, denied/unavailable, and ambiguous outcomes remain distinct. A malformed or unreadable accepted handoff becomes AMBIGUOUS and is never retried.
- Tasks now presents a session Job Center. The same projected Job fact is included in session Evidence. Logout clears Job state.
- This is source/test evidence, not a new live IRIS qualification. Audit is a read workflow; it does not establish mutating-operation handoff, generic Job API coverage, authoritative operation read-back, or an operation receipt.
- Full JavaScript suite: **136/136 PASS**. Focused assertions cover bounded collection, state mapping, live app handoff projection, session logout clearing, and server asset delivery. JavaScript syntax checks, XML parse, and `git diff --check` passed. These do not substitute for IRIS compilation or browser/runtime qualification.

### Contest bonus and feature status at this source milestone

| Feature | Source implemented | Runtime qualified | Publicly demonstrable | Remaining gap |
|---|---|---|---|---|
| DPI-I-261 | Installed-package provider/UI exists from prior work | Installed rows qualified only for prior `%SYS`/authorized identity scope | Conditionally, live; demo catalog stays synthetic | Available catalog and package install/remove still unqualified; private authenticated installed-IPM inspection blocked |
| Docker | No Docker deployment source added | **NO**. Docker client is installed, but neither configured engine pipe is available | No | Start/restore Docker engine under the local development workflow, then create only `OPSDECK_08_TEST_TARGET` with an exact 2026.2 Community image |
| Embedded Python | No product Python transform added | **NO** | No | Implement bounded fixed-log normalization only when it can be compiled and exercised on the authorized disposable runtime |
| IRIS Vector Search | Deferred | **NO** | No | `VECTOR_SEARCH_DEFERRED_STORAGE_OWNERSHIP`; no package-owned derived-index store exists |

The published image catalogs currently show 2026.2 Community tags, including official `intersystems/iris-community:2026.2` and the ZPM-enabled `intersystemsdc/iris-community:2026.2-zpm`. The local runtime was unavailable, so no image was pulled and tag availability was not tested through Docker. Native/IPM stays the canonical installation path.

## Known, inferred, unverified

### Known

- The current integration branch contains the two product REST classes and their manifest resources; installed inventory has prior bounded runtime evidence for its qualified scope.
- One running IRIS instance was found on this host, `IRISTesting`; the portal tab was unauthenticated.
- The accepted `/opsdeck` runtime state was not touched.
- Current module manifest contains the artifacts enumerated above and no persistent database/schema resource.
- Official IPM documentation distinguishes installed listing from configured-registry search.

### Inferred

- IPM repository registry/search is the intended authoritative source for available-package metadata, based on official command docs and current upstream source; exact installed call/authority is not established.
- Option D minimizes unsupported ownership and migration risk until a human selects a durable persistence boundary.
- The manifest resources express intended package ownership, but do not prove exact uninstall effects on a populated target.

### Unverified

- Installed repository identity/configuration, search method/schema, network behavior and authority.
- Web-app PUT owner, payload, result, and read-back.
- Exact installed package operation API/result contracts and operation executor qualification.
- Integrated install/uninstall/reinstall ownership proof on an isolated target.
- Durable Evidence requirement decision and database/namespace/mapping choice.
- Vector Search suitability and availability on the eventual persistence target.

## References

- [InterSystems IRIS 2026.2 IPM documentation](https://irisdocs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=AIPM)
- [IPM CLI commands](https://github-wiki-see.page/m/intersystems/ipm/wiki/02.-CLI-commands)
- [IPM manifest reference](https://github.com/intersystems/ipm/wiki/03.-IPM-Manifest-(Module.xml))
- [Current upstream `IPM.Main`](https://github.com/intersystems/ipm/blob/main/src/cls/IPM/Main.cls) and [`IPM.Utils.Module`](https://github.com/intersystems/ipm/blob/main/src/cls/IPM/Utils/Module.cls) — reconnaissance only; not proof of installed runtime source.
- [IRIS namespace mappings](https://irisdocs.intersystems.com/irisforhealthlatest/csp/docbook/DocBook.UI.Page.cls?KEY=GSA_config_namespace_addmap)
- [IRIS global mappings](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls/history/DocBook.UI.Page.cls?KEY=RACS_Global)
- [Preserved DPI-I-261 opportunity](../../CompDocs-1.0-evidence/InterSystems-2026/COMMUNITY_OPPORTUNITY_PLAN.md)
