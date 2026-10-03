# OpsDeck qualification status

**Current public release:** `v0.2.0`  
**Release commit:** `23215459096cb47d255c45b1e6e86687f3d8e93a`  
**Public release status:** unchanged; no newer public release or registry availability is claimed.

This document separates public release, accepted local qualification, and source-only development. Source branches do not inherit installed or live qualification.

## Accepted local qualification

### 0.2.1 distribution fidelity

- Corrected candidate: `50205ed79dbd80a768d67c2455d514c09bbc5999`
- Branch: `fix/0.2.1-responsive-inventory-reflow`
- Status: **ACCEPTED locally**
- Fresh Windows checkout / Git-blob parity: PASS
- Controlled lifecycle: PASS
- Regression suite: 82/82 PASS
- Installed-native responsive qualification: PASS
- 48 route-at-width observations and no-reload responsive transition: PASS

The failed responsive specimen `69e1215febab5008fc0542d96c0e921f638b4502` remains historical evidence. The accepted local candidate has not replaced the public `v0.2.0` release.

### 0.3 capability-aware morphing UI — first bounded slice

- Commit: `42e9f60694cc33826748e69ef8d289aac0604a6d`
- Branch: `feature/capability-aware-morphing-ui`
- Status: **FIRST BOUNDED SLICE ACCEPTED**, not full 0.3 completion
- Local regressions: 88/88 PASS
- Lifecycle and installed-native browser/responsive qualification: PASS

The accepted slice projects navigation and contextual priority from observed provider evidence without treating presentation as authority.

## Current development frontier — 2026-10-02

### Contest 0.8 continuation — 2026-10-03

| Milestone | Branch / tip | Evidence classification |
|---|---|---|
| Shared session Job Center source slice | `integration/opsdeck-1-20261002` / changes in current checkpoint | **SOURCE IMPLEMENTED / LOCAL TESTED 136/136 / IRIS MUTATING JOB FLOW UNQUALIFIED**. The accepted bounded audit async read is projected into one bounded session Job collection, Tasks Job Center, and session Evidence. Ambiguity is explicit and never retried. |

Docker reconnaissance found the CLI but no reachable configured Linux or default engine socket. No container/image/volume was created. User-authorized Decision A fixes Evidence as session-scoped for 0.8/1.0 and defers Vector Search absent an independently owned derived-index boundary. Existing installed-package observations and fixed-log qualification were not repeated.

All entries below are local source work. They have not been installed into IRISTesting and do not qualify live execution or persistence.

| Milestone | Local branch / commit | Evidence classification |
|---|---|---|
| 0.4 Docker / clean-room | No new source change | **DEFERRED / ENVIRONMENT BLOCKED**. Docker repair, WSL changes, and elevation were explicitly deferred until PC return. |
| 0.5 audit async | `feature/bounded-read-provider-coverage-0.5` / `6f24069cb6d15799e929519cdc2de504941d667c` | Bounded source slice; maxRows=1, strict same-origin/path validation, no redirect following. Complete official result schema remains UNVERIFIED. |
| 0.5 fixed logs | `feature/fixed-log-reader-source-0.5` / `90108d61d33154ed497f19f0e3516353992c7c57` | **SOURCE PROTOTYPE / IRIS COMPILE AND PRIVILEGE CONTRACT UNQUALIFIED**. Provider-boundary tests pass. ObjectScript runtime byte accounting and denied-versus-unavailable classification require IRIS-side proof. Not packaged or installed. |
| 0.6 operation engine | `feature/verified-operation-engine-0.6` / `57b5b022641e7a24d178bc9389a2dc229944a512` | **SOURCE-READY / FIXTURE-QUALIFIED / LIVE-EXECUTOR-UNQUALIFIED**. Deterministic risk policy, explicit authority evidence, stale-plan checks, cancellation, denial/unavailable/ambiguous states, no ambiguous retry, and read-back-gated receipts. |
| 0.7 Evidence Center | `feature/durable-evidence-center-0.7` / `88f22c9537df11d1340380a446df74c146f2b9be` | **EVIDENCE-CONTRACT/UI SOURCE-READY / PERSISTENCE BACKEND UNQUALIFIED**. Bounded redacted session evidence, filtering, and JSON/Markdown export; no durable IRIS provider. |
| 0.8 Applications → Packages | `feature/applications-packages-0.8` / `ed490e94af92fce52c2d564cc95377a9f3baee38` | **WORKSPACE SOURCE-READY / PLANNING-FIXTURE FLOW QUALIFIED / LIVE IPM EXECUTION UNQUALIFIED**. Package rows are visibly synthetic; plans are HIGH risk and confirmation remains disabled. |

Local regression results at those source commits: 0.6 **95/95**, 0.7 **100/100**, and 0.8 **104/104**. Tests prove the local contracts and fixture behavior only.

## Unverified / deferred boundaries

- Docker clean-room reproduction and persistence across container restart.
- Audit async result schema beyond the observed bounded empty result.
- Fixed-log ObjectScript compilation, exact byte/encoding behavior, denial classification, and minimum required privileges.
- A disposable fixture for any live 0.6 mutation and a real qualified write executor.
- A persistent, redacted IRIS-backed 0.7 Evidence provider.
- Read-only IPM repository/inventory attachment and a disposable package fixture for 0.8.
- Real IPM install/update/remove result semantics and authoritative post-operation read-back.
- Public registry installation of OpsDeck, public release of 0.2.1, and Open Exchange availability.

## PC-return sequence

1. Restore Docker and qualify the 0.4 clean-room boundary.
2. Compile and inspect the fixed-log reader on IRIS; determine the exact read privilege and denial/error mapping without widening privileges.
3. Qualify the first real 0.6 mutation only against a disposable IRIS fixture after the operation executor is reviewed.
4. Attach and qualify a persistent 0.7 evidence provider.
5. Observe IPM read-only package metadata, then attach a disposable package fixture before considering any 0.8 execution path.

The accepted 0.2.0 and 0.2.1 historical evidence is preserved. No Phase C continuation, 0.9 work, public push, merge, tag, release, registry claim, or Open Exchange action is included in these source branches.
