# OpsDeck

OpsDeck is an open-source operations console for InterSystems IRIS. Its active M0 path connects to a local IRIS instance, reads server identity and web applications through the SysAdmin API, renders those live resources, and compares the displayed application list with a second authoritative read.

## M0 status

The local M0 path has been exercised against InterSystems IRIS Community Edition 2026.2: `GET /api/admin/info` returned the live identity, `GET /api/admin/v2/web-apps` returned 22 applications, and OpsDeck displayed the result and reported a matching second read. M1 read-only views are now being qualified against live sources; mutation workflows remain outside the M1 baseline.

## Requirements

- InterSystems IRIS Community Edition 2026.2, available locally through the SysAdmin API (the default development endpoint is `http://127.0.0.1:52773`). A native Windows installation is supported; Docker is optional.
- Node.js 22 or newer. The application uses only Node's built-in modules; there are no npm dependencies to install.

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

## Run OpsDeck

From the repository root:

```powershell
npm test
npm start
```

Open `http://127.0.0.1:4173`. Enter the IRIS username and password in the local OpsDeck form. The local Node process proxies `GET /api/admin/info`, the observed M0 web-app list, and only explicitly registered read-only M1 sources to the configured loopback IRIS origin. No arbitrary path or cross-origin target is accepted. The username/password authorization value is held in process memory for the local session; the password field is cleared after connection, and the credential buffer is cleared when the session expires or the process stops. OpsDeck does not save credentials in browser storage or repository files.

For an alternate local IRIS web port, set `OPSDECK_IRIS_URL` before starting Node, for example:

```powershell
$env:OPSDECK_IRIS_URL = 'http://127.0.0.1:52773'
npm start
```

The proxy intentionally rejects non-loopback IRIS origins. Stop OpsDeck with `Ctrl+C`; this clears in-memory session credentials.

## M0 workflow

1. Connect with an IRIS account that can read the two observed endpoints.
2. Confirm the Overview identifies the live server and reports its application count.
3. Open Applications to inspect the returned web applications.
4. Confirm **Authoritative read-back matched**. OpsDeck compares the first live list with a separate second `GET /api/admin/v2/web-apps`, independent of row order.
5. Run `npm test` to check API-shape mapping, source allowlisting, and comparison behavior.

The UI is a thin view over IRIS-owned state. It does not mirror IRIS data to a local database, and it does not use fixtures as live data.

## Development

```powershell
npm test
npm start
```

The provider mapping is in `src/iris-provider.js`; the loopback-only development server is in `src/server.mjs`; the UI is in `public/`.

## M1 live-read views

The current GUI exposes read-only live views for Applications, Access, Security, Tasks, System, and Logs. It uses the SysAdmin API v2 envelope for `/api/admin` sources and the observed direct JSON array for `/api/mgmnt/` discovery. Results are lazy-loaded for the selected source, retain a provider-owned key and scope, and render only an explicit field allowlist. In Applications, web-app detail is loaded on request; a REST-service relationship is shown only for an exact identity match; and the live Swagger summary is retrieved only when requested. The summary contains operation paths and descriptions, not request/response schemas or examples. Empty collections are shown separately from provider errors. The OAuth authorization-server configuration source currently reports an IRIS error and remains visibly unavailable.

M1 routes do not run scheduled jobs, mutate users or roles, reveal wallet secrets, advance the stateful alert feed, or read arbitrary filesystem paths. Audit record search and file-backed message/System Monitor sources are not yet bound. The source registry and automated adapter/server tests can be checked with `npm test`; this does not substitute for remaining live acceptance and fixture work.

## Competition

OpsDeck is being developed for the **InterSystems Programming Contest: Build Your Own Management Portal (2026)**. The intended application path is:

```text
User intent → OpsDeck GUI → provider adapter → authoritative IRIS API
            → rendered result → authoritative read-back
```

Nothing required to reproduce the application depends on private repositories or private infrastructure.

## License

OpsDeck is licensed under the [MIT License](LICENSE).
