# OpsDeck 1.0 product integration checkpoint

**Branch:** `integration/opsdeck-1.0-20261002`  
**Checkpoint:** `4b407b23f002adcac9655f3af300e086931af49a`  
**Status:** integration design and evidence record; not a release candidate.

> **Supersession note (2026-10-03):** This is a historical 1.0 integration
> checkpoint. Its Vector Search deferral pending durable authoritative Evidence
> is superseded by the active 0.9 objective: authoritative Evidence remains
> session-scoped, while a package-owned database/namespace is required only
> for rebuildable derived Vector Search state. See
> [the current storage lifecycle record](OPSDECK_0_9_IPM_STORAGE_LIFECYCLE_20261003.md).

This checkpoint turns the isolated IRIS runtime seams into the product-owned source topology. It does not claim that the integrated package lifecycle has passed.

## Product ownership and REST topology

The current native contract contains three ObjectScript classes:

| Class | Product responsibility | Package resource |
|---|---|---|
| `OpsDeck.Product.FixedLogReader` | Reads only the two fixed, bounded operational log sources and enforces `%Admin_Operate:Use` in the current process. | `OpsDeck.Product.PKG` |
| `OpsDeck.Product.FixedLogREST` | Exposes the two semantic log routes and bounded IPM inventory/catalog routes. | `OpsDeck.Product.PKG` |
| `OpsDeck.Product.LogInterpreter` | Applies bounded rule-based interpretation only to fixed log observation payloads passed by the REST class. | `OpsDeck.Product.PKG` |

`module.xml` declares `SourcesRoot` as `src` and includes `OpsDeck.Product.PKG`. This follows the IPM manifest pattern: a `.PKG` resource includes the classes in that ObjectScript package. All three class files live under `src/OpsDeck/Product/`. No temporary package is part of the final design. Official manifest documentation describes `SourcesRoot`, `.PKG` resources, and `.CLS` resources; the installed IRIS source/runtime checkpoint has already compiled these exact class sources in isolation. This establishes the declaration shape, while a full product install/uninstall lifecycle is still required to qualify ownership.

The manifest owns two web applications:

- `/opsdeck-api`: authenticated, `DispatchClass="OpsDeck.Product.FixedLogREST"`, no static serving, and no recursive route handling. Its routes are `GET /messages`, `GET /system-monitor`, `GET /packages`, and exact-name `GET /available-packages?name=...`.
- `/opsdeck`: authenticated static browser application served from the package-owned CSP directory. Browser providers use same-origin `/opsdeck-api/...` routes for fixed logs, installed package inventory, and exact-name available package lookup.

The fixed log API accepts semantic route names only. It has no caller-selected file path, generic filesystem route, or generic ObjectScript execution bridge. The two log endpoints keep the previously qualified status distinctions and limits: bounded source observation, at most 250 lines, and no resolved source-path metadata.

IPM module ownership and IRIS security authorization are separate. The package manifest owns the two classes, the two web applications, and the files it installs. It does not grant an IRIS user or role any permission. Uninstall ownership still needs an integrated lifecycle proof that confirms only these OpsDeck artifacts are removed and unrelated resources survive.

## Package inventory authority model

**Chosen model: a narrow product-owned endpoint that executes under and preserves the authenticated IRIS identity (model B).** A browser cannot directly invoke an ObjectScript IPM method as a browser API. The endpoint calls `%IPM.Main.GetListModules` and explicitly checks the current user for `SELECT` on `%IPM_Storage.ModuleItem` before reading.

Runtime evidence established that `hello` passed this check and returned installed rows, while `OpsDeckTest` and `OpsDeckAdmin` were denied. This endpoint therefore did not turn the package owner into the caller's authority: the allow/deny result changed with the authenticated user. The response represents denial as `status: "denied"` with no package rows.

The required permission is the actual `SELECT` authority on `%IPM_Storage.ModuleItem`. That is a system IPM registration table permission, not a generic “OpsDeck operator” permission. It is not granted by OpsDeck and should not be assumed appropriate for every operator. Users without the existing permission receive DENIED. No SQL privilege or role change was made. A server-side proxy that called IPM with broader service credentials would be an escalation and is outside this design.

## Installed and available package discovery

Installed inventory is **PARTIAL/PASS within the qualified scope**: the live `%IPM.Main.GetListModules(namespace, repositoryFilter, .modules)` call returned installed package names and versions in `%SYS` for an already-authorized identity. The observed implementation reads `%IPM_Storage.ModuleItem`; its repository argument filters installed registrations and does not query repositories. The live browser renders these rows and preserves denial without fixture substitution.

Available discovery is **implemented in the local 0.2.3 source; the integrated helper was runtime-qualified for one exact query**. The browser's Packages workspace now accepts one exact package identity and calls `GET /opsdeck-api/available-packages?name=...`; the product class checks the current `$USERNAME` for `SELECT` on `%IPM_Repo.Definition`, caps configured repositories at five and response rows at 50, and uses `%IPM.Repo.Utils.SearchRepositoriesForModule` with exact package criteria. It reports coverage, preserves `DENIED`/`UNAVAILABLE`/`FAILED`/`EMPTY`, and does not fill empty source fields. For stable three-part semantic versions only, the browser marks `UPDATE_AVAILABLE` only if the available version compares higher than the installed version; prerelease/build/snapshot comparisons are left unqualified.

The installed API's manager visits enabled repository definitions and calls an available package service with the exact criteria; the remote service issues a package GET. The manager can skip unavailable services, so zero returned rows alone does not establish EMPTY or complete repository coverage. Authenticated product HTTP and connected Edge returned `opsdeck@0.2.0` from `registry` with complete one-repository coverage for `OpsDeckQualify`; installed `opsdeck@0.2.2` is newer than the observed catalog. The installed image configuration identifies `registry` as `https://pm.community.intersystems.com`; per-row `Repository` and `Origin` fields remain omitted when absent. The local manifest/source is `0.2.3` and has not been loaded. Qualification required `%Admin_Secure:USE` to let IPM inspect its existing TLS configuration and SQL EXECUTE on `%IPM_Repo.Definition_SortOrder`; these are Docker-fixture grants only. Since `%Admin_Secure:USE` is inappropriate as a default operator grant, the live catalog result is qualified only at this elevated fixture identity's scope. The installed browser renderer showed a generic `INSTALLED` badge; read-only asset hashes confirm it is not the local source renderer, so current-source `INSTALLED_NEWER` UI behavior remains unqualified. See [authenticated HTTP boundary](OPSDECK_0_9_AUTHENTICATED_HTTP_BOUNDARY_20261003.md), [catalog reconnaissance](OPSDECK_0_9_AVAILABLE_CATALOG_RECONNAISSANCE_20261003.md), and [EGEHAR route analysis](OPSDECK_0_9_EGEHAR_20261003.md).

## DPI-I-261 acceptance matrix

The preserved Community Opportunity description asks operators to see available packages, see installed packages, and install packages from the administration experience. The following matrix keeps those asks separate.

| Idea requirement | Implemented source | Runtime qualified | Publicly demonstrable | Remaining gap |
|---|---|---|---|---|
| See installed packages | `OpsDeck.Product.FixedLogREST.InstalledPackages`; live Packages UI | **PARTIAL/PASS** for `%SYS` and identities with existing `%IPM_Storage.ModuleItem` `SELECT`; other tested identities receive DENIED | **Conditionally** demonstrable on an authorized live IRIS instance; the public safe demo remains synthetic | Cross-namespace behavior and integrated product package lifecycle are not qualified; authority is not generally present for OpsDeckTest/OpsDeckAdmin |
| See available Open Exchange/configured repository packages, versions, and source | Product REST provider plus exact-name Packages UI lookup; configured repository name is returned; missing `Origin`/`Repository` fields stay absent | **PARTIAL**: authenticated HTTP and connected Edge rendering pass for the exact Docker fixture identity and installed UI; current source relationship label and other caller authority remain unqualified | No; public demo remains synthetic; the connected fixture UI is not a public demonstration | Load and qualify current integrated browser assets; assess authority for ordinary operators and additional repo coverage without changing config |
| Install a selected package from the administration experience | Fixture-only plan UI; no live executor | **NO** | No; install remains disabled | Exact IPM operation contract, executor authority, disposable fixture, confirmed operation, read-back, receipt, and cleanup |
| Preserve package-manager authority and state | Authenticated endpoint checks current identity for required table `SELECT`; installed rows are read from IPM | **PARTIAL** for installed inventory only | The DENIED state can be demonstrated | Catalog authority and safe write authority remain unqualified |

The DPI-I-261 idea is **not implemented as a whole** and no Community Opportunity completion claim is ready.

## Other active boundaries

### Live web-app executor

`PUT /api/admin/v2/web-app` remains unqualified for mutation. Direct read-only inspection of installed compiled method bodies and metadata has established the name query identity, JSON-object body schema, `Security.Applications.Modify`/`.Create` upsert branches, patch behavior for existing applications, create status 201, synchronous execution, GET read-back, and the matching DELETE route. The disposable target reports `/opsdeck-fixture` absent and provides an existing `/opsdeck` property set from which a disabled fixture payload can be derived. The official class contract requires `%Admin_Secure:Use`; the local proxy passes through the connected user's authorization. The candidate create payload and authenticated HTTP behavior remain unqualified. See [the 0.9 web-app PUT contract record](OPSDECK_0_9_WEBAPP_PUT_CONTRACT_20261003.md). No PUT or DELETE was issued. The `/opsdeck-fixture` operation is not ready for execution.

### Package operations

IPM exposes `%IPM.Main.Install`, `.Update`, and `.Uninstall` entry points, but exact argument/result semantics and their invocation authority have not been inspected and qualified for an OpsDeck caller. Package operations stay disabled because the general live operation executor is unqualified. Before any future package operation, the exact call semantics, caller authority, package fixture absence, receipt path, cleanup, and cleanup read-back must all be established without adding a second safety engine.

### Evidence persistence and vector search

The Evidence Center currently stores projected session evidence only. The inspected product source has no existing OpsDeck-owned durable IRIS persistence seam. Choosing a database, namespace, or mapping would be a material architecture decision, so no storage was created and no raw logs are persisted. Durable operation receipts, qualification records, package observations, provider state, and source/resource identities remain unimplemented. Vector search stays deferred until durable projected Evidence exists.

## Product package lifecycle gate

The manifest and source now define a single OpsDeck-owned package topology, but integrated lifecycle qualification remains **UNVERIFIED**. Required proof on a disposable, isolated target is:

1. `zpm install opsdeck` installs exactly the two product classes, `/opsdeck-api`, `/opsdeck`, and the static browser assets.
2. The installed browser loads its product API and live providers under the current identity.
3. `zpm uninstall opsdeck` removes only the OpsDeck-owned artifacts and leaves unrelated classes, applications, packages, and files intact.
4. Reinstall restores the complete supported product.

The currently preserved runtime installation contains an existing OpsDeck application/package identity. Replacing it would overwrite accepted state; creating a new database/namespace or altering mappings would cross the explicit architecture gate. Therefore the integrated lifecycle has not been run against that instance. A safe disposable target and its existing authority are required before this mandatory gate can pass.

## Evidence classification

### KNOWN

- Last pushed checkpoint is `611010d2467411bb79bdb724810c07dd54d7e3b5` on `integration/opsdeck-1.0-20261002`; current working source includes uncommitted 0.2.3 catalog/browser integration.
- Three native classes are under `src/OpsDeck/Product/` and declared together by `OpsDeck.Product.PKG`.
- The isolated REST and reader source compiled and the fixed semantic routes, authentication, bounded reads, and inventory authority differences were observed; see `opsdeck-1-0-runtime-lanes-2026-10-02.json` in the preserved evidence worktree.
- Product source maps live package rows into the Packages workspace. Live available versions are not fabricated.
- Official IRIS 2026.2 documentation identifies `search` as current-registry discovery and `list-installed` as current-namespace installed discovery.

### INFERRED

- The `.PKG` resource is the correct package-owned class declaration for these two classes, based on the official IPM manifest convention and matching installed source layout.
- The narrow endpoint preserves caller authority for the observed checks because the runtime allow/deny outcomes followed the authenticated identity. This inference is limited to the qualified read method and does not establish authority for future methods.

### UNVERIFIED

- Exact install/uninstall/reinstall ownership behavior for this integrated manifest.
- Browser/API runtime operation from the fully installed product package.
- Available catalog schema/authority on the installed IPM version and current repository configuration.
- Package install/update/remove executor, live web-app PUT executor, durable Evidence storage, and vector search.
- Public registry availability or release qualification.

## References

- [InterSystems IRIS 2026.2 IPM documentation](https://irisdocs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=AIPM) — module manifests, repository configuration, `search`, `list-installed`, and lifecycle commands.
- [InterSystems IPM manifest reference](https://github.com/intersystems/ipm/wiki/03.-IPM-Manifest-(Module.xml)) — `SourcesRoot`, `.PKG` resources, web applications, and resource ownership.
- [Preserved DPI-I-261 opportunity and acceptance evidence](../../CompDocs-1.0-evidence/InterSystems-2026/COMMUNITY_OPPORTUNITY_PLAN.md) — source of idea scope and product placement.
