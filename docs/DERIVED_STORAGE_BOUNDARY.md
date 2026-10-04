# Derived storage boundary for the next gate

Status: proposed product contract; not implemented or runtime-qualified. Accepted milestone is 0.8.0.

## Scope and identities

The proposed owner is the OpsDeck package. A dedicated `OPSDECK` namespace/database stores only rebuildable vector records and search metadata. The proposed disposable path is `/durable/iris/mgr/OPSDECK/`. No new mappings into `%SYS` or USER are required. Existing REST dispatch remains in `%SYS`, preserves the authenticated caller and delegates only closed derived-data operations into OPSDECK.

The dedicated database resource is `%DB_OPSDECK`, with no public permission. IRIS automatically associates a same-name database role with a custom database resource. Product installation must not assign that role or resource to an operator. Temporary qualification READ/WRITE for OpsDeckQualifyRole requires separate authorization.

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

Ownership marker location and failure rollback must be implemented and independently tested before provisioning is qualified. A marker alone is insufficient if namespace/database bindings or contents disagree. The existing isolated storage lifecycle fixture is evidence about callback ordering, not the final product owner.

## Stored representation

Only compact identity, source identity/time, normalized fingerprint/text, vector and EvidenceRef/source reference. No raw log persistence, authoritative management mirror, credentials, authoritative receipts or shadow CMDB. Deleting this database may remove search convenience; it must never remove authoritative operational truth. Similarity assists navigation and does not prove a finding.

## Evidence and official contracts

- Existing [IPM lifecycle inspection and isolated fixture](OPSDECK_0_9_IPM_STORAGE_LIFECYCLE_20261003.md) establishes post-compilation Configure and standard Clean callbacks.
- [CREATE DATABASE](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=RSQL_createdatabase) creates namespace/database under `%Admin_Manage`; its documented SQL options do not specify the dedicated resource.
- [CreateDatabase configuration action](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=RACS_createdatabase) uses SYS.Database and Config.Databases. Installed signatures must be inspected before choosing exact provisioning calls.
- [Database resource semantics](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GSA_using_resources) govern database data access and the associated database role.

## Decision boundary

Provisioning the dedicated database/namespace and security resource/automatic role is a material new architecture and security boundary. Until specifically authorized, continue read-only/source work only. No resource/role reassignment, fixture grant or product persistence is authorized by the completed v0.8 temporary grants. This proposal does not advance the version.
