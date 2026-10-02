# Draft: A native IRIS operations console with visible evidence boundaries

**Status:** editorial draft for human review; not submitted to Developer Community. Release wording is for the 0.3.0 candidate and must be checked against final publication status before submission.

OpsDeck is an open-source operations console for InterSystems IRIS. The v0.3.0 release candidate is prepared as the first public capability-aware OpsDeck release. It carries the accepted native/distribution foundation and adds a bounded navigation projection based on observed provider states and current context. Capability projection changes presentation; it does not grant IRIS authority. OpsDeck brings application discovery, access and security metadata, tasks, system information, logs, and evidence status into one browser workspace.

The project is being developed for the InterSystems Programming Contest: Build Your Own Management Portal. Its current public release is available from [Open Exchange](https://openexchange.intersystems.com/package/OpsDeck), and the source and qualification record are on [GitHub](https://github.com/KennethJSmithDev/OpsDeck).

## Start with the safe demo

The [live safe demo](https://kennethjsmithdev.github.io/OpsDeck/) needs no IRIS account. It uses deterministic, sanitized sample data and labels itself as a demo. Select the Operations persona to see the general workspace, then switch to another demo persona to see how the navigation projection changes. The sample data stays fixed; the visible surface changes with the selected demo authority.

The demo is useful for evaluating the interaction model, but it is not a connection to an IRIS instance. Its identity, application list, and other values are synthetic. The public demo may reflect an earlier build than this release candidate. OpsDeck labels this boundary directly so that a successful demo read cannot be mistaken for live system evidence.

## A quick tour

Start at **Overview**. It presents the current provider identity and a bounded summary of the application inventory. The Applications view lists web applications and provides a detail inspector for a selected entry. Where the workflow supports it, OpsDeck performs a separate authoritative read-back instead of treating the rendered row as proof by itself.

The other workspaces cover **Access**, **Security**, **Tasks**, **System**, and **Logs**. They present bounded metadata returned by the configured IRIS APIs. Available data depends on the connected identity and on the runtime APIs that are available. OpsDeck distinguishes an empty collection from a denied request, an unavailable source, a failed request, or an observation that has not been verified.

Open **Evidence** to see those distinctions collected in one place. A neighboring successful request does not turn an unverified workflow into a verified one. For example, the published v0.2.0 scope does not claim completed audit-record retrieval or fixed readers for `messages.log` and `SystemMonitor.log`.

## Run the native application

The native path is served by IRIS itself; the browser page does not require a separate Node server. The tested package workflow uses a local source checkout in `%SYS` with IPM installed. The [native installation guide](https://github.com/KennethJSmithDev/OpsDeck/blob/main/docs/NATIVE_INSTALL.md) describes the tested boundary and precautions for an existing `/opsdeck` application.

At a high level, obtain the repository and select the published release:

```powershell
git clone https://github.com/KennethJSmithDev/OpsDeck.git
cd OpsDeck
git checkout v0.3.0
```

In the supported IRIS Terminal, select `%SYS`, enter the IPM shell with `zpm`, and load the checked-out source directory containing `module.xml`:

```text
load C:\path\to\OpsDeck
```

Then open the explicit application URL, `/opsdeck/index.html`, and sign in through the normal IRIS-backed flow. Use an account authorized for the particular reads you want to inspect. Installation authority and ordinary application viewing authority are separate concerns.

The accepted native lifecycle and installed-browser foundations were reproduced for earlier exact package candidates on native Windows IRIS 2026.2 Build 221U. Qualification of this exact 0.3.0 candidate is recorded separately; it does not inherit a lifecycle result merely from those earlier candidates.

## Why keep the boundary visible?

An operations console can make a partial view look more complete than it is. OpsDeck keeps the IRIS APIs authoritative and uses bounded provider mappings for the displayed data. It does not substitute sample data when a live request fails. It also keeps the safe demo separate from the native runtime.

This design means that an empty result can remain empty, a denied read can remain denied, and an unsupported or unqualified workflow can be labeled honestly. A clean layout is useful only if the operator can still tell where each observation came from and what it proves.

The native app is read-oriented. The published release does not offer arbitrary ObjectScript execution, a generic filesystem interface, or package-install controls. Those boundaries are deliberate: a management interface should not imply authority that the connected identity or qualified backend does not provide.

## Try it and review the scope

Use the safe demo for a quick, credential-free tour. For a native instance, follow the release-tagged installation guide and connect only to an IRIS environment where you are authorized to work. Before replacing an existing `/opsdeck` application, follow the guide's pre-capture and ownership checks.

The [qualification status](https://github.com/KennethJSmithDev/OpsDeck/blob/main/docs/QUALIFICATION_STATUS.md) describes which behaviors were observed and which remain outside the release claim. The project is intended to grow through small, reviewable steps, with new behavior promoted only when its source, runtime, and authority boundaries are understood.

**Human review before any Developer Community submission:** verify every version/runtime statement against the final target release, add any approved screenshots, and replace no limitations unless new evidence supports the change.
