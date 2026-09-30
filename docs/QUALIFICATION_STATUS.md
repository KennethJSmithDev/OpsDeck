# OpsDeck qualification status

**Repository version:** `0.2.0` (release candidate)

**Native qualification branch:** `release/native-ipm-0.2.0`

## Integrated final candidate — 2026-09-30

This tree reconciles native-iris-pivot at d793ef14c39c7c89d2f2cfc55dfb86582f9c94da with main at ddb3c0e2665a853bb854def7c0f18e242db952c6. It preserves same-origin native reads, in-memory credentials, sign-out, fixed providers and strict audit boundaries, and adds the main evaluator tour, persona descriptions, Evidence view and responsive styles. The package identity is opsdeck 0.2.0. Static/unit/browser fixture checks qualify only their tested contracts. R3 is ATTEMPTED / INCONCLUSIVE; final authenticated package lifecycle and source/runtime parity remain unqualified. The historical bundle and prior SHA remain evidence, not qualification of this integrated tree.

### Current release preparation — 2026-09-30

The operator's credential-free capture established BOM-less UTF-16LE output from the installed Terminal. After the reader repair, a bounded real probe returned the authenticated identity and `%SYS` namespace with attempt-specific completion. Read-only inspection returned IRIS 2026.2 Build 221U and `%IPM.Main` class presence, but the package-manager `version` call threw exception code -99; IPM usability/version and installed package state remain unqualified. The earlier lifecycle attempt reached authenticated application capture and stopped in IPM preflight with possible partial bootstrap state. That uncertainty remains unresolved and prohibits automatic bootstrap or lifecycle retry. No current load/uninstall/reload was attempted. Runtime browser observations must identify the installed bundle; they do not qualify the current packaged assets.

The safe demo uses deterministic sanitized data and four authority personas. It does not prove live IRIS permissions, package installation or audit/log completion. See [Evaluator Guide](EVALUATOR_GUIDE.md).


**Status:** reference workflow reproduced; native browser slice reproduced; M1 remains partial. The package lifecycle remains unqualified until the full cycle passes.

### Current native candidate reproduction â€” 2026-09-25

- Candidate branch and base commit: `native-iris-pivot` at `64141ec7eae0e96f7b94b5d6b1f46d2346866741`.
- `npm test`: 32 passed, 0 failed. JavaScript syntax checks and `git diff --check` passed on the candidate working tree.
- `/opsdeck/index.html` loaded from the local IRISTesting instance. On 2026-09-25, the user completed browser sign-in and the app showed authenticated identity `OpsDeckTest`.
- Applications returned 23 web-app records and the independent authoritative read-back matched. REST services returned 9 records and its second read matched.
- Access returned 12 user records with matching second read. Security wallet collections returned an empty collection with matching second read. Tasks returned 16 task records with matching second read. System usage returned one live object; its second sample differed, consistent with changing counters and not claimed as a stable read-back. Logs audit status returned one live object and matching second read. No audit search was started.
- A separate bounded HTTP authentication discriminator returned HTTP 200 from `/api/admin/info`; this is corroborating endpoint evidence, independent of the browser session.
- R1 browser authentication and the selected surface smoke are **PASS** for the existing locally installed native bundle. The local checkout corrections were not deployed to IRIS; see the source-to-runtime comparison below. This does not qualify package installation or deferred audit async and named-source log readers.
- A read-only SHA-256 comparison found `public/index.html` and `src/iris-provider.js` match the live CSP copies; `public/app.js` and `public/styles.css` differ. This confirms the current runtime is not byte-for-byte identical to the candidate checkout.

### Explicit v0.1 deferred dispositions

- Audit async result retrieval: **BLOCKED / UNVERIFIED**. IRIS accepted a bounded request, but the returned route failed the existing strict validator and no result GET was made.
- Native `%SYS.Audit` DB-API path: **UNRESOLVED**. A direct DB-API request did not establish an authenticated identity; no SQL result is claimed.
- Messages native reader: **UNAVAILABLE / DEFERRED**. No supported fixed-source reader is qualified.
- System Monitor native reader: **UNAVAILABLE / DEFERRED**. No supported fixed-source reader is qualified.

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

- Whether `/api/admin/v1/async-result?id=â€¦` is the supported status resource returned by the v2 audit POST, a compatibility route, or an IRIS defect.
- Any async status response, task state, terminal result shape, bounded record count, or continuation/pagination behavior for the audit query.
- Authenticated OpsDeck readers for `messages.log` and `SystemMonitor.log`; only their existence and metadata were inspected.
- The full declared v0.1 Logs baseline and full M1 acceptance.
- A root candidate `module.xml` is present. IPM availability/version in the target namespace; package load/install; uninstall/removal; clean reinstall; and a reproducible package-managed native deployment remain unverified until the actual lifecycle is reproduced.
- Server-side ObjectScript execution through OpsDeck. No ObjectScript bridge exists in this repository. CallIn availability or enablement in the IRIS runtime was not qualified, and OpsDeck makes no CallIn claim.
- The reason `app.js` and `styles.css` differ from their live CSP copies. The fresh browser run authenticated against the existing local native bundle; local checkout changes were not package-deployed.

## Blocked boundary and attempts

### Audit async result

**Earliest failing boundary:** bounded authenticated audit `POST` â†’ HTTP 202 â†’ sanitized, same-origin `Location` â†’ strict route validation rejects the path as `unexpected-path`. No GET was attempted after rejection.

**Attempted:** one bounded query (current test user, rolling ten-minute interval, `maxRows=1`); sanitized inspection of the returned URL structure; comparison with the checked-in SysAdmin operation inventory, which lists both v1 and v2 async-result GET paths.

**Not attempted:** following the v1 Location, guessing or substituting a v2 URL, repeating the query, loosening the route validator, retrieving audit rows, or claiming pagination behavior.

**Next required local evidence:** obtain authoritative route binding/contract evidence that ties the returned v1 path to the v2 audit handoff, or authorize a specifically bounded discriminating runtime test. Only after that boundary is established should one status GET be considered, still enforcing same-origin, exact-route, one-id, and result-size bounds. A terminal bounded result is required before claiming audit search works.

### Named-source logs and packaging

The local files were observed by metadata only. No source implementation was found in the OpsDeck tree, and no fixed-source bridge was deployed. Continue only after identifying a supported IRIS-owned reader and an exact bounded API; do not expose arbitrary paths.

The root `module.xml` is a static candidate only. It copies the four package-owned browser files individually, avoiding the unrelated `proof/` content in the local CSP directory, and declares the Password-authenticated `/opsdeck` application. XML parsing, application tests, syntax checks, and whitespace checks pass. No IPM command was executed: the local authenticated Terminal runner was rejected by the active automation execution policy before reaching IRIS, so even `%IPM.Main` availability/version in `%SYS` remains unknown. The installed `iris.exe` CLI documents instance/routine execution but no direct ObjectScript expression mode; no existing local routine that invokes IPM was identified. The existing OpsDeck REST surface is read-only and `/api/atelier` is disabled. There was no load, install, uninstall, application deletion, or runtime/security change.

**Earliest package boundary not reached:** authenticated local package-manager inspection in `%SYS` using the separate package-install identity. Continue only when that supported local Terminal action can run; then use the actual installed IPM path without changing runtime privileges or Locked Down. A manifest or unit test alone cannot admit package lifecycle claims.

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
- Current candidate base `64141ec7eae0e96f7b94b5d6b1f46d2346866741`: on 2026-09-25, browser authentication as `OpsDeckTest`, Applications (23 records, matched read-back), Access (12 records, matched read-back), Security (empty wallet collection, matched read-back), Tasks (16 records, matched read-back), System usage (one live object; second counter sample differed), and Logs audit status (one object, matched read-back) were observed. No audit search was started. `npm test` passed 32/32 on the candidate working tree with the current corrections; syntax checks, `git diff --check`, and `module.xml` XML parsing passed. This does not qualify the IPM lifecycle.
- Latest sanitized audit follow-up receipt: 2026-09-24. It records `npm test` 32/32, both JavaScript syntax checks, and `git diff --check` as passing at that commit.
- Local verification on 2026-09-25 at tree `361930c`: `npm test` (32 pass, 0 fail); `node --check public/app.js`; `node --check src/iris-provider.js`; `node --check src/server.mjs`; `node --check demo/demo-provider.js`; `git diff --check` (all passed). No live audit follow-up, package operation, CallIn test, or provider expansion was run.

## Next boundary

Continue package lifecycle qualification independently from the audit route-equivalence question. Keep the async response strict, and keep package, fixed-log, and ObjectScript/CallIn claims separate from already reproduced native browser capability.
