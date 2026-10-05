import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, provider, css] = await Promise.all([
  readFile(new URL("../demo/index.html", import.meta.url), "utf8"),
  readFile(new URL("../demo/demo-provider.js", import.meta.url), "utf8"),
  readFile(new URL("../public/styles.css", import.meta.url), "utf8"),
]);

test("Safe Demo shell keeps the full safety notice fixed and has one repository link beside one persona selector", () => {
  assert.match(html, /id="opsdeck-safe-demo-banner"[^>]*>SAFE DEMO · SANITIZED SAMPLE DATA · NO IRIS CONNECTION</u);
  assert.equal((html.match(/class="demo-repo-link"/gu) || []).length, 1);
  assert.equal((html.match(/aria-label="Demo access persona"/gu) || []).length, 1);
  assert.match(html, /id="opsdeck-demo-access-row"[\s\S]*?id="opsdeck-demo-persona"[\s\S]*?class="demo-repo-link"/u);
  assert.doesNotMatch(html, /Return to GitHub repository<\/a>/u);
  assert.match(css, /#opsdeck-safe-demo-banner\s*\{[^}]*position:fixed[^}]*top:0/u);
  assert.match(css, /\.demo-repo-link\s*\{[^}]*position:static/u);
});

test("scroll-away utility reuses the authoritative persona selector without changing persona authority logic", () => {
  assert.match(provider, /localStorage\.getItem\("opsdeck\.demo\.persona"\)/u);
  assert.match(provider, /select\.addEventListener\("change"[\s\S]*?localStorage\.setItem\("opsdeck\.demo\.persona", event\.target\.value\)[\s\S]*?location\.reload\(\)/u);
  assert.match(provider, /new IntersectionObserver\(\(\[entry\]\) => setPersistentAccess\(!entry\.isIntersecting\)/u);
  assert.match(provider, /classList\.toggle\("demo-access-persistent"/u);
  assert.match(css, /body\.demo-access-persistent #opsdeck-demo-access-row\s*\{[^}]*position:fixed/u);
  assert.match(css, /\.command-trigger\s*\{[^}]*position:fixed[^}]*right:16px/u);
  assert.match(css, /body\.demo-access-persistent #opsdeck-demo-access-row\s*\{[^}]*left:16px/u);
  assert.match(css, /@media\(max-width:760px\)\s*\{[\s\S]*?body\.demo-access-persistent #opsdeck-demo-access-row\s*\{[^}]*bottom:calc\(68px/u);
});
