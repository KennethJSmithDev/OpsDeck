# OpsDeck

OpsDeck is an open-source operations console for InterSystems IRIS. Its active M0 path connects to a local IRIS instance, reads server identity and web applications through the SysAdmin API, renders those live resources, and compares the displayed application list with a second authoritative read.

## M0 status

The local M0 path has been exercised against InterSystems IRIS Community Edition 2026.2: `GET /api/admin/info` returned the live identity, `GET /api/admin/v2/web-apps` returned 22 applications, and OpsDeck displayed the result and reported a matching second read. The repeatable setup and test instructions are below. Broader operational domains remain gated until their providers and permissions have been verified.

## Requirements

- InterSystems IRIS Community Edition 2026.2, available locally on `127.0.0.1:52773`.
- Docker Engine/Desktop with a working Linux container backend. First-time image use may require accepting the InterSystems Community Edition terms in Docker Hub.
- Node.js 22 or newer. The application uses only Node's built-in modules; there are no npm dependencies to install.

InterSystems publishes the `intersystems/iris-community` image. The validated workstation used tag `2026.2-linux-amd64` with image digest `sha256:d4331089a4d19aafa867c26b343eb2b8486cf112ef1522132761e6327691377e` (Linux/amd64). See the [official image and deployment guidance](https://hub.docker.com/r/intersystems/iris-community) and the [official 2026.2 documentation](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=ACLOUD).

## Start a local IRIS instance

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

Open `http://127.0.0.1:4173`. Enter the IRIS username and password in the local OpsDeck form. The local Node process proxies only `GET /api/admin/info` and `GET /api/admin/v2/web-apps` to the configured loopback IRIS origin. No cross-origin access is enabled. The username/password authorization value is held in process memory for the local session; the password field is cleared after connection, and the credential buffer is cleared when the session expires or the process stops. OpsDeck does not save credentials in browser storage or repository files.

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
5. Run `npm test` to check the API-shape mapping and comparison behavior.

The UI is a thin view over IRIS-owned state. It does not mirror IRIS data to a local database, and it does not use fixtures as live data.

## Development

```powershell
npm test
npm start
```

The provider mapping is in `src/iris-provider.js`; the loopback-only development server is in `src/server.mjs`; the M0 UI is in `public/`.

## Competition

OpsDeck is being developed for the **InterSystems Programming Contest: Build Your Own Management Portal (2026)**. The intended application path is:

```text
User intent → OpsDeck GUI → provider adapter → authoritative IRIS API
            → rendered result → authoritative read-back
```

Nothing required to reproduce the application depends on private repositories or private infrastructure.

## License

OpsDeck is licensed under the [MIT License](LICENSE).
