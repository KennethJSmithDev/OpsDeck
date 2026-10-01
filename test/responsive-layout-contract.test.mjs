import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");
const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");

test("available workspace width stacks inventory and authoritative inspector", () => {
  assert.match(css, /\.workspace\s*\{[^}]*container-name:\s*workspace[^}]*container-type:\s*inline-size/s);
  const rules = css.slice(css.indexOf("@container workspace (max-width:1000px)"), css.indexOf("@container workspace (max-width:620px)"));
  assert.match(rules, /\.apps-layout,\.provider-layout\s*\{\s*grid-template-columns:\s*minmax\(0,1fr\)/s);
  assert.match(rules, /\.inspector\s*\{\s*position:\s*static/s);
});

test("inventory panel changes from a table to labeled cards at its usable width", () => {
  assert.match(css, /\.table-panel\s*\{[^}]*container:\s*inventory\s*\/\s*inline-size/s);
  const cardMode = css.slice(css.indexOf("@container inventory (max-width:700px)"), css.indexOf("@container source-panel (max-width:760px)"));
  assert.match(cardMode, /table\s*\{[^}]*min-width:\s*0[^}]*display:\s*block/s);
  const compactSafety = cardMode.slice(cardMode.indexOf("@media (max-width:700px)"));
  assert.match(compactSafety, /\.apps-layout \.panel\.table-panel table,\s*\.provider-layout \.panel\.table-panel table\s*\{[^}]*min-width:\s*0/s);
  assert.match(compactSafety, /@media\s*\(min-width:\s*746px\)\s*\{\s*\.apps-layout \.panel\.table-panel table,\s*\.provider-layout \.panel\.table-panel table\s*\{[^}]*min-width:\s*660px/s);
  assert.match(css, /\.app-row,\.provider-row\s*\{[^}]*display:\s*grid/s);
  assert.match(app, /data-label="Web application"/);
  assert.match(app, /data-label="Namespace"/);
  assert.match(app, /data-label="State"/);
  assert.match(app, /data-label="\$\{esc\(key\)\}"/);
  assert.match(app, /sourceId === "tasks"\s*\?\s*\["Type", "Namespace", "Suspended"/);
});

test("source tabs wrap, and normal operational regions do not create horizontal scrollers", () => {
  assert.match(css, /\.source-tabs\s*\{[^}]*flex-wrap:\s*wrap[^}]*overflow:\s*visible/s);
  assert.match(css, /@container\s+source-panel\s*\(max-width:\s*760px\)/);
  assert.match(css, /\.source-tab\s*\{\s*flex:\s*1 1 150px/s);
  assert.doesNotMatch(css.match(/\.table-wrap\s*\{[^}]*\}/s)?.[0] || "", /overflow-x?\s*:\s*auto/);
  assert.doesNotMatch(css.match(/\.source-tabs\s*\{[^}]*\}/s)?.[0] || "", /overflow-x?\s*:\s*auto/);
  assert.doesNotMatch(css.match(/\.workspace\s*\{[^}]*\}/s)?.[0] || "", /overflow-x?\s*:\s*auto/);
});

test("server and username labels wrap instead of truncating useful identity text", () => {
  for (const selector of [".instance-value", ".user-chip"]) {
    const rule = css.match(new RegExp(`${selector.replaceAll(".", "\\.")}\\s*\\{[^}]*\\}`, "s"))?.[0] || "";
    assert.match(rule, /overflow-wrap:\s*anywhere/);
    assert.doesNotMatch(rule, /text-overflow:\s*ellipsis|white-space:\s*nowrap|overflow:\s*hidden/);
  }
});

test("compact shell navigation collapses at a width that preserves workspace room", () => {
  assert.match(css, /@media\s*\(max-width:\s*980px\)/);
  assert.match(css, /\.nav-secondary\s*\{\s*display:\s*none/);
  assert.match(css, /\.sidebar\.more-open\s+\.nav-secondary\s*\{\s*display:\s*flex/);
  assert.match(app, /aria-expanded="\$\{state\.mobileMoreOpen\}"/);
});
