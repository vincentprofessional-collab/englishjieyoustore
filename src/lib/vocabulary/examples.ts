import { BBC_ARTICLES } from "@/lib/articles/bbc";
import { NEW_CONCEPT_LESSONS } from "@/lib/new-concept";
import { alignNewConceptParagraph } from "@/lib/new-concept-bilingual";
import { getNewConceptMediaUrls } from "@/lib/new-concept-media";
import { supabase } from "@/lib/supabase/client";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { normalizeLookupWord } from "@/lib/vocabulary/local-vocabulary";

export type VocabularyUsageExample = {
  audioUrl: string | null;
  bookCode: string;
  chineseText: string;
  englishText: string;
  id: string;
  sentenceNo: number;
  sourceId: string;
  sourceTitle: string;
  sourceType: "new-concept" | "listening" | "reading" | "article" | "manual";
  testNo: number;
};

type TranscriptSentenceRow = {
  audio_path: string | null;
  chinese_text: string | null;
  english_text: string;
  id: string;
  section_id: string;
  sentence_no: number;
};

type ContentBookRow = {
  code: string;
  title: string | null;
};

type TestRow = {
  content_books: ContentBookRow[] | ContentBookRow | null;
  test_no: number;
  title: string | null;
};

type SectionRow = {
  id: string;
  section_no: number;
  tests: TestRow[] | TestRow | null;
  title: string | null;
};

function pickOne<T>(value: T[] | T | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getWordSearchPattern(word: string) {
  return `%${word.replace(/[%_]/g, "\\$&")}%`;
}

function isConsonantVowelConsonant(word: string) {
  return /^[a-z]*[^aeiou][aeiou][^aeiouwxy]$/i.test(word);
}

function getExampleMatchForms(word: string, explicitForms: string[] = []) {
  const normalizedWord = normalizeLookupWord(word);
  const forms = new Set<string>();

  if (!normalizedWord) {
    return forms;
  }

  forms.add(normalizedWord);
  for (const form of explicitForms) {
    const normalizedForm = normalizeLookupWord(form);

    if (normalizedForm) {
      forms.add(normalizedForm);
    }
  }

  if (normalizedWord.length <= 2) {
    return forms;
  }

  if (/[^aeiou]y$/i.test(normalizedWord)) {
    forms.add(`${normalizedWord.slice(0, -1)}ies`);
    forms.add(`${normalizedWord.slice(0, -1)}ied`);
  } else if (/(s|x|z|ch|sh)$/i.test(normalizedWord)) {
    forms.add(`${normalizedWord}es`);
    forms.add(`${normalizedWord}ed`);
  } else if (normalizedWord.endsWith("e")) {
    forms.add(`${normalizedWord}s`);
    forms.add(`${normalizedWord}d`);
    forms.add(`${normalizedWord.slice(0, -1)}ing`);
  } else {
    forms.add(`${normalizedWord}s`);
    forms.add(`${normalizedWord}ed`);
    forms.add(`${normalizedWord}ing`);
  }

  if (isConsonantVowelConsonant(normalizedWord)) {
    const doubledWord = `${normalizedWord}${normalizedWord.at(-1)}`;

    forms.add(`${doubledWord}ed`);
    forms.add(`${doubledWord}ing`);
  }

  return forms;
}

function matchesUsageExampleWord(text: string, wordForms: Set<string>) {
  const tokens = text.toLowerCase().match(/[a-z]+(?:['’-][a-z]+)?/g) ?? [];

  return tokens.some((token) => wordForms.has(normalizeLookupWord(token)));
}

function getBbcUsageExamples(wordForms: Set<string>, limit: number) {
  const examples: VocabularyUsageExample[] = [];
  const seenSentences = new Set<string>();

  for (
    let articleIndex = BBC_ARTICLES.length - 1;
    articleIndex >= 0 && examples.length < limit;
    articleIndex -= 1
  ) {
    const article = BBC_ARTICLES[articleIndex];

    for (const sentence of article.sentences ?? []) {
      const sentenceKey = sentence.english.toLowerCase().replace(/\s+/g, " ").trim();

      if (
        !sentence.audioUrl ||
        seenSentences.has(sentenceKey) ||
        !matchesUsageExampleWord(sentence.english, wordForms)
      ) {
        continue;
      }

      seenSentences.add(sentenceKey);
      examples.push({
        audioUrl: sentence.audioUrl,
        bookCode: "BBC",
        chineseText: sentence.chinese,
        englishText: sentence.english,
        id: `bbc:${article.id}:sentence:${sentence.sentenceNo}`,
        sentenceNo: sentence.sentenceNo,
        sourceId: article.id,
        sourceTitle: `BBC ${article.year} · ${article.title}`,
        sourceType: "article",
        testNo: 0,
      });

      if (examples.length >= limit) {
        break;
      }
    }
  }

  return examples;
}

function getNewConceptUsageExamples(wordForms: Set<string>, limit: number) {
  const examples: VocabularyUsageExample[] = [];
  const seenSentences = new Set<string>();

  for (const lesson of NEW_CONCEPT_LESSONS) {
    if (examples.length >= limit || lesson.kind !== "dialogue" || !lesson.audioPath) continue;

    const matchingIndexes = lesson.english.flatMap((line, index) =>
      matchesUsageExampleWord(line, wordForms) ? [index] : [],
    );
    if (!matchingIndexes.length) continue;

    const { sentenceAudioUrls } = getNewConceptMediaUrls(lesson);
    const chineseLines = lesson.bookCode === "new-concept-2"
      ? alignNewConceptParagraph(
          lesson.english,
          lesson.fullChineseTranslation ?? lesson.chinese[0] ?? "",
          lesson.lessonNo,
        )
      : lesson.chinese;

    for (const sentenceIndex of matchingIndexes) {
      const englishText = lesson.english[sentenceIndex]?.trim() ?? "";
      const normalizedText = englishText.toLowerCase().replace(/\s+/g, " ");
      const audioUrl = sentenceAudioUrls[sentenceIndex] ?? null;
      if (!englishText || !audioUrl || seenSentences.has(normalizedText)) continue;

      seenSentences.add(normalizedText);
      examples.push({
        audioUrl,
        bookCode: lesson.bookCode === "new-concept-2" ? "NEW_CONCEPT_2" : "NEW_CONCEPT_1",
        chineseText: chineseLines[sentenceIndex] ?? "",
        englishText,
        id: `new-concept:${lesson.id}:sentence:${sentenceIndex + 1}`,
        sentenceNo: sentenceIndex + 1,
        sourceId: lesson.id,
        sourceTitle: `新概念英语${lesson.bookCode === "new-concept-2" ? "第二册" : "第一册"} · Lesson ${lesson.lessonNo}${lesson.title ? ` ${lesson.title}` : ""}`,
        sourceType: "new-concept",
        testNo: 0,
      });

      if (examples.length >= limit) break;
    }
  }

  return examples;
}

export function prioritizeVocabularyUsageExamples(...groups: VocabularyUsageExample[][]) {
  const examples: VocabularyUsageExample[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const example of group) {
      if (example.bookCode === "BBC" && !example.audioUrl) continue;
      const normalizedText = example.englishText.toLowerCase().replace(/\s+/g, " ").trim();
      const key = normalizedText || example.id;
      if (seen.has(key)) continue;
      seen.add(key);
      examples.push(example);
    }
  }

  return examples;
}

export async function getVocabularyUsageExamples(
  word: string,
  limit = 5,
  explicitForms: string[] = [],
) {
  const normalizedWord = normalizeLookupWord(word);
  const wordForms = getExampleMatchForms(normalizedWord, explicitForms);
  const maximumExamples = Math.min(Math.max(limit, 0), 5);

  if (!normalizedWord || maximumExamples === 0) {
    return [];
  }

  const newConceptExamples = getNewConceptUsageExamples(wordForms, maximumExamples);
  const listeningLimit = maximumExamples - newConceptExamples.length;

  if (listeningLimit === 0) return newConceptExamples;

  const { data: transcriptRows, error: transcriptError } = await supabase
    .from("transcript_sentences")
    .select("id,section_id,sentence_no,english_text,chinese_text,audio_path")
    .or(
      [...wordForms]
        .slice(0, 12)
        .map((form) => `english_text.ilike.${getWordSearchPattern(form)}`)
        .join(","),
    )
    .order("sentence_no", { ascending: true })
    .limit(listeningLimit * 6);

  if (transcriptError || !transcriptRows?.length) {
    return prioritizeVocabularyUsageExamples(
      newConceptExamples,
      getBbcUsageExamples(wordForms, listeningLimit),
    ).slice(0, maximumExamples);
  }

  const sentences = (transcriptRows as TranscriptSentenceRow[])
    .filter((sentence) => sentence.audio_path && matchesUsageExampleWord(sentence.english_text, wordForms))
    .slice(0, listeningLimit);

  if (sentences.length === 0) {
    return prioritizeVocabularyUsageExamples(
      newConceptExamples,
      getBbcUsageExamples(wordForms, listeningLimit),
    ).slice(0, maximumExamples);
  }

  const sectionIds = [...new Set(sentences.map((sentence) => sentence.section_id).filter(Boolean))];
  const { data: sectionRows } = await supabase
    .from("test_sections")
    .select(
      `
        id,
        section_no,
        title,
        tests (
          test_no,
          title,
          content_books (
            code,
            title
          )
        )
      `,
    )
    .in("id", sectionIds);
  const sectionMap = new Map((sectionRows as SectionRow[] | null | undefined)?.map((section) => [section.id, section]) ?? []);

  const listeningExamples = sentences.map((sentence) => {
    const section = sectionMap.get(sentence.section_id);
    const test = pickOne(section?.tests);
    const book = pickOne(test?.content_books);
    const sourceTitle = [
      book?.title || book?.code,
      test?.test_no ? `Test ${test.test_no}` : test?.title,
      section?.section_no ? `Section ${section.section_no}` : section?.title,
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      audioUrl: getPublicStorageUrl("audio", sentence.audio_path),
      bookCode: book?.code ?? "listening",
      chineseText: sentence.chinese_text ?? "",
      englishText: sentence.english_text,
      id: sentence.id,
      sentenceNo: sentence.sentence_no,
      sourceId: sentence.section_id,
      sourceTitle: sourceTitle || "雅思听力例句",
      sourceType: "listening" as const,
      testNo: test?.test_no ?? 0,
    };
  });

  const prioritizedExamples = prioritizeVocabularyUsageExamples(newConceptExamples, listeningExamples);
  return prioritizeVocabularyUsageExamples(
    prioritizedExamples,
    getBbcUsageExamples(wordForms, maximumExamples - prioritizedExamples.length),
  ).slice(0, maximumExamples);
}
