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

**PASS for the exact frozen 0.2.1 candidate. Browser/responsive requalification remains pending.**

The earlier failure state was resolved as qualification-tooling defects:

- the apparent sibling-inventory change was version-dependent `Sort-Object` ordering; corrected cross-engine comparison showed the same 1,504 rows as sets;
- package-operation markers could be glued to IPM output without a leading newline;
- a post-verdict array comparison produced a false negative;
- application-path comparison did not canonicalize both slash styles;
- empty collection properties could collapse to `$null` during validation.

The harness was hardened to:

- use standalone operation-marker framing;
- preserve raw private captures on unresolved semantic results;
- stop before automatic recovery on ambiguous mutations;
- retain item-level sibling rows with ordinal/version-independent sorting;
- canonicalize path separators and empty collection values;
- self-test in Windows PowerShell 5.1 and PowerShell 7.6.5.

The accepted 0.2.0 baseline was then restored and verified before a fresh 0.2.1 run.

The fresh 0.2.1 lifecycle passed:

- exact local-source load;
- `opsdeck@0.2.1` registration;
- authoritative `/opsdeck`;
- deployed resource hashes matching the candidate;
- bounded native smoke;
- uninstall/removal;
- proof and sibling preservation;
- clean same-source reload;
- **82/82** regressions.

Because the installed raw browser/provider bytes changed from the previously qualified CRLF representation, the installed-native browser and responsive matrix must still be rerun before 0.2.1 can be accepted for release.

## UNVERIFIED / DEFERRED

- exact core IPM version used by the accepted v0.2.0 lifecycle;
- fresh-checkout parity for public v0.2.0;
- public registry availability/installation;
- v0.2.1 installed-native browser/responsive requalification;
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

Complete installed-native browser/responsive requalification against the exact 0.2.1 bytes.

If that passes, preserve the accepted 0.2.1 candidate and proceed to the capability-aware morphing UI on a separate feature branch.

See [Roadmap](ROADMAP.md).
