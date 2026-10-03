# OpsDeck 0.9 EGEHAR — isolated package-load blocker

Date: 2026-10-03  
Runtime: official `intersystemsdc/iris-community:2026.2-zpm`, digest `sha256:68bc1d43c98ca816f2e98a185edc1250bebb6b763f8159da35c8543b09c0df70`

## Local failure

| Field | Observation |
|---|---|
| Symptom | `zpm load /tmp/opsdeck-package` compiled its ObjectScript classes, then failed during activation with `<13> Permission denied` creating `/usr/irissys/csp/opsdeck/`. |
| Boundary | The failure occurred while copying package static assets to the CSP filesystem, after class compilation. |
| Owning layer | Container OS directory permissions, not the IPM package registry or IRIS class compiler. |
| IRIS version | IRIS 2026.2 Build 221U; IPM 0.10.8. |
| Current authority | IRIS and its process ran as existing `irisowner` uid/gid 51773. No IRIS privilege or role was changed. |
| Reproduction | In the disposable Docker target, copy the local package source to `/tmp/opsdeck-package` and run `zpm load /tmp/opsdeck-package`. Compilation succeeds; activation fails at directory creation. |
| Earliest failure | Creation of `/usr/irissys/csp/opsdeck/` returns `<13>`. |

Direct read-only inspection found `/usr/irissys` mode `0500`, `/usr/irissys/csp` mode `0555`, and no `opsdeck` child. After failure, `zpm list opsdeck*` returned no package, establishing a clean retry boundary.

## Bounded reconnaissance and resolution class

The official IPM documentation describes module resources and file copies as package-managed resources. The official IRIS installation-manifest documentation describes CSP application installation resources. These corroborate the failing artifact boundary; the measured image permissions identify the local cause. No competitor implementation source was opened or used.

On this one isolated disposable target, root created only `/usr/irissys/csp/opsdeck`, assigned to the existing IRIS process owner (51773:51773), mode `0755`. The parent CSP directory remained read-only. Repeating the same local-source `zpm load` then completed successfully. This is a test-target preparation, not a production deployment fix.

| EGEHAR field | Decision |
|---|---|
| Problem | Official image CSP parent disallows the non-root package loader from creating the app-owned child directory. |
| Transferable idea | Make only the product-specific CSP subtree writable to the IRIS runtime identity. |
| OpsDeck-native design | A reproducible image/test-target preparation for `/usr/irissys/csp/opsdeck`; retain read-only permissions on the shared parent. Product installation guidance must state or automate this prerequisite without broad permission changes. |
| Why minimum | One child directory is writable; no shared directory mode, IRIS role, SQL privilege, user, repository, or host state changes. |
| Test | Local package load as the normal IRIS process identity after confirming the package was absent following the first failure. |
| Representation cost | Small target setup requirement. A product-owned Docker/deployment path is still needed to make it reproducible for users. |
| Tradeoff | Narrow filesystem preparation preserves shared image permissions but means an unprepared image can reject the static-file copy step. Do not broaden `csp` permissions as a workaround. |

## Official corroboration

- [InterSystems IRIS IPM documentation](https://irisdocs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=AIPM) documents module resources and package-managed files.
- [InterSystems IRIS installation manifest documentation](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GIEMISC_manifest) documents manifest-managed installation resources including CSP applications.

This record documents a blocker and an isolated resolution class. It is not a general Docker image defect report, a claim that the target adjustment is the supported production installation procedure, or authorization to change host permissions.
