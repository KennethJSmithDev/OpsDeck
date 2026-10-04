# OpsDeck

<p align="center">
  <a href="https://kennethjsmithdev.github.io/OpsDeck/"><strong>🚀 HISTORICAL SAFE DEMO</strong></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/KennethJSmithDev/OpsDeck/releases/tag/v0.2.0"><strong>📦 HISTORICAL v0.2.0</strong></a>
  &nbsp;·&nbsp;
  <a href="docs/NATIVE_INSTALL.md"><strong>🛠️ NATIVE INSTALL</strong></a>
  &nbsp;·&nbsp;
  <a href="docs/EVALUATOR_GUIDE.md"><strong>🧭 EVALUATOR GUIDE</strong></a>
  &nbsp;·&nbsp;
  <a href="docs/ROADMAP.md"><strong>🗺️ ROADMAP</strong></a>
</p>

<p align="center">
  <sub>Native IRIS operations console · Evidence-scoped verification · Responsive from phone to desktop</sub>
</p>

<p align="center">
  <img src="assets/OpsDeckLogo.png" alt="OpsDeck — Operations Console for InterSystems IRIS" width="720">
</p>

**OpsDeck** is an open-source operations console for InterSystems IRIS. It brings application discovery, access and security metadata, tasks, system information, logs, and evidence-backed read verification into one focused interface.

OpsDeck is being developed for the **InterSystems Programming Contest: Build Your Own Management Portal (2026)**.

## Current Main state — OpsDeck 1.0 Pre-RC

Main is the authoritative pre-RC product source. The accepted mutation checkpoint `e6328c704d021052629f40b6d41c2759596e2c1e` was promoted by merge `3b7a5307183addec6e32418b7858161a8aa666f3`; remote Main and integration had exactly the same tree `793e621a335a80befff4b92ac1400bc6b2578e17`.

All nine roadmap phases retain bounded acceptance. Source-generated accounting is **117 exposed / 56 observed / 37 reproduced / 34 independently verified / 7 exposed mutation endpoints / 12 qualified mutation workflows**, over 276 declared operations and 161 mutation-shaped contracts. Supported fields and authority/read-back scopes are explicit in the generic explorer. The task Description HTTP 500 is known debt and contributes no exposed capability.

Product identity is **OpsDeck · Pre-RC 1.0**. Internal and IPM package version remains **0.8.0**, the accepted package milestone; no 1.0 release, RC tag or public-registry distribution is implied. The existing published v0.2.0 release and demo are historical artifacts and do not represent current Main. GitHub Pages publication requires explicit manual dispatch.

Current acceptance, solidification and optimization results are in [Main state](docs/MAIN_PRE_RC_STATE_20261004.md), [mutation milestone](docs/MUTATION_BREADTH_MILESTONE_20261004.md), and [generated capability inventory](docs/CAPABILITY_INVENTORY.md). The [nine-phase roadmap](docs/OPSDECK_DREAM_1_0_EXECUTION_PLAN.md) remains the durable product contract. Historical release evidence is retained in the dated version and qualification ledgers.

## Why OpsDeck

OpsDeck is deliberately thin:

- **IRIS remains authoritative.** OpsDeck does not mirror the platform into a second management database.
- **Observed state stays tied to source identity.** Independent read-back is used where qualified.
- **Empty, unavailable, denied, and failed are different states.** The UI does not collapse them into generic errors.
- **Responsive layout is semantic, not merely cosmetic.** Navigation collapses into a More menu, inventories change representation when space is constrained, inspectors stack, source tabs wrap, and ordinary workflows avoid horizontal panning.
- **The native runtime is small.** IRIS serves the browser application directly; Node is not required for the native page.
- **Claims stay bounded.** Unsupported or unqualified behavior remains visible instead of being implied by a successful neighboring feature.

## Current management workspace

- **Overview** — IRIS identity, API information, namespaces, application count, and read-back status.
- **Applications** — web applications, REST-service discovery, application detail, and bounded OpenAPI/Swagger summaries.
- **Access** — users, roles, resources, and qualified direct relationships.
- **Security** — bounded security metadata with explicit safe-field projections.
- **Tasks** — task inventory, detail, and history/status where available.
- **System** — system usage, processes, databases, and devices where available.
- **Logs** — audit status/event definitions, task history, and journal-file metadata where available.
- **Evidence** — what OpsDeck can prove, what is blocked, and where qualification deliberately stops.

## Current capability status

| Path | Current evidence | Boundary |
|---|---|---|
| Native IRIS product | All-nine-phase bounded acceptance; 117 exposed operations, 56 observed, 34 independently verified at recorded scopes; 7 mutation endpoints and 12 qualified workflows | API declaration does not imply complete CRUD or effective authority; task Description 500 remains excluded known debt |
| Owned Docker package lifecycle | Current local-source load, uninstall/absence, same-source reload, derived ownership validation and 25 exact HTTP assets | Only the owned disposable target; no public-registry or arbitrary third-party package qualification |
| Browser/mobile interface | Current-source desktop/mobile smoke, generic discovery/rehearsal, exact review, Observe Only, synthetic update/restore receipts; earlier native effects preserved | Synthetic UI contributes no native capability counts; native effects remain tied to recorded identities/fixtures |
| Representation optimization | Shipped catalog dictionary expands exactly to the accepted expanded contract; 259 tests PASS; 59,050 fewer manifest-file bytes | Local Node parse/memory probes are not production latency or browser heap claims |
| Published historical demo/release | Existing sanitized public demo and v0.2.0 artifacts retained | They do not represent current Main; publication is manual-only |

## Built with the IRIS Community

Main includes the accepted operational core: live observations, verified reversible operations, reviewed package workflows, derived retrieval, multi-target observations, workflows and an AI trust seam. Authority and read-back remain bounded to their recorded target and caller scopes. No bonus-award or arbitrary third-party package claim follows. See [Main state](docs/MAIN_PRE_RC_STATE_20261004.md) and the historical [version gate ledger](docs/VERSION_GATE_LEDGER.md).

The read-only ObjectScript snippet library and contextual IRIS help are community-oriented learning aids, not verified Ideas Portal submissions. Snippets are inert text, load on selection, and are never executed by OpsDeck.

## 90-second evaluation path

For a credential-free review, open the [live safe demo](https://kennethjsmithdev.github.io/OpsDeck/) and follow the [Evaluator Guide](docs/EVALUATOR_GUIDE.md).

The useful story is short:

`Overview → Applications → Access → provider-state differences → Evidence`

The safe demo is intentionally obvious about being sanitized sample data. Failed live IRIS reads are never replaced with demo records.

## Native source installation

The tested deployment model is an IRIS-hosted IPM source package.

```powershell
git clone https://github.com/KennethJSmithDev/OpsDeck.git
cd OpsDeck
git checkout v0.2.0
```

Then, from the IRIS IPM prompt in `%SYS`:

```text
load C:\path\to\OpsDeck
```

Open:

```text
http://127.0.0.1:52773/opsdeck/index.html
```

Adjust the HTTP port for the local instance.

**Important:** the v0.2.0 source release is published, but exact fresh-checkout byte parity on Windows is still being requalified because of the line-ending finding above. Public-registry availability/installation is also a separate unverified boundary. Do not advertise `install opsdeck` as qualified until the intended registry version has been independently confirmed and installed.

See [Native Installation](docs/NATIVE_INSTALL.md) for prerequisites, ownership, recovery, and uninstall boundaries.

## Architecture

```text
operator
   ↓
OpsDeck UI
   ↓
bounded provider adapter
   ↓
authoritative IRIS APIs
   ↓
rendered state
   ↓
independent authoritative read-back where qualified
```

IRIS owns IRIS state, authorization, and platform semantics. OpsDeck owns operator intent, compact references, presentation state, and bounded evidence.

## Authentication and security

- Credentials are never committed to the repository.
- Native browser credentials remain in tab memory and are cleared by Sign out.
- Secret-bearing fields are not intentionally projected into generic views.
- Provider routes are explicit and bounded.
- The current release is read-oriented; broad mutation workflows are not yet claimed.
- Public management ports should not be exposed to untrusted networks.

## Development / Node reference runtime

The preserved Node path remains useful for development and provider tests:

```powershell
npm test
npm start
```

Open `http://127.0.0.1:4173`. The reference server defaults to IRIS at `http://127.0.0.1:52773` and intentionally restricts upstream targets.

The application has no npm package dependencies; it uses Node built-ins.

## Road to 1.0

The next product-facing milestone after distribution fidelity is the **capability-aware morphing UI**: one canonical interface projected according to observed authority, provider availability, context, and workspace width without inventing permissions or duplicating authoritative state.

The longer sequence is tracked in [docs/ROADMAP.md](docs/ROADMAP.md).

## Support

Use the repository's **Issues** section for reproducible bugs and support requests. Never include passwords, tokens, private keys, or other secrets in issue reports.

## License

OpsDeck is licensed under the [MIT License](LICENSE).
