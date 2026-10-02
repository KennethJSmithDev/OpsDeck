# OpsDeck qualification status

**Current public release:** `v0.2.0`  
**Prior public release commit:** `23215459096cb47d255c45b1e6e86687f3d8e93a`
**Release candidate:** `opsdeck 0.3.0` on `release/v0.3.0-contest-checkpoint`
**Tested IRIS:** native Windows IRIS 2026.2 Build 221U, `%SYS`

This ledger preserves the v0.2.0 public evidence and records the accepted 0.2.1 and first bounded 0.3 foundations. Exact v0.3.0 candidate `5812f79c0e68b64196b1f4a97a9e435e2b37f933` passed local and native qualification described below; publication is still pending human review. Older candidate records remain in Git history and private evidence; they are not silently promoted into proof.

## ACCEPTED FOUNDATIONS

- v0.2.1 distribution fidelity: accepted from exact candidate `50205ed79dbd80a768d67c2455d514c09bbc5999`, including fresh Windows checkout/Git-blob parity, controlled lifecycle, 82/82 regression suite, and installed-native responsive qualification.
- First bounded 0.3 capability-aware UI slice: accepted at `42e9f60694cc33826748e69ef8d289aac0604a6d`, including deterministic capability-aware navigation/context projection and 88/88 local regressions, plus its exact 0.2.1 lifecycle and installed-native responsive qualification.
- The first bounded 0.3 slice is not completion of the broader internal 0.3 roadmap. Projection does not grant IRIS authority.
- Exact `opsdeck@0.3.0` candidate: QUALIFIED LOCALLY; NOT PUBLISHED.

## KNOWN

### Exact v0.3.0 local-source package lifecycle

A controlled 16-stage lifecycle passed for exact source candidate `5812f79c0e68b64196b1f4a97a9e435e2b37f933` (`opsdeck@0.3.0`). The sanitized private receipt records the detailed stage results.

Observed and verified at that boundary:

- local-source load completed;
- `opsdeck 0.3.0` registration was present;
- the authoritative `/opsdeck` application was present;
- all four deployed package-resource hashes matched the tested package fingerprint;
- bounded operational HTTP checks passed;
- uninstall removed the expected package-owned state;
- unrelated proof/sibling inventory remained unchanged;
- clean same-source reload reproduced the package;
- the final installed package was left in place;
- product regression suite passed **88/88**.

### Previously accepted installed-native foundation

The installed application was exercised as `OpsDeckTest`.

Observed:

- Overview rendered live server identity;
- 23 web applications matched an independent read-back;
- Applications rendered `/opsdeck` and authoritative detail;
- Access rendered 12 users and 131 resources with matching second reads for exercised paths;
- Security returned a valid empty wallet collection with matching second read;
- Tasks rendered 16 task records and selected detail with matching second read;
- System rendered live counters; a later sample differed, consistent with changing counters and not claimed as stable equality;
- Logs rendered enabled audit status while explicitly marking audit-record retrieval unqualified;
- Sign out cleared visible connected identity/provider state.

### Previously accepted installed responsive behavior

Eight routes were checked at:

- 320
- 390
- 600
- 820
- 1024
- 1440 CSS px

The measured pages had zero document horizontal overflow and no ordinary horizontal scrollers in the exercised UI. A no-reload wide → narrow → wide resize preserved selected Applications state and usable compact navigation.

### Safe demo

GitHub Pages serves a deterministic sanitized demo. It proves evaluator UX, responsive presentation, authority projection, provider-state semantics, and Evidence-state communication only. It does not prove live IRIS behavior.

## POST-RELEASE FINDING

A fresh Windows clone of public tag `v0.2.0` with `core.autocrlf=true` materialized `public/app.js` and `public/styles.css` with CRLF line endings.

Their working-tree SHA-256 values differed from the lifecycle-receipt hashes.

The Git object blobs at the release commit match the tested source commit, so current evidence localizes the discrepancy to **checkout representation**, not changed repository semantics and not a demonstrated runtime defect.

Therefore:

- local-source lifecycle qualification for the recorded tested source remains accepted;
- fresh-checkout byte parity for public `v0.2.0` is **UNVERIFIED**;
- the published `v0.2.0` tag must not be moved;
- a new patch candidate must establish a canonical checkout representation and requalify those exact bytes.

## CURRENT RELEASE-CANDIDATE BOUNDARY

The post-release branch proposes LF as the canonical checkout representation for all five package-input files:

- `module.xml`
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `src/iris-provider.js`

The corrected representation was accepted in the 0.2.1 foundation and carried into this release candidate.

Acceptance requires:

1. fresh Windows checkout using `core.autocrlf=true` matched all five package-input Git blobs;
2. exact 0.3.0 package-input hashes and composite fingerprint were recorded;
3. package/version identity was frozen at candidate commit `5812f79...`;
4. source → deployed byte parity passed;
5. local-source lifecycle reproduction passed all 16 stages;
6. installed-native browser smoke and sign-out passed;
7. responsive behavior was reused from the accepted first bounded 0.3 qualification because styles.css and responsive app behavior are unchanged from `42e9f606...`; version/cache identity is the only runtime JS/HTML difference;
8. proof and sibling inventory preservation passed during lifecycle.

## UNVERIFIED / DEFERRED

- exact core IPM version used by the successful lifecycle;
- fresh public-checkout parity for `v0.2.0`;
- public registry availability and installation of OpsDeck;
- audit asynchronous result retrieval after the accepted HTTP 202 query;
- authenticated bounded readers for `messages.log` and `SystemMonitor.log`;
- full declared Management Portal parity;
- native ObjectScript execution / CallIn bridge;
- broad mutation workflows;
- Docker parity;
- formal least-privilege proof across all providers.

## Audit async boundary

A bounded authenticated audit query returned HTTP 202 and a same-origin Location using:

```text
/api/admin/v1/async-result?id=...
```

The current strict client contract permits the expected v2 path and rejected that v1 path before issuing a status GET.

No result retrieval, route substitution, or equivalence claim is admitted.

## Next boundary

Human review of the exact locally qualified candidate, followed by separately authorized merge/tag/publication actions. The candidate is the first public capability-aware OpsDeck release; the broader internal 0.3 roadmap remains incomplete.

See [Roadmap](ROADMAP.md).
