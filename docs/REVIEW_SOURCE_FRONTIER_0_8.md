# OpsDeck source frontier review — through 0.8

This branch is an index for remote technical review. It does not merge the parallel 0.5 work into the 0.6–0.8 chain and does not change milestone source commits.

## Accepted foundations

### 0.2.1 distribution fidelity

- Branch: `fix/0.2.1-responsive-inventory-reflow`
- Commit: `50205ed79dbd80a768d67c2455d514c09bbc5999`
- Status: **ACCEPTED**
- Evidence: fresh Windows checkout and Git-blob parity passed; controlled lifecycle passed; 82/82 regression tests passed; installed-native responsive qualification and 48 route-at-width observations passed.
- Change: corrected narrow inventory table reflow while preserving selected resource through no-reload responsive transitions.
- Historical failed specimen: `69e1215febab5008fc0542d96c0e921f638b4502` remains preserved as evidence.

### 0.3 first bounded capability-aware UI slice

- Branch: `feature/capability-aware-morphing-ui`
- Commit: `42e9f60694cc33826748e69ef8d289aac0604a6d`
- Status: **ACCEPTED — FIRST BOUNDED SLICE ONLY**
- Evidence: 88/88 local regressions passed; lifecycle and installed identity/hash/proof/sibling gates passed; installed-native route and responsive qualification passed.
- Change: navigation and projections respond to observed capabilities. This does not complete the full 0.3 roadmap.

## Source development

### 0.5 fixed-log reader

- Branch: `feature/fixed-log-reader-source-0.5`
- Commit: `90108d61d33154ed497f19f0e3516353992c7c57`
- Relationship: **parallel from accepted Phase C** (`42e9f60694cc33826748e69ef8d289aac0604a6d`). This commit is not an ancestor of the 0.8 branch head, and this review branch does not merge it.
- Tests: 95/95.
- Status: **SOURCE PROTOTYPE**.
- Change: source-only bounded reader contract for the fixed `messages.log` and `SystemMonitor.log` identities.
- Unverified: IRIS compilation, byte/encoding behavior, denied-versus-unavailable behavior, and the required privilege contract. It has not been installed into IRISTesting.

### 0.6 verified operation engine

- Branch: `feature/verified-operation-engine-0.6`
- Commit: `57b5b022641e7a24d178bc9389a2dc229944a512`
- Relationship: source chain after the accepted 0.3 foundation; dependency for 0.7 and 0.8.
- Tests: 95/95.
- Status: **SOURCE-READY / FIXTURE-QUALIFIED / LIVE-EXECUTOR-UNQUALIFIED**.
- Change: deterministic operation planning, policy and authority checks, fixture-only execution outcomes, receipts, and authoritative read-back semantics.
- Unverified: real IRIS executor and real mutation qualification. Fixture success is not live IRIS evidence.

### 0.7 Evidence Center

- Branch: `feature/durable-evidence-center-0.7`
- Commit: `88f22c9537df11d1340380a446df74c146f2b9be`
- Relationship: depends on 0.6 receipt semantics and precedes the 0.8 workspace in the source development chain.
- Tests: 100/100.
- Status: **CONTRACT/UI SOURCE-READY / PERSISTENCE BACKEND UNQUALIFIED**.
- Change: bounded evidence contracts, deterministic receipt browsing/rendering, redaction, provenance, fixture data, and compact exports.
- Unverified: durable IRIS-backed persistence provider.

### 0.8 Applications → Packages

- Branch: `feature/applications-packages-0.8`
- Implementation commit: `ed490e94af92fce52c2d564cc95377a9f3baee38`
- Branch head: `25b361d716cd06cef0930e46183377766a42c187`
- Relationship: builds on 0.6 operation planning and 0.7 evidence semantics. The branch history includes the 0.6–0.8 chain; it does **not** include the parallel 0.5 fixed-log commit.
- Tests: 104/104.
- Status: **WORKSPACE SOURCE-READY / PLANNING-FIXTURE QUALIFIED / LIVE IPM EXECUTION UNQUALIFIED**.
- Change: synthetic Applications → Packages workspace, package/source identity and detail, namespace-explicit inventory presentation, installation planning, risk/precondition review, fixture flow, and Evidence integration. Live execution remains unavailable.
- Unverified: actual package inventory from a qualified provider and live IPM install/update/remove execution.
- Package version remaining `0.2.1` is intentional development state; the workspace does not constitute a release.

## Deferred

### 0.4 Docker / clean-room reproduction

- Status: **DEFERRED / ENVIRONMENT BLOCKED**.
- Docker Desktop's Linux engine was unavailable during the prior assessment. No Docker or WSL repair is represented by these source branches.

## Review instructions

1. Review `feature/fixed-log-reader-source-0.5` separately. It is parallel work and is **not included in the 0.8 branch history**.
2. Review `feature/verified-operation-engine-0.6` → `feature/durable-evidence-center-0.7` → `feature/applications-packages-0.8` as the dependent source chain.
3. Treat this branch as an index based on the 0.8 head, not as a merge of all milestone branches.
4. Do not infer live-runtime qualification from source tests or fixture results.
5. Do not infer release status from branch numbering. Public v0.2.0 remains the current published release; accepted 0.2.1 and bounded 0.3 evidence remains preserved.
6. No 0.9 implementation exists on this frontier.

