import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(path, imports) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, URL, require: (name) => {
    if (!(name in imports)) throw new Error(`Unexpected import ${name}`);
    return imports[name];
  } });
  return exports;
}

test('stored bilingual study examples need no cross-book lookup and never invent a translation', () => {
  const helper = load('../src/lib/vocabulary/study-examples.ts', {
    'server-only': {}, '@/data/vocabulary/workbook-usage-examples.json': {
      baby: { englishText: 'The baby sleeps.', chineseText: '婴儿睡着了。' },
    },
  });
  const original = { word: 'baby', englishExamples: [], englishExampleTranslations: [] };
  const result = helper.withExistingStudyExamples(original);
  assert.equal(result.englishExamples[0], 'The baby sleeps.');
  assert.equal(result.englishExampleTranslations[0], '婴儿睡着了。');
  assert.equal(original.englishExamples.length, 0);
  const unknown = helper.withExistingStudyExamples({ word: 'unknown', englishExamples: ['Existing.', 'No translation.'], englishExampleTranslations: ['已有译文。'] });
  assert.equal(unknown.englishExamples.length, 1);
  assert.equal(unknown.englishExampleTranslations[0], '已有译文。');
});

test('lookup includes new-concept and listening audio even when a workbook example exists; BBC remains member-only', async () => {
  const article = { id: '260810', year: 2026, title: 'BBC', sentences: [{ sentenceNo: 1, english: 'A baby smiles.', chinese: '婴儿笑了。', audioUrl: '/old.mp3' }] };
  const db = { from(table) {
    const data = table === 'transcript_sentences' ? [
      { id: 'l1', section_id: 's1', sentence_no: 1, english_text: 'This baby is happy.', chinese_text: '这个婴儿很开心。', audio_path: 'listening/l1.mp3' },
      { id: 'bad', section_id: 's1', sentence_no: 2, english_text: 'Another baby.', chinese_text: null, audio_path: 'listening/bad.mp3' },
    ] : [{ id: 's1', section_no: 1, tests: { test_no: 1, content_books: { code: 'cambridge-4', title: 'Cambridge 4' } } }];
    const query = { select() { return this; }, not() { return this; }, or() { return this; }, order() { return this; }, limit() { return this; }, in() { return this; }, then(resolve) { resolve({ data, error: null }); } };
    return query;
  } };
  const source = load('../src/lib/vocabulary/examples.ts', {
    '@/lib/articles/bbc': { BBC_ARTICLES: [article] },
    '@/lib/new-concept': { NEW_CONCEPT_LESSONS: [{ id: 'n1', kind: 'dialogue', audioPath: 'new-concept.mp3', bookCode: 'new-concept-1', lessonNo: 1, english: ['Where is the baby?'], chinese: ['婴儿在哪里？'] }] },
    '@/lib/new-concept-bilingual': { alignNewConceptParagraph: () => [] },
    '@/lib/new-concept-media': { getNewConceptMediaUrls: () => ({ sentenceAudioUrls: ['/audio/new-concept.mp3'] }) },
    '@/lib/supabase/client': { supabase: db },
    '@/lib/supabase/storage': { getPublicStorageUrl: (_bucket, path) => `/audio/${path}` },
    '@/lib/vocabulary/local-vocabulary': { normalizeLookupWord: (word) => word.trim().toLowerCase() },
    '@/data/vocabulary/workbook-usage-examples.json': { baby: { englishText: 'The baby sleeps.', chineseText: '婴儿睡着了。' } },
  });
  const rows = await source.getVocabularyUsageExamples('baby');
  assert.deepEqual(Array.from(rows, (row) => row.sourceType).sort(), ['article', 'listening', 'new-concept', 'workbook']);
  assert.ok(rows.filter((row) => row.sourceType !== 'workbook').every((row) => row.audioUrl && row.chineseText));
  assert.ok(rows.find((row) => row.bookCode === 'BBC').audioUrl.startsWith('/api/vocabulary-bbc-example-audio?'));

  let access = false;
  let denied = false;
  let lookups = 0;
  const hint = { word: 'baby', normalizedWord: 'baby', inflections: [] };
  const server = { createServerSupabaseClient: async () => ({ rpc: async (name, args) => {
    assert.equal(name, 'can_access_project'); assert.equal(args._project_key, 'bbc');
    return { data: access, error: denied ? new Error('unavailable') : null };
  } }) };
  const route = load('../src/app/api/vocabulary-hint/route.ts', {
    'next/server': { NextResponse: { json: (body) => body } },
    '@/lib/articles/bbc-vocabulary': { getBbcVocabularyDetail: () => null },
    '@/lib/supabase/server': server,
    '@/lib/vocabulary/examples': { ...source, getVocabularyUsageExamples: async (...args) => { lookups++; return source.getVocabularyUsageExamples(...args); } },
    '@/lib/vocabulary/phrases': { getVocabularyPhraseMatches: () => [] },
    '@/lib/vocabulary/local-vocabulary': { getVocabularyEntry: () => hint, getExtendedVocabularyEntry: () => hint, getVocabularyFormationParts: () => [] },
    '@/lib/vocabulary/lookup-etymology': { getVocabularyLookupEtymology: () => null },
    '@/lib/vocabulary/synonym-distinctions': { getVocabularySynonymDistinctions: () => [] },
  });
  const request = { url: 'https://local.invalid/api/vocabulary-hint?word=baby&detail=1' };
  assert.ok((await route.GET(request)).usageExamples.every((row) => row.bookCode !== 'BBC'));
  access = true;
  assert.ok((await route.GET(request)).usageExamples.some((row) => row.bookCode === 'BBC'));
  denied = true;
  assert.ok((await route.GET(request)).usageExamples.every((row) => row.bookCode !== 'BBC'));
  const before = lookups;
  assert.equal((await route.GET({ url: `${request.url}&study=1` })).usageExamples.length, 0);
  assert.equal(lookups, before);
});

test('BBC example playback verifies membership before reading metadata and uses the currently published clip', async () => {
  let access = false;
  let reads = 0;
  class Response {
    constructor(body, options) { this.body = body; this.status = options?.status ?? 200; }
    static redirect(url) { return { location: String(url), status: 307 }; }
  }
  const route = load('../src/app/api/vocabulary-bbc-example-audio/route.ts', {
    'next/server': { NextResponse: Response },
    '@/lib/articles/bbc': { getBbcArticleById: () => ({ year: 2026, sentences: [{ sentenceNo: 1, audioUrl: '/old.mp3' }] }) },
    '@/lib/articles/bbc-uploaded-content': { getUploadedBbcArticle: async () => { reads++; return { year: 2026, sentences: [{ sentenceNo: 1, audioUrl: '/current-clip.mp3' }] }; } },
    '@/lib/supabase/server': { createServerSupabaseClient: async () => ({ rpc: async () => ({ data: access, error: null }) }) },
  });
  const url = new URL('https://local.invalid/api/vocabulary-bbc-example-audio?article=260810&year=2026&sentence=1');
  const request = { nextUrl: url, url: String(url) };
  assert.equal((await route.GET(request)).status, 403);
  assert.equal(reads, 0);
  access = true;
  assert.equal((await route.GET(request)).location, 'https://local.invalid/current-clip.mp3');
});
