import assert from 'node:assert/strict';
import test from 'node:test';
import { selectVocabularyStudyGroup, vocabularyStudyGroupIndex, VOCABULARY_GROUP_SIZE } from '../src/lib/vocabulary/study-groups.ts';

test('571 words form 29 distinct groups, with 11 words in the final group and independent core/all selections', () => {
  const words = Array.from({ length: 571 }, (_, id) => ({ id }));
  const groups = Array.from({ length: Math.ceil(words.length / VOCABULARY_GROUP_SIZE) }, (_, index) => selectVocabularyStudyGroup(words, index));
  assert.equal(groups.length, 29);
  assert.ok(groups.slice(0, -1).every((group) => group.length === 20));
  assert.equal(groups.at(-1).length, 11);
  assert.deepEqual(groups.flat(), words);
  assert.deepEqual(selectVocabularyStudyGroup(words, null), words);
  assert.equal(selectVocabularyStudyGroup(words, 3)[0].id, 60);
  const selected = { core: 1, all: 28 };
  assert.equal(selectVocabularyStudyGroup(words.slice(0, 45), selected.core)[0].id, 20);
  assert.equal(selectVocabularyStudyGroup(words, selected.all)[0].id, 560);
  assert.equal(vocabularyStudyGroupIndex(99, 571), 28);
  assert.equal(vocabularyStudyGroupIndex(-1, 571), null);
  assert.equal(vocabularyStudyGroupIndex('1', 571), null);
  assert.equal(vocabularyStudyGroupIndex(undefined), null);
  assert.deepEqual(selectVocabularyStudyGroup([], 0), []);
});
