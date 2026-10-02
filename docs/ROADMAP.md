# OpsDeck roadmap to 1.0

**Status:** living product roadmap. Sequence is evidence-gated, not calendar-gated.

**Current frontier (2026-10-02):** 0.2.1 distribution fidelity is accepted locally; the first bounded 0.3 slice is accepted. 0.4 is deferred/environment blocked. Independent 0.5–0.8 source branches are being developed with live installation, mutation, and persistence boundaries clearly unqualified. See [Qualification Status](QUALIFICATION_STATUS.md).

OpsDeck 0.2.0 established the native IRIS-hosted baseline: source-package lifecycle, live read workflows, evidence semantics, and responsive behavior. The next releases expand from that accepted foundation rather than replacing it.

## Governing rules

- Preserve the published `v0.2.0` tag and its evidence.
- Close the current distribution-fidelity boundary before broad feature work.
- IRIS remains authoritative for IRIS state and permissions.
- New UI projections may hide, group, reorder, or emphasize capabilities, but may not invent authority.
- New write operations require explicit plans, confirmation, authoritative read-back, and durable receipts.
- AI may propose or explain. It does not bypass deterministic operation policy.
- Vector representations are navigational indexes, not authoritative evidence.
- Every milestone requires behavioral correctness and representation-cost sanity.

## 0.2.1 — distribution fidelity

**Status:** ACCEPTED as a local candidate (`50205ed79dbd80a768d67c2455d514c09bbc5999`); not published as a release.

Objective: make a normal public checkout produce the exact package bytes that are qualified.

Acceptance:

- canonical LF checkout contract for the five package inputs;
- fresh Windows checkout using ordinary Git settings;
- exact source hashes captured;
- package identity frozen as 0.2.1 before qualification;
- source → deployed byte parity;
- local-source load/uninstall/clean-reload lifecycle;
- installed-native smoke;
- responsive regression on affected surfaces;
- unrelated-state preservation;
- public-registry install remains a separate gate until actually reproduced.

No feature expansion is required for this patch.

## 0.3 — capability-aware morphing UI

**Status:** first bounded slice accepted at `42e9f60694cc33826748e69ef8d289aac0604a6d`; full 0.3 roadmap remains open.

Objective: make one canonical OpsDeck interface adapt to the operator's **observed authority, available providers, active context, and usable workspace width**.

The UI should feel purpose-built for the current operator without duplicating IRIS state or creating a parallel permission system.

### Inputs

- authenticated identity;
- observed provider availability;
- observed authorization/denial evidence;
- route and selected resource;
- capability maturity/qualification state;
- viewport/component width;
- task context such as failure, degraded source, or selected application.

### Outputs

Possible projections include:

- primary navigation ordering;
- which routes remain first-class versus move under **More**;
- which actions are shown, disabled, or omitted;
- context-sensitive evidence and diagnostics;
- inspector/detail density;
- surfaced related domains;
- compact versus expanded summaries;
- task-specific investigation affordances.

### Hard rules

```text
observed authority ≠ inferred authority
hidden control ≠ missing capability
UI projection ≠ authorization
layout state ≠ IRIS state
```

The backend/provider remains responsible for enforcing actual authority.

### Acceptance

- deterministic projection from the same semantic inputs;
- no privilege inferred from role names alone;
- denied, unavailable, unqualified, and unsupported remain distinguishable;
- navigation remains keyboard/touch usable;
- state survives wide → narrow → wide transitions;
- tested across representative authority profiles and responsive widths;
- no duplicated authoritative resource cache introduced merely for presentation;
- fallback UI remains usable when capability evidence is incomplete.

## 0.4 — native Docker / clean-room reproduction

**Current status:** DEFERRED / ENVIRONMENT BLOCKED. No Docker, WSL, Windows feature, or privilege changes were made in the mobile-first continuation.

Objective: reproduce the **native IRIS-hosted architecture** in a clean container environment.

Preferred shape:

```text
IRIS container
  ├─ OpsDeck IPM package
  ├─ /opsdeck native application
  └─ authoritative IRIS APIs
```

The old Node proxy remains a development/reference path, not the default production topology.

Acceptance includes clean build/start, documented human initialization boundary, persistence behavior, package install, native browser smoke, restart, and secret-free image/Compose metadata.

## 0.5 — close remaining read-provider gaps

**Current status:** bounded audit async source work exists; fixed-log reader remains a source prototype pending IRIS compile, byte/encoding, denial-classification, and privilege qualification.

Priority gaps:

- audit async result handoff;
- bounded `messages.log` reader;
- bounded `SystemMonitor.log` reader;
- any remaining high-value M1 provider gap demonstrated by current evidence.

No arbitrary filesystem bridge.

## 0.6 — verified operation engine

**Current status:** source-ready and fixture-qualified; live executor and disposable IRIS fixture remain unqualified.

Introduce the canonical write path:

```text
operator intent
   ↓
OperationPlan
   ↓
fresh pre-state
   ↓
policy / authority validation
   ↓
explicit confirmation
   ↓
provider operation
   ↓
authoritative read-back
   ↓
OperationReceipt
```

Start only with disposable, reversible fixtures.

No automatic retry after an ambiguous write.

## 0.7 — durable Evidence Center

**Current status:** evidence contract and UI are source-ready; current implementation is session-memory backed and persistence remains unqualified.

Promote Evidence from current-session communication to bounded durable operational evidence.

Candidate capabilities:

- durable redacted OperationReceipts;
- read-only evidence captures;
- source/resource identity links;
- compact JSON and Markdown export;
- clear VERIFIED / PARTIAL / FAILED / UNVERIFIED semantics.

Secrets never enter evidence payloads.

## 0.8 — Applications → Packages

**Current status:** workspace and planning fixture are source-ready; live IPM inventory and execution are unqualified. Confirmation stays unavailable until the real executor and disposable fixture pass.

Use live IPM state to add a Packages workspace under Applications.

Stages:

1. installed/available package inventory;
2. repository/source identity;
3. namespace-explicit package detail;
4. reviewed install plan;
5. explicit confirmation;
6. install through a bounded IRIS-owned seam;
7. installed-state read-back;
8. OperationReceipt.

Package install is HIGH-risk relative to ordinary reads and should never become a one-click list action.

## 0.9 — vector evidence retrieval

Use IRIS Vector Search to index **redacted operational evidence projections** for navigation and similarity.

Example:

```text
Evidence / receipt
   ↓
operation-sufficient redacted projection
   ↓
embedding
   ↓
IRIS VECTOR
   ↓
similar prior incidents / operations / failures
   ↓
source EvidenceRef
```

The vector result must always resolve back to authoritative evidence. Similarity is not proof.

## 0.9.x — AI planning and explanation

AI depends on the semantic/evidence system above.

Desired role:

- explain current observed state;
- summarize relevant evidence;
- retrieve similar prior evidence;
- suggest investigation paths;
- prepare bounded OperationPlans;
- explain risks and missing evidence.

AI does **not** directly gain write authority.

```text
AI proposes
   ↓
OperationPlan
   ↓
deterministic OpsDeck policy
   ↓
human confirmation
   ↓
normal operation engine
   ↓
authoritative read-back
   ↓
OperationReceipt
```

This avoids the generic "chatbot in the admin portal" failure mode and keeps reasoning separate from authority.

## 1.0 — qualified product

1.0 means the supported product contract is independently reproducible, not merely feature-rich.

Target qualification includes:

- source and public-registry installation;
- upgrade path from supported 0.x release;
- native Windows path;
- clean Docker reproduction;
- capability-aware responsive UI;
- qualified read provider set;
- bounded verified operations;
- durable Evidence Center;
- package workspace;
- vector-backed evidence retrieval;
- AI planning/explanation at its documented authority boundary;
- security and secret-handling review;
- release documentation and clean evaluator path.

The exact 1.0 scope may narrow if evidence shows a feature cannot meet the same quality bar as the accepted foundation.

