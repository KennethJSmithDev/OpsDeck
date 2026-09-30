# Evaluator Guide

OpsDeck can be evaluated without credentials through the public safe demo:

https://kennethjsmithdev.github.io/OpsDeck/

The demo is intentionally labeled as sanitized sample data and does not pretend to be a live IRIS instance.

## 90-second path

### 1. Overview

Start with the evaluator tour and current demo persona.

Notice that OpsDeck presents authority scope explicitly rather than making every management surface appear universally available.

### 2. Applications

Inspect application and REST-service information.

The UI is designed around bounded provider-owned identities rather than a mirrored administrative database.

### 3. Access

Switch among the demo personas and inspect how the available surface changes.

The dataset stays deterministic; authority changes.

### 4. Provider boundaries

OpsDeck treats these as different states:

- valid empty;
- source unavailable;
- access denied.

They are not rendered as interchangeable generic errors.

### 5. Evidence

Open the Evidence view.

It shows the product's central rule: state what can be proved, what is blocked, and what remains unverified.

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
- live log-file reads;
- any mutation.

See [Qualification Status](QUALIFICATION_STATUS.md) for the current live/native evidence boundary.

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

The final shipping target is an IRIS-native application served from `/opsdeck`, with the public Node server retained as a compact reference/development runtime.

Final installation claims will be published only after the native package lifecycle is reproduced.
