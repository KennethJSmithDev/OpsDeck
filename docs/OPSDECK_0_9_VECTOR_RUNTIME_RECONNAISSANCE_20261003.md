# OpsDeck 0.9 Vector Search runtime reconnaissance — 2026-10-03

## Local failures and resolution

| Symptom | Boundary / earliest failure | Owning layer | Runtime and authority | Reproduction / resolution |
|---|---|---|---|---|
| `TO_VECTOR('1,0,0','DOUBLE',3)` failed during SQL prepare with “Invalid VECTOR field definition” although the function worked without an explicit type. | `%SQL.Statement.%Prepare`, before execution or data access. | IRIS SQL parser and `TO_VECTOR` literal grammar. | IRIS 2026.2 Build 221U, IPM 0.10.8, disposable `OPSDECK_08_TEST_TARGET`, `%SYS`, `$USERNAME=irisowner`; existing checks reported `%Admin_Manage:Use` and `%Admin_Secure:Use`. | Reproduced in a read-only `SELECT`. Official `TO_VECTOR` documentation calls `type` a literal. The accepted form is `TO_VECTOR('1,0,0',double,3)` with the type token unquoted. A read-only cosine query then returned `1`. |
| A `CREATE TABLE VectorRecord` statement failed with “IDENTIFIER expected, reserved word IDENTITY found” when its first column was named `Identity`. | DDL prepare, before table creation. | IRIS SQL identifier grammar. | Same runtime and identity. | Reproduced in the disposable OPSDECK namespace. Renaming the column to `RecordID` allowed table creation. |

## Bounded Vector Search contract observation

After confirming that `OPSDECK` namespace/database did not exist, a temporary database/namespace was created on the disposable target at `/durable/iris/mgr/OPSDECK`, with global journaling enabled. A test table used a fixed three-element `VECTOR(DOUBLE,3)` field and an IRIS `HNSW(Distance='Cosine')` index. Three synthetic rows were inserted with `TO_VECTOR(value,double,3)`. A `TOP 2` query ordered by `VECTOR_COSINE(... ) DESC` excluded its source row and returned:

| Record | Similarity | Evidence reference |
|---|---:|---|
| `event-timeout-b` | `0.993883734673618902` | `log:systemMonitorLog:8` |
| `event-denied` | `0` | `log:messagesLog:5` |

This confirms real SQL vector storage, HNSW index creation, vector insertion and bounded cosine ranking on this runtime. It does **not** qualify a product embedding model, log-to-vector pipeline, REST endpoint, browser experience, HNSW plan selection at product scale, or package-owned lifecycle.

The test namespace and rows were removed with `DROP DATABASE OPSDECK`; the SQL operation returned success. Read-back found no `OPSDECK` namespace/database registration, and the exact test directory contained only empty `C`, `D`, and `stream` directories, which were removed individually. No other namespace, database, package, repository, user, role, privilege, or web application was changed.

## Evidence and limits

- Test target: `OPSDECK_08_TEST_TARGET`, image `intersystemsdc/iris-community:2026.2-zpm`, digest `sha256:68bc1d43c98ca816f2e98a185edc1250bebb6b763f8159da35c8543b09c0df70`.
- Runtime evidence came from one authenticated IRIS console identity (`irisowner`) on this disposable target. No HTTP identity or end-user authority was exercised.
- Synthetic fixture vectors and source references were test-only; no raw log data or real evidence was persisted.
- No external model, AI provider, competitor repository, or competitor code was used.
- The temporary namespace was not package-owned and was fully cleaned. Package configure/unconfigure callbacks and safe collision refusal are still required before product storage exists.

## Official corroboration

- [IRIS 2026.2 `TO_VECTOR` reference](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=RSQL_tovector) documents the comma-separated vector input and type literal.
- [IRIS 2026.2 Vector Search guide](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GSQL_vecsearch) documents fixed-length vector columns, HNSW constraints, bounded `TOP`/descending similarity queries, and cosine semantics.
- [IRIS 2026.2 `CREATE DATABASE`](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=RSQL_createdatabase) and [`DROP DATABASE`](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=RSQL_dropdatabase) document namespace/database creation and removal as privileged operations requiring `%Admin_Manage`.

## Decision

The runtime supports the core Vector Search SQL contract. Proceeding with a product-owned derived index remains sequenced after a real verified operation and its receipt; no product persistence or vector code is introduced by this reconnaissance record.
