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

## 0.2.1 — distribution fidelity

Objective: make a normal public checkout produce the exact package bytes that are qualified.

Checkout representation is verified for the frozen candidate under normal Windows Git settings.

The exact 0.2.1 local-source lifecycle has also passed after qualification-tooling defects were localized and corrected.

Accepted so far:

- exact fresh-checkout source hashes;
- source → deployed byte parity;
- load/registration;
- uninstall/removal;
- unrelated-state preservation;
- clean same-source reload;
- 82/82 regressions;
- sanitized/private evidence preservation.

Accepted additionally:

- installed-state identity/hash gate;
- representative installed-native desktop route checks;
- Applications/Access/Tasks/Security/Logs read-back behavior;
- Evidence historical wording classification;
- sign-out/session-clear behavior.

Responsive qualification result:

- all 48 individual route-at-width observations passed at 320/390/600/820/1024/1440 CSS px;
- selected `/opsdeck` state survives the no-reload Applications transition;
- the no-reload transition nevertheless fails at 320/390/600 px because inventory tables retain a stale 660 px minimum width and create document-level overflow.

Remaining acceptance gate:

- smallest justified responsive fix on a separate authorized branch;
- rerun the affected no-reload transition and exact-width browser checks against the corrected bytes;
- explicit installed-native browser PASS.

Public-registry installation remains a separate gate.

## 0.3 — capability-aware morphing UI

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
