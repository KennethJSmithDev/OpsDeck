# OpsDeck roadmap to 1.0

**Status:** living product roadmap. Sequence is evidence-gated, not calendar-gated.

OpsDeck v0.2.0 established the native IRIS-hosted baseline: package lifecycle, live read workflows, evidence semantics, and responsive behavior.

Future work builds from that accepted foundation rather than reopening it without contradictory evidence.

## Governing rules

- Preserve shipped release identities and evidence.
- Close distribution fidelity before broad feature work.
- IRIS remains authoritative for IRIS state and permissions.
- UI projection may adapt presentation, but may not invent authority.
- Ambiguous mutation results stop automatic cleanup/retry.
- Write operations require fresh pre-state, explicit confirmation, authoritative read-back, and receipts.
- AI may propose or explain. It does not acquire execution authority.
- Vector similarity is navigation, not proof.
- Every milestone requires behavioral correctness and representation-cost sanity.

## 0.2.1 — distribution fidelity — ACCEPTED

Accepted corrected candidate:

`50205ed79dbd80a768d67c2455d514c09bbc5999`

Accepted evidence includes:

- fresh Windows checkout / Git-blob parity;
- exact source → deployed byte parity;
- 16-stage package lifecycle;
- uninstall/removal and clean same-source reload;
- proof + 1,504-row canonical sibling preservation;
- 82/82 regressions;
- installed-native identity/hash gate;
- 48 route-at-width browser samples;
- no-reload responsive Applications sequence;
- selected-resource preservation;
- zero document overflow / ordinary horizontal scrollers;
- sign-out/session clearing.

Public-registry installation remains a separate distribution gate.

The earlier failed responsive specimen is preserved as historical evidence rather than rewritten.

## 0.3 — capability-aware morphing UI — ACTIVE LOCAL QUALIFICATION

Local implementation exists on a separate feature branch from the accepted 0.2.1 foundation. Local regression and exact lifecycle checks pass; installed-native browser qualification remains pending human sign-in.

Objective: project one canonical OpsDeck interface according to:

- observed authority;
- provider/capability availability;
- active context;
- usable workspace width.

The UI should feel purpose-built for the current operator without becoming a second authorization system.

Hard rules:

```text
observed authority ≠ inferred authority
UI projection ≠ authorization
role name ≠ capability proof
layout state ≠ IRIS state
hidden control ≠ missing capability
```

First slice:

1. deterministic UI projection from existing semantic state;
2. primary navigation + **More** composition;
3. explicit denied/unavailable/unqualified states;
4. contextual emphasis without mutating authoritative state;
5. responsive behavior preserved;
6. safe-demo personas use the same projection mechanism where practical.

## 0.4 — native Docker / clean-room reproduction

Preferred production topology:

```text
IRIS container
  ├─ OpsDeck IPM package
  ├─ /opsdeck native application
  └─ authoritative IRIS APIs
```

The Node proxy remains a development/reference path unless evidence requires otherwise.

## 0.5 — remaining read-provider gaps

Priority:

- audit async result handoff;
- bounded `messages.log` reader;
- bounded `SystemMonitor.log` reader;
- other high-value provider gaps demonstrated by evidence.

No arbitrary filesystem bridge.

## 0.6 — verified operation engine

```text
operator intent
→ OperationPlan
→ fresh pre-state
→ policy / authority validation
→ explicit confirmation
→ provider operation
→ authoritative read-back
→ OperationReceipt
```

Start with disposable, reversible fixtures.

## 0.7 — durable Evidence Center

Add bounded persistent evidence:

- redacted OperationReceipts;
- evidence captures;
- source/resource identity links;
- compact JSON/Markdown export;
- VERIFIED / PARTIAL / FAILED / UNVERIFIED semantics.

No secrets in evidence payloads.

## 0.8 — Applications → Packages

Use live IPM state for package inventory and reviewed installation.

No one-click install from a list.

Package installation is a high-risk operation and requires plan → confirmation → bounded execution → installed-state read-back → receipt.

## 0.9 — vector-backed evidence retrieval

Use IRIS Vector Search over redacted operational evidence projections.

Every similarity result must resolve back to source evidence.

## 0.9.x — AI planning and explanation

AI depends on the semantic/evidence system.

```text
observed state
→ relevant evidence
→ vector retrieval
→ AI explanation / proposal
→ OperationPlan
→ deterministic policy
→ human confirmation
→ normal executor
→ authoritative read-back
→ OperationReceipt
```

AI proposes.

AI does not acquire authority.

## 1.0 — qualified product

1.0 means the supported contract is independently reproducible, not merely feature-rich.

Target qualification includes:

- source and public-registry installation;
- supported upgrade path;
- native Windows path;
- clean Docker reproduction;
- capability-aware responsive UI;
- qualified read-provider set;
- bounded verified operations;
- durable Evidence Center;
- package workspace;
- vector-backed evidence retrieval;
- AI planning/explanation at its documented authority boundary;
- security/secret-handling review;
- polished release documentation and evaluator path.
