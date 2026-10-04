# OpsDeck 0.5.0 integration candidate

**Status:** accepted operational-visibility milestone on the integration branch. This is not a public release, tag, or mainline merge.

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

v0.6 real verified mutation, v0.7 live receipt-backed Evidence, v0.8 package install/remove and DPI-I-261 completion, and v0.9 intelligence qualification remain unaccepted. Public registry installation, main merge, tag, and publication remain outside this candidate.
