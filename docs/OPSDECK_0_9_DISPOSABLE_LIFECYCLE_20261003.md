# OpsDeck 0.9 disposable native package lifecycle

**Runtime:** `OPSDECK_08_TEST_TARGET`  
**Image:** `intersystemsdc/iris-community:2026.2-zpm`  
**Digest:** `sha256:68bc1d43c98ca816f2e98a185edc1250bebb6b763f8159da35c8543b09c0df70`  
**IRIS/IPM:** IRIS 2026.2 Build 221U / IPM 0.10.8  
**Scope:** local-source `zpm load /tmp/opsdeck-package` in disposable `%SYS`; this does not qualify a registry install.

## Test sequence and observations

| Phase | OpsDeck | Independent sentinel | Unrelated system portal |
|---|---|---|---|
| Before uninstall | `opsdeck@0.2.1`; `OpsDeck.Product.FixedLogREST` exists; `/opsdeck/index.html` and `/opsdeck/app.js` return 200; anonymous `/opsdeck-api/packages` returns 401. | `opsdeck-lifecycle-sentinel@0.0.1`; `OpsDeck.TestSentinel.Ping` exists; `/opsdeck-sentinel/sentinel.txt` returns 200. | `/csp/sys/UtilHome.csp` returns 200. |
| After `zpm uninstall opsdeck` | Package absent; class existence check returns 0; browser assets and API route return 404. | Package, class, and static file remain; static file returns 200. | Still returns 200. |
| After local-source reinstall | `opsdeck@0.2.1`; class existence check returns 1; static assets return 200; anonymous API route returns 401. | Still present throughout OpsDeck reinstall. | Still returns 200. |
| Fixture cleanup | OpsDeck remains installed. | `zpm uninstall opsdeck-lifecycle-sentinel`; class existence returns 0; route returns 404. Its exact temporary CSP directory was removed. | Still returns 200. |

The sentinel was created only inside this disposable target to test package-boundary preservation. Its manifest declared one test class, one static file, and one test web application. Its setup needed the same narrow per-app CSP child directory preparation described in [the EGEHAR record](OPSDECK_0_9_EGEHAR_20261003.md); the shared CSP parent remained mode `0555`. The built-in `/csp/sys` application provided an additional preservation control.

The target initially failed package activation when the IRIS OS identity could not create `/usr/irissys/csp/opsdeck/`. After creating only that child with the existing IRIS OS owner and mode `0755`, local-source package load and the full uninstall/reinstall sequence succeeded. No user, role, resource, SQL privilege, repository, or host IRISTesting state was changed.

## Qualification boundary

**PASS:** exact local 0.2.1 module source package ownership for the two OpsDeck classes (`OpsDeck.Product.PKG`), `/opsdeck-api`, `/opsdeck`, and its copied browser files in this image/namespace/identity; uninstall removes those tested OpsDeck resources and leaves the test sentinel and system portal intact; reinstall restores the tested resources.

**NOT QUALIFIED:** `zpm install opsdeck` from the configured registry (the registry version observed previously is older than this local source); a browser-authenticated live provider request; another namespace, image entrypoint, or IRIS version; preserving any dynamically-created OpsDeck user data (none exists in this test); a supported production provisioning path for the CSP child directory.

The anonymous `401` on `/opsdeck-api/packages` is the expected authentication boundary and confirms the route exists while the package is installed. It does not establish the authenticated provider response in this target. The accepted earlier authenticated installed-inventory evidence remains separately scoped to its qualified identities/runtime.
