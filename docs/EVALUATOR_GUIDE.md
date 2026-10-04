# OpsDeck 1.0.0 Evaluator Guide

Current release: **OpsDeck 1.0.0**, qualified on the exact Main commit [`be35ed89c21e91079b0152ba4572f0700839b515`](https://github.com/KennethJSmithDev/OpsDeck/commit/be35ed89c21e91079b0152ba4572f0700839b515). The published native archive is [`opsdeck-1.0.0-rc.tgz`](https://github.com/KennethJSmithDev/OpsDeck/releases/download/v1.0.0/opsdeck-1.0.0-rc.tgz), SHA-256 `178bf6ea3809b023ed76a39ea313cfaf33ff3f5e91a5afbfc2627cadf3faf798`.

Capability accounting is **117 / 56 / 37 / 34 / 7 / 12**: exposed, runtime-observed, reproduced, independently verified, exposed mutation operations, and qualified mutation workflows. Qualification passed **259 tests**; shipped manifest is **610,382 bytes**. These counts reflect their recorded evidence scopes, not complete CRUD or universal authority.

## Safe demo

Open the [current safe demo](https://kennethjsmithdev.github.io/OpsDeck/) without credentials. It uses deterministic synthetic data and does not prove a live IRIS connection or native mutation. Start at Overview, inspect Applications and Access, use the role selector and FX Studio controls, and finish at Evidence/Session Ledger. On small screens, use the collapsed navigation and command surface; the tested one-thumb critical flow avoids horizontal scrolling.

## Native qualification evidence

The [1.0.0 qualification report](RC_1_0_0_QUALIFICATION_20261004.md) covers the exact package, fresh Docker installation and initialization, authenticated browser reads, rehearsal/forecast/review, Observe Only enforcement, reversible role mutation and authoritative read-back, Verified Receipts, restoration and cleanup, IPM lifecycle, Embedded Python, native Vector Search, generic SysAdmin explorer, mobile/compact-height flow, privacy scan, and final manifest measurement. Detailed native receipts and screenshots remain in the private qualification evidence store.

## Install the exact qualified archive

Download the archive from the [v1.0.0 GitHub release](https://github.com/KennethJSmithDev/OpsDeck/releases/tag/v1.0.0), verify the SHA-256 above, and load it from the IRIS IPM prompt in `%SYS`:

```text
load C:\path\to\opsdeck-1.0.0-rc.tgz
```

Open `http://127.0.0.1:<your-instance-port>/opsdeck/index.html`. See [Native Installation](NATIVE_INSTALL.md) for prerequisites, ownership, update, recovery, and uninstall boundaries. Public-registry availability is not confirmed; the `zpm install opsdeck` shortcut must not be assumed to resolve 1.0.0.

## Known limits

Task Description HTTP 500 and the message-rotation probe remain known debt and are excluded from dispatch and capability counts. Vector similarity is bounded concept navigation, not incident proof or a neural embedding claim. Native qualification applies to the named disposable Docker target, identity, and exact approved fixture authority; other IRIS versions, broad operator policies, arbitrary packages, concurrency, and scale are not inferred. See the qualification report for full limits.
