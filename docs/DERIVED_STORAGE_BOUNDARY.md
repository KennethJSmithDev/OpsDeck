# Derived storage boundary for the next gate

Status: product storage, native Vector schema/data lifecycle, caller-scoped HTTP indexing/retrieval and connected Edge preview qualified on the authorized disposable Docker target. Full v0.9 acceptance remains incomplete. Accepted milestone remains 0.8.0.

## Scope and identities

The proposed owner is the OpsDeck package. A dedicated `OPSDECK` namespace/database stores only rebuildable vector records and search metadata. The proposed disposable path is `/durable/iris/mgr/OPSDECK/`. No new mappings into `%SYS` or USER are required. Existing REST dispatch remains in `%SYS`, preserves the authenticated caller and delegates only closed derived-data operations into OPSDECK.

The dedicated database resource is `%DB_OPSDECK`, with no public permission. IRIS automatically associates a same-name database role with a custom database resource. Product installation does not assign that role or resource to an operator. The user authorized temporary qualification READ/WRITE for OpsDeckQualifyRole; the refusal probe used it and revoked it.

Read-only inspection on OPSDECK_08_TEST_TARGET found the namespace, configured database, path and resource absent. This is a point-in-time observation, not permission to provision them or skip install-time collision checks.

## Lifecycle contract

| Event | Required behavior |
|---|---|
| Fresh installation | Refuse namespace/database/path/resource/role collisions. Provision only the exact named artifacts under installer authority. Record a versioned ownership marker binding package, namespace, database, normalized path and resource. |
| Partial installation failure | Remove only artifacts demonstrably created by this installation. Unresolved ownership stops cleanup; never take over an existing artifact. |
| Upgrade/reinstall | Require the exact ownership marker and matching runtime bindings. Preserve existing derived records; use explicit schema migration/rebuild semantics. |
| Query/index refresh | Preserve caller identity and enforce dedicated database access. Bounded records/results, fixed schemas and operations; no arbitrary SQL, raw paths or mirrored management inventory. |
| Uninstall | Standard IPM Clean hook, not an unconnected custom action. Verify ownership and bindings; refuse deletion if foreign resources/data are detected. Remove only derived state and owned namespace/database/resource/automatic role. Read back absence. |
| Collision or changed ownership | Refuse adoption/deletion and report the precise conflict. Operator resolves it explicitly. |

`OpsDeck.Product.DerivedStorage` owns the virtual `OpsDeckDerivedStore` manifest resource. Configure creates the directory, database, configuration, namespace, dedicated resource and fixed Vector table/index. `^OpsDeckDerivedOwner` lives in OPSDECK and binds the identities above plus schema revision 2. Fresh IRIS/schema metadata has bounded SHA-256 fingerprints; physical database references bypass mappings. The numeric `oddDEF` generation counter is normalized, while all definition children remain checked. Lazy, physically empty IRIS metadata headers are allowed only from the observed fixed list.

The mutable Vector global family is derived from the authoritative compiled storage definition of `OpsDeckDerived.VectorRecord`, rather than guessed from its SQL name. The marker binds that family and validation requires the table still use it. Other global contents remain checked. The closed table has identity, source/time, normalized text/fingerprint, EvidenceRef and a fixed 16-component vector; its HNSW index uses cosine distance. The bounded native query returns at most five references and similarities, never vector arrays. Similarity is navigation, not proof. HNSW plan selection at scale is unverified.

Clean preflight runs before IPM unconfigures applications. It refuses changed bindings, mappings, foreign globals/files/streams, foreign resource use or memberships in the associated role. The Clean callback repeats validation before removing artifacts. Directory cleanup uses only removal of empty directories, including the IRIS-created stream child. Failed provisioning rolls back successful creations in reverse order and reports incomplete rollback.

Runtime qualification passed fresh creation, repeat Configure, empty-directory collision refusal, foreign-global refusal/preservation, temporary foreign-role refusal/preservation, actual package upgrade, uninstall absence for all five artifacts, unrelated IPM/app preservation and reinstall. The early foreign-data refusal also preserved both product web applications. Three synthetic Vector records survived package reload, returned exact source/EvidenceRef identities with expected cosine relationships, were removed with actual package uninstall, and were absent after schema rebuild/reinstall. Schema collision refused adoption.

Upgrade debt: an already loaded IPM processor revision can execute its earlier callback code within a process that recompiles it. Qualification used fresh console processes when changing processor semantics. Revision-1 experimental empty stores are refused by revision 2; no silent adoption or data migration is implemented. Future cross-revision upgrades require a separate exact qualification.

Embedded Python's `opsdeck-concepts-v1` is a deterministic, transparent concept vocabulary for compact normalization. It produces concept labels rather than raw log lines and is not a neural embedding model. Its native runtime example mapped "slow database connection with failed permission" to timeout/denied/error/network/database. The caller-scoped HTTP/Edge slice is documented in [the retrieval qualification record](DERIVED_SEARCH_QUALIFICATION.md).

### Physical lifecycle and transaction failure

A failed Configure invocation exposed a real rollback error: the IPM loader's surrounding transaction still referenced schema writes when provisioning cleanup deleted the physical database. IRIS subsequently reported ROLLFAIL. The earlier successful lifecycle tests did not establish this failure path.

Installed IPM 0.10.8 `LoadNewModule` supports the module default `NoTransaction`. The manifest now declares `<Defaults><Parameter Name="NoTransaction">1</Parameter></Defaults>`. Provision, Clean preflight and Remove refuse a surrounding transaction before mutation. If an unexpected transaction remains during failed provisioning, cleanup refuses database deletion and reports incomplete cleanup. Journaling remains enabled. Physical namespace/database configuration is explicitly nontransactional; this is not an atomic installation guarantee.

Qualification exercised an actual package Configure failure after schema/ownership writes using a temporary, fixture-only copy of the product processor. With the default active, the failure left transaction level zero and namespace, configured database, directory, resource and associated role absent. The real processor was restored, compiled in a separate process and loaded successfully; both product routes and unrelated IPM/system app survived. Direct surrounding-transaction probes refused Provision and Remove while preserving the caller's transaction and store. The temporary failing processor is not product source or deployed behavior.

External problem: transactional package load cannot safely roll back a physical database that cleanup has deleted. Transferable idea: use the package manager's official nontransactional load contract for physical lifecycle ownership. OpsDeck design: manifest default plus early transaction refusal and checked reverse cleanup. Minimum reason: avoids replacing IPM or adding a parallel installation engine. Representation cost: manifest metadata and small native guards, no browser cost. Official corroboration: [IPM 0.10.8 Module implementation](https://github.com/intersystems/ipm/blob/v0.10.8/src/cls/IPM/Utils/Module.cls) and [module parameter representation](https://github.com/intersystems/ipm/blob/v0.10.8/src/cls/IPM/Storage/ModuleSetting/Parameter.cls).

Limitations: nested dependency installation with an outer transaction, cross-revision processor changes and schema migration require separate qualification. An explicit override disabling this default fails closed. Historical native error logs and IPM history remain intact.

## Stored representation

Only compact identity, source identity/time, normalized fingerprint/text, vector and EvidenceRef/source reference. No raw log persistence, authoritative management mirror, credentials, authoritative receipts or shadow CMDB. Deleting this database may remove search convenience; it must never remove authoritative operational truth. Similarity assists navigation and does not prove a finding.

## Evidence and official contracts

- Existing [IPM lifecycle inspection and isolated fixture](OPSDECK_0_9_IPM_STORAGE_LIFECYCLE_20261003.md) establishes post-compilation Configure and standard Clean callbacks.
- [CREATE DATABASE](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=RSQL_createdatabase) creates namespace/database under `%Admin_Manage`; its documented SQL options do not specify the dedicated resource.
- [CreateDatabase configuration action](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=RACS_createdatabase) uses SYS.Database and Config.Databases. Installed signatures must be inspected before choosing exact provisioning calls.
- [Database resource semantics](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GSA_using_resources) govern database data access and the associated database role.

## Decision boundary

The user explicitly authorized this Docker-only architecture/qualification boundary. Host IRISTesting remains excluded. The installed Docker store is retained for the next Vector gate, with no public access and no remaining temporary operator grant. Main and public versions are unchanged. This source milestone does not accept v0.9.
