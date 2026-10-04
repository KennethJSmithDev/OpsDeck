# OpsDeck

<p align="center">
  <a href="https://kennethjsmithdev.github.io/OpsDeck/"><strong>🚀 LIVE SAFE DEMO</strong></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/KennethJSmithDev/OpsDeck/releases/tag/v1.0.0"><strong>📦 v1.0.0 RELEASE</strong></a>
  &nbsp;·&nbsp;
  <a href="docs/NATIVE_INSTALL.md"><strong>🛠️ INSTALL</strong></a>
  &nbsp;·&nbsp;
  <a href="docs/EVALUATOR_GUIDE.md"><strong>🧭 EVALUATOR GUIDE</strong></a>
  &nbsp;·&nbsp;
  <a href="docs/CAPABILITY_INVENTORY.md"><strong>📊 CAPABILITIES</strong></a>
</p>

<p align="center">
  <strong>Evidence-first operations for InterSystems IRIS.</strong><br>
  Observe live state · Rehearse changes · Forecast impact · Execute with authority · Verify what actually happened
</p>

<p align="center">
  <img src="assets/OpsDeckLogo.png" alt="OpsDeck — Operations Console for InterSystems IRIS" width="720">
</p>

**OpsDeck 1.0.0** is an open-source operations environment for InterSystems IRIS. It combines live management views, evidence-scoped verification, reviewed mutation workflows, semantic investigation, adaptive mobile UX, and bounded intelligence in one native IRIS-hosted interface.

Built for the **InterSystems Programming Contest: Build Your Own Management Portal (2026)**.

> **v1.0.0:** 117 IRIS operations exposed · 56 runtime-observed · 37 reproduced · 34 independently verified · 7 mutation endpoints · 12 qualified mutation workflows · 259 tests · 610,382 runtime-manifest bytes

## Why OpsDeck

Traditional admin interfaces often show state and leave the operator to infer what a change will do, whether it actually happened, and what evidence remains afterward.

OpsDeck makes that sequence explicit:

```text
OBSERVE
   ↓
OPERATION REHEARSAL
   ↓
IMPACT FORECAST
   ↓
PLAN REVIEW
   ↓
CONFIRM
   ↓
EXECUTE
   ↓
AUTHORITATIVE READ-BACK
   ↓
VERIFIED RECEIPT
   ↓
SESSION LEDGER
```

The same semantics survive from desktop down to a 320-pixel mobile viewport. IRIS remains authoritative; OpsDeck does not invent a second source of truth.

## 90-second evaluator path

No IRIS instance or credentials are required for the public demo.

1. Open the **[Live Safe Demo](https://kennethjsmithdev.github.io/OpsDeck/)**.
2. Switch **Demo Access** personas to see authority change the visible workspace.
3. Inspect **Applications** and the difference between supported, denied, unavailable, empty, failed, and unverified states.
4. Open **Evidence** to see what OpsDeck can prove and where qualification stops.
5. Try **FX Studio** or shrink the browser to see the same semantic UI adapt rather than become a horizontally scrolling desktop page.

The demo uses deterministic sanitized sample data and says so explicitly. It never substitutes sample records for a failed live IRIS read.

For the complete review path, see the **[Evaluator Guide](docs/EVALUATOR_GUIDE.md)**.

## What ships in 1.0

### Operations and evidence

- Live IRIS identity, application, access, security, task, system, log, package, and evidence projections where admitted.
- **Operation Rehearsal** builds the canonical plan without dispatch.
- **Impact Forecast** projects target, pre-state, expected transition, authority, risk, reversibility, and likely service/user effect.
- **Plan Review** preserves the exact state being confirmed.
- **Observe Only** is enforced at the execution boundary, not merely by hiding buttons.
- **Verified Receipt** requires authoritative read-back at qualified mutation boundaries.
- **Session Ledger** projects current-session observations, plans, confirmations, receipts, findings, and refusals without creating a second history system.

### SysAdmin reach

The source-generated inventory currently records:

| Measure | Qualified count |
|---|---:|
| Declared SysAdmin operations | 276 |
| Exposed operations | **117** |
| Runtime-observed | **56** |
| Reproduced | **37** |
| Independently verified | **34** |
| Mutation-shaped contracts | 161 |
| Exposed mutation endpoints | **7** |
| Qualified mutation workflows | **12** |

Counts use **HTTP method + canonical SysAdmin v2 path** as the operation unit. A declared API contract does not become runtime proof merely because it exists in the OpenAPI document.

See **[Capability Inventory](docs/CAPABILITY_INVENTORY.md)** for the generated accounting and qualification boundaries.

### Investigation and automation

- Native **Embedded Python** performs bounded fixed-log concept normalization.
- Native **IRIS Vector Search** provides source-linked semantic navigation over product-owned derived records.
- The generic SysAdmin explorer derives long-tail request structure from the official API specification while routing admitted mutations through the canonical planner/executor.
- Workflows compose existing OpsDeck operations rather than arbitrary code.
- Entity relationships remain tied to admitted Evidence.
- Candidate intelligence remains untrusted until the server reconstructs intent against authoritative state and normal policy/authority checks.

### Adaptive UX

- Responsive semantic projection from desktop to one-thumb mobile operation.
- Command palette on desktop and thumb-accessible command surface on mobile.
- JSON/CSV export from already-admitted state.
- Multi-target identity and comparison semantics without pretending separate observations are one global truth.
- **FX Studio** separates base mode, material, effect intensity, and motion so customization remains modular while semantic status meanings stay invariant.

## Compact by architecture

The qualified 1.0 runtime manifest is **610,382 bytes across 25 assets**.

OpsDeck reached that size after expanding from 113 to 117 exposed operations and from 6 to 12 qualified mutation workflows. A later representation pass reduced the runtime below its pre-expansion size without removing those capabilities.

The point is not code golf. Shared semantic contracts carry planning, authority, evidence, targeting, and presentation so features do not each need their own copy of the same machinery.

Fun fact: the source logo is roughly **3.48× larger than the runtime manifest**. The logo is staying. 🙂

## Native installation

The exact qualified 1.0.0 archive is attached to the **[GitHub v1.0.0 release](https://github.com/KennethJSmithDev/OpsDeck/releases/tag/v1.0.0)**.

For the qualified artifact path, clone the tagged source and use the release archive from the GitHub release:

```powershell
git clone https://github.com/KennethJSmithDev/OpsDeck.git
cd OpsDeck
git checkout v1.0.0
```

From the IRIS IPM prompt in `%SYS`, load the downloaded release archive:

```text
load C:\path\to\opsdeck-1.0.0-rc.tgz
```

Then open:

```text
http://127.0.0.1:52773/opsdeck/index.html
```

Adjust the HTTP port for the local instance.

The preserved release artifact is **154,243 bytes**, SHA-256:

```text
178bf6ea3809b023ed76a39ea313cfaf33ff3f5e91a5afbfc2627cadf3faf798
```

It passed fresh installation, an installed 0.8.0 → 1.0.0 update, uninstall with owned-state cleanup, and reinstall on the owned IRIS 2026.2 / IPM 0.10.8 qualification target.

**Public IPM registry distribution of 1.0.0 is not claimed until independently observed.** Until then, use the qualified GitHub release artifact rather than assuming `zpm install opsdeck` resolves 1.0.0.

See **[Native Installation](docs/NATIVE_INSTALL.md)** for prerequisites, lifecycle boundaries, and recovery details.

## Release qualification

The exact `v1.0.0` tag points to qualified commit `be35ed89c21e91079b0152ba4572f0700839b515`.

Release qualification included:

- **259/259** regression tests;
- **25/25** shipped runtime assets matching source and authenticated native HTTP delivery;
- fresh archive installation and product-owned store initialization;
- connected native browser operation;
- Observe Only with zero dispatch;
- reversible native mutation with authoritative read-back and restoration;
- the same reviewed mutation flow at **320×568**;
- native Embedded Python analysis and source-linked Vector Search;
- installed **0.8.0 → 1.0.0** update with bounded derived-state preservation;
- uninstall cleanup with unrelated IRIS/IPM state preserved;
- reinstall from the same preserved archive;
- staged source and archive privacy scans with zero high-confidence secret findings.

The full scope and limitations are recorded in **[1.0 RC Qualification](docs/RC_1_0_0_QUALIFICATION_20261004.md)**.

## Built with the IRIS community

OpsDeck implements community-driven capabilities because they improve the product, not merely to collect contest checkboxes.

Current documented work includes reviewed IPM/Open Exchange package workflows associated with **DPI-I-261**, contextual IRIS learning assistance, and the read-only ObjectScript snippet library.

See **[Community Ideas Status](docs/COMMUNITY_IDEAS_STATUS.md)** for exact provenance, acceptance scope, and what is or is not being claimed.

## Evidence semantics

OpsDeck deliberately keeps these states distinct:

- **VERIFIED** — independent evidence agrees with the displayed state.
- **EMPTY** — the authoritative provider returned a valid empty collection.
- **UNAVAILABLE** — the source could not provide a usable result.
- **DENIED** — the current identity lacks authority.
- **FAILED** — the provider reported failure.
- **UNVERIFIED** — the required qualification boundary has not been crossed.

Absence is not failure, and failure is not absence.

## Security and authority

- Credentials are never committed to the repository.
- Native browser credentials remain in tab memory and are cleared by Sign out.
- Secret-bearing fields are not intentionally projected into generic views.
- Provider routes are explicit and bounded.
- Exact confirmation is bound to the reviewed plan.
- Observe Only blocks dispatch in the executor.
- Intelligence does not acquire authority merely by proposing an operation.
- Public IRIS management ports should not be exposed to untrusted networks.

See **[Security Policy](SECURITY.md)**.

## Known boundaries

OpsDeck 1.0 does **not** claim universal support merely because the official API declares an operation.

Known release boundaries include:

- Task Description mutation returned HTTP 500 on the qualification target and remains excluded from dispatch admission and capability counts.
- The message-rotation probe returned a failed provider state; successful rotated-log retrieval is not admitted.
- Vector similarity is bounded concept navigation, not incident proof or a neural embedding claim.
- Vector concurrency and scale remain unqualified.
- External model inference is not required for core operation and remains outside the qualified 1.0 release claim.
- Qualification is scoped to the recorded IRIS 2026.2 disposable Docker target, identities, fixtures, and authority boundaries.
- Public-registry 1.0.0 installation remains unclaimed until independently observed.

## Development

The preserved Node reference path remains useful for provider development and tests:

```powershell
npm test
npm start
```

Open `http://127.0.0.1:4173`.

The application has no npm package dependencies; the reference server uses Node built-ins.

## Documentation

- **[Evaluator Guide](docs/EVALUATOR_GUIDE.md)**
- **[Native Installation](docs/NATIVE_INSTALL.md)**
- **[Capability Inventory](docs/CAPABILITY_INVENTORY.md)**
- **[1.0 Qualification](docs/RC_1_0_0_QUALIFICATION_20261004.md)**
- **[Community Ideas Status](docs/COMMUNITY_IDEAS_STATUS.md)**
- **[Roadmap](docs/ROADMAP.md)**

## Support

Use **[GitHub Issues](https://github.com/KennethJSmithDev/OpsDeck/issues)** for reproducible bugs and support requests. Never include passwords, tokens, private keys, or other secrets in reports.

## License

OpsDeck is licensed under the **[MIT License](LICENSE)**.
