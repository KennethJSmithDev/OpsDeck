# OpsDeck footprint comparison staging — 2026-10-04

> Comparative engineering note. Keep methodology visible; do not turn unlike measurements into a leaderboard claim.

## OpsDeck accepted integration

Accepted checkpoint: `3e1680ffeb1f3d855203e086e0f1fbcf4bb5abd9`.

- Browser JS/CSS/HTML: **417,697 bytes (~408 KiB)**
- Lazy JSON/schema metadata: **233,377 bytes (~228 KiB)**
- Complete 23-file manifest: **651,812 bytes (~637 KiB)**
- Exposed IRIS operations: **113**
- Runtime-observed: **51**
- Reproduced: **31**
- Independently verified: **28**
- Historically qualified mutation workflows: **6**

## Live competitor production browser artifacts

Measured from files committed in the current public GitHub repositories, not repository size.

| Product | Production browser artifact measured | Bytes | Approx |
|---|---|---:|---:|
| OpsDeck | qualified browser JS/CSS/HTML | 417,697 | 408 KiB |
| FlightDeck | `frontend/dist/` | 806,112 | 787 KiB |
| OcuPilot 1.0.8 | `ui/dist/` | 2,926,179 | 2.79 MiB |
| Aperture 1.3.0 | `www/` | 2,957,465 | 2.82 MiB |

Live repositories:

- Aperture: https://github.com/MxSalata/aperture
- FlightDeck: https://github.com/kcedd34/iris-flightdeck
- OcuPilot: https://github.com/jbrandtmse/OcuPilot
- SentaiTask: https://github.com/musketeers-br/sentai-task

### Useful comparisons

- OpsDeck's **entire accepted 23-file manifest (~637 KiB)** is smaller than FlightDeck's committed frontend distribution (~787 KiB).
- OcuPilot's current main production JavaScript bundle is ~2.45 MB, larger by itself than OpsDeck's entire accepted manifest.
- Aperture's committed `www/` production frontend is ~2.96 MB; its IPM/backend material is additional.

## Methodology caveats

Do **not** claim “smallest portal in the contest” from this table.

Reasons:

1. Not every contestant commits a directly comparable built production directory.
2. Browser bundles and complete package manifests are different denominators.
3. Docker base images and IRIS itself are intentionally excluded.
4. Documentation, tests, screenshots, and development dependencies are excluded from OpsDeck's shipped-manifest number and should be excluded from competitors too.
5. SentaiTask's production frontend/model deployment needs a separate reproducible build measurement before comparison.

## README-ready factual block

### Compact by architecture

OpsDeck's complete application manifest is approximately **637 KiB**, including its browser application and product-owned runtime assets. The browser representation is approximately **408 KiB uncompressed**.

At the accepted integration checkpoint, that compact representation exposes **113 IRIS operations** while also providing verified operation planning, Evidence, workflows, multi-target semantics, native Vector Search, Embedded Python analysis, adaptive mobile UX, and optional FX Studio customization.

OpsDeck stays small by composing capabilities over shared semantic contracts rather than duplicating state and execution machinery.

Do not publish this block until final-release measurements replace the integration values.
