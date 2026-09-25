# OpsDeck qualification status

**Repository version:** `0.1.0`  
**Native qualification branch:** `native-iris-pivot`  
**Status:** reference workflow reproduced; native browser slice reproduced; M1 and package lifecycle remain partial/unverified.

This record applies EGEHAR's evidence rule: a result admits only the boundary that was observed. Historical local runtime receipts are identified as historical observations; they are not represented as a fresh reproduction at every later checkout.

## KNOWN

- The local checkout has a separate Node reference runtime and a browser client that can be served as static files by IRIS. Native browser API calls use bounded same-origin routes; the repository contains no server-side ObjectScript execution or CallIn bridge.
- Historical native Windows IRIS 2026.2 observations reproduced the explicit entry URL `/opsdeck/index.html`, its relative assets, browser sign-in as the dedicated `OpsDeckTest` identity, live identity, a 23-entry web-app list with matching independent read-back, and selected Applications, Access, Security, Tasks, System, and Logs reads. Sign-out returned the UI to sign-in. The native evidence is recorded in the private project qualification receipts; this public record preserves only sanitized route/status/shape evidence.
- The local test identity previously needed `%DB_IRISSYS:R` and `%DB_USER:R` in addition to its six `%Admin_*:U` grants for the currently qualified native reads. Those grants were observed to change the failing routes to HTTP 200; they are not represented as a formally proven minimum privilege set.
- One authenticated native audit query, filtered to the current test identity, a rolling ten-minute interval, and `maxRows=1`, returned HTTP 202. Its `Location` was structurally same-origin and contained exactly one nonempty `id` query value. Only sanitized structure was retained.
- The frontend's strict validator requires `/api/admin/v2/async-result` and rejected the observed `/api/admin/v1/async-result` with `unexpected-path`. It did not issue a status GET. That refusal preserves the exact-route boundary.
- Native `messages.log` and `SystemMonitor.log` files were found by file metadata only. Their contents were not read, and the OpsDeck tree has no fixed-source reader for them.
- A safe-demo provider supplies deterministic sanitized sample records separately from the live IRIS provider. The GitHub Pages workflow builds only the demo HTML, provider, frontend assets, and provider adapter; demo records are not live IRIS evidence.
- On 2026-09-25, `node --version` reported `v24.21.0`. `npm test` on merged tree `361930c` (including product commit `daa07d1ec22a888522b7dad03d76dfff3ccd2db2`) passed 32/32 (0 failed, 0 skipped). `node --check public/app.js`, `node --check src/iris-provider.js`, `node --check src/server.mjs`, and `git diff --check` passed before documentation changes. This suite includes synthetic auth/provider/async/fixed-log cases; it does not reproduce native IRIS behavior.
- At that same inspection, Windows services `IRIS_c-_devops_iris` and `IRISTestinghttpd` reported Running, and loopback TCP checks to ports 52773 and 1972 succeeded. Those checks establish listener availability only, not successful authentication or the unresolved route semantics.

## INFERRED

- The current audit qualification gap is localized after the query POST and URL-shape inspection but before any async-result GET: the observed route version does not match the one route the client currently permits, and available evidence does not establish that the v1 resource is equivalent to the documented v2 status resource.
- The absence of an OpsDeck reader is an integration/socket gap for Messages and System Monitor. File metadata proves the files exist, but it does not prove that a supported authenticated reader exists or what its safe projection should be.
- The documented native UI/provider slices are independent of the unresolved audit async path and fixed-source log integration. The Node reference workflow, safe demo, and already qualified native routes therefore remain useful and must not be described as wholly unfinished.
- Passing synthetic tests validates the guard and mapping logic at their test boundary. It cannot establish live provider attachment, ObjectScript execution, IPM lifecycle behavior, or full M1 acceptance.

## UNVERIFIED

- Whether `/api/admin/v1/async-result?id=…` is the supported status resource returned by the v2 audit POST, a compatibility route, or an IRIS defect.
- Any async status response, task state, terminal result shape, bounded record count, or continuation/pagination behavior for the audit query.
- Authenticated OpsDeck readers for `messages.log` and `SystemMonitor.log`; only their existence and metadata were inspected.
- The full declared v0.1 Logs baseline and full M1 acceptance.
- IPM availability/version in the target namespace; package load/install; uninstall/removal; clean reinstall; and a reproducible package-managed native deployment. No `module.xml` or package lifecycle claim is present.
- Server-side ObjectScript execution through OpsDeck. No ObjectScript bridge exists in this repository. CallIn availability or enablement in the IRIS runtime was not qualified, and OpsDeck makes no CallIn claim.
- A current fresh authenticated native browser run from this checkout. Historical browser evidence remains scoped to the bundle/runtime identity recorded at the time.

## Blocked boundary and attempts

### Audit async result

**Earliest failing boundary:** bounded authenticated audit `POST` → HTTP 202 → sanitized, same-origin `Location` → strict route validation rejects the path as `unexpected-path`. No GET was attempted after rejection.

**Attempted:** one bounded query (current test user, rolling ten-minute interval, `maxRows=1`); sanitized inspection of the returned URL structure; comparison with the checked-in SysAdmin operation inventory, which lists both v1 and v2 async-result GET paths.

**Not attempted:** following the v1 Location, guessing or substituting a v2 URL, repeating the query, loosening the route validator, retrieving audit rows, or claiming pagination behavior.

**Next required local evidence:** obtain authoritative route binding/contract evidence that ties the returned v1 path to the v2 audit handoff, or authorize a specifically bounded discriminating runtime test. Only after that boundary is established should one status GET be considered, still enforcing same-origin, exact-route, one-id, and result-size bounds. A terminal bounded result is required before claiming audit search works.

### Named-source logs and packaging

The local files were observed by metadata only. No source implementation was found in the OpsDeck tree, and no fixed-source bridge was deployed. Continue only after identifying a supported IRIS-owned reader and an exact bounded API; do not expose arbitrary paths. Package qualification separately requires a real installed IPM namespace and a clean load/install/uninstall/reinstall lifecycle. A manifest or unit test alone cannot admit that claim.

### ObjectScript / CallIn

The current implementation calls official IRIS REST APIs from the browser and uses Node only for its separate reference proxy. It does not invoke ObjectScript code. CallIn service state was not tested in the current checkpoint. No execution capability should be claimed unless service availability, authorization, a bounded call, and its semantic result are independently reproduced.

## Unaffected functionality

- Node reference server, fixed provider routes, safe mappings, session behavior, and their automated tests.
- Sanitized safe demo and its static Pages build workflow.
- Historical native static hosting at `/opsdeck/index.html`, browser authentication, identity/web-app read-back, and the specifically observed native provider reads.
- Other native UI/provider routes that do not depend on audit async completion or a fixed-source Messages/System Monitor bridge.

The unaffected items above remain scoped to their own evidence. They do not imply whole-product parity, an installable package, or native ObjectScript execution.

## Preservation and test record

- Product source SHA qualified by the latest local suite: `daa07d1ec22a888522b7dad03d76dfff3ccd2db2`; the suite ran on merged tree `361930c`.
- Latest sanitized audit follow-up receipt: 2026-09-24. It records `npm test` 32/32, both JavaScript syntax checks, and `git diff --check` as passing at that commit.
- Local verification on 2026-09-25 at tree `361930c`: `npm test` (32 pass, 0 fail); `node --check public/app.js`; `node --check src/iris-provider.js`; `node --check src/server.mjs`; `node --check demo/demo-provider.js`; `git diff --check` (all passed). No live audit follow-up, package operation, CallIn test, or provider expansion was run.

## Next boundary

Stop at the route-equivalence question. Resume native audit qualification only with authoritative evidence or an approved bounded test that can discriminate the v1/v2 route relationship. Keep the async response strict, and keep package, fixed-log, and ObjectScript/CallIn claims separate from already reproduced native browser capability.
