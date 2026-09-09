import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));

const expected2026ArticleIds = [
  "260105", "260112", "260119", "260126", "260202", "260209", "260216", "260223",
  "260302", "260309", "260316", "260323", "260330", "260406", "260413", "260420",
  "260427", "260504", "260511", "260518", "260525", "260601", "260608", "260615",
  "260622", "260629", "260713", "260720", "260727",
];

test("BBC 2026 release keeps the complete source-faithful article set", () => {
  const articles = readJson("src/data/bbc/2026/index.json");

  assert.deepEqual(articles.map((article) => article.id), expected2026ArticleIds);
  assert.equal(articles.flatMap((article) => article.vocabulary).length, 770);

  for (const article of articles) {
    assert.equal(article.year, 2026, article.id);
    assert.equal(article.fullAudioFile, "full-content.mp3", article.id);
    assert.ok(article.paragraphs.length > 0, article.id);
    assert.equal(article.paragraphs.length, article.chineseParagraphs.length, article.id);
    assert.ok(article.chineseParagraphs.every((paragraph) => /[\u3400-\u9fff]/u.test(paragraph)), article.id);
    assert.ok(article.sentences.length > 0, article.id);
    assert.ok(article.sentences.every((sentence) => sentence.audioFile.endsWith(".mp3")), article.id);
    assert.ok(article.sentences.every((sentence) => sentence.english && sentence.chinese), article.id);
    assert.ok(article.vocabulary.every((item) => item.highlight === true && item.sourceLevel === "四级"), article.id);

    const standaloneArticle = readJson(`src/data/bbc/2026/${article.id}.json`);
    assert.deepEqual(standaloneArticle, article, `${article.id} standalone file differs from index`);
  }
});

test("BBC 2026 remains wired into the article catalog and learning modules", () => {
  const catalogSource = read("src/lib/articles/bbc.ts");
  const detailSource = read("src/components/bbc-article-detail-page.tsx");
  const vocabularySource = read("src/lib/articles/bbc-vocabulary.ts");
  const localVocabularySource = read("src/lib/vocabulary/local-vocabulary.ts");

  assert.match(catalogSource, /import bbc2026Articles from "@\/data\/bbc\/2026\/index\.json"/);
  assert.match(catalogSource, /\.\.\.bbc2026Articles/);
  assert.match(catalogSource, /Array\.from\(\{ length: 12 \}, \(_, index\) => 2015 \+ index\)/);
  assert.match(detailSource, /BbcArticleQuiz/);
  assert.match(detailSource, /BbcSentencePractice/);
  assert.match(detailSource, /getBbcArticleContentOverride/);
  assert.match(vocabularySource, /getVocabularyBaseEntryForWordForm/);
  assert.match(vocabularySource, /getBbcVocabularyEntryForWordForm/);
  assert.match(localVocabularySource, /export function getVocabularyBaseEntryForWordForm/);
  assert.match(localVocabularySource, /export function getVocabularyEntryForWordForm/);
});

test("BBC source quiz and wrong-answer collection stay in the release", () => {
  const quizCatalog = readJson("src/data/bbc/quiz-index.json");
  const readyRecords = quizCatalog.filter((record) => record.status === "ready");
  const favoriteSource = read("src/lib/bbc-quiz-favorites.ts");

  assert.equal(readyRecords.length, 475);
  assert.equal(quizCatalog.find((record) => record.articleId === "260727")?.status, "partial");
  assert.match(favoriteSource, /ielts-platform\.favoriteQuestions/);
  assert.match(favoriteSource, /bbc-wrong:\$\{articleId\}:\$\{kind\}-\$\{questionNumber\}/);
});
