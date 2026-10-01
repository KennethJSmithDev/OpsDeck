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

**FAIL for the exact frozen 0.2.1 candidate. Phase C remains gated.**

The pre-browser read-only identity gate passed:

- `opsdeck@0.2.1` registered in `%SYS`;
- `/opsdeck` present, enabled, and matched authoritative application detail;
- all four deployed asset hashes matched the frozen candidate and lifecycle receipt;
- proof inventory matched its saved snapshot;
- the 1,504-row sibling inventory matched the saved post-lifecycle snapshot item-for-item.

Representative installed-native browser checks also passed:

- live identity `OpsDeckTest` on IRIS 2026.2 Build 221U;
- Overview with 23 applications;
- Applications with 23 applications and matching independent list/REST read-backs;
- Access with 12 records and matching second read;
- Tasks with 16 records and matching second read;
- Security as a valid matched empty collection;
- Logs audit status with matching second read while audit-record retrieval remained explicitly blocked/unqualified;
- Evidence wording correctly describing the shipped v0.2.0 lifecycle as historical qualification;
- Sign out clearing the connected identity and authenticated route state.

System usage produced a differing second sample during observation. No stable-equality claim is made for changing counters.

Exact viewport control was then established for:

`320, 390, 600, 820, 1024, 1440 CSS px`

All **48 route-at-width observations** rendered at their requested width with:

- zero document-level horizontal overflow;
- zero ordinary horizontal scrollers;
- expected route hash.

However, the separate no-reload Applications transition failed:

`1440 → 320 → 390 → 600 → 820 → 1024 → 1440`

The selected `/opsdeck` resource and Applications route were preserved without reload, but at 320, 390, and 600 CSS px:

- document scroll width was 714 px;
- client widths were 305, 375, and 585 px respectively;
- both inventory tables retained computed `min-width: 660px`;
- no ordinary horizontal scroller contained the overflow.

The localized elements are:

- `.apps-layout .panel.table-panel table`
- `.provider-layout .panel.table-panel table`

The base stylesheet sets `table { min-width:660px }`, while the responsive inventory container rule is intended to set the table minimum to zero below 700 px. On the failed in-place resize path the card-style container rules applied, but the 660 px table minimum remained stale. A route re-render at the same width, or a scroll-driven layout recalculation, cleared the table minimum to zero and removed the overflow.

Therefore:

- route-at-width rendering is accepted at the observed boundary;
- selected-resource preservation across the transition is accepted;
- the **responsive no-reload transition gate is FAIL**;
- the owning product boundary is responsive inventory-table styling;
- the precise style/layout invalidation trigger remains unverified;
- no product source was changed during qualification;
- Phase C has not started.

A separately authorized responsive-fix candidate is required before 0.2.1 can be release-qualified.

## UNVERIFIED / DEFERRED

- exact core IPM version used by the accepted v0.2.0 lifecycle;
- fresh-checkout parity for public v0.2.0;
- public registry availability/installation;
- v0.2.1 responsive no-reload transition correction and requalification;
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

Keep the frozen commit `69e1215febab5008fc0542d96c0e921f638b4502` and accepted v0.2.0 evidence unchanged.

Create a separate responsive-fix branch only under explicit authorization. Localize and correct the stale inventory-table minimum-width behavior with the smallest justified product change, then rerun the affected installed-native browser/responsive evidence against the corrected exact bytes.

Do not start Phase C until the browser gate explicitly passes.

See [Roadmap](ROADMAP.md).
