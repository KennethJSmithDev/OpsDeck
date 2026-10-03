# OpsDeck 0.9 IPM storage lifecycle contract — 2026-10-03

## Question

Can OpsDeck provision its derived Vector Search namespace/database with an IPM
custom phase and rely on package uninstall to remove it?

## Runtime and authority

- Target: disposable `OPSDECK_08_TEST_TARGET`, IRIS 2026.2 Build 221U, IPM
  0.10.8, current namespace `%SYS`.
- Inspection used the container's IRIS console and `%Dictionary` compiled
  metadata/source. It was read-only. No current user HTTP identity was tested.
- `OPSDECK` was absent at the start of the broader Vector Search
  reconnaissance; its temporary SQL qualification namespace was dropped and
  verified absent afterward. This inspection did not create it.

## Direct installed-runtime observations

Compiled implementation read-back established:

| Installed method | Observation |
|---|---|
| `%IPM.ResourceProcessor.CustomPhaseMixin.OnCustomPhase` | Default body returns `$$$OK`. |
| `%IPM.Lifecycle.Base.GetCompletePhases` | A single nonstandard phase name is retained as a custom phase. |
| `%IPM.Storage.Module.ExecutePhases` | For a custom phase, it calls `OnCustomPhase` on in-scope processors extending `CustomPhaseMixin`. The standard `Clean` phase takes the lifecycle `%Clean` path. |
| `%IPM.Storage.Module.Uninstall` | Calls `ExecutePhases` with `Clean`; uninstall is a standard clean phase. |

The installed `ExecutePhases` implementation also showed that `OnBeforePhase`
is called for in-scope processors before either standard or custom phase work.
The custom-phase branch does not invoke the lifecycle `%Clean` method.

## Matching official IPM source evidence

The installed version is IPM 0.10.8. The matching official tag is
[`v0.10.8`](https://github.com/intersystems/ipm/tree/v0.10.8), pinned in the
existing [IPM operations contract record](OPSDECK_0_9_IPM_OPERATIONS_RECONNAISSANCE_20261003.md).
Its source matches the observed dispatch structure:

- [`%IPM.ResourceProcessor.CustomPhaseMixin`](https://github.com/intersystems/ipm/blob/v0.10.8/src/cls/IPM/ResourceProcessor/CustomPhaseMixin.cls)
  defines `OnCustomPhase` as a successful no-op by default.
- [`%IPM.Storage.Module.ExecutePhases` and `.Uninstall`](https://github.com/intersystems/ipm/blob/v0.10.8/src/cls/IPM/Storage/Module.cls)
  dispatch custom phases separately and route uninstall through `Clean`.
- The official [`CustomPhase` integration test](https://github.com/intersystems/ipm/blob/v0.10.8/tests/integration_tests/Test/PM/Integration/CustomPhase.cls)
  asserts that a custom phase runs as a module action, but does not run during
  uninstall.
- Official [IPM lifecycle documentation](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls/documatic/history/DocBook.UI.Page.cls?KEY=AIPM)
  describes `module.xml` as declaring resources and before/after installation
  actions, and `uninstall` as removal of an installed module.

The test is evidence about IPM behavior, not a product implementation pattern
for database ownership.

## Design consequence

A custom module action alone is not a sufficient owner for an OpsDeck database:
IPM does not run that custom action during uninstall. Provisioning a database
in such an action without a separately qualified `Clean` path could leave an
orphaned namespace/database.

Any future automatic resource lifecycle must have an explicit, tested cleanup
hook in the standard `Clean` path, must refuse collisions and non-OpsDeck-owned
data, and must verify absence after cleanup. A custom phase may be useful for
an explicit administrative action, but it cannot stand in for uninstall
ownership.

No database or namespace lifecycle implementation was added. Exact manifest
support for an OpsDeck-owned create-and-clean resource processor, and its
uninstall/reinstall behavior, remain unqualified. Continue investigating the
official and installed lifecycle hooks before creating product storage.

## State change

No IRIS package, repository, namespace, database, mapping, class, web
application, user, role, privilege, or browser authentication state was
changed. No package operation was invoked.
