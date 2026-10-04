# OpsDeck 1.0 RC qualification — 2026-10-04

**1.0 RC PASS at the owned Docker qualification boundary.** The preserved artifact is ready for deliberate v1.0.0 publication. No tag, release, IPM/Open Exchange upload, Pages publication or source-branch push is performed by this qualification.

## Exact identity and preserved milestones

Authoritative Pre-RC baseline: commit `62f363a41d8dcc70e65cd9fb9093a058736aad4f`, tree `dffb82580047a6054c8f4ee9c203658c51dd8c89`. The final qualification receipt outside Git records the candidate's exact commit/tree after this document and the source repairs are committed. Package identity is **opsdeck 1.0.0**; public, internal and package versions are all 1.0.0, labeled Release Candidate. Git/build metadata remains explicitly unembedded, never inferred.

All nine accepted phases, mutation families, engine/Evidence/authority/read-back/TargetRef/workflow/AI/FX semantics, source-generated accounting, original expanded catalog and logo are preserved. Existing module query-string tokens are stable module cache identities; canonical ProductIdentity and IPM registration determine product/package version.

| Accounting | Count |
|---|---:|
| Declared SysAdmin method/path operations | 276 |
| Exposed | 117 |
| Runtime-observed | 56 |
| Reproduced | 37 |
| Independently verified | 34 |
| Mutation-shaped declared contracts | 161 |
| Exposed mutation endpoints | 7 |
| Qualified mutation workflows | 12 |

## Artifact and reproducibility

- Preserved IPM archive: `opsdeck-1.0.0-rc.tgz`, **154,243 bytes**.
- Archive SHA-256: `178bf6ea3809b023ed76a39ea313cfaf33ff3f5e91a5afbfc2627cadf3faf798`.
- **37** native package/version/build inputs match local source, Git index and a default fresh Windows checkout. They include the module, eight native product classes, 25 runtime assets, package.json, README and LICENSE.
- Input-map SHA-256: `4d464a1ce795f005649397351fe068c70ceb692791bc7a77161edb7044008d61`. Definition: SHA-256 of UTF-8 JSON of the sorted path-to-SHA256 map, compact separators, no trailing newline. The complete map is preserved privately.
- IPM packaging produces **36 file payloads**: generated module XML, eight exported native classes, 25 runtime assets, README and LICENSE. No runtime derived records, grants, credentials or private qualification files are exported.
- A fresh-checkout build and repeated build reproduce every payload file exactly. Native tar member mtimes differ, so compressed archives are not claimed bit-reproducible. Publish the preserved qualified archive by the SHA above; do not substitute a later rebuild without verification.
- The final artifact's 34 module/class/runtime payloads exactly match the archive used for the full native/vector/mobile operation qualification. README and LICENSE complete the release packaging; they introduce no execution code. The final preserved archive was independently freshly installed, mutated/read back/restored, uninstalled and reinstalled.

## Required claim matrix

| Required claim | Actual evidence and scope | Result |
|---|---|---|
| Fresh checkout and full regression | Default checkout byte identity at all 37 build inputs; 259 tests, no failures/skips; source-generated outputs reproduced | PASS |
| Actual package build | Local IPM Package produces .tgz; 25 packaged runtime assets exactly match source; closed exported class/module payloads; archive hash preserved | PASS |
| Fresh Docker product install and native initialization | Owned OPSDECK_08_TEST_TARGET, IRIS 2026.2 Build 221U / IPM 0.10.8; absent OpsDeck state → exact archive load → schema/ownership Validate=1. This is not a fresh-OS or other-version claim | PASS |
| Authenticated connected browser and critical reads | Existing OpsDeckQualify identity; authoritative identity and independent application inventory; security roles/resources, tasks, system, installed packages and fixed logs; same-origin native browser, no synthetic transport | PASS |
| Rehearsal / forecast / review | Native generic role contract produces a canonical plan with target, pre-state/guard, authority, transition, risk, restoration and service effect; rehearsal issues no PUT; exact confirmation binds current plan | PASS |
| Observe Only enforcement | Native harness executor BLOCKED with zero additional requests; connected browser confirmation disabled while ON; initial session ON | PASS |
| Reversible native mutation / receipt / restoration | Existing inert role/resource description families; update and fresh restoration both VERIFIED through the canonical executor; independent description/guard equality; fixture cleanup and absence verified. Browser role update/restoration yields native Verified Receipts | PASS |
| Package inventory and lifecycle | Native inventory reports opsdeck 1.0.0 and zpm 0.10.8; product archive install/remove/reinstall observed. Earlier fixture package install/remove admission remains preserved at its exact authority scope; arbitrary package behavior is not inferred | PASS |
| Embedded Python | Native fixed-log HTTP projection returns opsdeck-embedded-python-log-analysis-v1 findings; native class method execution also observed | PASS |
| Native Vector Search | Actual fixed-log/Python refresh indexes one bounded concept record; native VECTOR_COSINE/HNSW schema path returns a source-linked result; authenticated browser renders SUPPORTED and similarity 0.866. Previously authorized exact temporary derived permissions restored/revoked; DENIED after revocation clears results | PASS |
| Evidence / Session Ledger | Current native session projects observations, rehearsals, confirmations and both Verified Receipts; no second history system | PASS |
| Generic explorer | Packed catalog expands to original semantics; native operation selection, bounded schema input, preview, rehearsal and supported provider adapter; unsupported contracts stay explicit | PASS |
| Mobile and compact height | Actual native critical rehearsal → exact confirmation → update → restoration at 320×568, document width 305; thumb command surface and receipts; desktop/native identity also observed | PASS |
| Update / reinstall | Real installed registration 0.8.0 → exact 1.0.0 archive; native derived fixture survives and is removed; same-version archive reload validates ownership. Refused downgrade attempts remain failures and are excluded from upgrade proof | PASS |
| Uninstall cleanup / unrelated state | All 25 assets, product classes, registration, apps, namespace/database/resource/role and derived directory absent; unrelated module registrations and /csp/sys properties exact; IPM preserved; exact archive reinstall Validate=1 | PASS |
| Privacy / secret scan | 142 staged source files and 36 archive files pass whitelist/high-confidence secret checks; exact password/encoded credential scan finds zero matches in staged source; credentials remain existing DPAPI/in-memory only; raw evidence outside Git | PASS |
| Measurement / inventory / version | 25 manifest assets; 436,614 JS/CSS/HTML bytes + 173,030 lazy JSON bytes = 610,382 total manifest bytes. Counts remain 117/56/37/34/7/12. Canonical product, package.json, module and actual IPM inventory agree on 1.0.0 | PASS |

## Release-blocking repairs and qualification preparation

1. Version/identity owner: replace accepted 0.8.0 / Pre-RC 1.0 metadata with consistent 1.0.0 Release Candidate, refresh only the identity import cache key and corresponding assertions. Existing tests are retained; no semantic guard is weakened. This adds 13 browser-source bytes.
2. DerivedStorage export owner: implement IPM's OnExportItem handled flag. Cached derived data has no package input; Configure reconstructs the owned schema from shipped classes. The earlier export failure was preserved, then actual .tgz build/install/lifecycle and affected native paths were rerun.
3. Canonical package-input attributes: preserve native classes, package metadata, README and LICENSE across fresh Windows checkout. No native controller or operation authority changes.

The image initially lacked a writable /usr/irissys/ipm cache. Qualification created the absent parent and only the opsdeck cache directory for the existing container OS user (private package directory mode 700), without registry changes or broad parent write permission. This is an installer filesystem prerequisite, not an operator permission supplied by the product. Reversible role/resource fixtures and previously approved exact derived SQL/database permissions were restored/removed. No credential was changed or private-access scope broadened. IRISTesting was untouched.

## Known limitations and debt

Task Description HTTP 500 remains known debt, excluded from dispatch admission and counts. Unqualified catalog mutations/read shapes are explicit gaps. The rotation probe returns an explicit failed provider state on this target; no successful rotated-log retrieval claim is admitted. Logs are bounded/truncated and derived similarity is transparent concept navigation, not incident proof or a neural embedding claim. The indexed source includes a previously labeled native qualification event; it is not an actual incident and not a synthetic browser transport.

Qualification is local-source/local-archive on the named IRIS/IPM target with the named identity and temporary exact authority scope. Public registry installation, arbitrary/third-party package safety, other platform versions, broad operator policies, concurrency/scale and external model inference are not inferred. Historical evidence in the UI/docs keeps its dated scope. Compressed package byte reproducibility is not claimed; the exact qualified archive is immutable by hash.

## Evidence locations

Public-safe durable record: this document, generated CAPABILITY_INVENTORY.json/Markdown, representation-measurement.json and the preserved dated milestone documents. Private vault: the local rc-20261004 qualification directory outside Git, containing exact archive, input/payload hash maps, source checkout, regression logs, native build/install/update/lifecycle traces, native mutation/Python/vector receipts, connected desktop/mobile screenshots, failed experiments and preservation manifest. The final checkpoint receipt records candidate commit/tree, artifact hash and evidence manifest. No raw native logs or qualification credentials are staged.
