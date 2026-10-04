# OpsDeck 0.9 IPM operation contract reconnaissance — 2026-10-03

## Scope and evidence

Read-only review of the running disposable target `OPSDECK_08_TEST_TARGET` (IRIS 2026.2 Build 221U, IPM 0.10.8, namespace `%SYS`) and the matching official IPM source tag `v0.10.8` at commit `2081b4d354073c324b170f83160dac8b9174397e`. Runtime method metadata reports these signatures:

| Method | Runtime signature | Return contract |
|---|---|---|
| `%IPM.Main.Install` | `Install(&pCommandInfo, pLog:%IPM.General.AbstractHistory="")` | No ObjectScript return value in its method signature; it finalizes history and throws an exception on failure. |
| `%IPM.Main.Update` | `Update(&pCommandInfo)` | No ObjectScript return value; validates installed identity, then invokes `Install` or local `Load`, with history and exceptions. |
| `%IPM.Main.Uninstall` | `Uninstall(&pCommandInfo)` | No ObjectScript return value; delegates to `%IPM.Storage.Module.Uninstall`, which returns `%Status` internally and is thrown on error. |
| `%IPM.Main.GetListModules` | `GetListModules(pNamespace:%String=$namespace,pSearch:%String="",&list,pExtraFields:%String="",pRepository:%String="")` | Inventory output is returned by reference; it is the read-back contract used by OpsDeck's installed provider for the selected namespace. |

The `&pCommandInfo` argument is an ObjectScript local array with a command name, nested `parameters`, `modifiers`, and `data` subscripts. It is not a typed request object or a receipt. A direct REST bridge must construct this array from a closed, server-owned operation schema; it must not accept arbitrary command lines, modifiers, paths, or command data.

## Operation semantics

### Install

ZPM help and the command declaration define `install <module> [<version>]`. `module` is required; the version or version expression is optional and defaults to the latest match. A module can be repository-qualified, such as `registry/name`. Runtime source confirms `Install` searches enabled repositories in the current namespace, lowercases the package name, and uses the supplied version expression. It selects the first version-sorted result when not prompting. Install then retrieves and runs the package lifecycle. Package code and custom lifecycle actions are therefore part of the operation's effects.

OpsDeck must require an exact package identity, exact version, and observed source identity; omit `-force`, `-dev`, keyword selection, environment-file overrides, Python dependency changes, and all other modifiers/data not explicitly qualified. No package operation was invoked.

### Update

ZPM help defines `update <module> [<version>]`, defaulting to the newest version when the version is omitted. Runtime source requires the module already installed in the current namespace and delegates to `Install` (or local `Load` when a path is provided), marking the operation as an update. Its exact version argument is a version expression. Update does not permit the `PermitDowngrade` data flag. OpsDeck must pin an exact version and source and must reject downgrade/force semantics. No update was invoked.

### Uninstall

ZPM help defines `uninstall <module>` in the current namespace. Omitting a module is only valid with `-all`, which is out of scope. `-force` bypasses dependent-module protection; `-recurse` removes eligible dependencies; `-purge` purges table data. Runtime source passes the selected module to `%IPM.Storage.Module.Uninstall` with force/recurse and cleanup data. OpsDeck must omit all three destructive modifiers, use only the exact selected identity, and fail if dependents prevent removal. No uninstall was invoked.

### Result and read-back

The direct methods do not return a normalized operation result. IPM's command path writes progress/output, finalizes history, and raises exceptions for failures. HTTP success or a completed class call cannot prove package state. OpsDeck must perform a fresh authoritative installed-inventory read after the operation and compare exact package identity plus version for install/update, or identity absence for uninstall. Unclear dispatch outcome is AMBIGUOUS and cannot be retried automatically. OpsDeck itself must mint the `OperationReceipt` only from the provider's terminal outcome plus read-back.

## Namespace and authority boundary

The operations act in the current namespace; installed package state and repository configuration are namespace-dependent for IPM 0.9+. `%IPM.Main.Install`, `.Update`, and `.Uninstall` are internal command methods and do not expose a public authorization-policy object or accept a user-context argument. Source inspection found the CLI operations delegate to IPM lifecycle code without a method-level explicit IRIS `$SYSTEM.Security.Check` gate. Runtime metadata/help does not prove the effective privileges required by every lifecycle resource processor, package custom phase, or generated code path.

**Authority status: UNVERIFIED for an OpsDeck HTTP caller.** A product endpoint must preserve the authenticated `$USERNAME` and must not substitute service credentials, `$SYSTEM` authority, a second service account, or an elevated process. Because install executes arbitrary package lifecycle code, a narrow endpoint cannot be justified solely by filtering package/version arguments. Until the existing caller is proven to have appropriate IRIS authority and the execution context is proven not to amplify it, package operations remain unavailable. No privileges or roles were changed.

## Generic executor mapping

| Generic executor stage | Package provider contract |
|---|---|
| Intent | `package.install`, `package.update`, or `package.remove`; exact identity and current namespace. |
| Plan | Exact package name, selected repository identity when installing/updating, exact version, fresh installed pre-state, and reviewed impact/dependency observations. |
| Authority | Current IRIS user and namespace only; no impersonation. Required effective IPM/resource privileges remain unqualified. |
| Confirmation | Bind the reviewed identity, version/source, namespace, pre-state fingerprint, expiry, and impact into the existing OperationPlan confirmation. |
| Dispatch | Exactly one server-side IPM operation invocation with a constructed allowlisted command array and no arbitrary command text. |
| Ambiguity | Never retry a request after uncertain dispatch. Read back once under the policy for ambiguous execution; receipt stays AMBIGUOUS unless outcome is proven. |
| Verification | Fresh `%IPM.Main.GetListModules` read: exact name/version present for install/update; exact name absent for remove. |
| Receipt | Existing shared OperationReceipt contract only, with actual plan, authority observation, dispatch disposition, read-back, and cleanup evidence. |

This is a provider contract mapping, not a qualified live executor. Do not add a parallel PackageExecutor.

## Runtime work performed

- Ran read-only `zpm help install`, `help update`, and `help uninstall` in the disposable target.
- Queried compiled method signatures for the four methods above.
- Compared contracts with official IPM 0.10.8 source at the pinned commit.
- Issued no IPM install, update, uninstall, repository command, or package mutation.
- Made no IRIS state changes.

## Sources

- [Official IPM v0.10.8 source — `%IPM.Main`](https://github.com/intersystems/ipm/blob/2081b4d354073c324b170f83160dac8b9174397e/src/cls/IPM/Main.cls)
- [Official IPM v0.10.8 source — `%IPM.Storage.Module`](https://github.com/intersystems/ipm/blob/2081b4d354073c324b170f83160dac8b9174397e/src/cls/IPM/Storage/Module.cls)
- [Official IPM documentation and compatibility notes](https://github.com/intersystems/ipm/tree/v0.10.8)

## Conclusion

The package operation's identity/version inputs, namespace scope, configured-repository use, unsafe modifiers, result behavior, and authoritative inventory read-back are established for IPM 0.10.8. An OpsDeck package operation is **NOT READY**: the current authenticated operator's effective authority, non-escalating server execution boundary, locally controlled fixture route from an available catalog, and shared executor-to-HTTP dispatch remain unqualified.
