# Security Policy

## Reporting a security issue

Please **do not open a public GitHub issue for a suspected security vulnerability** if the report would contain credentials, tokens, private keys, sensitive IRIS configuration, or other confidential information.

For ordinary reproducible bugs that do not contain sensitive information, use the repository's Issues section.

When reporting a security-sensitive problem, provide only the minimum information needed to identify the affected OpsDeck version and behavior. Never include real passwords or production secrets.

## Scope

OpsDeck v0.1 is designed as a read-only management interface over explicitly registered InterSystems IRIS providers. Security-sensitive design goals include:

- no credentials committed to source control;
- no arbitrary upstream proxy targets;
- no arbitrary provider-path forwarding;
- explicit output-field allowlists for management data;
- visible failure when an authoritative provider is unavailable;
- no intentional rendering of password, secret, token, or private-key values.

The Node runtime in this repository is a local reference/development path. The IRIS-native deployment path is being qualified separately for v0.1.0.

## Supported versions

Security support currently follows the latest published OpsDeck v0.1.x release. Pre-release and development snapshots may change without compatibility guarantees.
