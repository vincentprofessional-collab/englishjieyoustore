import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { isSeniorHighV2Set, validateSeniorHighV2Set } from "./senior_high_v2_schema.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_V1 = path.join(ROOT, "public", "senior-high", "catalog.json");
const SCHEMA = path.join(ROOT, "data", "senior-high", "schema", "v2.json");
const BASELINE = path.join(ROOT, "data", "senior-high", "audit", "v1-baseline-20260901.json");
const v1Catalog = JSON.parse(fs.readFileSync(PUBLIC_V1, "utf8"));
const v1Items = [...(v1Catalog.knowledge || []), ...(v1Catalog.practice || [])];

function optionText(item) {
  return (item.options || []).map((option) => option.text || "").join(" ");
}

function baselineStats() {
  const leak = /答案|解析|下一题|passage/i;
  return {
    itemCount: v1Items.length,
    oneOptionCount: v1Items.filter((item) => (item.options || []).length === 1).length,
    optionLeakCount: v1Items.filter((item) => leak.test(optionText(item))).length,
    longOptionCount: v1Items.filter((item) => (item.options || []).some((option) => (option.text || "").length > 500)).length,
    completePaperCount: (v1Catalog.papers || []).length,
  };
}

test("v1 catalog is rejected by the v2 gate", () => {
  assert.equal(isSeniorHighV2Set(v1Catalog), false);
  const result = validateSeniorHighV2Set(v1Catalog);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("schemaVersion")));
});

test("frozen v1 baseline defect counts stay visible after the live catalog is rebuilt", () => {
  const baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
  assert.deepEqual({
    itemCount: baseline.publicCatalog.itemCount,
    oneOptionCount: baseline.measuredDefects.oneOptionCount,
    optionLeakCount: baseline.measuredDefects.optionLeakCount,
    longOptionCount: baseline.measuredDefects.optionOver500CharactersCount,
    completePaperCount: baseline.measuredDefects.completePaperCount,
  }, {
    itemCount: 1183,
    oneOptionCount: 524,
    optionLeakCount: 467,
    longOptionCount: 441,
    completePaperCount: 0,
  });
  assert.equal(baseline.legacyValidationEvidence.reportedOk, true);
  assert.equal(baseline.legacyValidationEvidence.reportedPublishedItemCount, baseline.publicCatalog.itemCount);
  assert.ok(baselineStats().oneOptionCount < baseline.measuredDefects.oneOptionCount);
});

test("v2 schema artifact is versioned and does not describe the legacy catalog shape", () => {
  const schema = JSON.parse(fs.readFileSync(SCHEMA, "utf8"));
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.properties.schemaVersion.const, 2);
  assert.ok(schema.required.includes("sections"));
  assert.equal(schema.properties.knowledge, undefined);
  assert.equal(schema.properties.practice, undefined);
});

test("v2 rejects a one-option choice, leaked option, and dangling blank token", () => {
  const sourceRef = {
    sourceDocumentId: "doc-1",
    relativePath: "sample.docx",
    sha256: "a".repeat(64),
    locator: { page: 1 },
    extractionMethod: "docx-xml",
    confidence: 1,
  };
  const badSet = {
    schemaVersion: 2,
    id: "practice-bad",
    kind: "practice",
    title: "bad fixture",
    year: "2025",
    region: "北京",
    variant: "专项",
    instructions: [],
    assetRefs: [],
    sourceRefs: [sourceRef],
    quality: { structureStatus: "approved", structureConfidence: 1, issueCount: 0, issues: [] },
    sections: [{
      id: "section-1",
      title: "阅读",
      instructions: [],
      layout: "flow",
      groups: [{
        id: "group-1",
        instructions: [],
        stimulusBlocks: [{ type: "paragraph", runs: [{ type: "text", text: "Read." }] }],
        sharedOptions: [],
        questions: [{
          id: "q-1",
          displayNumber: 1,
          sourceQuestionNumber: 1,
          type: "single_choice",
          promptBlocks: [{ type: "paragraph", runs: [{ type: "blank", blankId: "missing" }] }],
          placement: { kind: "inline", blankIds: ["missing"] },
          options: [{ id: "A", label: "A", blocks: [{ type: "paragraph", runs: [{ type: "text", text: "答案：leak" }] }] }],
          blanks: [{ blankId: "missing" }],
          answerSpec: { availability: "answered", gradingMode: "auto", kind: "choice", acceptedAnswers: ["A"] },
          explanationBlocks: [],
          sourceRefs: [sourceRef],
          reviewStatus: "approved",
        }],
      }],
    }],
  };
  const result = validateSeniorHighV2Set(badSet);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("single_choice must have 2-6 options")));
  assert.ok(result.errors.some((error) => error.includes("answer/explanation/navigation leakage")));
});

test("v2 accepts explicit blocks, inline blank tokens, and unanswered manual questions", () => {
  const sourceRef = {
    sourceDocumentId: "doc-valid",
    relativePath: "sample.docx",
    sha256: "b".repeat(64),
    locator: { page: 2, paragraph: 4 },
    extractionMethod: "docx-xml",
    confidence: 0.98,
  };
  const paragraph = (text) => ({ type: "paragraph", runs: [{ type: "text", text }] });
  const set = {
    schemaVersion: 2,
    id: "practice-valid",
    kind: "practice",
    title: "valid fixture",
    year: "2025",
    region: "北京",
    variant: "专项",
    instructions: [paragraph("Choose the best answer.")],
    assetRefs: [],
    sourceRefs: [sourceRef],
    quality: { structureStatus: "approved", structureConfidence: 0.98, issueCount: 0, issues: [] },
    sections: [{
      id: "section-valid",
      title: "综合训练",
      instructions: [],
      layout: "flow",
      groups: [{
        id: "group-valid",
        instructions: [],
        stimulusBlocks: [paragraph("A short passage.")],
        sharedOptions: [],
        questions: [
          {
            id: "q-choice",
            displayNumber: 1,
            sourceQuestionNumber: 11,
            type: "single_choice",
            promptBlocks: [paragraph("What is the passage about?")],
            placement: { kind: "standalone" },
            options: [
              { id: "A", label: "A", blocks: [paragraph("Learning") ] },
              { id: "B", label: "B", blocks: [paragraph("Travel") ] },
            ],
            blanks: [],
            answerSpec: { availability: "answered", gradingMode: "auto", kind: "choice", acceptedAnswers: ["A"], normalization: { unicodeNfkc: true, trim: true, collapseSpaces: true, caseSensitive: false } },
            explanationBlocks: [],
            sourceRefs: [sourceRef],
            reviewStatus: "approved",
          },
          {
            id: "q-fill",
            displayNumber: 2,
            sourceQuestionNumber: 12,
            type: "inline_fill",
            promptBlocks: [{ type: "paragraph", runs: [{ type: "text", text: "The answer is " }, { type: "blank", blankId: "blank-q-fill" }, { type: "text", text: "." }] }],
            placement: { kind: "inline", blankIds: ["blank-q-fill"] },
            options: [],
            blanks: [{ blankId: "blank-q-fill", answerShape: "word" }],
            answerSpec: { availability: "answered", gradingMode: "auto", kind: "per_blank", perBlankAnswers: { "blank-q-fill": ["clear"] }, normalization: { unicodeNfkc: true, trim: true, collapseSpaces: true, caseSensitive: false } },
            explanationBlocks: [],
            sourceRefs: [sourceRef],
            reviewStatus: "approved",
          },
          {
            id: "q-manual",
            displayNumber: 3,
            sourceQuestionNumber: 13,
            type: "short_answer",
            promptBlocks: [paragraph("Explain your choice.")],
            placement: { kind: "standalone" },
            options: [],
            blanks: [],
            answerSpec: { availability: "none", gradingMode: "none", kind: "none" },
            explanationBlocks: [],
            sourceRefs: [sourceRef],
            reviewStatus: "approved",
          },
        ],
      }],
    }],
  };
  const result = validateSeniorHighV2Set(set);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.questionCount, 3);
});
