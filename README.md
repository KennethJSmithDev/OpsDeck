# OpsDeck

<p align="center">
  <a href="https://kennethjsmithdev.github.io/OpsDeck/"><strong>🚀 LIVE SAFE DEMO</strong></a>
  &nbsp;·&nbsp;
  <a href="#project-status"><strong>📋 PROJECT STATUS</strong></a>
  &nbsp;·&nbsp;
  <a href="#development"><strong>🛠️ DEVELOPMENT</strong></a>
</p>

<p align="center">
  <sub>Interactive sanitized sample data · No IRIS connection or credentials required</sub>
</p>

<p align="center">
  <img src="assets/OpsDeckLogo.png" alt="OpsDeck — Operations Console for InterSystems IRIS" width="720">
</p>

**OpsDeck** is an open-source, web-based operations console for InterSystems IRIS. It brings application discovery, access and security metadata, tasks, system information, logs, and evidence-backed read verification into one focused interface.

OpsDeck is being developed for the **InterSystems Programming Contest: Build Your Own Management Portal (2026)**.

## Current milestone

The repository version is **0.1.0**. The project has a proven Node reference workflow and a separately qualified slice of IRIS-native hosting and reads. IRIS-native hosting does not depend on Node at runtime. Native package installation and complete v0.1 provider parity are not qualified, so this repository does not claim an installable IPM/ZPM release.

### Capability status

| Path | Current evidence | Boundary |
|---|---|---|
| Node reference runtime | Reproduced against IRIS Community Edition 2026.2 for server identity, web-app discovery, and independent web-app read-back. Fixed read-only provider mappings, safe-field projections, loopback session behavior, and adapter/server/bootstrap tests are in the repository. | This is the reference and development workflow. It is not required by the qualified native browser path. |
| IRIS-native browser app | `/opsdeck/index.html`, static assets, browser authentication, live identity, web-app list/read-back, and selected Applications, Access, Security, Tasks, System, and Logs reads have been observed on native Windows IRIS 2026.2. Sign-out and recoverable authentication errors are implemented. | M1 is **PARTIAL**. Audit async result handling and named-source Messages/System Monitor logs are not qualified. See [qualification status](docs/QUALIFICATION_STATUS.md). |
| Safe demo | The Pages demo uses deterministic sanitized data through a separate demo provider. The app can be explored without IRIS or credentials; a Pages deployment workflow is included. | Demo data is illustrative and does not prove live IRIS behavior. |
| IPM/ZPM package | No IRIS `module.xml` package manifest or successful package lifecycle evidence is present. | Load/install, uninstall, and clean reinstall remain unverified. |
| ObjectScript execution / CallIn | The repository contains a static browser client that calls bounded same-origin IRIS REST APIs; it has no ObjectScript execution bridge. | No authenticated native ObjectScript execution or CallIn capability is claimed. |

These are scoped claims, not a single pass/fail label for the whole product. Full evidence, current limitations, and the next test boundary are recorded in [qualification status](docs/QUALIFICATION_STATUS.md).

### Current management workspace

- **Overview** — live IRIS identity, API information, namespaces, application count, and authoritative read-back status.
- **Applications** — web applications, REST-service discovery, application detail, and bounded Swagger/OpenAPI summaries.
- **Access** — users, roles, and resources through explicit read-only provider mappings.
- **Security** — bounded security metadata with explicit field allowlists; secret-bearing values are not intentionally rendered.
- **Tasks** — task inventory and schedule/status information where available from the provider.
- **System** — system usage, processes, databases, and devices where available.
- **Logs** — audit status/event definitions, task history, and journal-file metadata where available.

Provider errors and unavailable sources are shown separately from valid empty collections. OpsDeck does not substitute fixture data for live IRIS state.

## Design

OpsDeck follows a deliberately thin architecture:

```text
User
  ↓
OpsDeck
  ↓
bounded provider adapter
  ↓
authoritative InterSystems IRIS APIs
  ↓
rendered result
  ↓
independent authoritative read-back where qualified
```

IRIS remains the source of truth. OpsDeck keeps provider-owned identities and scopes rather than creating a second operational state store.

## Requirements

For the Node reference runtime:

- **InterSystems IRIS Community Edition 2026.2**, available through the local SysAdmin API (the tested default is `http://127.0.0.1:52773`). A native Windows installation is supported; Docker is optional.
- **Node.js 22 or newer**

The application has no npm package dependencies; it uses Node's built-in modules.

**Docker is optional.** OpsDeck can use an existing local IRIS installation. A container may also be used as a development/test IRIS instance, but Docker is not an application requirement.

Use the supported InterSystems Windows installer or an InterSystems-published Community Edition image. The validated container image was `intersystems/iris-community:2026.2-linux-amd64` (Linux/amd64). See the [official image and deployment guidance](https://hub.docker.com/r/intersystems/iris-community) and the [official 2026.2 documentation](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=ACLOUD).

Keep the Management Portal and API on the local machine for this development workflow; do not expose management ports to an untrusted network.

## Start a local IRIS instance

For a native Windows installation, start the IRIS instance using the installed InterSystems tooling and verify the local Management Portal at `http://127.0.0.1:52773/csp/sys/UtilHome.csp` (adjust the port if the installation uses another one). Complete any required first-login setup in the Portal, then enter the resulting account in OpsDeck. Do not put that password in a command, repository file, or issue.

### Optional: use the Community Edition container

If no container named `opsdeck-iris` exists, run:

```powershell
docker run --name opsdeck-iris --detach `
  --publish 127.0.0.1:1972:1972 `
  --publish 127.0.0.1:52773:52773 `
  intersystems/iris-community:2026.2-linux-amd64
```

Wait for the container health check and verify the Management Portal at `http://127.0.0.1:52773/csp/sys/UtilHome.csp`. Complete the IRIS first-login password setup in the portal. Do not put that password in a command, repository file, or issue. To restart the same container later, use `docker start opsdeck-iris` and verify its health again.

## Run the Node reference runtime

Clone the repository, then from its root:

```powershell
npm test
npm start
```

Open `http://127.0.0.1:4173`. By default the reference runtime expects IRIS at `http://127.0.0.1:52773`.

To use a different **loopback** IRIS HTTP port, set `OPSDECK_IRIS_URL` before starting OpsDeck:

```powershell
$env:OPSDECK_IRIS_URL = 'http://127.0.0.1:52773'
npm start
```

The reference proxy intentionally rejects non-loopback IRIS origins.

## Authentication and security

The Node reference runtime accepts an IRIS username and password only for the local OpsDeck session.

- Credentials are not written to repository files.
- Credentials are not intentionally persisted in browser storage.
- The local reference server keeps its authorization material only in process memory for the active session and clears it when the session expires or the process stops.
- Only explicitly registered IRIS routes are proxied.
- Arbitrary upstream paths and arbitrary cross-origin targets are rejected.
- Provider mappings use explicit field allowlists for operational views.
- Mutation workflows are outside the v0.1 read-only baseline.

The native browser path uses same-origin IRIS APIs and keeps its Basic authorization value in tab memory. A successful native browser login and selected reads were reproduced locally; this does not establish package installation, all-provider parity, or ObjectScript/CallIn execution. Use an IRIS account with only the privileges needed for the management information you intend to inspect.

## Verification model

The Overview and Applications path includes an independent read-back check for the live web-application list. OpsDeck compares the displayed state with a separate authoritative IRIS read, independent of row order.

The broader provider set uses stable provider identities, bounded source registration, explicit safe-field mappings, and visible provider-error handling. Not every provider has the same read-back semantics; the UI does not claim verification where it has not been established.

## Development

```text
public/
  index.html
  app.js
  styles.css

src/
  iris-provider.js
  server.mjs

demo/
  index.html
  demo-provider.js

test/
  app-bootstrap.test.mjs
  iris-provider.test.js
  server.test.mjs
```

Run the automated suite with `npm test`. It covers reference-server behavior and synthetic native/provider mappings; a pass does not substitute for live native-runtime qualification.

## Project status

### Proven or reproduced

- Node reference identity, web-app discovery, and independent web-app read-back on IRIS 2026.2.
- A bounded native IRIS browser workflow at `/opsdeck/index.html`, including sign-in, identity, web-app list/read-back, and selected live provider views.
- Explicit output allowlists, secret-shaped field rejection, fixed read routes, and sanitized async-Location validation.
- A safe demo using deterministic sample data without an IRIS connection or credentials.
- Automated provider, server, and bootstrap tests.

### Pending qualification

- Audit async result retrieval: the bounded query returns HTTP 202 with a same-origin `Location` at `/api/admin/v1/async-result`; the current validator requires `/api/admin/v2/async-result` and rejects the observed path. No status GET or result was followed because the route equivalence is not established.
- OpsDeck providers for fixed-source `messages.log` and `SystemMonitor.log` reads.
- Full declared v0.1 provider parity and M1 acceptance.
- IPM/ZPM load/install, uninstall, and clean-reinstall lifecycle.
- Native ObjectScript execution or a CallIn bridge; neither is implemented or qualified here.

The detailed known/inferred/unverified ledger and next safe test are in [docs/QUALIFICATION_STATUS.md](docs/QUALIFICATION_STATUS.md).

## Support

Use the repository's **Issues** section for reproducible bugs and support requests. Please do not include passwords, tokens, private keys, or other secrets in issue reports.

## License

OpsDeck is licensed under the [MIT License](LICENSE).
