import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("ten generated papers contain renderable questions, writing tasks, and media", () => {
  const inventory = JSON.parse(fs.readFileSync(new URL("../src/lib/junior-high/paper-inventory.json", import.meta.url), "utf8"));
  assert.equal(inventory.length, 10);
  for (const item of inventory) {
    const paper = JSON.parse(fs.readFileSync(item.dataPath, "utf8"));
    assert.ok(paper.questions.length > 0, `${item.slug} has no questions`);
    const ids = new Set(paper.questions.map((question) => question.id));
    assert.equal(ids.size, paper.questions.length, `${item.slug} has duplicate question ids`);
    assert.ok(paper.writing.promptA.length > 0, `${item.slug} has no writing prompt`);
    assert.ok(paper.writing.promptB.length > 0, `${item.slug} has no second writing prompt`);
    for (const asset of paper.assets?.all ?? []) {
      assert.ok(fs.existsSync(`${process.cwd()}/public${asset}`), `${item.slug} missing asset ${asset}`);
    }
  }
});
