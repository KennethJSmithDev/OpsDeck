# OpsDeck 0.9 authenticated HTTP catalog boundary

## Scope

Read-only qualification of the installed product REST routes on the isolated
`OPSDECK_08_TEST_TARGET`, IRIS 2026.2 Build 221U / IPM 0.10.8, namespace
`%SYS`. The repository was clean at the start of this work on
`integration/opsdeck-1.0-20261002`, tip
`65fa4a250c120b43998bb11b7734c6e83553e5c7`; the installed package was
`opsdeck@0.2.2`, while the source manifest is `0.2.3`.

No request touched host `IRISTesting`. No package mutation, web-application
mutation, repository configuration change, or product package update was
performed. A later Edge sign-in attempt stopped before submission because the
Edge control clipboard could not access the Windows clipboard; no password
was submitted and no connected browser session was established.

## Authorization localization

The authenticated fixture user successfully called `/api/admin/info`, which
reported the caller as `OpsDeckQualify` in `%SYS`. Initially, the static
`/opsdeck` application returned 200, while authenticated requests to
`/opsdeck-api/packages`, `/opsdeck-api/available-packages`, and an unknown
`/opsdeck-api` route returned 403 with an empty HTML body. Anonymous requests
returned 401. This placed the 403 before product route/provider handling.

Read-only inspection of the installed `Security.Applications` definitions
found both applications enabled, Password authentication, and no application
Resource or added/matching roles. The REST app dispatches to
`OpsDeck.Product.FixedLogREST`; that class has no nonempty `SECURITYRESOURCE`
and no custom `AccessCheck` or `OnPreDispatch` implementation. No application
Resource was invented.

The account lacked `%DB_IRISSYS:READ`. The `%SYS` REST dispatch code is in the
IRISSYS database, and the official IRIS REST guidance requires the executing
identity to read databases used by the REST service. The authorized
`%Admin_Operate:USE` permission alone did not open the dispatch. Adding only
`%DB_IRISSYS:READ` to the disposable fixture role changed authenticated
product requests from 403 to HTTP 200 JSON. This dispatch fix is separate
from the subsequent IPM provider authority checks described below.

The provider then returned an installed inventory with no visible rows and an
available-catalog result of `unavailable/no-enabled-repositories`. Runtime
mapping showed `%IPM_Storage.ModuleItem` and `%IPM_Repo.Definition` data in the
IPM database at `/durable/iris/mgr/zpm/`, protected in this image by the
existing `%DB_%DEFAULT` resource. The fixture lacked that resource's READ
permission even though its specific SQL SELECT checks passed. Adding only
`%DB_%DEFAULT:READ` to the disposable role made the IPM rows visible. An
attempt to grant `%DB_IPM:READ` was rejected because that resource does not
exist; the rejected attempt made no change.

## Authenticated results under the disposable qualification role

The role's effective resources after the catalog qualification grants are:

```text
%Admin_Operate:USE
%Admin_Secure:USE
%DB_IRISSYS:READ
%DB_%DEFAULT:READ
```

The role also has the expressly authorized `%Admin_Secure:USE` grant, SQL
SELECT on `%IPM_Storage.ModuleItem` and `%IPM_Repo.Definition`, and SQL
EXECUTE on `%IPM_Repo.Definition_SortOrder` in `%SYS`. This is the observed
qualification authority set, not a minimum-privilege product recommendation.

Its existing SQL SELECT access to `%IPM_Storage.ModuleItem` and
`%IPM_Repo.Definition` remains the provider's table-level guard. In `%SYS`, it
also has SQL EXECUTE on the IPM stored function
`%IPM_Repo.Definition_SortOrder`. The current identity passes those checks.

| Request | HTTP | Authenticated result |
|---|---:|---|
| `/api/admin/info` | 200 | `OpsDeckQualify`, `%SYS`, product `iris` |
| `/opsdeck-api/packages` | 200 | `available`; `zpm@0.10.8`, `opsdeck@0.2.2` |
| `/opsdeck-api/available-packages?name=opsdeck` | 200 | `available`; `opsdeck@0.2.0` from `registry`; 1 configured and available repository, coverage `complete` |

Installed inventory reports `opsdeck@0.2.2`, while the available catalog
reports `opsdeck@0.2.0`. The product comparison is therefore
`INSTALLED_NEWER` / local newer, not `UPDATE_AVAILABLE`. Source tests cover
that comparison; the connected browser rendering is still pending.

## Exact IPM caller-authority failures and resolution

The first direct IPM call as `OpsDeckQualify` returned status 5540 / SQLCODE
-99. The installed `%IPM.Repo.Remote.PackageService.GetHttpRequest()` calls
`GetSSLConfiguration(host)`, whose installed implementation calls
`Security.SSLConfigs.Exists()` and creates a configuration if it does not
exist. A direct `Exists()` check as the fixture identity returned Access
Denied (status 822); after the exact security API permission was added, the
same check returned true. The target's `pm.community.intersystems.com` SSL
configuration existed before the successful authenticated catalog call, so
that successful read did not enter the conditional create path.

The catalog still returned the generic failure after the TLS check passed. The
installed `%IPM.Repo.Manager.SearchRepositoriesForModule()` source showed its
repository selection query uses `ORDER BY
%IPM_Repo.Definition_SortOrder(ID)`. Dictionary metadata identifies
`%IPM.Repo.Definition.SortOrder` as `SqlProc=1`. For `OpsDeckQualify`,
`CheckPrivilege(..., 9, "%IPM_Repo.Definition_SortOrder", "e", "%SYS")`
returned 0, while table SELECT checks returned 1. This was the missing
least-scope SQL authority; it is why the earlier generic 5540 was not fixed by
the SSL permission alone.

After granting EXECUTE only on `%IPM_Repo.Definition_SortOrder` to
`OpsDeckQualifyRole` in `%SYS`, the exact-name authenticated product route
returned one live row. A direct authenticated `ListModules` call also returned
one row, confirming the HTTP GET path and configured repository service are
reachable with this identity.

`%Admin_Secure:USE` is a broad security API permission. Official IRIS 2026.2
documentation requires it (along with `%DB_IRISSYS:READ`) for security APIs
that access `IRISSECURITY`, and `Security.SSLConfigs` documents the same
permission for SSL configuration operations. It is retained only on the
disposable qualification role under the explicit qualification authorization;
it is not an appropriate default OpsDeck operator grant. The live catalog
result is qualified only at this privileged fixture identity's authority
scope.

## Installed search call chain

Read-only inspection of the target's compiled method implementations
established this call chain:

```text
OpsDeck.Product.FixedLogREST.SearchAvailablePackages
  -> %IPM.Repo.Utils.SearchRepositoriesForModule
  -> %IPM.Repo.Manager.SearchRepositoriesForModule
  -> %IPM.Repo.Remote.PackageService.ListModules
```

The manager selects the configured repository, checks service availability,
then invokes `ListModules`. The remote package service builds a GET for the
exact `packages/<name>` endpoint, supplies `allVersions` and prerelease/
snapshot flags, and parses the returned package/version JSON. The
`SearchRepositoriesForModule` method catches thrown exceptions and returns a
`%Status`; the OpsDeck provider currently preserves only the bounded generic
reason `catalog-query-failed`.

In the installed `ListModules` implementation, a non-200 HTTP response with no
transport error returns an empty list without parsing the body. The two
observed catalog failures were caller-authority failures outside the HTTP
response path: first the `Security.SSLConfigs` security API, then EXECUTE on
the stored sort function used by the repository manager query. After those
exact grants, the bounded authenticated HTTP search returns its live row. The
source still contains no explicit OpsDeck route-level privilege check for
either underlying IPM requirement; OpsDeck's own provider continues to check
the repository table SELECT before calling IPM.

## State and acceptance

- **KNOWN:** authenticated identity and namespace are preserved by the product
  HTTP path; installed inventory returns two live rows; authenticated catalog
  returns `opsdeck@0.2.0` from `registry` with complete one-repository
  coverage; installed `opsdeck@0.2.2` compares as local newer; both exact
  caller-authority failures and their resolutions are evidenced above.
- **INFERRED:** an ordinary OpsDeck operator without `%Admin_Secure:USE` will
  be denied by this IPM implementation's SSL-configuration lookup. The
  browser can represent this as DENIED; no role was broadened outside the
  disposable target.
- **UNVERIFIED:** connected Edge rendering under `OpsDeckQualify`, the
  operation denial/result boundary, operation authority/qualification, live
  receipt, and package install/remove.
- The target still has installed `opsdeck@0.2.2`, newer than the authenticated
  registry result `0.2.0`; browser display of the `INSTALLED_NEWER`
  relationship remains unqualified.
- The Docker qualification identity and DPAPI-protected local credential are
  retained for the campaign. Plaintext was not output or committed. The
  Windows clipboard was cleared after the unsuccessful Edge handoff.
- `IRISTesting` is untouched. No Edge session was authenticated. No product
  package, repository, class, web application, or package data was mutated.
- **v0.5 remains NOT ACCEPTED.** Authenticated HTTP catalog behavior now
  passes at the recorded fixture authority scope, but the connected Edge
  rendering gate is pending. No v0.6 mutation was attempted.

## Official contract references

- [Securing IRIS REST services](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GREST_securing)
- [IRIS REST specification and database access guidance](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls/framework-api/scbi/changes/DocBook.UI.Page.cls?KEY=GREST_specification)
- [IRIS privileges and permissions](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GSA_config_privs)
- [InterSystems IRIS 2026.2 IPM documentation](https://irisdocs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=AIPM)
