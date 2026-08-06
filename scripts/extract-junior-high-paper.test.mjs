import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("generic extractor creates a paper and stops analysis at the next section", () => {
  const sourceDir = "/Users/shidianjin/Downloads/考试-中考/2023年中考英语试卷 121份/精品解析：2023年北京市中考英语真题";
  const original = path.join(sourceDir, "精品解析：2023年北京市中考英语真题（原卷版）.docx");
  const analysis = path.join(sourceDir, "精品解析：2023年北京市中考英语真题（解析版）.docx");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "junior-high-paper-"));
  const output = path.join(tempDir, "paper.json");
  const assets = path.join(tempDir, "assets");
  const result = spawnSync("python3", [
    "scripts/extract-junior-high-paper.py",
    "--original", original,
    "--analysis", analysis,
    "--slug", "test-beijing-2023",
    "--year", "2023",
    "--region", "北京",
    "--output", output,
    "--assets", assets,
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const paper = JSON.parse(fs.readFileSync(output, "utf8"));
  assert.equal(paper.year, 2023);
  assert.ok(paper.questions.length >= 37);
  const question37 = paper.questions.find((question) => question.number === 37);
  assert.ok(question37);
  assert.doesNotMatch(question37.analysis, /五、文段表达/);
  assert.ok(paper.writing.promptA.length > 0);
});
