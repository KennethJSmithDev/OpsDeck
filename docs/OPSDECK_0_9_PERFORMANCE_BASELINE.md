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

## Measurement notes

- Sizes are filesystem byte counts for the exact browser assets copied by `module.xml`.
- Request count and timing came from the browser Navigation Timing, Resource Timing, Paint Timing, and CDP Performance APIs against the real installed native static application.
- Cold and warm measurements are one observation each and are directional baseline values, not a latency SLO.
- The user was not authenticated in the browser during these measurements. Connected reads, representative navigation, and live workspace render are intentionally unmeasured until a permitted disposable-session browser procedure is available.
