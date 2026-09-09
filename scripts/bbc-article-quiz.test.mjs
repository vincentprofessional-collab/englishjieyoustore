import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const data = JSON.parse(readFileSync(new URL('../src/data/bbc/150720-quiz.json', import.meta.url), 'utf8'));
const catalog = JSON.parse(readFileSync(new URL('../src/data/bbc/quiz-index.json', import.meta.url), 'utf8'));
test('150720 PDF quiz and exercise each retain all five source questions', () => {
  assert.equal(data.articleId, '150720');
  for (const group of [data.quiz, data.exercise]) {
    assert.deepEqual(group.map(q => q.number), [1, 2, 3, 4, 5]);
    assert.ok(group.every(q => q.prompt && q.answer));
  }
  assert.equal(data.source.questionPage, 2);
  assert.equal(data.source.answerPage, 3);
});
test('bold answer-page text maps to the source question numbers', () => {
  assert.deepEqual(data.quiz.map(q => q.answer), ['One week.', "False. The Old House School's headmaster encourages children to be computer-savvy from an early age.", 'Fred, a nine-year-old pupil at the Old Hall School.', 'In the US.', 'The latest.']);
  assert.deepEqual(data.exercise.map(q => q.answer), ['miss', 'spends', 'computer', 'pupils', 'similar']);
  assert.deepEqual(data.exercise.map(q => q.options.indexOf(q.answer)), [3, 2, 2, 0, 1]);
});
test('each exercise keeps four distinct options and exactly one source blank', () => {
  for (const q of data.exercise) {
    assert.equal(new Set(q.options).size, 4);
    assert.equal(q.options.filter(o => o === q.answer).length, 1);
    assert.equal(q.prompt.match(/_{2,}/g)?.length, 1);
  }
});

test('all source-faithful ready records retain five quiz and five exercise questions', () => {
  const readyRecords = catalog.filter((record) => record.status === 'ready');
  assert.equal(readyRecords.length, 475);
  assert.equal(catalog.find((record) => record.articleId === '260727')?.status, 'partial');
  for (const record of readyRecords) {
    assert.deepEqual(record.quiz.map((q) => q.number), [1, 2, 3, 4, 5], record.articleId);
    assert.deepEqual(record.exercise.map((q) => q.number), [1, 2, 3, 4, 5], record.articleId);
    if (record.matching?.length) {
      assert.ok(record.matching.length >= 1 && record.matching.length <= 5, record.articleId);
      assert.deepEqual(record.matching.map((q) => q.number), Array.from({ length: record.matching.length }, (_, index) => index + 1), record.articleId);
      for (const question of record.matching) assert.ok(question.options.includes(question.answer), `${record.articleId} matching ${question.number} answer`);
    }
    for (const question of record.exercise) {
      assert.ok(question.options.length >= 4, `${record.articleId} exercise ${question.number}`);
      assert.ok(question.options.includes(question.answer), `${record.articleId} exercise ${question.number} answer`);
    }
    for (const question of [...(record.matching ?? []), ...record.quiz, ...record.exercise]) {
      assert.doesNotMatch(question.prompt, /Page \d+ of \d+|词汇表|选择意思恰当/);
      assert.doesNotMatch(question.answer, /Page \d+ of \d+|词汇表/);
    }
  }
});

test('the generated 150720 record agrees with the submitted sample evidence', () => {
  const generated = catalog.find((record) => record.articleId === '150720');
  assert.deepEqual(generated.quiz.map((q) => q.answer), data.quiz.map((q) => q.answer));
  assert.deepEqual(generated.exercise.map((q) => q.answer), data.exercise.map((q) => q.answer));
});

test('BBC wrong-answer favorites use one stable source key and the existing storage path', () => {
  const helper = readFileSync(new URL('../src/lib/bbc-quiz-favorites.ts', import.meta.url), 'utf8');
  assert.match(helper, /ielts-platform\.favoriteQuestions/);
  assert.match(helper, /bbc-wrong:\$\{articleId\}:\$\{kind\}-\$\{questionNumber\}/);
  assert.match(helper, /status: "already-saved"/);
  assert.match(helper, /status: "failed"/);
});
