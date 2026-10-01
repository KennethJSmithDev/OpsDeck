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

## ACCEPTED — v0.2.1 distribution fidelity

**Corrected accepted candidate:** `50205ed79dbd80a768d67c2455d514c09bbc5999`  
**Branch:** `fix/0.2.1-responsive-inventory-reflow`  
**Package:** `opsdeck@0.2.1`

The failed responsive specimen `69e1215febab5008fc0542d96c0e921f638b4502` remains preserved and unchanged as historical evidence.

### Source representation

A fresh Windows checkout with `core.autocrlf=true` reproduced all five package-input Git blobs exactly.

### Local lifecycle

The corrected candidate passed the controlled 16-stage local-source lifecycle:

- registration as `opsdeck@0.2.1`;
- enabled `/opsdeck` in `%SYS`;
- deployed resource hashes matched the fresh checkout;
- bounded native smoke passed;
- uninstall/removal verified;
- proof and 1,504 canonical sibling rows preserved;
- clean same-source reload verified;
- **82/82** regressions passed.

### Installed-native responsive qualification

**PASS.**

The installed browser loaded the 0.2.1 stylesheet cache key and the corrected CSS rule:

`table { width: 100%; min-width: 0px; border-collapse: collapse; }`

All **48 route-at-width samples** passed across:

`320, 390, 600, 820, 1024, 1440 CSS px`

with:

- zero document horizontal overflow;
- zero ordinary horizontal scrollers;
- expected route rendering.

The no-reload Applications sequence also passed:

`1440 → 320 → 390 → 600 → 820 → 1024 → 1440`

with:

- route preserved;
- selected `/opsdeck` resource preserved;
- all inventory tables at computed `min-width: 0px`;
- zero document overflow;
- zero ordinary horizontal scrollers.

Representative Applications, Access, Security, Tasks, System, and Logs states rendered. Sign-out/session clearing passed.

The Evidence view's v0.2.0 lifecycle sentence is classified as historical baseline wording, not a claim that the currently installed package is v0.2.0.

### Phase C / 0.3 current state

A separate local branch, `feature/capability-aware-morphing-ui`, is based on the accepted 0.2.1 foundation.

Current candidate:

`42e9f60694cc33826748e69ef8d289aac0604a6d`

Known:

- deterministic capability-aware navigation projection implemented;
- existing semantic/provider/read-back/context inputs reused;
- no role-name or privilege-flag authority inference;
- safe demo and live mode share the same projection mechanism;
- denied/unavailable/unknown/product-unqualified remain explicit;
- **88/88** local regressions pass;
- syntax/responsive-contract/`git diff --check` pass;
- fresh Windows checkout package inputs match Git blobs;
- hardened 16-stage lifecycle passes for the exact Phase C candidate;
- post-lifecycle identity/hash/proof/sibling gate passes.

Remaining Phase C gate:

- installed-native browser/responsive qualification after human sign-in.

No public Phase C release claim is made.

## UNVERIFIED / DEFERRED

- exact core IPM version used by the accepted v0.2.0 lifecycle;
- fresh-checkout parity for public v0.2.0;
- public registry availability/installation;
- public-registry installation of OpsDeck 0.2.1;
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

Complete installed-native browser/responsive qualification for the exact Phase C candidate after human sign-in.

Do not broaden Phase C authority merely to make the UI projection pass. Preserve the accepted 0.2.1 distribution-fidelity milestone and v0.2.0 historical evidence.

If Phase C browser qualification passes, preserve the candidate/evidence before any public merge/tag/release decision.

See [Roadmap](ROADMAP.md).
