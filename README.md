# OpsDeck

<p align="center">
  <a href="https://kennethjsmithdev.github.io/OpsDeck/"><strong>🚀 LIVE SAFE DEMO</strong></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/KennethJSmithDev/OpsDeck/releases/tag/v0.2.0"><strong>📦 v0.2.0 RELEASE</strong></a>
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

## Current release

**v0.2.0 is published.**

- Release commit: `23215459096cb47d255c45b1e6e86687f3d8e93a`
- Tested package source: `1663869af14673f027efb63a986ac5c1e50a8ac1`
- Package: `opsdeck 0.2.0`
- Tested runtime: native Windows IRIS 2026.2 Build 221U, `%SYS`
- Product regression suite: **82/82 PASS**

The controlled local-source lifecycle reproduced load, registration, native operational checks, uninstall/removal, unrelated-state preservation, and clean same-source reload. The installed native app was exercised as `OpsDeckTest`; eight routes were checked at 320, 390, 600, 820, 1024, and 1440 CSS px with zero measured document horizontal overflow, plus a no-reload wide → narrow → wide resize.

### Distribution boundary

A post-release fresh Windows clone of tag `v0.2.0` with `core.autocrlf=true` materialized `public/app.js` and `public/styles.css` with CRLF line endings. Those working-tree hashes differ from the lifecycle receipt even though the Git object blobs match the tested source commit.

That finding demonstrates **checkout representation variance, not a runtime failure**.

Exact fresh-checkout byte parity and public-registry installation therefore remain **UNVERIFIED**. The published `v0.2.0` tag will not be moved. Current development is closing that distribution-fidelity boundary for the next patch release.

See [Qualification Status](docs/QUALIFICATION_STATUS.md) for the current evidence ledger.

The current native package ownership design, package authority model, DPI-I-261 acceptance matrix, and remaining runtime gates are recorded in the [OpsDeck 1.0 product integration checkpoint](docs/OPSDECK_1_0_PRODUCT_INTEGRATION.md).

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

## Capability status

| Path | Current evidence | Boundary |
|---|---|---|
| Native IRIS browser app | Sign-in, identity, web-app list/read-back, selected Applications, Access, Security, Tasks, System, Logs, sign-out, and responsive behavior reproduced on IRIS 2026.2 | M1 remains partial; audit async result retrieval, Messages, and System Monitor readers remain unqualified/deferred |
| Local-source IPM lifecycle | Load, registration, deployed hashes, HTTP checks, uninstall/removal, unrelated-state preservation, and clean reload reproduced | Exact core IPM version, fresh public-checkout byte parity, and public-registry installation remain unverified |
| Safe demo | Deterministic sanitized evaluator data, authority personas, responsive UI, and Evidence semantics | Demo data is not live IRIS evidence |
| Node reference runtime | Live identity, web-app discovery/read-back, fixed routes, safe mappings, and session behavior | Development/reference workflow; not required by the native browser path |
| ObjectScript execution / CallIn | No execution bridge is present | No native arbitrary execution capability is claimed |

## Built with the IRIS Community

The integration branch has accepted **v0.8 operational core**: live observations, verified reversible web-application operations, session Evidence, and reviewed package install/remove through the same executor. Connected Edge rendered actual package plans and VERIFIED receipts on the disposable Docker target. DPI-I-261's requested discovery and installation behavior is complete at that fixture's qualified authority scope. Temporary qualification grants were revoked afterward; ordinary operator authority and arbitrary third-party packages are not qualified. This is an integration milestone, not a public release. Public identity remains **OpsDeck · Beta Release 0.2**; no bonus award or stacking claim is made. See [the exact acceptance ledger](docs/VERSION_GATE_LEDGER.md).

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
