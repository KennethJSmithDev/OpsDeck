# OpsDeck 0.5.0 accepted source checkpoint

**Status:** accepted operational-visibility milestone. Included in the Main source checkpoint at [`1aaee4e`](https://github.com/KennethJSmithDev/OpsDeck/commit/1aaee4ecca5055a5b64ceaf85cfbb1d493c5b435). This is not a public `0.5.0` release or tag; the latest public release remains `0.2.0`.

The Main checkpoint also contains the small System > About surface. Its canonical product identity displays `OpsDeck`, `Beta Release`, and public version `0.2`; package/internal version `0.5.0` and runtime details are secondary. Git commit and build timestamp remain explicitly unembedded in the package. The source suite verifies that About is optional and shares ProductIdentity with Evidence.

## Release decision — 2026-10-03

**Do not publish v0.5.0 yet.** Operational-visibility acceptance is PASS at its qualified scope. Exact Main package release qualification remains outstanding: the lifecycle receipt covers `opsdeck@0.2.1`, while connected Edge exercised installed `opsdeck@0.2.2`. Current Main's package inputs, including the optional About identity asset, have not passed the complete exact-source install/uninstall/reinstall and connected installed-browser qualification. The public release remains `v0.2.0`; Main is the accepted v0.5 source checkpoint for judge review.

This decision preserves the existing milestone acceptance and requires no v0.6 feature. No new contest bonus award or completed Community Idea is asserted by the checkpoint. DPI-I-261 package installation remains incomplete.

## What v0.5 means

OpsDeck presents bounded live operational observations through its browser workspaces, including Applications, Tasks and Job Center, Logs with Embedded Python findings, Packages, and session Evidence. The safe demo presents corresponding deterministic synthetic examples and labels them as demo data.

The Packages workspace combines installed IPM registrations with a bounded exact-name query against configured repositories. Catalog identity, available version, repository identity, coverage, and caller authority state are kept explicit where observed. For the qualified `opsdeck` observation, installed `0.2.2` exceeded available `0.2.0`; this is not an update recommendation.

## Acceptance evidence

- Connected Edge on `OPSDECK_08_TEST_TARGET` identified `OpsDeckQualify` in `%SYS` and rendered the live installed inventory and exact `opsdeck` catalog result from `registry`, with 1/1 configured repositories reachable. The browser did not fall back to demo data.
- Overview, Applications, Logs/findings, Tasks/Job Center, Packages, and Evidence were rendered in the connected Docker session. The session and credentials were Docker-only; host `IRISTesting` was not touched.
- JavaScript suite: **156/156 PASS**. JavaScript/ES module syntax checks: **PASS**. `module.xml` parse: **PASS**. `git diff --check`: **PASS**.
- Current source representation is **260,184 uncompressed browser bytes** (222,152 JS, 37,584 CSS, 448 HTML), eight native initial requests. This is +31,847 bytes (+13.94%) over the preserved 228,337-byte baseline. Since the previous measurement, +6,476 bytes implement bounded rotated-message-log observation in the existing app/provider modules, with no added asset or initial request. The recorded additions represent product semantics without adding a frontend framework or global catalog preload.

## Scope and remaining work

Catalog runtime authority is qualified only for the disposable fixture identity, whose grants include `%Admin_Secure:USE`; that is not a default operator grant. The Docker target's installed package remains `opsdeck@0.2.2`; it displays the generic `INSTALLED` badge while separately showing installed `0.2.2` and available `0.2.0`. This truthful state is sufficient for v0.5's written version-semantics criterion; the more specific `INSTALLED_NEWER` label in newer source is presentation debt and has source/test evidence, not installed-runtime evidence.

v0.6 real verified mutation, v0.7 live receipt-backed Evidence, v0.8 package install/remove and DPI-I-261 completion, and v0.9 intelligence qualification remain unaccepted. Public registry installation, tag, and publication remain outside this checkpoint.
