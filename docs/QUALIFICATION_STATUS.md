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

- the ACD0/F94A sibling digest discrepancy was reproduced from the same current 1,504-row inventory by version-dependent `Sort-Object` ordering; ordinal sorting is stable across both engines;
- the original 09:20 item rows were not retained, so the historical transient window cannot be reconstructed and no claim is made that transient sibling activity was impossible or harmless;
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

### Installed-native browser result

**PARTIAL PASS. Responsive matrix still UNVERIFIED.**

A read-only identity gate against the installed 0.2.1 state passed:

- `opsdeck@0.2.1` registered in `%SYS`;
- `/opsdeck` present and enabled;
- all four deployed resource hashes matched the frozen candidate and lifecycle receipt;
- proof inventory matched its saved snapshot;
- the 1,504-row sibling inventory matched the saved post-lifecycle snapshot item-for-item.

The existing authenticated native browser session then reproduced:

- live identity `OpsDeckTest` on IRIS 2026.2 Build 221U;
- Overview with 23 applications;
- Applications with 23 applications and matching independent list/REST read-backs;
- Access with 12 records and matching second read;
- Tasks with 16 records and matching second read;
- Security as a valid matched empty collection;
- Logs audit status with matching second read while audit-record retrieval remained explicitly blocked/unqualified;
- Evidence wording correctly describing the shipped v0.2.0 lifecycle as historical qualification;
- Sign out clearing the connected identity and returning to the disconnected connect screen.

System usage produced a differing second sample during observation. No stability/equality claim is made for changing counters.

At the available 1912 px viewport, representative routes had matching document/client widths and no ordinary horizontal scrollers.

The required exact 320, 390, 600, 820, 1024, and 1440 CSS px checks could not be run because the attached Edge controls exposed no exact viewport setter; keyboard zoom did not change the measured CSS viewport. Approximate widths were deliberately not substituted.

Therefore the exact responsive-width matrix, wide → narrow → wide behavior, and selected-resource preservation across that transition remain **UNVERIFIED** for the installed 0.2.1 raw bytes.

0.2.1 is not release-qualified until that gate passes.

## UNVERIFIED / DEFERRED

- exact core IPM version used by the accepted v0.2.0 lifecycle;
- fresh-checkout parity for public v0.2.0;
- public registry availability/installation;
- v0.2.1 exact responsive-width matrix and wide → narrow → wide state-preservation requalification;
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

Provide a browser-control path that can set the exact requested CSS viewport widths, then complete the 320/390/600/820/1024/1440 matrix and wide → narrow → wide state-preservation check against the still-installed exact 0.2.1 bytes.

No package reinstall or product mutation is required merely to close this UI evidence gap.

If that passes, preserve the accepted 0.2.1 candidate and proceed to the capability-aware morphing UI on a separate feature branch.

See [Roadmap](ROADMAP.md).
