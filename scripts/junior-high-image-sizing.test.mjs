import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const css = fs.readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("junior high images use Word-like size caps across every image role", () => {
  assert.match(css, /\.junior-high-source-image \{[^}]*width: min\(100%, 380px\);[^}]*max-height: 240px/);
  assert.match(css, /\.junior-high-context-image \{[^}]*max-width: min\(100%, 180px\);[^}]*max-height: 140px/);
  assert.match(css, /\.junior-high-question-image \{[^}]*max-width: min\(100%, 140px\);[^}]*max-height: 100px/);
  assert.match(css, /\.junior-high-writing-diagram \{[^}]*width: min\(100%, 380px\);[^}]*max-height: 240px/);
  assert.match(css, /\.junior-high-book-card img \{[^}]*width: 80px;[^}]*max-height: 128px/);
});
