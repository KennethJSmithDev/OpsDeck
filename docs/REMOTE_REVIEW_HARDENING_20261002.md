# Remote hardening review — 0.5 through 0.8

**Purpose:** preserve remote review findings before local IRIS qualification.

This branch is review/development state only. It does not promote 0.5–0.8 to accepted live functionality and it does not alter the accepted 0.2.1 or first bounded 0.3 evidence.

## Review branches

### Fixed-log / audit hardening

Branch:

`review/harden-fixed-log-reader-0.5-20261002`

Base:

`feature/fixed-log-reader-source-0.5` at `90108d61d33154ed497f19f0e3516353992c7c57`

Remote review changes:

- async-result mapping now requires the immutable handle returned by the strict Location validator; raw task IDs no longer satisfy the mapping contract;
- the ObjectScript reader remains limited to exactly `messagesLog` and `systemMonitorLog`;
- the reader now describes a bounded recent-tail observation rather than reading from the beginning of the file;
- the reader explicitly requires the current process to hold `%Admin_Operate:Use`, matching InterSystems' documented privilege for examining logs;
- the intended IRIS-side window is at most 64 KiB plus one context byte used only to discard a partial first line;
- output keeps at most the newest 250 complete lines inside that bounded window;
- CR/LF and other non-TAB control characters are removed from returned line values;
- raw filesystem paths remain absent from the browser contract.

Still unqualified until IRIS runtime work:

- ObjectScript compilation;
- exact `%File.Size`, `MoveTo()`, binary-mode, and multibyte behavior on the installed IRIS 2026.2 build;
- log-growth/rotation behavior during a read;
- installed-runtime confirmation that `%Admin_Operate:Use` is evaluated in the expected authenticated process context;
- OS/file failures remain classified separately from the explicit IRIS authorization denial;
- browser-safe IRIS endpoint/adapter;
- package/module inclusion.

The hardening branch must remain separate from the 0.6–0.8 chain until local integration is explicitly tested.

## 0.6 operation-engine hardening carried on this branch

The browser-deployed `public/operation-engine.js` is now the canonical implementation. `src/operation-engine.js` is only a Node/test re-export seam.

Operation planning now fails closed unless the operation matches policy-owned:

- capability identity;
- semantic action;
- risk;
- provider operation identity;
- required privilege declaration;
- target domain/kind/provider;
- exact parameter keys and values;
- exact pre-state keys and operation-specific state constraints.

Package plans also bind namespace, source identity, installed version, and requested version to the observed synthetic pre-state.

This remains fixture qualification only. No live IRIS executor has been added.

## 0.7 Evidence hardening carried on this branch

Evidence persistence/export is now based on positive field projections instead of recursive denylist-style redaction.

Each evidence kind owns the fields that may be retained. Unknown fields are omitted even when they have harmless-looking names.

JSON and Markdown export re-project supplied records before serialization, so callers cannot bypass the evidence field contract by passing raw records to an export function.

Nested object payloads are rejected for the currently allowed evidence fields.

This remains session-memory contract/UI work. No durable IRIS persistence backend has been added.

## 0.8 Packages state

The Packages workspace remains visibly synthetic and still uses the canonical operation engine.

Live package execution remains unavailable. Confirmation remains unavailable until a qualified executor, authority evidence, disposable fixture, authoritative IPM read-back, and receipt path exist.

## Local qualification order

1. Fetch both remote hardening branches into isolated local worktrees.
2. Run JavaScript syntax checks, `npm test`, and `git diff --check` on each branch.
3. Review the 0.5 ObjectScript class against the installed IRIS 2026.2 class reference and compile it in an isolated test namespace without changing the accepted OpsDeck package/web app.
4. Exercise the two fixed sources read-only and record actual line count, byte count, truncation, status/error behavior, and whether returned rows are the recent tail.
5. Preserve any denied/unavailable distinction only if directly observed.
6. Integrate the reviewed 0.5 changes with this 0.8 hardening branch in a new local integration branch; do not rewrite either review branch.
7. Re-run the full regression suite after integration.
8. Implement IRIS-side seams for 0.6–0.8 incrementally, preserving the existing policy/evidence contracts.
9. Do not execute a real 0.6 mutation without a separately identified disposable and reversible fixture.
10. Keep Docker deferred unless explicitly reactivated.

## Identity / release boundary

- Public v0.2.0 remains unchanged.
- Accepted local 0.2.1 remains unchanged.
- Accepted first bounded 0.3 slice remains unchanged.
- Package version remaining 0.2.1 on the source frontier is development state, not a release claim.
- Do not overwrite the accepted installed `/opsdeck` bytes merely to test source-frontier code under the same package identity.
- Prefer isolated runtime qualification and preserve exact source/installed identities in receipts.

## Stop conditions

Stop before:

- privilege expansion;
- service enablement;
- broad filesystem access;
- generic ObjectScript execution;
- mutation of the accepted installed OpsDeck package merely for convenience;
- non-disposable live mutation;
- public merge/tag/release/Open Exchange publication.

