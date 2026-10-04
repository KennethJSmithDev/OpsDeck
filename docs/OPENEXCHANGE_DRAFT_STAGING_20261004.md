# Open Exchange / contest listing draft — staging

> Do not publish until final release qualification. Replace counts/versions/links from the final ledger.

## Short description

OpsDeck is a compact, evidence-first operations environment for InterSystems IRIS. It observes live state, rehearses bounded changes, forecasts impact, executes through a shared authority-aware engine, verifies authoritative read-back, retains receipts, and lets operators investigate Evidence with Embedded Python and native IRIS Vector Search.

## Why OpsDeck

OpsDeck is built around one operational law:

**OBSERVE → REHEARSE → FORECAST → PLAN → AUTHORITY → CONFIRM → EXECUTE → READ BACK → RECEIPT → LEDGER**

The same semantics support handcrafted workflows, a schema-derived SysAdmin explorer, package operations, multi-target comparison, workflows, Evidence-backed entity relationships, semantic retrieval, adaptive mobile UI, and bounded AI assistance.

AI/provider output is not authority. Candidate intent is reconstructed server-side against fresh IRIS state before it can become an OperationPlan.

## Current accepted integration facts

- 113 exposed IRIS operations
- 51 runtime-observed
- 31 reproduced
- 28 independently verified
- 6 historically qualified mutation workflows
- 238/238 tests at the accepted all-nine-phase checkpoint
- ~408 KiB browser JS/CSS/HTML
- ~637 KiB complete accepted manifest
- Embedded Python
- IRIS Vector Search
- IPM/ZPM
- Docker qualification
- online safe demo
- one-thumb/compact-layout qualification
- optional/removable FX Studio representation layer

These values are staging facts and must be regenerated before publication.

## Community Ideas implemented

Primary accepted claim:

- **DPI-I-261** — package inventory/catalog plus qualified install/remove through the canonical executor, authoritative read-back, and receipts.

Other Ideas must be listed only after their exact acceptance scope passes.

## Installation

Final release must preserve the existing one-command IPM path:

`zpm "install opsdeck"`

Add Docker and direct evaluator paths after exact final-release qualification.
