# Native installation — OpsDeck 1.0.0 Release Candidate

Current product label is OpsDeck 1.0.0 Release Candidate. IPM package version is opsdeck 1.0.0. This document describes current Main; published v0.2.0 and its historical Windows evidence remain separate. No new registry publication, tag or release is claimed.

## Scope and prerequisites

Use an IRIS instance with IPM in %SYS and an installer identity authorized for package ownership/configuration. Ordinary viewing/mutation authority is separate. Current lifecycle smoke is qualified only on owned disposable Docker OPSDECK_08_TEST_TARGET (loopback HTTP 52774). IRISTesting is excluded.

Read module.xml for the authoritative ownership manifest: 25 browser/static assets (24 at the solidification baseline), OpsDeck.Product package classes, /opsdeck and /opsdeck-api web applications, and the ownership-checked rebuildable OPSDECK derived store. The manifest may change during representation optimization; regenerate its hashes rather than maintaining an independent file count.

Before changing an installation, capture existing app definitions, package registration, deployed asset hashes and derived-store ownership. Refuse unknown collisions or foreign state. The dedicated %DB_OPSDECK resource has no public permission; the package assigns no operator grants. Never overwrite an unrelated /opsdeck installation.

## Load current local source

Select a verified Main checkout containing module.xml. In the IRIS %SYS IPM shell:

```text
load /absolute/path/to/OpsDeck
```

Verify registration as opsdeck 1.0.0, both application definitions, compiled classes, store ownership/schema validation and every FileCopy source/deployed hash. Open /opsdeck/index.html on your instance's configured origin; the owned qualification target uses http://127.0.0.1:52774/opsdeck/index.html.

## Session and authority

Credentials stay in browser memory and clear on sign-out. Observe Only starts ON. Reads/rehearsals remain available, but confirmation and executor dispatch are blocked. A supported mutation needs exact confirmation, current caller authority, fresh pre-state and authoritative read-back. Route visibility and declared API schemas do not grant authority.

## Lifecycle smoke and removal

For a package-owned disposable installation only, preserve evidence, verify the derived store is empty or recoverably rebuildable, and require CleanupPreflight success before uninstall:

```text
uninstall opsdeck
```

Verify registration, owned classes/apps/assets/store/namespace/database/resource/automatic role are absent, with IPM and unrelated applications preserved. Reload the exact source and verify registration, ownership/schema, applications and byte-exact HTTP assets. Current pre-RC smoke completed load → uninstall/absence → same-source reload on the owned Docker target; detailed evidence is private and the public result is in MAIN_PRE_RC_STATE_20261004.md.

Local-source load does not prove public-registry installation. Do not alter credentials, services, external registries or neighboring systems to work around a failed lifecycle. Ownership/refusal contracts and ambiguous outcomes remain authoritative.

## Qualified release artifact

The RC record identifies the exact locally built IPM .tgz. Install that preserved archive with `load /absolute/path/to/opsdeck-1.0.0-rc.tgz`. The installer OS user needs a writable IPM package-cache location; Docker qualification created only the OpsDeck cache directory, with no registry or operator-grant changes for that filesystem preparation. Derived records are rebuildable runtime cache and are excluded from package export. Schema/provisioning classes remain packaged. See RC_1_0_0_QUALIFICATION_20261004.md for artifact, upgrade, cleanup and authority scope.
