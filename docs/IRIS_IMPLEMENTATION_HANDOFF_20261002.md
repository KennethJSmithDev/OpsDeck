# IRIS implementation handoff — 2026-10-02

Use this after remote review. The goal is to attach and qualify the smallest IRIS-native seams without reopening accepted 0.2.1 / bounded 0.3 evidence.

## Remote inputs

Fetch these branches:

- `review/harden-fixed-log-reader-0.5-20261002`
- `review/harden-source-frontier-0.8-20261002`

The first remains parallel work. The second contains the reviewed 0.6–0.8 source frontier plus the remote hardening notes.

Do not modify or rewrite the original milestone branches merely to integrate them.

## Standing continuation rule

Continue autonomously through already-authorized work.

Reuse existing authorized sessions / browser-managed autofill / protected local credentials without exposing their values.

Do not ask for repeated human "Continue" approval for normal authentication or for another source/test step inside this handoff.

Stop only for:

- a new credential or secret;
- privilege expansion;
- enabling/disabling an IRIS service;
- changes to user/role grants;
- destructive or non-disposable mutation;
- overwrite of the accepted installed `/opsdeck` candidate;
- public merge/tag/release/Open Exchange publication;
- a material architecture choice not resolved by evidence.

## 1. Build a local integration worktree

Create a NEW local integration branch/worktree from:

`review/harden-source-frontier-0.8-20261002`

Suggested branch:

`integration/iris-frontier-0.8-20261002`

Integrate:

`review/harden-fixed-log-reader-0.5-20261002`

Resolve conflicts semantically. Preserve BOTH:

- the 0.5 audit/fixed-log work;
- the 0.6 operation engine, 0.7 Evidence Center, and 0.8 Packages work.

Pay particular attention to `public/app.js`: the 0.5 branch deliberately moved the `iris-provider.js` module cache key forward from the older 0.2.0 query identity. Do not accidentally resolve that conflict by restoring the stale 0.2.0 import.

Do not flatten or rewrite the review branches.

Before IRIS changes, run:

- JavaScript syntax checks;
- `npm test`;
- `git diff --check`;
- focused tests for audit, fixed logs, operation engine, Evidence, and Packages.

If integration exposes a regression, repair only the smallest justified seam and record the exact commit.

A normal push of the integration branch is authorized after these checks pass. No force push.

## 2. 0.5 fixed-log compile/runtime qualification

Do NOT overwrite the accepted installed OpsDeck package or its `/opsdeck` web bytes.

Treat compile authority and runtime authority as separate identities. The ordinary OpsDeck runtime account is not expected to be a developer identity and must not be widened merely to compile review code.

InterSystems IRIS 2026.2 documents class/code compilation as requiring `%Development_CodeModify:Use`; modifying code in a database also requires the corresponding database write authority. Use an ALREADY-AUTHORIZED local development/installation identity or path that already possesses those rights. Do not add them to OpsDeckTest.

First qualify the class independently in an existing non-product test namespace when practical (prefer an existing namespace rather than creating one).

Compile the exact reviewed `OpsDeck.FixedLogReader` source.

The source contract is:

- only `messagesLog`;
- only `systemMonitorLog`;
- no caller path;
- no directory listing;
- no generic filesystem API;
- current process must hold `%Admin_Operate:Use`;
- recent bounded observation;
- max 64 KiB response window;
- max 250 complete returned lines;
- no raw path returned.

Record compilation success/failure exactly.

Exercise both sources read-only.

For each source record only sanitized evidence needed to establish:

- status;
- line count;
- byte count;
- truncated flag;
- whether the rows are from the recent tail;
- source identity;
- current-user authorization result.

Do not preserve raw log contents in receipts.

Specifically test/inspect the installed IRIS behavior of:

- `%File.Size`;
- `MoveTo()`;
- binary-mode `Read()`;
- CRLF handling;
- file growth during observation;
- file shorter than the window;
- file larger than the window.

If actual logs do not contain enough non-ASCII material to establish multibyte behavior, keep that point UNVERIFIED instead of fabricating a PASS.

The explicit `%Admin_Operate:Use` check should own the DENIED state. OS/file-open/read failures must not be mislabeled as authorization denial.

## 3. Browser-safe fixed-log endpoint

Inspect the installed IRIS 2026.2 extension points before implementing.

Prefer the smallest native REST seam backed directly by the reviewed reader.

Do not add a generic call/ObjectScript execution bridge.

The REST surface must expose only the two semantic operations, for example two explicit GET routes or one server-enumerated source ID. It must never accept a filesystem path.

The reader's `%Admin_Operate:Use` check remains mandatory even if the web application also has a resource requirement.

For runtime qualification, you are authorized to create ONE disposable temporary review web application only if:

- the chosen path does not already exist;
- its pre-state is captured;
- it uses existing authentication mechanisms;
- no role/user privilege is added;
- no service is enabled;
- it dispatches only to the bounded OpsDeck review API;
- it can be removed/restored cleanly afterward.

Suggested identity:

`/opsdeck-review-api`

Do not alter the accepted `/opsdeck` application for this qualification.

Use the already-authorized OpsDeckTest identity through its normal saved-authentication flow when possible. Never print or inspect the password.

Prove:

- authenticated allowed read;
- explicit DENIED behavior if an already-existing identity without `%Admin_Operate:Use` is available;
- no path traversal / arbitrary source;
- 64 KiB / 250-line bounds survive the HTTP boundary;
- response omits resolved filesystem paths;
- empty/unavailable/read-failure/truncated stay distinct.

Do not create or change a user/role merely to manufacture a denial test. If no existing denial identity exists, leave that runtime case UNVERIFIED.

## 4. 0.6 live executor seam

Do not assume the source placeholder provider operation is correct.

Inspect the live installed SysAdmin API/OpenAPI first and establish the exact supported mutation contract.

The reviewed engine currently treats operation/provider/risk/authority/target/parameter/pre-state identities as deterministic policy. Plans are deeply immutable in the fixture runtime, only admitted plans may execute there, expiry is always enforced, and fixture verification is policy-owned rather than supplied by a caller. Preserve that architecture.

A live IRIS executor MUST NOT treat a serialized browser plan, browser-side authority flag, or client verifier as proof. Reconstruct/revalidate the operation against server-owned policy, fresh authoritative pre-state, and current-process authority before any write. Client plan IDs are correlation identities, not execution authority.

If a supported reversible web-application mutation exists, create exactly ONE disposable fixture only after proving its target identity is absent.

Suggested semantic fixture:

`/opsdeck-fixture`

The fixture must be clearly disposable and unrelated to the accepted `/opsdeck` application.

Before creation/mutation:

- capture relevant application inventory;
- capture proof/sibling identities;
- record target absence;
- establish required authority;
- establish exact request and read-back schemas.

Then qualify the smallest reversible operation:

client intent / reviewed plan
→ server-side deterministic revalidation
→ fresh authoritative pre-state
→ current-process authority
→ explicit confirmation binding
→ ONE provider mutation
→ authoritative read-back
→ OperationReceipt

Do not replace that with a trust-the-client shortcut.

The observable product flow remains:

plan
→ fresh pre-state
→ authority validation
→ explicit fixture confirmation
→ ONE provider mutation
→ authoritative read-back
→ OperationReceipt
→ restore/delete fixture
→ sibling preservation read-back

Do not auto-retry an ambiguous mutation.

If the supported API does not establish the expected operation body or safe fixture path, stop 0.6 live qualification and preserve the gap. Source implementation may continue, but do not invent a write contract.

## 5. 0.7 IRIS persistence provider

The reviewed Evidence Center is positive-projection only. Keep it that way.

Do not persist arbitrary raw provider responses.

Before selecting a backend, inspect where product-owned durable data can live without writing OpsDeck application data into an inappropriate system database.

Prefer a product-owned, bounded IRIS persistence seam.

Do not create a new database/namespace or change mappings without a separate evidence-backed reason. If correct storage ownership cannot be established on IRISTesting without broader configuration changes, implement the provider source contract and leave live persistence UNQUALIFIED.

Any persistent record must contain only the already-projected evidence representation.

Required behaviors:

- bounded record count/read window;
- deterministic identity;
- create/read;
- explicit failure states;
- no secrets/raw logs;
- compact export still re-projects before serialization.

## 6. 0.8 Packages IRIS provider

Begin READ-ONLY.

Inspect the installed IPM/ZPM interfaces and establish a bounded installed-package inventory without changing registry configuration.

Map real package data into the existing Package ResourceRef contract.

Do not treat Open Exchange availability as established merely because installed IPM metadata exists.

Prove:

- package identity;
- namespace/scope;
- installed version;
- provider/source identity where actually known;
- empty/unavailable/denied/failure distinctions.

Only after the 0.6 live operation seam is qualified should you attempt package mutation.

A package mutation requires a locally-created disposable fixture package whose identity is absent before the test.

Use:

plan
→ fresh package pre-state
→ authority
→ confirmation
→ bounded IPM operation
→ authoritative IPM inventory read-back
→ receipt
→ cleanup
→ sibling preservation

Do not touch unrelated installed packages.

If creating/using a disposable package fixture would require repository/configuration/privilege expansion, stop before that step and preserve the source-ready state.

## 7. Docker remains deferred

Do not start, repair, reinstall, or reconfigure Docker/WSL in this handoff.

0.4 remains deferred.

## 8. Preserve accepted identity

Do not overwrite the accepted installed `opsdeck@0.2.1` or `/opsdeck` bytes with the source-frontier tree merely to make browser testing convenient.

Do not move or recreate v0.2.0.

Do not publish a new package version.

Use isolated runtime fixtures and explicit source identities.

## 9. Evidence

For each runtime slice record:

KNOWN
INFERRED
UNVERIFIED
CHANGES
TESTS
FAILURES
INVALIDATED_PRIOR_EVIDENCE
NEWLY_ACCEPTED_EVIDENCE
LIMITATIONS
KNOWN_DEBT
NEXT_BOUNDARY

Raw credentials, task IDs, log contents, filesystem paths, authorization headers, and secrets must not enter receipts.

## 10. Remote hand-back

When a coherent slice is complete:

- commit locally;
- normal-push only the integration/review branch;
- do not merge to main;
- do not tag/release;
- report the branch and exact commit;
- report IRIS state changes and cleanup;
- report tests;
- report which 0.5–0.8 gates are now live-qualified versus still source-only.

Stop after exhausting the safe IRIS work available without Docker or a new privilege/configuration boundary.
