# Evaluator Guide

Explore OpsDeck without credentials:

https://kennethjsmithdev.github.io/OpsDeck/

The safe demo uses deterministic sanitized data. It demonstrates the interface and evidence semantics, not live IRIS permissions or data.

## 90-second path

### 1. Overview

Start with the evaluator tour and current demo persona.

### 2. Applications

Inspect application and REST-service information.

### 3. Access

Switch demo personas and notice that the dataset remains deterministic while the projected authority changes.

### 4. Provider-state semantics

OpsDeck keeps these distinct:

- valid empty;
- unavailable;
- denied;
- failed;
- unverified.

### 5. Evidence

Open Evidence. This is the product's central rule: state what can be proved, what is blocked, and where qualification deliberately stops.

## Responsive behavior

OpsDeck responds to usable workspace width rather than assuming a device class.

- compact navigation moves secondary routes under **More**;
- dense inventories change representation when columns no longer fit;
- inspectors stack below lists;
- source tabs wrap;
- ordinary tested workflows avoid horizontal panning.

The installed native v0.2.0 application was checked across eight routes at 320, 390, 600, 820, 1024, and 1440 CSS px with zero measured document horizontal overflow. A wide → narrow → wide sequence preserved the selected Applications state without reload.

## What the demo proves

- interface organization;
- responsive presentation;
- authority projection;
- provider-state semantics;
- evidence-state communication;
- evaluator workflow.

## What the demo does not prove

- live IRIS connectivity;
- native installation;
- package lifecycle;
- live audit retrieval;
- live named-log readers;
- mutation behavior.

Those claims have separate evidence. See [Qualification Status](QUALIFICATION_STATUS.md).

## Architecture

```text
User
  ↓
OpsDeck
  ↓
bounded provider adapter
  ↓
authoritative IRIS source
  ↓
rendered state
  ↓
independent read-back where qualified
```

The safe demo substitutes a deterministic demo provider **only in evaluator mode**. Failed live reads are never replaced with demo records.

## Current direction

v0.2.0 established the native IRIS-hosted baseline.

The next product-facing target, after the current distribution-fidelity diagnostic gate closes, is a capability-aware morphing UI driven by observed authority, provider availability, context, and workspace width.

See [Roadmap](ROADMAP.md).
