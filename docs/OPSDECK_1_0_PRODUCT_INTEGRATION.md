# OpsDeck 1.0 product integration checkpoint

**Branch:** `integration/opsdeck-1.0-20261002`  
**Checkpoint:** `4b407b23f002adcac9655f3af300e086931af49a`  
**Status:** integration design and evidence record; not a release candidate.

This checkpoint turns the isolated IRIS runtime seams into the product-owned source topology. It does not claim that the integrated package lifecycle has passed.

## Product ownership and REST topology

The smallest supported native contract currently contains two ObjectScript classes:

| Class | Product responsibility | Package resource |
|---|---|---|
| `OpsDeck.Product.FixedLogReader` | Reads only the two fixed, bounded operational log sources and enforces `%Admin_Operate:Use` in the current process. | `OpsDeck.Product.PKG` |
| `OpsDeck.Product.FixedLogREST` | Exposes the two semantic log routes and the bounded installed-IPM inventory route. | `OpsDeck.Product.PKG` |

`module.xml` declares `SourcesRoot` as `src` and includes `OpsDeck.Product.PKG`. This follows the IPM manifest pattern: a `.PKG` resource includes the classes in that ObjectScript package. Both class files live under `src/OpsDeck/Product/`. No temporary package is part of the final design. Official manifest documentation describes `SourcesRoot`, `.PKG` resources, and `.CLS` resources; the installed IRIS source/runtime checkpoint has already compiled these exact class sources in isolation. This establishes the declaration shape, while a full product install/uninstall lifecycle is still required to qualify ownership.

The manifest owns two web applications:

- `/opsdeck-api`: authenticated, `DispatchClass="OpsDeck.Product.FixedLogREST"`, no static serving, and no recursive route handling. Its routes are `GET /messages`, `GET /system-monitor`, and `GET /packages`.
- `/opsdeck`: authenticated static browser application served from the package-owned CSP directory. Browser providers use same-origin `/opsdeck-api/...` routes for the fixed log and installed package observations.

The fixed log API accepts semantic route names only. It has no caller-selected file path, generic filesystem route, or generic ObjectScript execution bridge. The two log endpoints keep the previously qualified status distinctions and limits: bounded source observation, at most 250 lines, and no resolved source-path metadata.

IPM module ownership and IRIS security authorization are separate. The package manifest owns the two classes, the two web applications, and the files it installs. It does not grant an IRIS user or role any permission. Uninstall ownership still needs an integrated lifecycle proof that confirms only these OpsDeck artifacts are removed and unrelated resources survive.

## Package inventory authority model

**Chosen model: a narrow product-owned endpoint that executes under and preserves the authenticated IRIS identity (model B).** A browser cannot directly invoke an ObjectScript IPM method as a browser API. The endpoint calls `%IPM.Main.GetListModules` and explicitly checks the current user for `SELECT` on `%IPM_Storage.ModuleItem` before reading.

Runtime evidence established that `hello` passed this check and returned installed rows, while `OpsDeckTest` and `OpsDeckAdmin` were denied. This endpoint therefore did not turn the package owner into the caller's authority: the allow/deny result changed with the authenticated user. The response represents denial as `status: "denied"` with no package rows.

The required permission is the actual `SELECT` authority on `%IPM_Storage.ModuleItem`. That is a system IPM registration table permission, not a generic “OpsDeck operator” permission. It is not granted by OpsDeck and should not be assumed appropriate for every operator. Users without the existing permission receive DENIED. No SQL privilege or role change was made. A server-side proxy that called IPM with broader service credentials would be an escalation and is outside this design.

## Installed and available package discovery

Installed inventory is **PARTIAL/PASS within the qualified scope**: the live `%IPM.Main.GetListModules(namespace, repositoryFilter, .modules)` call returned installed package names and versions in `%SYS` for an already-authorized identity. The observed implementation reads `%IPM_Storage.ModuleItem`; its repository argument filters installed registrations and does not query repositories. The live browser renders these rows and preserves denial without fixture substitution.

Available discovery is **not implemented and not qualified**. Official IRIS 2026.2 documentation lists `search` for modules in the current registry and `list-installed` for the current namespace. The IPM CLI contract also describes repository listing and `repo -list-modules` as queries over configured repositories. Those are read-only discovery surfaces, but they do not establish a stable browser-facing ObjectScript method, its exact installed-version schema, repository identity fields, or read authority on this installed runtime. `GetListModules` is not that interface. The product therefore does not synthesize available versions or treat installed metadata as catalog data.

The smallest safe next step is to inspect the configured-repository read interface and its authority against this exact installed IPM version, without changing repositories. If no configured catalog is available to the current identity, the product must show unavailable/not configured. No repository was added or modified.

## DPI-I-261 acceptance matrix

The preserved Community Opportunity description asks operators to see available packages, see installed packages, and install packages from the administration experience. The following matrix keeps those asks separate.

| Idea requirement | Implemented source | Runtime qualified | Publicly demonstrable | Remaining gap |
|---|---|---|---|---|
| See installed packages | `OpsDeck.Product.FixedLogREST.InstalledPackages`; live Packages UI | **PARTIAL/PASS** for `%SYS` and identities with existing `%IPM_Storage.ModuleItem` `SELECT`; other tested identities receive DENIED | **Conditionally** demonstrable on an authorized live IRIS instance; the public safe demo remains synthetic | Cross-namespace behavior and integrated product package lifecycle are not qualified; authority is not generally present for OpsDeckTest/OpsDeckAdmin |
| See available Open Exchange/configured repository packages, versions, and source | None. The UI reports available version as not observed in live mode. | **NO** | No; synthetic catalog rows remain demo-only | Inspect installed IPM repository discovery API/configuration under current authority, then implement a bounded provider if it is available |
| Install a selected package from the administration experience | Fixture-only plan UI; no live executor | **NO** | No; install remains disabled | Exact IPM operation contract, executor authority, disposable fixture, confirmed operation, read-back, receipt, and cleanup |
| Preserve package-manager authority and state | Authenticated endpoint checks current identity for required table `SELECT`; installed rows are read from IPM | **PARTIAL** for installed inventory only | The DENIED state can be demonstrated | Catalog authority and safe write authority remain unqualified |

The DPI-I-261 idea is **not implemented as a whole** and no Community Opportunity completion claim is ready.

## Other active boundaries

### Live web-app executor

`PUT /api/admin/v2/web-app` remains unqualified. The generic-string OpenAPI body does not establish the installed implementation's request schema or exact write semantics. No payload was guessed and no fixture mutation was issued. Continue by inspecting installed implementation metadata/source. Until exact semantics and existing authority are established, no live executor or retry is permitted.

### Package operations

IPM documents install, update, and uninstall lifecycle commands, but that does not qualify a product API operation contract or a server-side executor. Package operations stay disabled because the general live operation executor is unqualified. Before any future package operation, the exact call semantics, caller authority, package fixture absence, receipt path, cleanup, and cleanup read-back must all be established without adding a second safety engine.

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

- Checkpoint source is at `4b407b23f002adcac9655f3af300e086931af49a` on `integration/opsdeck-1.0-20261002`.
- Two native classes are under `src/OpsDeck/Product/` and declared together by `OpsDeck.Product.PKG`.
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
