# Evaluator Guide

OpsDeck can be explored without credentials through the public safe demo:

https://kennethjsmithdev.github.io/OpsDeck/

The demo is intentionally labeled as sanitized sample data and never pretends to be a live IRIS instance.

## 90-second path

### 1. Overview

Start with the evaluator tour and current demo persona.

Notice that OpsDeck presents authority scope explicitly instead of making every management surface appear universally available.

### 2. Applications

Inspect application and REST-service information.

The UI uses bounded provider-owned identity rather than a mirrored administrative database.

### 3. Access

Switch among demo personas and inspect how the available surface changes.

The deterministic dataset stays the same; the projected authority changes.

### 4. Provider-state semantics

OpsDeck treats these as different states:

- valid empty;
- source unavailable;
- access denied;
- failed;
- unverified.

They are not rendered as one generic error.

### 5. Evidence

Open the Evidence route.

This is the product's central rule: state what can be proved, what is blocked, and where qualification deliberately stops.

## Responsive behavior

OpsDeck responds to usable workspace width rather than assuming a particular device class.

- Overview, Applications, and Access remain in compact navigation.
- **More** exposes Security, Tasks, System, Logs, and Evidence when the primary row no longer fits.
- Dense inventories change representation when meaningful columns cannot fit.
- Inspectors stack below lists at constrained widths.
- Source tabs wrap instead of requiring horizontal panning.
- Ordinary tested workflows use vertical scrolling only.

The installed native application was checked across eight routes at 320, 390, 600, 820, 1024, and 1440 CSS px with zero measured document horizontal overflow.

## What the demo proves

The demo is useful evidence for:

- interface organization;
- responsive presentation;
- authority projection;
- provider-state semantics;
- evidence-state communication;
- evaluator workflow.

## What the demo does not prove

It does not prove:

- live IRIS connectivity;
- native installation;
- package lifecycle;
- live audit retrieval;
- live named-log readers;
- mutation behavior.

Those claims require their own evidence. Native/package qualification is recorded in [Qualification Status](QUALIFICATION_STATUS.md).

## Architecture at a glance

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

The safe demo substitutes a deterministic demo provider **only in evaluator mode**. Failed live IRIS reads are not replaced with demo records.

## Current product direction

v0.2.0 established the native IRIS-hosted baseline.

The next product-facing direction is a **capability-aware morphing UI** that projects the same canonical application differently according to observed authority, provider availability, task context, and workspace width without inventing permissions or duplicating authoritative state.

See [Roadmap](ROADMAP.md).
