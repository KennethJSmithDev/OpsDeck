# OpsDeck 0.9 performance baseline

Captured on 2026-10-03 before 0.9 feature additions, from branch `integration/opsdeck-1.0-20261002` at `1ade5ff618e51b0d16923299bac3be079871ff26`.

## Browser representation

The served native application consists of one HTML shell, one stylesheet, and six ES modules. Source artifact sizes are:

| Artifact | Bytes |
|---|---:|
| JavaScript modules, 6 total | 191,339 |
| CSS | 36,550 |
| HTML | 448 |
| **Total uncompressed** | **228,337** |

The product loaded as eight initial HTTP requests: the HTML document, stylesheet, and six JavaScript modules. On the first observed load, browser resource `transferSize` values summed to 56,269 bytes. The in-app browser reported Chrome 154, Windows 10/Win64, 1280×720 CSS pixels, DPR 1.

## Render and idle memory

The measured state is the disconnected connect view. It rendered without automating an authentication form and showed the complete shell, navigation, and connection instructions.

| Measurement | First load | Warm reload |
|---|---:|---:|
| DOM content loaded | 85.7 ms | 30.8 ms |
| Load event | 90.2 ms | 33.0 ms |
| First contentful paint | 100 ms | Not exposed after reload by this browser paint-entry API |
| Initial HTTP requests | 8 | 8 (7 subresources served from cache) |

After the warm reload and a two-second idle interval, CDP reported 5,744,100 bytes of V8 JavaScript heap used and 6,946,816 bytes allocated. This is page-target JS heap, not total browser-process memory. No post-login workspace render or workspace-to-workspace latency is included.

## IRIS and package baseline

The isolated official image `intersystemsdc/iris-community:2026.2-zpm` (digest `sha256:68bc1d43c98ca816f2e98a185edc1250bebb6b763f8159da35c8543b09c0df70`) took approximately 7.8 seconds from container start to IRIS enabling logons. The initial product `zpm load` attempt compiled but failed during activation due to the read-only CSP parent directory; after creating the exact package-owned CSP subdirectory with ownership assigned to the existing IRIS OS user, the local-source load completed in the first 1.1-second observation window. This is not a controlled package-load benchmark; a clean load duration and connected usable-render duration remain to be timed.

The image was started through `/iris-main` because its vendor after-start wrapper had previously failed under `ISC_DATA_DIRECTORY`. The later 0.9 work must continue to disclose that limitation. The container, target-specific permission adjustment, and volume are disposable runtime state.

## Post IPM catalog-provider source comparison

After adding the exact-name live repository provider, Packages workspace lookup, and current safe-demo projections, the six shipped JavaScript modules total **203,816 bytes**, CSS remains **36,550 bytes**, and HTML remains **448 bytes**, for **240,814 uncompressed bytes** overall. Relative to the saved pre-addition baseline, JavaScript increased by **12,477 bytes** and total shipped source by **12,477 bytes (+5.46%)**; CSS did not change. The source dependency graph remains eight initial requests. The increase covers exact-name catalog lookup, source identity and coverage states, catalog-to-installed comparison, and compact deterministic demo projections for Packages, Jobs, Evidence, and log findings. It adds no frontend framework or global catalog preload.

The updated `/opsdeck/index.html` was loaded in the in-app browser's disconnected view and rendered the OpsDeck shell without entering credentials. The separate safe-demo bundle was also loaded locally: Overview, synthetic log finding, synthetic Job Center, catalog comparison, and Evidence projections rendered without console errors. This verifies static and deterministic demo rendering only. Current cold/warm timing, post-change transfer bytes, idle heap, connected usable-render, and representative navigation latency have not been measured in this turn; the earlier timing values remain historical baseline observations, not post-change performance claims.

## Catalog relationship and denial-state follow-up

At source checkpoint `404fa9a4223f4a105df2e72ca0ef48c538b565e0`, the exact six browser JavaScript modules named by the package graph total **204,735 bytes**; CSS remains **36,550 bytes** and HTML **448 bytes**, for **241,733 uncompressed bytes** overall. Relative to the saved post-catalog measurement above, this is **+919 bytes** in JavaScript and total source (**+0.38% total**). Relative to the preserved pre-intelligence baseline, the source graph is **+13,396 bytes (+5.87%)**. No module was added, so the initial source request graph remains eight requests.

The small increase represents explicit installed/current/older/newer/unknown package-version relationships and preservation of an upstream catalog HTTP 403 as DENIED. Both states change what the operator can safely conclude; neither preloads additional catalog or inventory data. These are filesystem source-byte counts and a dependency-graph request count, not new network-transfer measurements. Browser cold/warm timing, transferred bytes, heap, authenticated usable-render, and navigation latency remain unmeasured after this change.

At source checkpoint `91d69ab09d9b563bbac4773acfae1c865af76780`, a further **197 JavaScript bytes** render partial configured-repository coverage with an explicit `PARTIAL COVERAGE` warning while retaining observed rows. The graph totals **204,932 JavaScript + 36,550 CSS + 448 HTML = 241,930 uncompressed bytes**, **+197 bytes (+0.08% total)** from the preceding follow-up and **+13,593 bytes (+5.95%)** from the pre-intelligence baseline. There is no additional request or module. These remain source-size measurements; connected browser metrics remain unmeasured.

## Read-only ObjectScript snippet library

The snippet library adds **3,120 JavaScript bytes** and **589 CSS bytes** to the prior measured graph, for **+3,709 bytes (+1.49%)** over **249,471 bytes**. Current initial graph is **215,148 JavaScript + 37,584 CSS + 448 HTML = 253,180 bytes**. The three snippet text bodies total **738 bytes**, are separate package-owned static files, and are fetched only after an operator selects a snippet. Native initial request count remains **8**; selection adds one text request. No framework, provider, or execution surface was added.

The current safe-demo source bundle was staged locally and opened in **Edge**. The snippet disclosure and all three examples rendered; the local static server recorded an HTTP 200 for each selected text asset. Demo initial load made 9 successful asset requests plus its existing expected favicon 404; selecting a snippet adds one request. This is safe-demo source UI evidence, not a connected IRIS qualification. No credentials were entered and no IRIS state changed.

## Provider-neutral operation engine source follow-up

At the current source worktree, the six shipped JavaScript modules total **209,266 bytes**; CSS remains **36,550 bytes** and HTML **448 bytes**, for **246,264 uncompressed bytes** overall. This is **+4,334 JavaScript bytes (+1.79% total)** from the previous measurement and **+17,927 bytes (+7.85%)** relative to the 228,337-byte pre-intelligence baseline. The initial graph remains eight requests because the existing operation-engine module was extended rather than adding another module. The change centralizes pre-state, authority, plan-bound confirmation, one-shot dispatch, read-back, verification, and receipt handling behind a provider contract; the fixture path is an adapter. The implementation is source/unit-test qualified only. No live provider is connected, and post-change transfer, render, heap, or authenticated navigation metrics were not measured.

## Measurement notes

- Sizes are filesystem byte counts for the exact browser assets copied by `module.xml`.
- Request count and timing came from the browser Navigation Timing, Resource Timing, Paint Timing, and CDP Performance APIs against the real installed native static application.
- Cold and warm measurements are one observation each and are directional baseline values, not a latency SLO.
- The user was not authenticated in the browser during these measurements. Connected reads, representative navigation, and live workspace render are intentionally unmeasured until a permitted disposable-session browser procedure is available.

## Contextual IRIS learning help source follow-up

At the source worktree after adding the route-scoped collapsed “IRIS concepts in this view” disclosures, the six shipped JavaScript modules total **212,028 bytes**, CSS is **36,995 bytes**, and HTML is **448 bytes**, for **249,471 uncompressed bytes** overall. Compared with the pre-help operation-engine measurement, this is **+2,762 JavaScript bytes**, **+445 CSS bytes**, and **+3,207 total bytes (+1.30%)**. Relative to the preserved 228,337-byte pre-intelligence baseline, this source graph is **+21,134 bytes (+9.25%)**. The existing six modules remain the same, so the native initial graph remains eight requests. This addition consists of one static concept dictionary, route-to-topic identities, and disclosure styling; no framework, provider, or global state cache was added. The focused rendering test and full local suite pass. The repository's own GitHub Pages build recipe was staged in a temporary local folder and opened in Edge: Overview, Logs, and Packages displayed the scoped help, and package examples remained labeled synthetic. The demo made **nine successful asset requests** (one extra for the demo-provider script); the local static server also logged one expected browser `/favicon.ico` 404 because the demo bundle does not include a favicon. These demo requests are not used to revise the native eight-request baseline or timing measurements. This was source browser smoke only; the installed Docker app was not replaced, no IRIS credentials were entered, and no connected live view was qualified.

## Observed environment-mode shell identity

At the source checkpoint adding an environment-mode badge, the six browser JavaScript modules total **215,676 bytes**, CSS remains **37,584 bytes**, and HTML remains **448 bytes**, for **253,708 uncompressed bytes** overall. This is **+528 bytes (+0.21%)** from the previous 253,180-byte measurement and **+25,371 bytes (+11.11%)** from the preserved 228,337-byte pre-intelligence baseline. The native initial request graph remains eight requests; the feature reuses the existing server-identity response and adds no endpoint, asset, framework, or request. The 528-byte change bounds accepted identity labels and projects the observed system mode in the existing shell. Mode-field presence and display have source/unit-test evidence; actual runtime `/api/admin/info` population of `systemMode` remains unverified, so no live-environment badge claim is made.
