import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("catalog covers every generated inventory entry", () => {
  const inventory = JSON.parse(fs.readFileSync(new URL("../src/lib/junior-high/paper-inventory.json", import.meta.url), "utf8"));
  const catalogSource = fs.readFileSync(new URL("../src/lib/junior-high/paper-catalog.ts", import.meta.url), "utf8");
  for (const item of inventory) {
    assert.match(catalogSource, new RegExp(item.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
