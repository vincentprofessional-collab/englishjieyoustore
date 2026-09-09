import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const articles = JSON.parse(readFileSync(new URL("../src/data/bbc/2026/index.json", import.meta.url), "utf8"));

test("BBC 2026 keeps all 29 source articles bilingual", () => {
  assert.equal(articles.length, 29);
  assert.ok(articles.every((article) => article.id.startsWith("26")));
  assert.ok(articles.every((article) => article.paragraphs.length > 0));
  assert.ok(articles.every((article) => article.paragraphs.length === article.chineseParagraphs.length));
  assert.ok(articles.every((article) => article.chineseParagraphs.every((paragraph) => /[\u3400-\u9fff]/.test(paragraph))));
});

test("BBC 2026 vocabulary is retained as CET-4-or-higher source vocabulary", () => {
  const vocabulary = articles.flatMap((article) => article.vocabulary);
  assert.equal(vocabulary.length, 770);
  assert.ok(vocabulary.every((item) => item.sourceLevel === "四级" && item.highlight === true));
  assert.ok(vocabulary.every((item) => item.term && item.entry && item.example && item.translation));
});

test("BBC 2026 has one local full-content audio asset per article", () => {
  for (const article of articles) {
    assert.equal(existsSync(new URL(`../public/audio/bbc/2026/${article.id}/full-content.mp3`, import.meta.url)), true, article.id);
  }
  assert.equal(readdirSync(new URL("../public/audio/bbc/2026", import.meta.url)).length, 29);
});

test("BBC 2026 exposes one local sentence audio asset for every transcript sentence", () => {
  for (const article of articles) {
    assert.ok(article.sentences.length > 0, article.id);
    for (const sentence of article.sentences) {
      assert.equal(
        existsSync(new URL(`../public/audio/bbc/2026/${article.id}/${sentence.audioFile}`, import.meta.url)),
        true,
        `${article.id} sentence ${sentence.sentenceNo}`,
      );
    }
  }
});

test("BBC vocabulary applies the level gate to inflected forms through their base entry", () => {
  const source = readFileSync(new URL("../src/lib/articles/bbc-vocabulary.ts", import.meta.url), "utf8");
  assert.match(source, /getVocabularyBaseEntryForWordForm/);
  assert.match(source, /function getBbcVocabularyEntryForWordForm/);
  assert.match(source, /const baseEntry = getVocabularyBaseEntryForWordForm\(value\)/);
  assert.match(source, /return getVocabularyEntryForWordForm\(value\)/);
});
