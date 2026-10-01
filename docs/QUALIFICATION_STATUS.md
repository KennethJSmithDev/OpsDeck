# OpsDeck qualification status

**Current public release:** `v0.2.0`  
**Release commit:** `23215459096cb47d255c45b1e6e86687f3d8e93a`  
**Tested package source:** `1663869af14673f027efb63a986ac5c1e50a8ac1`  
**Package:** `opsdeck 0.2.0`  
**Tested runtime:** native Windows IRIS 2026.2 Build 221U, `%SYS`

This file records the current public evidence boundary. Detailed private receipts remain in P001 CompDocs.

## ACCEPTED — v0.2.0

### Local-source lifecycle

The controlled lifecycle reproduced:

- local-source load;
- `opsdeck 0.2.0` registration;
- authoritative `/opsdeck`;
- exact deployed resource hashes;
- bounded operational HTTP checks;
- uninstall/removal;
- unrelated proof/sibling preservation;
- clean same-source reload;
- **82/82** product regressions.

### Installed native browser

Observed as `OpsDeckTest`:

- Overview identity;
- 23 web applications with independent read-back;
- Applications detail;
- Access users/resources with matching exercised second reads;
- valid empty Security wallet collection;
- 16 Tasks and selected detail;
- live System counters;
- Logs audit status with audit-record retrieval explicitly unqualified;
- sign-out clearing visible connected/provider state.

### Responsive behavior

Eight routes were checked at:

`320, 390, 600, 820, 1024, 1440 CSS px`

Measured pages had zero document horizontal overflow in the exercised matrix. A no-reload wide → narrow → wide sequence preserved selected Applications state and usable compact navigation.

## POST-RELEASE FINDING — v0.2.0

A fresh Windows checkout with `core.autocrlf=true` can materialize some package-input files with CRLF even though the tested source/Git blobs are LF.

Therefore:

- accepted v0.2.0 lifecycle evidence remains accepted for its tested source identity;
- exact fresh-checkout byte parity for public v0.2.0 is not claimed;
- the v0.2.0 tag is preserved;
- the correction belongs in a new patch candidate.

## DEVELOPMENT — v0.2.1 candidate

Frozen local candidate:

`69e1215febab5008fc0542d96c0e921f638b4502`

The candidate verified:

- `package.json` and `module.xml` identity at `0.2.1`;
- fresh Windows checkout under `core.autocrlf=true`;
- all five package inputs byte-identical to their Git blobs;
- 82/82 tests;
- JavaScript syntax;
- XML/package identity;
- `git diff --check`.

### Native lifecycle result

**FAILED / UNRESOLVED. No v0.2.1 qualification claim.**

The attempt stopped because:

1. `LOAD_INITIAL` completed Terminal transport but did not preserve the required exact `P001_OP_LOAD_INITIAL=1` operation marker;
2. the retained sanitized receipt does not contain the raw IPM output needed to classify the operation result;
3. legacy failure recovery attempted uninstall despite the ambiguous result;
4. post-recovery registration and `/opsdeck` were absent;
5. package-owned resource hashes were restored and proof inventory matched;
6. an independent CSP sibling inventory outside `CSP\opsdeck` changed digest while retaining the same 1,504-entry count;
7. no item-level pre-capture sibling rows survive, so the changed item cannot currently be identified.

No baseline restoration or new lifecycle attempt should occur until both the sibling delta and the IPM result-capture path are resolved.

## UNVERIFIED / DEFERRED

- exact core IPM version used by the accepted v0.2.0 lifecycle;
- fresh-checkout parity for public v0.2.0;
- public registry availability/installation;
- v0.2.1 native lifecycle;
- audit asynchronous result retrieval;
- authenticated bounded readers for `messages.log` and `SystemMonitor.log`;
- broad mutation workflows;
- Docker parity;
- arbitrary ObjectScript/CallIn execution;
- formal least-privilege proof across all providers.

## Audit async boundary

A bounded authenticated audit query returned HTTP 202 with a same-origin Location using:

```text
/api/admin/v1/async-result?id=...
```

The current strict client permits the expected v2 status route and rejected the v1 path before a status GET. No route substitution or completion claim is admitted.

## Next boundary

Read-only diagnosis only:

- localize or reconcile the sibling-inventory difference;
- recover or otherwise establish the IPM lifecycle result boundary without speculative mutation;
- repair qualification tooling only after the owning failure is evidenced.

After distribution fidelity is accepted, the next product-facing milestone is the capability-aware morphing UI.

See [Roadmap](ROADMAP.md).
