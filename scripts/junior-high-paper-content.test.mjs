import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("thirty generated papers contain renderable questions, writing tasks, and media", () => {
  const inventory = JSON.parse(fs.readFileSync(new URL("../src/lib/junior-high/paper-inventory.json", import.meta.url), "utf8"));
  assert.equal(inventory.length, 30);
  for (const item of inventory) {
    const paper = JSON.parse(fs.readFileSync(item.dataPath, "utf8"));
    assert.equal(paper.layout, "structured", `${item.slug} should use structured layout`);
    assert.ok(Array.isArray(paper.sections) && paper.sections.length > 1, `${item.slug} has no structured sections`);
    assert.ok(paper.sections.every((section) => Array.isArray(section.blocks)), `${item.slug} has invalid section blocks`);
    assert.ok(paper.questions.length > 0, `${item.slug} has no questions`);
    assert.ok(paper.questions.every((question) => question.type !== "generic"), `${item.slug} still has generic questions`);
    const ids = new Set(paper.questions.map((question) => question.id));
    assert.equal(ids.size, paper.questions.length, `${item.slug} has duplicate question ids`);
    assert.ok(paper.writing.promptA.length > 0, `${item.slug} has no writing prompt`);
    assert.ok(paper.writing.promptB.length > 0, `${item.slug} has no second writing prompt`);
    assert.ok(Array.isArray(paper.writingTasks) && paper.writingTasks.length > 0, `${item.slug} has no structured writing tasks`);
    assert.ok(paper.writingTasks.every((task) => !/请根据原卷写作部分的另一项要求/.test(task.prompt)), `${item.slug} has placeholder writing prompt`);
    assert.ok(paper.questions.every((question) => !/解析内容见对应解析版文件/.test(question.analysis)), `${item.slug} has fallback analysis`);
    for (const asset of paper.assets?.all ?? []) {
      assert.ok(fs.existsSync(`${process.cwd()}/public${asset}`), `${item.slug} missing asset ${asset}`);
    }
    for (const block of paper.sections.flatMap((section) => section.blocks ?? [])) {
      if (block.src) {
        assert.ok(fs.existsSync(`${process.cwd()}/public${block.src}`), `${item.slug} missing block asset ${block.src}`);
      }
    }
    if (item.audioAvailable) {
      assert.ok((paper.assets?.audio ?? []).length > 0, `${item.slug} should include audio`);
    }
    for (const audio of paper.assets?.audio ?? []) {
      assert.ok(fs.existsSync(`${process.cwd()}/public${audio}`), `${item.slug} missing audio ${audio}`);
    }
  }
});
