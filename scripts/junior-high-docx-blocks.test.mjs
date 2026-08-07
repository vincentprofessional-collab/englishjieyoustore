import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const inventory = JSON.parse(fs.readFileSync(path.join(root, "src/lib/junior-high/paper-inventory.json"), "utf8"));
const papers = [
  inventory.find((item) => item.year === 2024 && item.region === "天津"),
  inventory.find((item) => item.year === 2023 && item.region === "江苏"),
];

test("DOCX extraction keeps paragraphs, tables, and images in source order", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "junior-high-blocks-"));

  for (const item of papers) {
    assert.ok(item, "fixture paper should exist in inventory");
    const slug = `test-${item.year}-${item.region}`;
    const output = path.join(tempRoot, `${slug}.json`);
    const assets = path.join(tempRoot, slug);
    execFileSync("python3", [
      path.join(root, "scripts/extract-junior-high-paper.py"),
      "--original", item.originalPath,
      "--analysis", item.analysisPath,
      "--slug", slug,
      "--year", String(item.year),
      "--region", item.region,
      "--output", output,
      "--assets", assets,
    ], { cwd: root, stdio: "pipe" });

    const paper = JSON.parse(fs.readFileSync(output, "utf8"));
    assert.ok(Array.isArray(paper.sourceBlocks), `${slug} should expose source blocks`);
    assert.ok(paper.sourceBlocks.length > 2, `${slug} should expose multiple source blocks`);
    const kinds = paper.sourceBlocks.map((block) => block.kind);
    const tableIndex = kinds.indexOf("table");
    assert.ok(tableIndex > 0 && tableIndex < kinds.length - 1, `${slug} table should remain in document order`);
    assert.ok(paper.sourceBlocks.some((block) => block.kind === "image" && block.src), `${slug} should expose image URLs`);

    const mediaListing = execFileSync("unzip", ["-Z1", item.originalPath], { encoding: "utf8" });
    if (/word\/media\/[^\n]+\.wmf\s*$/im.test(mediaListing)) {
      assert.equal(paper.sourceBlocks.some((block) => /\.wmf$/i.test(block.src ?? "")), false, `${slug} should convert WMF media`);
      assert.ok((paper.assets?.all ?? []).some((asset) => /\.png$/i.test(asset)), `${slug} should publish converted PNG media`);
    }
  }
});
