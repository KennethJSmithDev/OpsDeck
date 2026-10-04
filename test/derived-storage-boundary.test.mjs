import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/OpsDeck/Product/DerivedStorage.cls", import.meta.url), "utf8");

test("derived storage uses standard IPM ownership callbacks and a dedicated no-public resource", () => {
  assert.match(source, /Extends %IPM\.ResourceProcessor\.Abstract/u);
  assert.match(source, /OnAfterPhase[\s\S]*?pPhase'="Configure"/u);
  assert.match(source, /OnBeforePhase[\s\S]*?pPhase'="Clean"[\s\S]*?CleanupPreflight/u);
  assert.match(source, /OnPhase[\s\S]*?pPhase'="Clean"[\s\S]*?pResourceHandled=1/u);
  assert.match(source, /Security\.Resources\)\.Create\(\.\.#RESOURCE,\.\.#DESCRIPTION,0\)/u);
  assert.doesNotMatch(source, /Security\.(?:Users|Roles)\)\.(?:Create|Modify)|GRANT\s|\bXECUTE\b|Shell\(/iu);
});

test("derived storage rejects foreign bindings and contents before deletion without recursive cleanup", () => {
  for (const state of ["collision", "owner-conflict", "binding-conflict", "mapping-conflict", "foreign-global", "foreign-file", "foreign-stream", "foreign-role", "foreign-role-member"]) {
    assert.ok(source.includes(`derived-store-${state}`), state);
  }
  assert.match(source, /count>10000/u);
  assert.match(source, /CleanupPreflight\(\)[\s\S]*?Config\.Namespaces\)\.Delete/u);
  assert.match(source, /RemoveEmptyDirectories/u);
  assert.doesNotMatch(source, /DeleteDirectoryTree|RemoveDirectoryTree|rm -rf/iu);
});
