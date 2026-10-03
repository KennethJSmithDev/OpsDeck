# DPI-I-966 rotated messages.log reconnaissance

## Local gap

| Field | Observation |
|---|---|
| Symptom | OpsDeck can observe the current messages log but cannot identify or open retained rotations. |
| Boundary | `OpsDeck.Product.FixedLogReader.Read` currently accepts only `messagesLog` and `systemMonitorLog`; it resolves one current file and uses the established bounded read window. |
| Owning layer | OpsDeck fixed-log provider and reader. IRIS remains owner of the files and their rotation. |
| Runtime | Disposable `OPSDECK_08_TEST_TARGET`, IRIS 2026.2 Build 221U. |
| Authority | Read-only console session as `irisowner`; the product reader's existing `%Admin_Operate:Use` check must also protect future listing and reads. HTTP user authority was not tested here. |
| Reproduction | Called `Config.config.GetConsoleFileName`, derived its sibling directory internally, then prepared the `%File.FileSet` class query for the exact wildcard `messages.old_*`; displayed at most 10 basenames/types/metadata and found 0 matches. No file contents were read. |
| Earliest failure | No runtime failure occurred. The gap is the absence of an OpsDeck rotation listing/resolution contract; this target has no rotation fixture to qualify. |

## Official and runtime evidence

IRIS 2026.2 documentation states that when the console log reaches its configured maximum, the current `messages.log` is renamed to `messages.old_Date` and a new `messages.log` is created. The `Date` placeholder's exact formatting is not specified in that documentation. [MaxConsoleLogSize](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=RACS_MaxConsoleLogSize)

The official `%Library.File` `FileSet` query accepts a directory and filename wildcard without requiring recursion. It returns `Type` with `F` for a file, `D` for a directory, and `S` for a symbolic link. [Query Directories and Drives](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GFILE_dirsdrives)

The disposable runtime query found zero `messages.old_*` matches. This does not qualify actual rotation naming, ordering, or file reads. No repository/IPM configuration, privileges, files, or IRIS state were changed.

## OpsDeck-native design candidate

- Resolve the current console-log file internally; inspect only its sibling `messages.old_*` family.
- Use `%File.FileSet` and admit only `Type="F"`; reject directories and symbolic links, and never recurse.
- Cap enumeration and preserve a coverage/truncation state if the cap is exceeded.
- Assign a stable opaque `sourceIdentity`; keep basenames and resolved paths out of response metadata.
- Resolve a requested identity by re-enumerating the same fixed family and matching its server-generated identity. Never accept a raw path or filename from the caller.
- Feed the selected member through the existing bounded reader and `LogInterpreter`. Preserve current `messages.log` as the canonical source and retain distinct source identity and observed file metadata for each rotation.
- Add rotation rows lazily in the Logs workspace; do not read every rotation's content when listing identities.

This is a design candidate only. Before implementation, qualify the bounded ordering behavior and a disposable synthetic regular-file/symlink fixture without modifying configuration or accepted host IRIS state. DPI-I-966 remains incomplete.
