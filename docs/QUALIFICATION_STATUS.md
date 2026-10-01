# OpsDeck qualification status

**Current public release:** `v0.2.0`  
**Release commit:** `23215459096cb47d255c45b1e6e86687f3d8e93a`  
**Tested package source:** `1663869af14673f027efb63a986ac5c1e50a8ac1`  
**Package:** `opsdeck 0.2.0`  
**Tested IRIS:** native Windows IRIS 2026.2 Build 221U, `%SYS`

This is the current public qualification ledger. Older intermediate candidate records remain in Git history and the private P001 evidence store; they are not silently promoted into current proof.

## KNOWN

### Local-source package lifecycle

A controlled 16-stage lifecycle passed for the tested package source.

Observed and verified at that boundary:

- local-source load completed;
- `opsdeck 0.2.0` registration was present;
- the authoritative `/opsdeck` application was present;
- all four deployed package-resource hashes matched the tested package fingerprint;
- bounded operational HTTP checks passed;
- uninstall removed the expected package-owned state;
- unrelated proof/sibling inventory remained unchanged;
- clean same-source reload reproduced the package;
- the final installed package was left in place;
- product regression suite passed **82/82**.

### Installed native browser

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

### Installed responsive behavior

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

## CURRENT DEVELOPMENT BOUNDARY

The post-release branch proposes LF as the canonical checkout representation for all five package-input files:

- `module.xml`
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `src/iris-provider.js`

Changing `.gitattributes` does not itself qualify the correction.

Acceptance requires:

1. fresh Windows checkout using ordinary Git settings;
2. exact package-input hashes captured from that checkout;
3. package/version identity frozen for the patch candidate;
4. source → deployed byte parity;
5. local-source lifecycle reproduction;
6. installed-native smoke;
7. responsive regression on affected surfaces;
8. preserved unrelated state.

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

Close distribution fidelity first.

After that gate passes, the next product-facing milestone is the **capability-aware morphing UI**: project one canonical interface from observed authority, provider availability, active context, and workspace width without inventing permissions or duplicating IRIS-owned state.

See [Roadmap](ROADMAP.md).
