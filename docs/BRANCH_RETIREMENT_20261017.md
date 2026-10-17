# OpsDeck historical branch retirement — 2026-10-17

**Objective:** keep `main` and one `verify/opsdeck` branch, after preserving accepted facts and recoverable history. This is a branch-lifecycle decision, **not** an instruction to merge old experimental implementations into a newer product.

## Authoritative starting point

- Project: `KennethJSmithDev/OpsDeck`.
- Audited `main`: `6ecf9e2db30effb7ba91f8f102f1df69acd6ed1b`, OpsDeck source/package identity 1.1.0, with test-gated Safe Demo Pages deployment.
- GitHub had **13 remote branches total**: `main` and the 12 below. The 18 other, fully merged branches had already been pruned using ancestry and expected-tip checks.
- **No open PRs or issues** at audit time. Existing v0.2.0 and v1.0.0 GitHub release tags are preserved. This archive does not claim a v1.1.0 GitHub tag.
- Every branch below had at least one commit not reachable from `main` when audited. **Unique commit does not automatically mean missing capability.** No branch is classified as ancestor-merged.

## Unique history and retirement disposition

The `unique` count is GitHub's ahead-of-merge-base count relative to audited `main`. Branch tips are exact identities at the audit time, not permanent recoverability guarantees.

| Branch | Exact tip | Unique commits | Content | Disposition |
|---|---|---:|---|---|
| `contest/bonus-readiness-20261002` | `f19021149767a5673223cabcfec424f42b0018e0` | 1 | Draft 2026 article, bonus-claim note, video script | Expired contest editorial/claims; no product code |
| `contest-final-staging-20261004` | `02f6d81b2a48c9c775b62dac6a76a36569c5585d` | 3 | Nine final staging notes: bonus, competitor gaps, evaluator, footprint, OEX copy, video and learning concept | Historical research and unsubmitted staging, not release evidence |
| `docs/post-release-polish-20261001` | `176724e51a8d3f943efbbb68677f927dcff63d66` | 31 | Older 0.2.x qualification/docs/roadmap history and 151-line generic release checklist | Old version claims superseded; checklist separately carried forward to main |
| `egehar-pilot-h004-20260925` | `84baab623d248cd697a9ff31af8b9472904e7bd7` | 4 | Early .egehar manifest, milestone status, native gate and remote hardening work JSON | Superseded pilot representation; current EGEHAR protocol governs |
| `feature/durable-evidence-center-0.7` | `88f22c9537df11d1340380a446df74c146f2b9be` | 1 | Legacy src/operation-engine.js deterministic policy/authority plus fixture test | Current canonical public/operation-engine.js owns later richer policy; no old source merge |
| `feature/verified-operation-engine-0.6` | `57b5b022641e7a24d178bc9389a2dc229944a512` | 1 | Same legacy operation-policy/authority correction under 0.6 lineage | Redundant with 0.7 tip and superseded by current canonical engine |
| `pages-safe-demo` | `f42444f4fcf6a3cf0519ea41a7bf457484306270` | 3 | Initial demo provider/html and initial Pages workflow | Current demo and main-only test-gated Pages deployment supersede |
| `release/v0.3.0-contest-checkpoint` | `136e8dfcaabf8579ace7e2fbddf9512f8523b5a3` | 4 | 0.3.0 candidate/version snapshots and old contest drafts | Historical release candidate; 1.1.0 is authoritative |
| `review/harden-source-frontier-0.8-20261002` | `28991aa2be295ff3c58eed5f4323379084410609` | 1 | Note distinguishing compilation/development permissions from runtime operator permissions | Preserve principle: never widen runtime role to compile development code |
| `review/provenance-control-20261002` | `d2440bc49d718938fbad4d8547f7a3824400bee1` | 1 | Ambiguous dispatch / changed read-back fixture regression | Equivalent named test exists on main in test/operation-engine.test.mjs |
| `review/source-frontier-0.8-20261002` | `ae49fe7a7182faa9055b04f0655162b538b1a924` | 1 | Historical 0.2.1 to 0.8 source-frontier status index | Accepted current/historical boundaries already in VERSION_GATE_LEDGER and project qualification docs |
| `safe-demo-polish` | `e4606360808ca2d3a6f06bb07bc21e038ac7598e` | 6 | Early judge tour, demo evidence cards/labels and Pages workflow experiments | Current safe demo provenance, Evidence Center and guided teaching supersede experimental UI |

## What is preserved in the current product

- The actual operation policy owner is `public/operation-engine.js`; `src/operation-engine.js` is its re-export compatibility seam. Current policy covers more operation types than the abandoned source prototype. Do **not** cherry-pick older policy files over it.
- `test/operation-engine.test.mjs` on `main` includes `a changed read-back does not close an ambiguous dispatch into a receipt`, with **AMBIGUOUS**, no retry, no receipt. That protects the provenance-control finding without retaining its branch.
- IRIS compilation authority is a **different identity** from runtime operator authority. An existing authorized developer/installer path must own compilation; never grant the runtime role code-modification privileges merely to pass a test.
- The older evaluator/judge tour is superseded by product-owned Guided Contextual Learning and the evidence-aware Safe Demo; no 2026 contest-only workflow must be revived.
- The historical **Release Checklist** from `docs/post-release-polish-20261001` is carried forward separately as `docs/RELEASE_CHECKLIST.md`. It is a process template, **not** a new qualification receipt. The current 1.0/1.1 qualification documents and versioned release notes own actual evidence.
- Historical 0.2–0.8 frontier remains indexed by `docs/VERSION_GATE_LEDGER.md`, dated qualification records, and `docs/ROADMAP.md`; do not promote their past `UNVERIFIED` claims into current product claims.

## Verification-branch contract

- Keep `main` as the only production source. Pushes to `main` run the existing production-source tests, secret-pattern check, and Pages Safe Demo deployment.
- Keep one long-lived `verify/opsdeck` branch. Start each release slice with it fast-forwarded to current `main`, implement only accepted bounded scope, prove the claim with focused/full/native evidence as appropriate, then merge a reviewed PR into `main`.
- After each merge, fast-forward `verify/opsdeck` to the new `main` once the verification branch has no pending work. **Never force-reset unreviewed work.** Short-lived branches are allowed for truly parallel jobs and removed after acceptance.
- Releasing a native IPM package, publishing OEX/GitHub tags, modifying credentials/privileges, or overriding operator auth remains a **separate authorization boundary**. A successful Pages job is not full native installed-package release proof.

## Pruning guard and limitations

Before deleting each of the 12 **unmerged** remote refs, re-fetch and check its full expected tip SHA above. If any changed, stop and re-review that branch. Verify repository identity and preserve `main`, `verify/opsdeck`, release tags, local worktrees, and unrelated untracked files.

Because these are **unmerged histories**, their exact old Git objects may eventually be garbage-collected after branch deletion. For byte-for-byte recovery, save **one verified local `git bundle`** containing their refs before pruning, and retain its filename/SHA-256 separately with project artifacts. This is a one-time retirement backup, **not** a recurring evidence ZIP. If only the semantic record is required, this document preserves the reason each branch was retired, not its full contents.

**Acceptance:** Retire the branches only after this documentation and the release checklist are present on `main`; then verify the remote contains exactly `main` and `verify/opsdeck`. No feature requalification is implied by deleting refs.
