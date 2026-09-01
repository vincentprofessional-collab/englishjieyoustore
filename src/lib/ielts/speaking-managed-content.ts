import type { SpeakingVocabulary } from "@/data/ielts/speaking-model-answers";
import type { SpeakingPartId } from "@/lib/ielts/speaking";

export type SpeakingAnswerBand = "band-7" | "band-8";

export type SpeakingEditableContent = {
  answer: string[];
  answerHeading: string;
  answerTranslation: string[];
  approach: string;
  audioUrl: string;
  band: SpeakingAnswerBand;
  followUp: string;
  frames: string[];
  heroLabel: string;
  partId: SpeakingPartId;
  partLabel: string;
  question: string;
  questionId: string;
  questionTranslation: string;
  slug: string;
  timing: string;
  vocabulary: SpeakingVocabulary[];
  year: string;
};

export type SpeakingManagedContentResponse = {
  page: {
    metaJson: unknown;
    summary: string | null;
    title: string | null;
  } | null;
  sections: Array<{
    contentJson: unknown;
    sectionKey: string;
    sortOrder: number;
    title: string | null;
  }>;
};

export type SpeakingManagedSectionInput = {
  contentJson: Record<string, unknown>;
  sectionKey: string;
  sortOrder: number;
  title: string;
};

const speakingSlugPattern = /^speaking-part-[123]-speaking-part-[123]-[a-z0-9-]+-band-[78]$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function cleanStringList(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => cleanText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function cleanVocabulary(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      return {
        note: cleanText(item.note, 260),
        phrase: cleanText(item.phrase, 160),
        translation: cleanText(item.translation, 160),
      };
    })
    .filter((item): item is SpeakingVocabulary => {
      return Boolean(item && (item.phrase || item.translation || item.note));
    })
    .slice(0, 16);
}

function readString(section: unknown, key: string, maxLength: number) {
  if (!isRecord(section) || typeof section[key] !== "string") {
    return null;
  }

  const value = cleanText(section[key], maxLength);
  return value || null;
}

function readStringList(section: unknown, key: string, maxItems: number, maxLength: number) {
  if (!isRecord(section)) {
    return null;
  }

  const value = cleanStringList(section[key], maxItems, maxLength);
  return value.length ? value : null;
}

function readVocabulary(section: unknown) {
  if (!isRecord(section)) {
    return null;
  }

  const value = cleanVocabulary(section.items);
  return value.length ? value : null;
}

function isSpeakingPartId(value: unknown): value is SpeakingPartId {
  return value === "part-1" || value === "part-2" || value === "part-3";
}

function isSpeakingAnswerBand(value: unknown): value is SpeakingAnswerBand {
  return value === "band-7" || value === "band-8";
}

export function getSpeakingContentSlug(
  partId: SpeakingPartId,
  questionId: string,
  band: SpeakingAnswerBand,
) {
  return `speaking-${partId}-${questionId}-${band}`;
}

export function isSpeakingContentSlug(slug: string) {
  return speakingSlugPattern.test(slug);
}

export function buildSpeakingManagedSections(
  content: SpeakingEditableContent,
): SpeakingManagedSectionInput[] {
  return [
    {
      contentJson: {
        answerHeading: content.answerHeading,
        band: content.band,
        followUp: content.followUp,
        heroLabel: content.heroLabel,
        partId: content.partId,
        partLabel: content.partLabel,
        question: content.question,
        questionId: content.questionId,
        timing: content.timing,
        translation: content.questionTranslation,
        year: content.year,
      },
      sectionKey: "basic_info",
      sortOrder: 10,
      title: "基础信息",
    },
    {
      contentJson: { text: content.approach },
      sectionKey: "high_score_idea",
      sortOrder: 30,
      title: "高分思路",
    },
    {
      contentJson: { items: content.frames },
      sectionKey: "sentence_patterns",
      sortOrder: 40,
      title: "万能句型",
    },
    {
      contentJson: { items: content.vocabulary },
      sectionKey: "vocabulary",
      sortOrder: 50,
      title: "重点词汇和短语",
    },
    {
      contentJson: { paragraphs: content.answer },
      sectionKey: "sample_answer",
      sortOrder: 60,
      title: "口语范文",
    },
    {
      contentJson: { paragraphs: content.answerTranslation },
      sectionKey: "translation",
      sortOrder: 70,
      title: "中文翻译",
    },
    {
      contentJson: { url: content.audioUrl },
      sectionKey: "audio",
      sortOrder: 80,
      title: "音频",
    },
  ];
}

export function applySpeakingManagedContent(
  initialContent: SpeakingEditableContent,
  managedContent: SpeakingManagedContentResponse,
) {
  if (!managedContent.page) {
    return initialContent;
  }

  const next: SpeakingEditableContent = {
    ...initialContent,
    answer: [...initialContent.answer],
    answerTranslation: [...initialContent.answerTranslation],
    frames: [...initialContent.frames],
    vocabulary: initialContent.vocabulary.map((item) => ({ ...item })),
  };

  if (managedContent.page.title) {
    next.question = managedContent.page.title;
  }

  const sectionsByKey = new Map<string, unknown>(
    managedContent.sections.map((section) => [section.sectionKey, section.contentJson]),
  );
  const basicInfo = sectionsByKey.get("basic_info");

  next.question = readString(basicInfo, "question", 500) ?? next.question;
  next.questionTranslation =
    readString(basicInfo, "translation", 500) ?? next.questionTranslation;
  next.followUp = readString(basicInfo, "followUp", 900) ?? next.followUp;
  next.year = readString(basicInfo, "year", 120) ?? next.year;

  next.approach =
    readString(sectionsByKey.get("high_score_idea"), "text", 2600) ?? next.approach;
  next.frames =
    readStringList(sectionsByKey.get("sentence_patterns"), "items", 16, 420) ?? next.frames;
  next.vocabulary = readVocabulary(sectionsByKey.get("vocabulary")) ?? next.vocabulary;
  next.answer =
    readStringList(sectionsByKey.get("sample_answer"), "paragraphs", 12, 2200) ?? next.answer;
  next.answerTranslation =
    readStringList(sectionsByKey.get("translation"), "paragraphs", 12, 2200) ??
    next.answerTranslation;
  next.audioUrl = readString(sectionsByKey.get("audio"), "url", 2000) ?? next.audioUrl;

  return next;
}

export function normalizeSpeakingEditableContent(value: unknown): SpeakingEditableContent | null {
  if (!isRecord(value)) {
    return null;
  }

  const partId = value.partId;
  const band = value.band;

  if (!isSpeakingPartId(partId) || !isSpeakingAnswerBand(band)) {
    return null;
  }

  const questionId = cleanText(value.questionId, 120);
  const slug = cleanText(value.slug, 220);

  if (!questionId || !isSpeakingContentSlug(slug)) {
    return null;
  }

  if (slug !== getSpeakingContentSlug(partId, questionId, band)) {
    return null;
  }

  const answerHeading = band === "band-8" ? "8 分范文" : "7 分范文";
  const heroLabel = band === "band-8" ? "BAND 8 MODEL ANSWER" : "BAND 7 MODEL ANSWER";

  return {
    answer: cleanStringList(value.answer, 12, 2200),
    answerHeading,
    answerTranslation: cleanStringList(value.answerTranslation, 12, 2200),
    approach: cleanText(value.approach, 2600),
    audioUrl: cleanText(value.audioUrl, 2000),
    band,
    followUp: cleanText(value.followUp, 900),
    frames: cleanStringList(value.frames, 16, 420),
    heroLabel,
    partId,
    partLabel: cleanText(value.partLabel, 80) || (partId === "part-1" ? "Part 1" : partId === "part-2" ? "Part 2" : "Part 3"),
    question: cleanText(value.question, 500) || "Untitled speaking question",
    questionId,
    questionTranslation: cleanText(value.questionTranslation, 500),
    slug,
    timing: cleanText(value.timing, 120),
    vocabulary: cleanVocabulary(value.vocabulary),
    year: cleanText(value.year, 120),
  };
}
