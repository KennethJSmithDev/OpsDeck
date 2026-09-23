# OpsDeck

**OpsDeck** is an open-source management console for InterSystems IRIS.

> Current status: **pre-M0 / platform validation**.  
> The public repository intentionally contains no claimed working implementation until the first live IRIS → management API → OpsDeck GUI path is reproduced and verified.

## Competition

OpsDeck is being developed for the **InterSystems Programming Contest: Build Your Own Management Portal (2026)**.

The contest requires a GUI powered by InterSystems IRIS management APIs covering:

- web application management and REST API exploration;
- permission management;
- security and secrets management;
- task management;
- operating-system/system management;
- logs surfaced from relevant subsystems.

## Engineering principle

OpsDeck does not attempt to reimplement the InterSystems Management Portal or mirror the entire IRIS platform.

The intended boundary is:

```text
User intent
  → OpsDeck GUI
  → compact resource/action model
  → thin InterSystems adapter
  → authoritative IRIS management APIs
  → result
  → authoritative read-back
  → evidence-aware UI
```

IRIS remains the owner of IRIS state.

## Current milestone

### M0 — OPEN

M0 will pass only after a reproducible live path proves:

1. a supported InterSystems IRIS Community Edition / IRIS for Health Community Edition instance is actually running;
2. OpsDeck authenticates through a supported management interface;
3. `GET /api/admin/info` returns live server/API identity;
4. `GET /api/admin/v2/web-apps` returns a real management result;
5. OpsDeck renders that result in its GUI;
6. an authoritative read-back verifies the displayed state;
7. the complete path is reproducible from documented setup;
8. no credentials or private tokens are committed.

Until then, functionality should be considered **unverified**.

## Source and development model

The submitted OpsDeck product will remain fully reproducible from this public repository.

Internal research, failed experiments, benchmark evidence, and unrelated proprietary engineering capability may be maintained separately, but **nothing required to run or reproduce the judged application will depend on private code or private infrastructure**.

## Documentation

Competition research, rules evidence, platform capability mapping, and experiment metrics are maintained separately in the P001 competition documentation workflow.

Product installation and usage documentation will move into this repository as milestones become reproducible.

## License

An open-source license will be selected before the first contest release. No license grant should be inferred until a LICENSE file is committed.
