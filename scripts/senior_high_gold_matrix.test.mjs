import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");
const matrix = JSON.parse(fs.readFileSync(path.join(ROOT, "data/senior-high/audit/gold-matrix.json"), "utf8"));
const inventory = new Map();
for (const row of fs.readFileSync(path.join(ROOT, "data/senior-high/audit/inventory.csv"), "utf8").split(/\r?\n/).slice(1)) {
  const fields = row.split(",");
  if (fields.length >= 2 && fields[1]) inventory.set(fields[1], fields);
}
const checkpointPath = path.join(ROOT, "data/senior-high/audit/document-ir.checkpoint.json");
const checkpoint = fs.existsSync(checkpointPath) ? JSON.parse(fs.readFileSync(checkpointPath, "utf8")) : null;

function checkpointFor(relativePath) {
  assert.ok(checkpoint, "full local DocumentIR checkpoint is not available");
  const row = inventory.get(relativePath);
  assert.ok(row, `gold source missing from inventory: ${relativePath}`);
  const digest = row[6];
  const record = checkpoint.records[digest];
  assert.ok(record, `gold source missing from DocumentIR checkpoint: ${relativePath}`);
  assert.equal(record.status, "ok", `gold source is not readable: ${relativePath}`);
  return record;
}

test("gold matrix contains paired real papers, practice families, legacy and media samples", () => {
  assert.equal(matrix.status, "phase_1_source_locked");
  assert.ok(matrix.samples.length >= 15);
  assert.ok(matrix.samples.some((sample) => sample.id === "paper-2025-new-gaokao-i" && sample.sources.length === 3));
  assert.ok(matrix.samples.some((sample) => sample.assertions.includes("regional_legacy_type")));
  assert.ok(matrix.samples.some((sample) => sample.assertions.includes("safe_zip_expansion")));
});

test("every gold source is present in the current inventory and DocumentIR checkpoint", () => {
  const paths = matrix.samples.flatMap((sample) => sample.sources);
  assert.equal(new Set(paths).size, paths.length);
  for (const relativePath of paths) {
    assert.ok(inventory.has(relativePath), `gold source missing from inventory: ${relativePath}`);
    if (checkpoint) checkpointFor(relativePath);
  }
});

test("gold DocumentIR preserves tables, embedded assets, PDF coordinates, media and ZIP virtual sources", (context) => {
  if (!checkpoint) return context.skip("full local DocumentIR checkpoint is intentionally not committed");
  const find = (id) => matrix.samples.find((sample) => sample.id === id).sources[0];
  const newI = checkpointFor(find("paper-2025-new-gaokao-i"));
  assert.ok(newI.content.tableCount >= 1);
  assert.ok(newI.content.assets.length >= 1);
  const pdf = checkpointFor(find("reference-5-3-seven-choice-pdf"));
  assert.ok(pdf.content.pageCount > 1);
  assert.ok(pdf.content.pages[0].blocks[0].bbox.length === 4);
  const zip = checkpointFor(find("archive-seven-choice-2019-2021"));
  assert.equal(zip.content.memberCount, 2);
  assert.equal(zip.content.expandedMembers.filter((member) => member.virtualSource).length, 2);
  const audio = checkpointFor(matrix.samples.find((sample) => sample.id === "practice-guangdong-speaking-test-c").sources[1]);
  assert.equal(audio.content.assets[0].kind, "audio");
});
