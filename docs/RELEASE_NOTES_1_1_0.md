# OpsDeck v1.1.0 — Guided Contextual Learning

Status: **v1.1.0 source merged into main**; test-gated Safe Demo deployment is a separate publication step. **The latest published GitHub release remains v1.0.0; current Open Exchange listing/link evidence is recorded below, separately from unverified registry installation and full installed-1.1.0 browser RC**. Accepted guided-learning correction: `f43660b2978f08e8738603d83d3c7f077206482d`, preserving parent `10f880496194ad563d94a58f820fb57a8966a1ee` and beginner substrate `2624376dd6cdf0402e152ed62dc59766524f5eae`.

## Public listing and download link — 2026-10-29

The [Open Exchange listing](https://openexchange.intersystems.com/package/OpsDeck) displays **1.1.0, October 17, 2026**. Its [download archive link](https://pm.community.intersystems.com/download/opsdeck/-/opsdeck-1.1.0.tgz) now names `opsdeck-1.1.0.tgz`. This supersedes the October 8 listing/link observation for current navigation, without rewriting the earlier inspected archive's identity or qualification.

**KNOWN:** the displayed listing version/date and linked filename; the latest published [GitHub release](https://github.com/KennethJSmithDev/OpsDeck/releases/tag/v1.0.0) remains v1.0.0. **UNVERIFIED in this reconciliation:** linked archive contents, package registration/version, byte identity, download integrity and registry-route installation. A listing or filename is not proof of any of those boundaries. No archive inspection, install or runtime test was performed for this update.

## Current evidence — 2026-10-16

The [scoped acceptance receipt](GUIDED_LEARNING_ACCEPTANCE_20261016.md) reconciles the following evidence against product source `bdda41acdf89769129f23fdc48223ebdd15fd063`:

- [Native package qualification](NATIVE_1_1_0_QUALIFICATION_20261016.md) records package build/install, the actual linked **1.0.0-registration → 1.1.0** upgrade, owned-state preservation, uninstall isolation, fresh install, restart and exact deployed-asset checks. This advances the October 8 lifecycle blocker for that scoped target.
- [Authenticated learning qualification](CONTEXTUAL_LEARNING_NATIVE_20261016.md) records exact 1.1.0 presentation assets temporarily served by a separate quick-start backend registered as **1.0.0**, including Learning ON/OFF, eight main workspaces plus Packages/About, four viewport widths and restart/read-back. The original assets were restored. This does not prove authenticated UI behavior on the independently installed 1.1.0 target.
- The October 16 source suite records **272/272 PASS**. Browser-download completion, exhaustive teaching and actual novice comprehension remain unverified; the receipt also records a minor glyph artifact.
- The accepted 1.1.0 source and qualification receipts are merged into `main`. The public Safe Demo follows `main` only after a successful Pages test/deploy job. Demo delivery does not independently qualify an installed IPM package. Versioned GitHub/IPM/OEX publication remains a separate boundary. [Issue #10](https://github.com/KennethJSmithDev/OpsDeck/issues/10) was closed on October 17, 2026; its closure does not establish full installed-package browser RC qualification or versioned publication.

The October 8 sections below are retained as dated preparation evidence. Their unavailable-Docker and pending-build statements describe that checkpoint, not the October 16 lifecycle result. The historical missing native 320px Learning OFF screenshot is not backfilled by later scoped evidence.

## Published baseline reconciliation — 2026-10-08

Authoritative [Open Exchange listing](https://openexchange.intersystems.com/package/OpsDeck) visibly reports **1.0.1, October 4, 2026**. Its actual download link points to `https://pm.community.intersystems.com/download/opsdeck/-/opsdeck-1.0.0.tgz`. Downloaded bytes: **2,598,070**; SHA-256 `78534ed4893afe10a7dd4223363a0d0c822395d85fe6bdf5c5c2573983cfa253`. The archive's root `module.xml` declares **opsdeck 1.0.0**. The exact registry URL for `opsdeck-1.0.1.tgz` returned **HTTP 404**.

These are distinct identities: published OEX listing **1.0.1**, observed linked IPM registration **1.0.0**. We do not rewrite the listing, relabel the downloaded package, modify the original release or assume a separately published 1.0.1 package. Historical GitHub v1.0.0 package hashes and acceptance receipts remain intact.

## Changes in 1.1.0

- 26 beginner-oriented concepts and mapped workspace reference disclosures, with official InterSystems documentation links.
- Shared product-owned optional Learning ON/OFF, workspace orientation, contextual field Help, action explanations and outcome/Evidence teaching; Safe Demo consumes the same implementation.
- Fresh matching operation plans own action-teaching identity, even when inventory is stale.
- Scoped 44px learning toggle/dismissal targets and visible-label-compatible Help names.
- Product public/internal/package identity, package.json and IPM module all report **1.1.0**. Native entrypoint and identity cache keys advance to 1.1.0, avoiding the old identity asset on upgrade.

No provider, executor, authority, Evidence, native storage schema or lifecycle implementation changes. Operational capability accounting remains **117 / 56 / 37 / 34 / 7 / 12**, with historical qualification scopes preserved. The identity-change regression suite remains 272 tests; current native runtime-manifest representation is **648,915 bytes**, browser JS/CSS/HTML **475,147 bytes** over **25** FileCopy assets. Prior 610,382-byte measurements belong to their original 1.0 qualification.

## Package and installation

The local distributable is `opsdeck-1.1.0-source.tgz`: a bounded IPM source-layout archive containing module.xml, package.json, the manifest's exact FileCopy inputs, eight product classes, README, LICENSE and these notes. It does not include test fixtures, private qualification helpers, untracked paths, secrets or runtime derived data. Its exact input hashes and archive SHA are recorded alongside the generated archive outside the repository.

On an existing authorized disposable IRIS/IPM target, stage the archive and use the standard `%SYS` IPM command `load /absolute/path/to/opsdeck-1.1.0-source.tgz`, then verify `opsdeck 1.1.0` registration, native HTTP bytes, sign-in/read paths, owned derived-state preservation and unrelated-state preservation. Do not run this against IRISTesting or overwrite an unrelated installation. Source packaging alone does not prove native installation.

## Upgrade compatibility at preparation — 2026-10-08

Source comparison against the **actually OEX-linked** archive confirms all eight native product classes unchanged, including DerivedStorage's ownership/schema checks. The module's resource/web-application ownership is unchanged; only its version changes. No storage migration is introduced. These observations support compatibility, but are not native upgrade proof.

**UNVERIFIED:** native IPM package build/install and published-baseline upgrade to 1.1.0. Docker's Linux-engine named pipe is unavailable; no existing authorized Docker target can currently be inspected or exercised. A separately registered 1.0.1 package was not obtainable from the exact public registry URL. Do not claim a tested 1.0.1-registration upgrade or replace native proof with synthetic tests.

The earlier public Docker quick-start deliberately remains pinned to its historically qualified 1.0.0 archive and hash; it does not install 1.1.0. Advancing that pin requires a separately qualified 1.1.0 native artifact and its exact SHA, not a guessed release URL.

## Evidence limits and publication hold at preparation — 2026-10-08

Independent acceptance covers the bounded guided-learning correction. Native 320px Learning OFF screenshot remains **UNVERIFIED**; existing measurements do not replace it. Actual novice comprehension and exhaustive long-tail teaching remain unverified. No push, merge, tag, release, Pages/IPM/OEX publication or Issue #10 closure is performed or implied.

## Local version-preparation verification — 2026-10-08

- Focused product-identity/native-render integration: **48/48 PASS**.
- Full `npm test`: **272/272 PASS**, zero failures/skips, approximately 15.8s. The first full run localized one stale entrypoint cache-key assertion; only that expected version key was updated, then the full suite passed.
- `node --check public/app.js`, `node --check public/product-identity.js`, and `git diff --check`: PASS.
- Package source-layout contents verified byte-for-byte; native install/build remains UNVERIFIED.
- Published-baseline comparison: eight product classes byte-identical; XML resource/web-application ownership identical after excluding Version.
- Native upgrade is blocked by unavailable Docker daemon and absent publicly downloadable 1.0.1-registration artifact. No existing installation was changed.
- Historic learning screenshots/receipts and unrelated untracked Docker/helper/contest paths remain untouched.

At this October 8 version-preparation checkpoint, v1.1.0 native RC PASS was not claimed. The then-next dependent boundary is native IPM build/install/upgrade qualification on an existing authorized disposable target, using the actual OEX-linked baseline and recording its 1.0.0 package registration separately from the OEX 1.0.1 listing. A literal 1.0.1-registration upgrade requires its exact published archive first.

## Current next boundary

Review the scoped October 16 acceptance and verify authenticated UI behavior on the exact installed 1.1.0 package before making a full native RC claim. A literal 1.0.1-registration upgrade remains unverified without that exact archive; the successful linked-baseline upgrade is from registration 1.0.0. Source is merged into `main`; the observed OEX listing/link does not establish a GitHub 1.1.0 release, exact registry-package identity or a full installed-1.1.0 browser RC claim. Pages publishes the Safe Demo only through its test-gated workflow.
