import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  BBC_2015_FREE_ARTICLE_IDS,
  BBC_2015_FREE_ARTICLE_START_DATE,
  isFreeBbc2015ArticleUnlocked,
  isFreeBbc2015AssetPath,
  getBbcAssetArticle,
} from "../src/lib/articles/bbc-free-access.mjs";

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
  assert.match(catalogSource, /Array\.from\(\{ length: 12 \}, \(_, index\) => 2026 - index\)/);
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

test("BBC 2015 articles unlock one each Monday from 150720, including audio assets", () => {
  const articles = readJson("src/data/bbc/2015/index.json");
  assert.deepEqual(BBC_2015_FREE_ARTICLE_IDS, articles.map((article) => article.id));
  assert.equal(BBC_2015_FREE_ARTICLE_START_DATE, "2026-10-12");
  assert.equal(isFreeBbc2015ArticleUnlocked("150720", new Date("2026-10-12T00:00:00Z")), true);
  assert.equal(isFreeBbc2015ArticleUnlocked("150727", new Date("2026-10-18T15:59:59Z")), false);
  assert.equal(isFreeBbc2015ArticleUnlocked("150727", new Date("2026-10-19T00:00:00Z")), true);
  assert.equal(isFreeBbc2015ArticleUnlocked("160104", new Date("2027-01-01T00:00:00Z")), false);
  assert.equal(isFreeBbc2015AssetPath("/api/bbc-audio/2015/150720/full-content.mp3", new Date("2026-10-12T00:00:00Z")), true);
  assert.equal(isFreeBbc2015AssetPath("/subtitles/bbc/2015/150727-bilingual.srt", new Date("2026-10-12T00:00:00Z")), false);
  assert.deepEqual(getBbcAssetArticle("/api/bbc-audio/2019/190101/full-content.mp3"), {
    articleId: "190101",
    year: 2019,
  });
});
