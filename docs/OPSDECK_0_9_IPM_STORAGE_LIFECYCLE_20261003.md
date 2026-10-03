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
- For the separate lifecycle fixture below, namespace
  `OPSDECK_STORAGE_FIXTURE`, its exact database directory, fixture package,
  and fixture class were each proven absent before installation. The existing
  console identity was `irisowner` in `%SYS`, with `%Admin_Manage:Use` already
  present. No privilege was granted.

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

The installed `%IPM.Storage.ResourceReference` metadata also exposes
`ProcessorClass` as an XML-projected attribute. Its processor resolution uses
that class (or a processor default) to instantiate a resource handler. In the
installed `%IPM.Lifecycle.Base.%Clean` implementation, uninstall calls
`OnPhase("Clean", .pParams, .handled)` for each in-scope resource processor
when `Clean.Level > 0`. A processor that sets `handled` bypasses IPM's default
resource-child cleanup for that resource. This is a possible ownership hook;
the cleanup behavior of an OpsDeck-specific implementation has not been
qualified.

## Matching official IPM source evidence

The installed version is IPM 0.10.8. The matching official tag is
[`v0.10.8`](https://github.com/intersystems/ipm/tree/v0.10.8), pinned in the
existing [IPM operations contract record](OPSDECK_0_9_IPM_OPERATIONS_RECONNAISSANCE_20261003.md).
Its source matches the observed dispatch structure:

- [`%IPM.ResourceProcessor.CustomPhaseMixin`](https://github.com/intersystems/ipm/blob/v0.10.8/src/cls/IPM/ResourceProcessor/CustomPhaseMixin.cls)
  defines `OnCustomPhase` as a successful no-op by default.
- [`%IPM.Storage.Module.ExecutePhases` and `.Uninstall`](https://github.com/intersystems/ipm/blob/v0.10.8/src/cls/IPM/Storage/Module.cls)
  dispatch custom phases separately and route uninstall through `Clean`.
- [`%IPM.Storage.ResourceReference`](https://github.com/intersystems/ipm/blob/v0.10.8/src/cls/IPM/Storage/ResourceReference.cls)
  exposes the manifest `ProcessorClass` attribute and instantiates the
  declared processor.
- [`%IPM.Lifecycle.Base.%Clean`](https://github.com/intersystems/ipm/blob/v0.10.8/src/cls/IPM/Lifecycle/Base.cls)
  calls each in-scope processor's `OnPhase("Clean", ...)` and honors its
  handled result before default resource cleanup.
- The official [`CustomPhase` integration test](https://github.com/intersystems/ipm/blob/v0.10.8/tests/integration_tests/Test/PM/Integration/CustomPhase.cls)
  asserts that a custom phase runs as a module action, but does not run during
  uninstall.
- Official [IPM lifecycle documentation](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls/documatic/history/DocBook.UI.Page.cls?KEY=AIPM)
  describes `module.xml` as declaring resources and before/after installation
  actions, and `uninstall` as removal of an installed module.
- Official IRIS [Configuration Merge action documentation](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls/framework-api/scdata/DocBook.UI.Page.cls?KEY=GCMF_iris_customizing_useful_action)
  supports `CreateDatabase` and `CreateNamespace` configuration actions. The
  [IRIS sample download guidance](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls/framework-api/scbi/DocBook.UI.Page.cls?KEY=ASAMPLES)
  recommends a dedicated `SAMPLES` namespace/database for sample classes.
  These establish supported configuration primitives and a separation
  precedent, but do not by themselves establish IPM package ownership or
  uninstall behavior for OpsDeck.

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

## Disposable lifecycle fixture

Added a test-only fixture at
[`test/fixtures/ipm-storage-lifecycle`](/C:/DevOps/P001/OpsDeck-1.0/test/fixtures/ipm-storage-lifecycle).
It declares a `.CLS` resource and a separate virtual resource with an explicit
`ProcessorClass`. Its processor creates only the fixed
`OPSDECK_STORAGE_FIXTURE` database/namespace at the fixed fixture path during
`OnAfterPhase("Configure")`. During `OnPhase("Clean")`, it drops that exact
fixture and sets the resource-handled output only after namespace absence is
read back. This code is a disposable qualification fixture, not product code;
it does not yet implement durable ownership markers or update/collision policy
for the real OpsDeck database.

**EGEHAR finding — manifest resource resolution:**

- **Symptom:** The first `zpm load` failed during Reload with
  `Resource path '.../src/OpsDeck/Qualification.xml' not found`.
- **Boundary / earliest failure:** IPM manifest resource resolution in the
  Reload phase; the database callback had not run.
- **Owning layer:** IPM resource selection/path resolution.
- **Runtime / authority:** IRIS 2026.2 Build 221U, IPM 0.10.8, disposable
  target, `%SYS`, console identity `irisowner`.
- **Reproduction:** A class resource without its `.CLS` suffix was interpreted
  as a package/document resource. No fixture namespace, module registration,
  or compiled class remained after the failed load.
- **Resolution class:** Declare the ObjectScript class as a `.CLS` resource,
  following the official IPM integration fixture pattern. A separate virtual
  resource names the processor class.
- **Evidence:** The matching IPM 0.10.8 official custom-phase fixture declares
  its class resource with `.CLS`; the corrected fixture loaded and compiled.
- **Official corroboration:** The pinned [`CustomPhase` IPM fixture](https://github.com/intersystems/ipm/blob/v0.10.8/tests/integration_tests/Test/PM/Integration/_data/custom-phase-without-lifecycle/module.xml)
  uses the `.CLS` resource form. No contestant material was used.

**Lifecycle result:**

| Step | Result |
|---|---|
| Fresh pre-state | Fixture namespace, database directory, package registration, and processor class absent. |
| Local IPM load | PASS. The class compiled, `OnAfterPhase("Configure")` created the namespace/database, and the fixture package registered. The runtime showed its `Compile`, `Configure`, and `Activate` after-phase callbacks. |
| Stored data | PASS. One synthetic `StorageMarker` row was inserted and read back inside the fixture namespace. |
| Uninstall | PASS. IPM ran `Unconfigure` then `Clean`; the processor dropped the fixture database, IPM removed the fixture registration/class, and read-back found the namespace absent. |
| Reinstall | PASS. From a clean state, the same package restored its registration, class, and dedicated namespace/database. |
| Final uninstall | PASS. Fixture registration/class/namespace were absent; the exact empty `C`/`D` stream directories and staging directory were then removed individually. |
| Unrelated OpsDeck control | PASS. `opsdeck@0.2.2` and `OpsDeck.Product.FixedLogREST` remained present. |

The initial prototype used `Reload` for creation. With the processor class not
yet compiled on a fresh load, that phase was too early: the package registered
but the test namespace remained absent. Moving creation to the observed
post-compilation `Configure` callback fixed the clean-install case. The
fixture's first failure and phase adjustment are recorded here so the product
implementation does not repeat either assumption.

This qualifies the IPM hook and the isolated fixture's create/use/uninstall/
reinstall path only. Product storage still needs an explicit marker that
proves the exact database and namespace are OpsDeck-owned, refusal on
name/path/resource collisions, an update/reinstall policy that preserves
derived state, failure rollback semantics, and package lifecycle testing with
the integrated OpsDeck manifest. The fixture's exact fixed-name deletion is
safe only because the fixture namespace and path were proven absent before
each run on the disposable target.

No product database or namespace was created. Manifest support for a
processor-owned resource and its standard `Clean` hook is established, and a
disposable create/use/clean/reinstall fixture passed. The OpsDeck-specific
ownership marker, collision checks, update behavior, failure rollback, and
integrated manifest lifecycle remain unqualified. Product storage has not yet
been created.

## State change

The only IRIS state changes were to the explicitly disposable
`opsdeck-storage-lifecycle-fixture` package and its synthetic
`OPSDECK_STORAGE_FIXTURE` namespace/database; both were uninstalled, read back
absent, and their exact empty directory/staging paths were removed. OpsDeck
package version/class state remained unchanged. No repository, mapping, user,
role, privilege, or browser authentication state was changed. No OpsDeck
operation was invoked.
