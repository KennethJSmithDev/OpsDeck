# OpsDeck 1.1.0 native qualification — 2026-10-16

**Native package/lifecycle gates PASS; authenticated browser gate BLOCKED. No overall native RC PASS.**

## Exact identities

- Qualified product source: `bdda41acdf89769129f23fdc48223ebdd15fd063`, tree `27711a7452c29b1621a48c6f79327186811ee233`.
- Source-input archive: `opsdeck-1.1.0-source.tgz`, SHA-256 `b27e1aad0f7f15b40fb6fcd4890e964ea7d84eab2d04753c2ce00f4ae7a69112`.
- Actual IPM-native export: **`opsdeck-1.1.0-native.tgz`**, **166,083 bytes**, SHA-256 **`88e5dc6e07f81eadd6ac1240bf2cfc703803eceeb1c55a3ce8b15e7be757f912`**. Preserve this artifact unchanged for the remaining browser qualification.
- Native export has 36 file payloads: eight native product classes, 25 runtime assets, module XML, README and LICENSE. The module and product identity report 1.1.0. All 25 source/native payload/deployed asset bytes match the source commit. Runtime manifest remains 648,915 bytes.

## Authority and environment

The user explicitly authorized opening Docker and the correct IRIS instance and running local qualification while away. Only the established disposable `OPSDECK_08_TEST_TARGET` was started and used: IRIS 2026.2 Build 221U, persistent existing qualification volume, HTTP loopback 127.0.0.1:52774. Existing OS-authenticated `irisowner` native session was used for IPM; no password reset, new user/grant, service-authentication change or private-access expansion occurred. IRISTesting remains untouched.

## Observed gates

| Gate | Actual evidence/result |
| --- | --- |
| Pre-state | opsdeck 1.0.0; ownership Validate=1 and CleanupPreflight=1; deployed prior identity matches published-linked archive; prior assets preserved privately |
| Source archive load | IPM Reload/Validate/Compile/Configure PASS; registration 1.1.0 |
| Native package build | `package opsdeck -path /tmp/opsdeck-110-native-export` PASS; output is sibling `.tgz`, not inside the export directory |
| Exact native archive reload | Reload/Compile/Configure PASS; registration 1.1.0, ownership Validate=1 |
| Published-baseline upgrade | Installed actual OEX-linked archive (SHA `78534ed4893afe10a7dd4223363a0d0c822395d85fe6bdf5c5c2573983cfa253`), registration 1.0.0; then exact native 1.1.0 archive upgraded successfully |
| Derived preservation | One explicitly disposable row inserted into an empty owned derived table; read back before/after upgrade; identity/text retained. Row deleted and table restored to zero rows |
| Native uninstall | IPM registration, both OpsDeck apps, checked product class, derived namespace/database/resource absent; IPM class and checked sibling /csp/sys properties preserved |
| Fresh native install | After uninstall, exact native archive load/compile/configure PASS; registration 1.1.0; ownership Validate=1 |
| Restart | Container restarted; registration 1.1.0, Validate=1, derived table empty, sibling properties unchanged; container healthy |
| Native HTTP delivery | /opsdeck/index.html and /opsdeck/product-identity.js HTTP 200; exact source bytes |
| Auth enforcement | Unauthenticated /api/admin/info and /api/admin/v2/web-apps return 401. This proves authentication is demanded, not successful authenticated reads |
| Authenticated browser/learning | **BLOCKED / UNVERIFIED**: protected qualifier credential file previously used is absent; browser-control inventory has no connected browsers. A request to open native OpsDeck in Codex is queued, not proof of a loaded or authenticated page |

## Limitations and failed probes

Open Exchange's authoritative listing remains **1.0.1** while its actual linked archive registers **1.0.0**. This qualification proves the observed published-package 1.0.0 → 1.1.0 transition; it does not manufacture a 1.0.1 registration.

Uninstall removed owned static files but retained an **empty static directory**. Complete directory removal is not claimed. No source change or manual directory deletion was made to hide this result.

An initial read-only count probe used the wrong SQL table name; the corrected `OpsDeckDerived.VectorRecord` query returned zero. An exploratory package-storage class lookup was unavailable; actual registration was verified with IPM list instead. These probes changed no server state. Native build output location was verified before copying the archive.

Historical version-preparation regression remains **272/272 PASS**; no tests were rerun because product source was unchanged. No new browser/native-mutation workflow proof is inferred from package success. The earlier native 320px Learning OFF screenshot remains UNVERIFIED; actual novice comprehension remains UNVERIFIED.

## Final state and evidence

Docker Desktop and the named target are left running healthy with **opsdeck 1.1.0** installed. The disposable preservation row is removed. The separate quick-start container remains stopped. Existing v1.0.1 listing/release, qualified historical artifacts and unrelated untracked files are preserved; no push, merge, tag, deployment, public release or issue closure.

Local evidence outside the product repository: `artifacts/opsdeck-v1.1.0-native-20261016/`, including exact native archive, native traces, qualification-receipt.json, payload/deployed hash maps, HTTP results and evidence-manifest.json. Raw evidence is not staged.

## Next boundary

Restore access to the existing authorized qualifier credential through its approved mechanism, and connect a browser to the target. Then qualify authenticated /api/admin reads and the shared guided-learning flow using this preserved exact native artifact. Recheck after restart. Do not reset credentials, grant privileges, access IRISTesting or publish merely to remove the blocker.
