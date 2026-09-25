# Qualification Status

**Public version:** `0.1.0`  
**Updated:** 2026-09-25

OpsDeck separates three kinds of evidence:

1. the public reference runtime and automated tests;
2. historical native IRIS observations preserved on the native qualification line;
3. the public safe demo, which uses sanitized deterministic sample data and is **not** live IRIS evidence.

This document intentionally does not turn unfinished work into release claims.

## Qualified / reproduced boundaries

### Reference runtime

The public reference runtime has reproduced:

- live IRIS identity through bounded management routes;
- web-application discovery;
- independent web-application read-back comparison;
- fixed provider registration;
- explicit safe-field projections;
- provider-error handling;
- automated server/provider/bootstrap tests.

### Native IRIS milestone

A separate qualification branch preserves the reproduced native direction.

Historical local observations include:

- IRIS-hosted OpsDeck at `/opsdeck/index.html`;
- authenticated browser session;
- live server identity;
- web-application discovery and matching read-back;
- selected Applications, Access, Security, Tasks, System, and Logs provider reads.

These are historical scoped observations. They do not imply that every provider or package lifecycle has been reproduced from the current public `main` checkout.

### Safe demo

The public GitHub Pages demo is deliberately evaluator-safe:

- no IRIS connection;
- no credentials;
- deterministic sanitized records;
- four authority personas;
- explicit empty / unavailable / denied semantics;
- guided evaluator tour;
- Evidence view.

The demo proves UI/provider semantics only.

## Current unresolved boundaries

### Audit query

A bounded live audit query was accepted by IRIS with HTTP 202.

The returned async-result route did not match the exact route admitted by OpsDeck's strict validator, so OpsDeck refused to follow it.

No URL rewriting, route substitution, or validator relaxation was used.

A second native-audit approach is under qualification, but no audit row has yet been returned through that path.

Therefore OpsDeck does **not** currently claim completed live audit search.

### Named log files

Local metadata established that Messages and System Monitor log files exist in the target IRIS installation.

OpsDeck has not yet qualified a fixed authenticated reader for those files.

File existence is not represented as log-read capability.

### Native package lifecycle

The intended release direction is an IRIS-native application.

Still unverified:

- final package manifest against the release namespace;
- package load/install;
- uninstall/cleanup;
- clean reinstall;
- final candidate reproduction.

No IPM/ZPM deployment claim should be inferred until that lifecycle passes.

## Design rule

OpsDeck distinguishes:

```text
verified
empty
unavailable
denied
blocked
unverified
```

These states are intentionally not collapsed into one generic success/failure indicator.

## Branch boundary

The public `main` branch contains the public reference runtime, evaluator demo, and release documentation.

The native qualification line is preserved separately while native packaging is finalized.

Do not assume that divergence means the native milestone was discarded; it is preserved specifically to avoid overwriting accepted runtime evidence during evaluator/documentation work.

## Final release gate

The release README and package claims will be updated only after the final candidate is reproduced against local IRIS and the installation lifecycle is verified.
