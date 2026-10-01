# Release Checklist

Use this checklist for every public OpsDeck release.

The purpose is to keep the product, package bytes, evidence, documentation, demo, and public claims synchronized.

## 1. Freeze identity

- [ ] Release scope is explicit.
- [ ] Product version is identical in all package/project identities.
- [ ] Candidate commit is frozen.
- [ ] Worktree is clean.
- [ ] Previous published tags remain unchanged.
- [ ] No unrelated feature work is mixed into the release branch.

## 2. Establish source representation

- [ ] Fresh checkout created from the exact candidate.
- [ ] Normal platform Git settings recorded.
- [ ] All package-input bytes hashed.
- [ ] Checkout bytes match the intended Git object representation.
- [ ] Line-ending/encoding rules are explicit.
- [ ] Manifest/package fingerprint recorded.

## 3. Static and regression checks

- [ ] Full product test suite passes.
- [ ] JavaScript syntax checks pass.
- [ ] XML/package manifest parses.
- [ ] Package identities agree.
- [ ] `git diff --check` passes.
- [ ] No secret/private evidence entered the public tree.

## 4. Pre-capture runtime state

Before mutation, preserve enough detail to localize any difference later.

- [ ] installed package identity/version;
- [ ] authoritative `/opsdeck` definition;
- [ ] package-owned resource hashes;
- [ ] rollback material;
- [ ] unrelated proof/sibling inventory **with item-level rows, not digest/count only**;
- [ ] exact representation used to compute any inventory digest;
- [ ] runtime/IRIS identity;
- [ ] authority used for package operations.

## 5. Lifecycle qualification

- [ ] local-source load semantic result captured;
- [ ] registration/version verified;
- [ ] `/opsdeck` verified;
- [ ] deployed bytes match candidate source;
- [ ] bounded native smoke passes;
- [ ] uninstall semantic result captured;
- [ ] owned resources removed;
- [ ] unrelated item-level inventory preserved;
- [ ] clean same-source reload passes;
- [ ] final registration/version/hashes verified.

### Ambiguous mutation rule

If a package operation result is ambiguous:

- [ ] **STOP automatic cleanup/retry**;
- [ ] reacquire authoritative package/app/resource state read-only;
- [ ] preserve raw bounded operation output privately;
- [ ] classify applied / not applied / unresolved;
- [ ] only then choose cleanup or repair.

Do not let a failure handler erase the evidence needed to understand the failure.

## 6. Installed browser qualification

Run only to the extent invalidated by changed product bytes.

- [ ] sign-in / identity;
- [ ] Overview;
- [ ] Applications + independent read-back;
- [ ] representative Access/Security/Tasks/System/Logs behavior;
- [ ] Evidence wording matches actual qualification;
- [ ] sign-out/session clearing;
- [ ] responsive widths appropriate to changed surfaces;
- [ ] wide → narrow → wide preserves state;
- [ ] ordinary document/panel overflow measured.

Preserve accepted prior milestones when identical bytes/semantics make a full rerun unnecessary.

## 7. Public documentation

Before merge/tag:

- [ ] README says the actual release status.
- [ ] Native install guide matches the tested path.
- [ ] Qualification status reflects current KNOWN / UNVERIFIED boundaries.
- [ ] Security policy matches current functionality.
- [ ] Release notes describe what actually shipped.
- [ ] Evaluator guide/demo claims match the release.
- [ ] Roadmap items are clearly future work.
- [ ] No stale “candidate”, “not yet tagged”, or superseded-version language remains.

## 8. Public release actions

Require explicit release approval.

- [ ] merge intended PR;
- [ ] verify `main` target;
- [ ] create immutable release tag;
- [ ] verify tag target;
- [ ] publish GitHub release;
- [ ] verify Pages/demo deployment;
- [ ] update Open Exchange;
- [ ] verify Package Manager publication separately;
- [ ] only claim registry installation after an independent install succeeds.

## 9. Post-release verification

- [ ] fresh public clone;
- [ ] tag checkout;
- [ ] package-input hashes checked;
- [ ] docs links checked;
- [ ] demo checked;
- [ ] release page checked;
- [ ] Open Exchange public state checked after approval;
- [ ] any distribution discrepancy recorded as a new boundary, never hidden by moving the release tag.

## 10. Preserve evidence

For consequential releases retain:

```text
KNOWN
INFERRED
UNVERIFIED
OBJECTIVE
AUTHORITY
OWNERSHIP
REPRESENTATION
FAILURE / ROOT_CAUSE
CHANGE / WHY_REQUIRED
COMMANDS
TESTS / METRICS
LIMITATIONS
KNOWN_DEBT
NEXT_BOUNDARY
```

Public product facts belong in OpsDeck.

Private diagnostic receipts belong in P001 CompDocs.

Reusable methodology belongs in EGEHAR only when supported beyond one project.
