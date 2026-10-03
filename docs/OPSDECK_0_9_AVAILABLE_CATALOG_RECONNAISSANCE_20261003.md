# OpsDeck 0.9 available package catalog reconnaissance

## Bounded runtime observation

On 2026-10-03 in the isolated `OPSDECK_08_TEST_TARGET`, IRIS 2026.2 Build 221U / IPM 0.10.8, namespace `%SYS`, current console identity `irisowner`, one exact read-only query was made through the installed IPM repository API:

```text
%IPM.Repo.SearchCriteria: Name="opsdeck", Registry="registry", AllVersions=1
%IPM.Repo.Utils.SearchRepositoriesForModule(criteria,.results)
```

It returned one catalog row:

| Field | Runtime value |
|---|---|
| Package identity | `opsdeck` |
| Available version | `0.2.0` |
| Repository identity (`ServerName`) | `registry` |
| Repository/module `Repository` field | Empty |
| `Origin` field | Empty |

No repository URL was fabricated from the empty `Origin`/`Repository` fields. The existing read-only `zpm repo -list` observation identified `registry` at `https://pm.community.intersystems.com`. The same target's installed inventory showed `opsdeck@0.2.1`; therefore this exact catalog result does not establish an update. No package, repository, credential, or configuration was changed.

## Installed implementation owner and bounds

Installed `%IPM.Main.Search` implements the package-manager `search` command and obtains module rows through `%IPM_Utils.Module_GetModuleList`. That table-valued path calls repository `ListModules` and applies its name filter after the calls, so it is not the preferred narrow network query.

The narrower installed contract is:

1. `%IPM.Repo.Utils.SearchRepositoriesForModule(criteria,.results)` obtains `%IPM.Repo.Manager` and delegates to `SearchRepositoriesForModule`.
2. The manager selects enabled `%IPM_Repo.Definition` entries, optionally constrained by `criteria.Registry`, and asks each available package service to `ListModules` using the criteria.
3. The remote package service builds an exact `packages/<name>` request for `criteria.Name`, sends an HTTP GET with version/snapshot/prerelease flags, and maps returned package/version metadata into `%IPM.Storage.QualifiedModuleInfo` objects.
4. `QualifiedModuleInfo.ServerName` is the configured repository name. Other fields such as `Origin` or `Repository` remain empty when the installed service returned them empty.

The installed method returns a status and a `%Library.ListOfObjects` of qualified module rows. Its row does not itself prove availability in every configured repository: the manager skips package services it considers unavailable, and a zero-row result must not be called EMPTY until repository coverage is established.

## Authority and product boundary

This was a direct method call in the local IRIS console as `irisowner`. It proves that this identity could obtain this one bounded result through the installed API. It does **not** prove that an arbitrary authenticated OpsDeck operator has the SQL read authority on `%IPM_Repo.Definition` or may access the configured catalog. The API may use the existing repository's configured service credentials to read public catalog metadata; OpsDeck must not return those credentials or replace the user's IRIS identity with broader application credentials.

The current working source adds `OpsDeck.Product.FixedLogREST.AvailablePackages`, which checks the current user for `%IPM_Repo.Definition:SELECT`, accepts one exact package identity, caps repository fan-out at five and result rows at 50, and returns explicit coverage/provider state. The Packages workspace maps that response, compares observed available versions with installed versions only when stable three-part semantic versions are parseable, and makes an exact-name request through the product route. Runtime evidence proves the helper's one `opsdeck@0.2.0` result under `irisowner`; it does not prove authenticated HTTP/browser rendering or authority for other users. No browser credentials or grants were available/added to qualify that remaining path. Zero-row results are called empty only with complete coverage; partial unobserved repositories remain distinct.

## Official contract

- [InterSystems IRIS 2026.2 IPM documentation](https://irisdocs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=AIPM) distinguishes local installed state from search of the configured registry and documents read-only repository search.
- [InterSystems REST service documentation](https://docs.intersystems.com/healthconnectlatest/csp/docbook/DocBook.UI.Page.cls?KEY=GREST_csprest) documents `%request.Data` query handling used by a future exact-name route.

## DPI-I-261 impact

Available package identity and version are **runtime observed for one exact query under `irisowner` in `%SYS`**, and the provider/UI integration is present in uncommitted local source. Authenticated browser visibility, operator authority across identities, broad repository coverage, and installation from the selected available package remain gaps. This does not complete DPI-I-261.
