# OpsDeck 0.9 authenticated HTTP catalog boundary

## Scope

Read-only qualification of the installed product REST routes on the isolated
`OPSDECK_08_TEST_TARGET`, IRIS 2026.2 Build 221U / IPM 0.10.8, namespace
`%SYS`. The repository was clean at the start of this work on
`integration/opsdeck-1.0-20261002`, tip
`65fa4a250c120b43998bb11b7734c6e83553e5c7`; the installed package was
`opsdeck@0.2.2`, while the source manifest is `0.2.3`.

No request touched host `IRISTesting`. No browser authentication, package
mutation, web-application mutation, repository configuration change, or
product package update was performed.

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
product requests from 403 to HTTP 200 JSON. `%Admin_Secure:USE` remains absent.

The provider then returned an installed inventory with no visible rows and an
available-catalog result of `unavailable/no-enabled-repositories`. Runtime
mapping showed `%IPM_Storage.ModuleItem` and `%IPM_Repo.Definition` data in the
IPM database at `/durable/iris/mgr/zpm/`, protected in this image by the
existing `%DB_%DEFAULT` resource. The fixture lacked that resource's READ
permission even though its specific SQL SELECT checks passed. Adding only
`%DB_%DEFAULT:READ` to the disposable role made the IPM rows visible. An
attempt to grant `%DB_IPM:READ` was rejected because that resource does not
exist; the rejected attempt made no change.

## Authenticated results after the two database-read grants

The role's effective resources are:

```text
%Admin_Operate:USE
%DB_IRISSYS:READ
%DB_%DEFAULT:READ
```

Its existing SQL SELECT access to `%IPM_Storage.ModuleItem` and
`%IPM_Repo.Definition` remains the provider's table-level guard. The product
route responses prove both guards passed.

| Request | HTTP | Authenticated result |
|---|---:|---|
| `/api/admin/info` | 200 | `OpsDeckQualify`, `%SYS`, product `iris` |
| `/opsdeck-api/packages` | 200 | `available`; `zpm@0.10.8`, `opsdeck@0.2.2` |
| `/opsdeck-api/available-packages?name=opsdeck` | 200 | provider state `failed`, reason `catalog-query-failed`; 1 configured repository, 1 available repository, coverage `complete`, 0 package rows |

The response's complete service coverage proves the configured `registry`
service availability check passed. The failure is later, during the bounded
exact-name search. A separate read-only discriminator using the exact product
criteria (`Name=opsdeck`, `Registry=registry`, `AllVersions=0`) succeeded in
the console owner context and returned `opsdeck@0.2.0` from `registry`. This
shows that the search criteria themselves are valid; it does not identify the
additional caller-context failure or qualify an OpsDeck operator catalog
result. No further privilege was added speculatively.

## State and acceptance

- **KNOWN:** authenticated identity and namespace are preserved by the product
  HTTP path; the installed inventory endpoint returns two live rows; the
  configured repository is reachable from the provider; console-owner exact
  search returns `opsdeck@0.2.0` from `registry`.
- **INFERRED:** the remaining available-catalog failure is inside the IPM
  repository search call under the authenticated web request context, after
  repository availability succeeds.
- **UNVERIFIED:** the exact failing IPM sub-operation and its minimum caller
  authority; authenticated catalog data/version relationship; connected Edge
  rendering; operation authority/qualification; live receipt; package
  install/remove.
- The target still has installed `opsdeck@0.2.2`, which is newer than the
  observed registry `0.2.0`; this comparison is not exposed through the
  authenticated catalog response and is not qualified in the browser.
- The Docker qualification identity and DPAPI-protected local credential are
  retained for the campaign. Plaintext was not output or committed.
- `IRISTesting` is untouched. No Edge session was authenticated. No product
  package, repository, class, web application, or package data was mutated.
- **v0.5 remains NOT ACCEPTED.** The catalog provider returns `FAILED`, so the
  connected-browser gate was not started and no v0.6 mutation was attempted.

## Official contract references

- [Securing IRIS REST services](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GREST_securing)
- [IRIS REST specification and database access guidance](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls/framework-api/scbi/changes/DocBook.UI.Page.cls?KEY=GREST_specification)
- [IRIS privileges and permissions](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GSA_config_privs)
- [InterSystems IRIS 2026.2 IPM documentation](https://irisdocs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=AIPM)
