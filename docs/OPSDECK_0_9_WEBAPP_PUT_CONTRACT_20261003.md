# OpsDeck 0.9 web-application PUT contract — 2026-10-03

## Local boundary and observations

| Field | Evidence |
|---|---|
| Symptom | The published OpenAPI body is generic and did not by itself establish the upsert semantics. |
| Boundary | Installed `%Api.Admin.Dispatch.v2` UrlMap dispatches `/api/admin/v2/web-app`; the owning endpoint is `%Api.Admin.Endpoints.WebApp.App`. Inspection used runtime compiled metadata/source, not a mutation. |
| Owning layer | IRIS Admin API dispatch and `Security.Applications` published API. |
| Runtime | `OPSDECK_08_TEST_TARGET`, IRIS 2026.2 Build 221U, IPM 0.10.8. |
| Current authority | Console identity `irisowner`; runtime check reported `%Admin_Secure:Use` true. This does not establish authenticated HTTP execution from OpsDeck. No HTTP credentials were submitted. |
| Reproduction | Read `RunPut`, `RunGet`, `MergeJsonAndProperties`, and `RequestBodySchema` from `%Dictionary.CompiledMethod` and its `Implementation` streams; read `Security.Applications` compiled property metadata and the official 2026.2 class reference. |
| Earliest failure | No request was issued, so no runtime request failure exists. The unresolved boundary is actual HTTP authority and exact successful fixture creation/read-back through OpsDeck's executor. |

## Established request and result behavior

- Owner method: `%Api.Admin.Endpoints.WebApp.App.RunPut(&sc:%Status, requestBody:%DynamicObject) As %Library.DynamicObject`.
- The route identity is the `name` query parameter, exposed to the method as `..Name`. The endpoint passes it as the `Name` argument to `Security.Applications.Exists`, then to `Modify` or `Create`.
- The body is a JSON object. `MergeJsonAndProperties` iterates `RequestBodySchema()` and copies only supplied schema properties into the property list. It translates the defined display/array fields and then forces `Type` to CSP; a caller cannot select another application type through the body.
- The installed schema includes `Enabled`, `NameSpace`, `Path`, `Recurse`, `ServeFiles`, `AutheEnabled`, and other CSP properties. It contains no body `Name` field. The security class metadata marks `Name` and `NameLowerCase` as required; `Name` is supplied separately by the route/API argument. How `Create` derives or validates `NameLowerCase` was not inspected. Other properties have defaults, but the API documentation says callers should supply the properties required for the application type. There is no explicit request-body required-property list in the installed schema.
- If the named application exists, `RunPut` calls `Security.Applications.Modify(name, properties)`. Official documentation states that Modify changes only the properties present in the supplied property array, so an enable/disable patch can bind only `Enabled` and preserve other properties.
- If the named application does not exist, `RunPut` calls `Security.Applications.Create(name, properties)`. On successful create it explicitly sets HTTP 201. Error results return an empty dynamic object; the final HTTP status mapping for every error case was not established in this read-only inspection.
- `RunGet` uses the same name identity and `Security.Applications.Exists`. It returns HTTP 404 if the application is absent and serializes the object if present. Read-back route: `GET /api/admin/v2/web-app?name=<exact-name>`.
- The endpoint is synchronous; there is no Job handoff in `RunPut`.
- Official 2026.2 `Security.Applications` documentation states `%Admin_Secure:Use` is required. OpsDeck's local proxy passes the authenticated session Authorization header to the upstream IRIS API; it does not substitute another identity. This establishes the intended non-elevating route, but authenticated HTTP behavior remains unqualified.

## Candidate fixture operation contract

For an existing web app, the body needed to request a state transition is exactly `{"Enabled":true}` or `{"Enabled":false}`; query identity remains `name=/opsdeck-fixture`. The endpoint uses patch semantics for existing records. The common executor must independently read and fingerprint fresh pre-state, check the caller's authority, require explicit confirmation, dispatch one request, and use the GET above for authoritative read-back.

For creating an absent fixture, a candidate request must also provide the fields required for a CSP application. The installed method/schema and class metadata do not enumerate type-specific required fields. A body such as `{"Enabled":false,"NameSpace":"%SYS","Path":"..."}` is therefore a hypothesis, not an established exact create payload. It was not sent.

**Execution readiness: NOT READY.** The contract owner, route identity, patch payload, sync behavior, and read-back are established. Exact absent-fixture create semantics have no runtime proof; the shared generic live executor and browser authority/confirmation flow have not yet been integrated; no authenticated disposable HTTP identity is available in this turn. No PUT, fixture creation, privilege grant, or application mutation occurred.

## Official corroboration

- [IRIS 2026.2 `Security.Applications` class reference](https://docs.intersystems.com/irislatest/csp/documatic/%25CSP.Documatic.cls?CLASSNAME=Security.Applications&LIBRARY=%25SYS) documents `Create`, `Modify`, the application properties, and `%Admin_Secure:Use` authority.
- [IRIS 2026.2 application administration guide](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GSA_manage_applications) documents that Modify updates only supplied properties and leaves others unchanged.

## State and next boundary

**Known:** owner, method signature, upsert branch, name source, accepted body-property schema, forced CSP type, create status 201, GET absence as 404, and required security resource.

**Inferred:** a closed `Enabled` patch is appropriate for an existing disposable CSP application; an absent app needs path/namespace configuration suitable for its type.

**Unverified:** exact accepted create payload, error-to-HTTP mapping, authenticated HTTP identity/privilege outcome, generic executor integration, and an end-to-end reversible operation receipt. Continue source work only through the shared executor; do not bypass it with direct console/API mutations.
