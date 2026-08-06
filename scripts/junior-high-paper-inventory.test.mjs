import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("paper inventory contains thirty complete unique source pairs", () => {
  const inventory = JSON.parse(fs.readFileSync(new URL("../src/lib/junior-high/paper-inventory.json", import.meta.url), "utf8"));
  assert.equal(inventory.length, 30);
  assert.equal(inventory.filter((item) => item.audioAvailable).length, 24);
  const keys = new Set();
  function containsFile(root, fileName) {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      const next = `${root}/${entry.name}`;
      if (entry.isFile() && entry.name === fileName) return true;
      if (entry.isDirectory() && containsFile(next, fileName)) return true;
    }
    return false;
  }
  for (const item of inventory) {
    assert.ok(item.year);
    assert.ok(item.region);
    assert.ok(item.originalPath.endsWith(".docx"));
    assert.ok(item.analysisPath.endsWith(".docx"));
    assert.ok(fs.existsSync(item.originalPath), `missing original: ${item.originalPath}`);
    assert.ok(fs.existsSync(item.analysisPath), `missing analysis: ${item.analysisPath}`);
    assert.equal(item.analysisName, item.originalName.replace("（原卷版）", "（解析版）"));
    assert.equal(item.audioAvailable, item.audioNames.length > 0);
    for (const audioName of item.audioNames) {
      assert.ok(containsFile(item.sourceDirectory, audioName), `missing audio: ${audioName}`);
    }
    const key = `${item.year}-${item.region}-${item.originalName}`;
    assert.equal(keys.has(key), false, `duplicate inventory entry: ${key}`);
    keys.add(key);
  }
});
