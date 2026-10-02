# OpsDeck

<p align="center">
  <a href="https://kennethjsmithdev.github.io/OpsDeck/"><strong>🚀 LIVE SAFE DEMO</strong></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/KennethJSmithDev/OpsDeck/releases/tag/v0.2.0"><strong>📦 v0.2.0 PRIOR RELEASE</strong></a>
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

**v0.3.0 is the first public capability-aware OpsDeck release candidate.**

- Prior public release: `v0.2.0` (`23215459096cb47d255c45b1e6e86687f3d8e93a`)
- Candidate package: `opsdeck 0.3.0`
- Qualification target: native Windows IRIS 2026.2 Build 221U, `%SYS` (exact candidate pending)
- Exact candidate qualification: pending

The candidate carries the accepted 0.2.1 distribution-fidelity work and first bounded capability-aware UI slice. The latter projects navigation from observed provider/capability states and context; it does not grant IRIS authority. See [Release 0.3.0](docs/RELEASE_0_3_0.md) and [Qualification Status](docs/QUALIFICATION_STATUS.md) for exact scope and candidate evidence.

### Distribution boundary

A post-release fresh Windows clone of tag `v0.2.0` with `core.autocrlf=true` materialized `public/app.js` and `public/styles.css` with CRLF line endings. That historical representation mismatch was corrected and accepted in the 0.2.1 candidate; the old tag and evidence remain unchanged.

Public-registry installation remains **UNVERIFIED**. The published `v0.2.0` tag will not be moved. Qualification of the exact 0.3.0 candidate is a separate release gate.

See [Qualification Status](docs/QUALIFICATION_STATUS.md) for the current evidence ledger.

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
| Local-source IPM lifecycle | v0.2.1 local-source lifecycle and distribution fidelity accepted; v0.3.0 exact candidate pending | Public-registry installation remains unverified |
| Capability-aware UI | First bounded slice accepted: observed capability/provider states and context project navigation | UI projection grants no authority; broader roadmap is incomplete |
| Safe demo | Deterministic sanitized evaluator data, authority personas, responsive UI, and Evidence semantics | Demo data is not live IRIS evidence |
| Node reference runtime | Live identity, web-app discovery/read-back, fixed routes, safe mappings, and session behavior | Development/reference workflow; not required by the native browser path |
| ObjectScript execution / CallIn | No execution bridge is present | No native arbitrary execution capability is claimed |

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
git checkout v0.3.0
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

**Important:** the prior public release is v0.2.0. The 0.3.0 candidate is being qualified from its exact source bytes. Public-registry availability/installation is a separate unverified boundary; do not advertise `install opsdeck` as qualified until the intended registry version has been independently confirmed and installed.

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

The first bounded capability-aware UI slice is included in the 0.3.0 candidate. The broader internal 0.3 roadmap is not complete.

The longer sequence is tracked in [docs/ROADMAP.md](docs/ROADMAP.md).

## Support

Use the repository's **Issues** section for reproducible bugs and support requests. Never include passwords, tokens, private keys, or other secrets in issue reports.

## License

OpsDeck is licensed under the [MIT License](LICENSE).
