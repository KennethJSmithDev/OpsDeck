# Docker quick start (IRIS 2026.2)

This quick start keeps the native product topology: one official IRIS Community 2026.2 container, IPM, and OpsDeck served by IRIS at `/opsdeck/index.html`. It adds no Node container, proxy, or second web server.

## Start a clean instance

Requirements: Docker Desktop with its Linux engine running, Docker Compose v2, and PowerShell 7 or later. From the repository root:

```powershell
./scripts/docker-quickstart.ps1 -Action Reset
```

`Reset` removes only this quick-start's `iris-data` volume and its locally generated password and PasswordHash merge, then starts the instance again. For an ordinary start that preserves data, run:

```powershell
./scripts/docker-quickstart.ps1
```

The script downloads the v1.0.0 GitHub release archive, verifies the qualified SHA-256 `178bf6ea3809b023ed76a39ea313cfaf33ff3f5e91a5afbfc2627cadf3faf798`, prepares ownership on its new named data volume, and generates a local `_SYSTEM` password. The official InterSystems PasswordHash utility derives a SHA-512 PasswordHash; a read-only CPF merge applies it on first startup. No password or qualification identity is committed. The script then installs the exact archive through IPM and checks native HTTP and authenticated OpsDeck reads. Keep the service bound to loopback.

Open [http://127.0.0.1:52774/opsdeck/index.html](http://127.0.0.1:52774/opsdeck/index.html) and sign in as `_SYSTEM` using the local password in `docker/quickstart/.secrets/iris-password.txt`. The credential material is local-only and ignored by Git. The public release archive remains the same qualified 1.0.0 artifact.

To stop the container while preserving data, run `./scripts/docker-quickstart.ps1 -Action Down`. To inspect status, run `./scripts/docker-quickstart.ps1 -Action Status`.

## What matches the qualification target

The prior `OPSDECK_08_TEST_TARGET` used `intersystemsdc/iris-community:2026.2-zpm`, image digest `sha256:68bc1d43c98ca816f2e98a185edc1250bebb6b763f8159da35c8543b09c0df70`, IRIS 2026.2 Build 221U, IPM 0.10.8, `/iris-main`, `ISC_DATA_DIRECTORY=/durable/iris`, a durable `/durable` volume, 64 MiB shared memory, and loopback host ports 51972→1972 and 52774→52773. The setup script prepares ownership for `/durable/iris` and creates the required `/usr/irissys/ipm/opsdeck` and `/usr/irissys/csp/opsdeck` directories owned by `irisowner` with mode 0700 after first boot. The product itself remains installed through IPM from the published archive.

The qualification target contained fixture users, roles, and evidence state, so it was not itself a clean initial installation. This quick start uses a new named volume, the official PasswordHash utility plus CPF merge, and the exact package archive. It does not reproduce the privileged qualification identity, mutation fixtures, or RC qualification suite.

Host ports are loopback-only. The superserver port is published only for parity with the qualification target; browser access uses the IRIS web server on port 52774. Never expose these ports to an untrusted network.
