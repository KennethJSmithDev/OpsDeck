# OpsDeck competitor gap staging — 2026-10-04

> Architectural research only. Competitor code must never be copied. Technical ideas, insights, and architectural findings may inform independent OpsDeck design.

## Current OpsDeck accepted frontier

Checkpoint: `3e1680ffeb1f3d855203e086e0f1fbcf4bb5abd9`.

OpsDeck currently has:

- 113 exposed SysAdmin operations
- Operation Rehearsal
- Impact Forecast
- Plan Review
- Observe Only enforced in the executor
- authoritative read-back and Verified Receipts
- Session Ledger / Evidence
- schema-derived SysAdmin explorer
- command palette and JSON/CSV export
- FX Studio representation projector
- TargetRef and target comparison semantics
- workflows over canonical operations
- Evidence-backed entity relationships
- Embedded Python + native Vector retrieval
- untrusted CandidateIntent → server-owned OperationPlan reconstruction
- seven bounded AI profiles
- qualified compact mobile/short-height layouts

## Remaining high-value gaps

### Aperture

Public project: https://github.com/MxSalata/aperture

Current public strengths still ahead of OpsDeck:

- substantially broader raw SysAdmin operation exposure
- broader real-runtime verification count
- mature long-tail API explorer
- polished evaluator/demo story
- mature dashboard/connection customization

OpsDeck differentiators:

- stronger central Evidence semantics
- explicit untrusted-inference trust boundary
- workflow composition over canonical operations
- much smaller committed production representation
- richer optional FX representation
- explicit compact/one-thumb qualification

### FlightDeck

Public project: https://github.com/kcedd34/iris-flightdeck

Current public strengths still ahead:

- 273-operation declared surface
- 138 independent read-back verifications reported
- broad CRUD/security/OS/task/log mutation coverage
- mature disposable real-IRIS demo

OpsDeck has now independently converged on equivalent classes of UX through its own semantics:

- dry-run class → Operation Rehearsal
- impact class → Impact Forecast
- read-only class → Observe Only
- activity trail class → Session Ledger
- entity relationships → Evidence-backed Entity Graph
- command palette → OpsDeck command surface

Largest remaining gap: **mutation breadth**, not mutation depth.

### OcuPilot

Public project: https://github.com/jbrandtmse/OcuPilot

Current public strengths still ahead:

- live external model providers
- very broad CRUD/editors
- mature AI interaction UX and governance surfaces
- source/SQL explorer breadth

OpsDeck differentiator:

- model/provider output is explicitly untrusted
- server reconstructs CandidateIntent from fresh authoritative state
- effective authority is bounded independently from provider output
- existing executor/read-back/Evidence path remains authoritative

Do not weaken this architecture merely to imitate OcuPilot's UI.

### SentaiTask

Public project: https://github.com/musketeers-br/sentai-task

Current public strengths still ahead:

- workflow/orchestration depth
- scheduling
- parallel/fan-in execution
- distributed target execution
- run lifecycle depth

OpsDeck should reuse its own canonical-operation workflow substrate rather than recreate Sentai's product.

High-value shared socket: a second real IRIS target would strengthen workflows, multi-target evidence, and Community Opportunity DPI-I-588 potential.

### Multi-instance competitors

Do not build a separate fleet product inside OpsDeck.

Continue the compact representation:

`TargetRef → independent observation → compare → independent plans/receipts`.

No fake distributed transaction.

## Current attack order

1. Generic mutation families over the 161 mutation-shaped contracts.
2. Second disposable IRIS target if cheaply available.
3. Harvest native reader/provider gaps that have clear ownership.
4. Bounded Embedded Python edge-case audit.
5. Fresh performance/accessibility measurements.
6. Freeze architecture at noon and move to release/presentation.
