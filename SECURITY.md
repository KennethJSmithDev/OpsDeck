# Security Policy

## Reporting a security issue

Do not open a public issue if the report would expose credentials, tokens, private keys, sensitive IRIS configuration, or other confidential information.

For ordinary reproducible bugs that contain no sensitive information, use GitHub Issues.

## Scope

OpsDeck 0.2.x is a read-oriented management interface over explicitly registered InterSystems IRIS providers.

Security goals include:

- no credentials committed to source control;
- no arbitrary browser-selected upstream targets;
- bounded provider routes;
- explicit safe-field projections;
- visible denied/unavailable states;
- no intentional rendering of passwords, secrets, tokens, or private-key values;
- no silent substitution of demo data for failed live IRIS reads;
- no mutation or execution claim without its own qualification.

The native browser path is served by IRIS at `/opsdeck`. The Node runtime remains a development/reference path.

## Supported versions

| Version | Support |
|---|---|
| 0.2.x | Current |
| 0.1.x | Historical / best effort |

Development branches may change without compatibility guarantees.

## Authentication boundary

The native browser uses same-origin IRIS management APIs. Credentials remain in tab memory for the active session and are cleared by Sign out.

OpsDeck does not define a replacement authorization model. IRIS remains authoritative for identity, roles, resources, and privileges.

## Current limits

The current public release does not claim:

- broad mutation workflows;
- arbitrary ObjectScript execution;
- a CallIn execution bridge;
- least-privilege proof for every provider;
- public-registry installation qualification;
- complete audit/log parity with Management Portal.

See [Qualification Status](docs/QUALIFICATION_STATUS.md).
