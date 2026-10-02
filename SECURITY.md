# Security Policy

## Reporting a vulnerability

Please report security-sensitive issues privately when possible. Do not include passwords, tokens, private keys, generated credentials, or other secrets in public issues.

When reporting a security-sensitive problem, provide only the minimum information needed to reproduce the issue.

## Scope

OpsDeck 0.3.x is designed as a read-oriented management interface over explicitly registered InterSystems IRIS providers. Its capability-aware UI projection is presentation only and does not grant IRIS authority.

Security-sensitive design goals include:

- no credentials committed to source control;
- no arbitrary browser-selected upstream targets;
- bounded provider routes;
- explicit safe-field projections;
- visible access-denied and unavailable states;
- no intentional rendering of passwords, secrets, tokens, or private-key values;
- no silent substitution of demo data for failed live IRIS reads;
- no claim of mutation or execution authority where it has not been qualified.

The Node runtime in this repository is a local reference/development path. The v0.2.0 public release has a qualified native IRIS-hosted browser path served from `/opsdeck`; the 0.3.0 candidate carries forward the accepted native foundation and is qualified separately as an exact package candidate.

## Supported versions

Security support follows the latest published OpsDeck release and subsequent maintained patch line.

| Version | Supported |
|---|---|
| 0.2.x | Yes |
| 0.3.x | Candidate; support begins on publication |
| 0.1.x | Best-effort historical reference only |

Pre-release and development branches may change without compatibility guarantees.

## Authentication boundary

The native browser path uses same-origin IRIS management APIs. Credentials are kept in tab memory for the active session and cleared by Sign out.

The Node reference runtime keeps its active authorization material only in process memory and restricts the configured upstream target.

OpsDeck does not define a replacement IRIS authorization model. IRIS remains authoritative for identity, roles, resources, and privileges.

## Current limits

The current public release does not claim:

- broad mutation workflows;
- arbitrary ObjectScript execution;
- a CallIn execution bridge;
- least-privilege proof for every possible provider;
- public-registry installation qualification;
- complete audit/log parity with the Management Portal.

See [docs/QUALIFICATION_STATUS.md](docs/QUALIFICATION_STATUS.md) for the current evidence boundary.
