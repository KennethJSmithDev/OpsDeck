# Derived storage boundary for the next gate

Status: product lifecycle foundation implemented and qualified on the authorized disposable Docker target. Vector schema/data lifecycle is not yet qualified. Accepted milestone remains 0.8.0.

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

`OpsDeck.Product.DerivedStorage` owns the virtual `OpsDeckDerivedStore` manifest resource. Configure creates the directory, database, configuration, namespace and dedicated resource. `^OpsDeckDerivedOwner` lives in OPSDECK and binds the identities above. Fresh IRIS metadata has bounded SHA-256 fingerprints; physical database references bypass mappings. The numeric `oddDEF` generation counter is normalized, while all definition children remain checked. Lazy, physically empty IRIS metadata headers are allowed only from the observed fixed list.

Clean preflight runs before IPM unconfigures applications. It refuses changed bindings, mappings, foreign globals/files/streams, foreign resource use or memberships in the associated role. The Clean callback repeats validation before removing artifacts. Directory cleanup uses only removal of empty directories, including the IRIS-created stream child. Failed provisioning rolls back successful creations in reverse order and reports incomplete rollback.

Runtime qualification passed fresh creation, repeat Configure, empty-directory collision refusal, foreign-global refusal/preservation, temporary foreign-role refusal/preservation, actual package upgrade, uninstall absence for all five artifacts, unrelated IPM/app preservation and reinstall. The early foreign-data refusal also preserved both product web applications. These tests establish the empty-store foundation; record preservation, schema evolution and Vector data/index ownership remain separate gates.

## Stored representation

Only compact identity, source identity/time, normalized fingerprint/text, vector and EvidenceRef/source reference. No raw log persistence, authoritative management mirror, credentials, authoritative receipts or shadow CMDB. Deleting this database may remove search convenience; it must never remove authoritative operational truth. Similarity assists navigation and does not prove a finding.

## Evidence and official contracts

- Existing [IPM lifecycle inspection and isolated fixture](OPSDECK_0_9_IPM_STORAGE_LIFECYCLE_20261003.md) establishes post-compilation Configure and standard Clean callbacks.
- [CREATE DATABASE](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=RSQL_createdatabase) creates namespace/database under `%Admin_Manage`; its documented SQL options do not specify the dedicated resource.
- [CreateDatabase configuration action](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=RACS_createdatabase) uses SYS.Database and Config.Databases. Installed signatures must be inspected before choosing exact provisioning calls.
- [Database resource semantics](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GSA_using_resources) govern database data access and the associated database role.

## Decision boundary

The user explicitly authorized this Docker-only architecture/qualification boundary. Host IRISTesting remains excluded. The installed Docker store is retained for the next Vector gate, with no public access and no remaining temporary operator grant. Main and public versions are unchanged. This source milestone does not accept v0.9.
