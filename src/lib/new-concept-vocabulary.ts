import {
  getVocabularyEntryForWordForm,
} from "@/lib/vocabulary/local-vocabulary";
import type { NewConceptLesson } from "@/lib/new-concept";

export type NewConceptVocabularyItem = {
  definitionLines: string[];
  level: string;
  partOfSpeech: string;
  phonetic: string;
  normalizedWord: string;
  ukAudioUrl: string;
  ukPhonetic: string;
  usAudioUrl: string;
  usPhonetic: string;
  word: string;
};

function escapeVocabularyTerm(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sourceContainsTerm(source: string, term: string) {
  const normalizedTerm = term.toLowerCase().replace(/’/g, "'").trim();

  if (!normalizedTerm) {
    return false;
  }

  return new RegExp(
    `(^|[^a-z])${escapeVocabularyTerm(normalizedTerm)}(?=$|[^a-z])`,
    "i",
  ).test(source);
}

function getArticleEnglishLines(lesson: NewConceptLesson) {
  return lesson.kind === "dialogue" ? lesson.english : lesson.exercise;
}

function getNewWordsAndExpressions(lesson: NewConceptLesson) {
  const source = lesson.vocabulary.join(" ").toLowerCase().replace(/[‘’]/g, "'");
  const articleWords = getArticleEnglishLines(lesson)
    .join(" ")
    .match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g) ?? [];
  const terms: string[] = [];
  const coveredWordIndexes = new Set<number>();

  for (let index = 0; index < articleWords.length; index += 1) {
    if (coveredWordIndexes.has(index)) {
      continue;
    }

    const maxLength = Math.min(4, articleWords.length - index);
    let matchedLength = 0;

    for (let length = maxLength; length >= 1; length -= 1) {
      const term = articleWords.slice(index, index + length).join(" ");
      const sourceTerm = term.replace(/['’]s$/i, "");

      if (sourceContainsTerm(source, term) || (sourceTerm !== term && sourceContainsTerm(source, sourceTerm))) {
        terms.push(sourceTerm);
        matchedLength = length;
        break;
      }
    }

    for (let offset = 0; offset < matchedLength; offset += 1) {
      coveredWordIndexes.add(index + offset);
    }
  }

  return [...new Set(terms.map((term) => term.toLowerCase().replace(/’/g, "'")))];
}

function getDictionaryEntryForTerm(term: string) {
  return getVocabularyEntryForWordForm(term) ??
    getVocabularyEntryForWordForm(term.split(/\s+/).find((word) => word.length > 1) ?? term);
}

export function getNewConceptVocabularyItems(lesson: NewConceptLesson) {
  return getNewWordsAndExpressions(lesson)
    .map((term) => {
      const entry = getDictionaryEntryForTerm(term);

      if (!entry || !entry.definitionLines.length) {
        return null;
      }

      return {
        definitionLines: entry.definitionLines.slice(0, 3),
        level: entry.level,
        normalizedWord: entry.normalizedWord,
        partOfSpeech: entry.partOfSpeech,
        phonetic: entry.phonetic,
        ukAudioUrl: entry.ukAudioUrl ?? "",
        ukPhonetic: entry.ukPhonetic ?? "",
        usAudioUrl: entry.usAudioUrl ?? "",
        usPhonetic: entry.usPhonetic ?? "",
        word: term,
      } satisfies NewConceptVocabularyItem;
    })
    .filter((item): item is NewConceptVocabularyItem => Boolean(item));
}
