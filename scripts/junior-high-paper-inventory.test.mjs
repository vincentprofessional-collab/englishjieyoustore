import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("paper inventory contains ten complete unique source pairs", () => {
  const inventory = JSON.parse(fs.readFileSync(new URL("../src/lib/junior-high/paper-inventory.json", import.meta.url), "utf8"));
  assert.equal(inventory.length, 10);
  const keys = new Set();
  for (const item of inventory) {
    assert.ok(item.year);
    assert.ok(item.region);
    assert.ok(item.originalPath.endsWith(".docx"));
    assert.ok(item.analysisPath.endsWith(".docx"));
    assert.ok(fs.existsSync(item.originalPath), `missing original: ${item.originalPath}`);
    assert.ok(fs.existsSync(item.analysisPath), `missing analysis: ${item.analysisPath}`);
    const key = `${item.year}-${item.region}-${item.originalName}`;
    assert.equal(keys.has(key), false, `duplicate inventory entry: ${key}`);
    keys.add(key);
  }
});
