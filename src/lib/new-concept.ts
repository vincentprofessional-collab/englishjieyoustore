import levelOneData from "@/data/new-concept/level-1.json";
import { getPublicStorageUrl } from "@/lib/supabase/storage";

export type NewConceptLesson = {
  audioFile: string | null;
  audioPath: string | null;
  chinese: string[];
  exercise: string[];
  id: string;
  kind: "dialogue" | "written-exercise";
  lessonNo: number;
  prompt: string;
  sourceNotesPdfPage: number;
  sourcePdfPage: number;
  title: string;
  titleChinese: string;
  vocabulary: string[];
  english: string[];
};

export type NewConceptBook = {
  bookCode: string;
  edition: string;
  lessons: NewConceptLesson[];
  pageMapNote: string;
  sourceLabel: string;
  sourcePdf: string;
  title: string;
};

const RAW_NEW_CONCEPT_BOOK = levelOneData as NewConceptBook;

const OCR_ARTIFACT_LINE_INDEXES: Record<number, number[]> = {
  25: [0, 1, 2, 3, 4, 5, 6, 7],
  27: [0],
  33: [0, 1, 2],
  39: [0],
  67: [0],
  77: [0, 1, 2, 3, 4],
  101: [0, 1],
  103: [0],
  113: [0],
  127: [0],
  133: [0],
  137: [0, 1, 2],
  139: [0],
  141: [0, 1, 2, 3],
};

function normalizeNewConceptEnglishLine(value: string) {
  return value
    .replace(/\s+[EFJk]\s*$/g, "")
    .replace(/Y\.H\.A\./g, "YHA")
    .replace(/D\.N\./g, "DN")
    .replace(/\bIam\b/g, "I am")
    .replace(/\bTleft\b/g, "I left")
    .replace(/\bIthink\b/g, "I think")
    .replace(/\bTcome\b/g, "I come")
    .replace(/\bThave\b/g, "I have")
    .replace(/\bTm\b/g, "I'm")
    .replace(/\bTve\b/g, "I've")
    .replace(/\bT'm\b/g, "I'm")
    .replace(/\bMy wife and J\b/g, "My wife and I")
    .replace(/\bThis is the school building\. k\b/g, "This is the school building.")
    .trim();
}

function normalizeNewConceptLesson(lesson: NewConceptLesson) {
  const artifacts = new Set(OCR_ARTIFACT_LINE_INDEXES[lesson.lessonNo] ?? []);

  return {
    ...lesson,
    english: lesson.english
      .filter((_, index) => !artifacts.has(index))
      .map(normalizeNewConceptEnglishLine),
  };
}

// The learning route intentionally contains only the odd-numbered dialogue
// lessons that have the supplied American-English recordings. The scanned
// book data remains complete in level-1.json for source traceability.
export const NEW_CONCEPT_LESSONS = RAW_NEW_CONCEPT_BOOK.lessons.filter(
  (lesson) => lesson.kind === "dialogue" && Boolean(lesson.audioPath),
).map(normalizeNewConceptLesson);
export const NEW_CONCEPT_BOOK: NewConceptBook = {
  ...RAW_NEW_CONCEPT_BOOK,
  lessons: NEW_CONCEPT_LESSONS,
};
export const NEW_CONCEPT_UNITS = Array.from({ length: 6 }, (_, index) => {
  const start = index * 24 + 1;
  const end = Math.min(start + 23, NEW_CONCEPT_LESSONS.length);

  return {
    end,
    lessons: NEW_CONCEPT_LESSONS.filter(
      (lesson) => lesson.lessonNo >= start && lesson.lessonNo <= end,
    ),
    start,
    unit: index + 1,
  };
});

export function getNewConceptLessonById(lessonId: string) {
  return NEW_CONCEPT_LESSONS.find((lesson) => lesson.id === lessonId);
}

export function getNewConceptAudioUrl(lesson: NewConceptLesson) {
  if (!lesson.audioPath) {
    return null;
  }

  const configuredBaseUrl = process.env.NEXT_PUBLIC_NEW_CONCEPT_AUDIO_BASE_URL?.replace(/\/+$/, "");
  if (configuredBaseUrl) {
    return `${configuredBaseUrl}/${lesson.audioPath.split("/").map(encodeURIComponent).join("/")}`;
  }

  if (process.env.NODE_ENV !== "production") {
    return `/audio/new-concept/book1/${encodeURIComponent(lesson.audioFile ?? "")}`;
  }

  return getPublicStorageUrl("audio", lesson.audioPath);
}

export function getNewConceptSentenceAudioUrl(lesson: NewConceptLesson, sentenceIndex: number) {
  if (!lesson.audioPath || lesson.kind !== "dialogue") {
    return null;
  }

  const lessonCode = String(lesson.lessonNo).padStart(3, "0");
  const sentenceCode = String(sentenceIndex + 1).padStart(2, "0");
  const storagePath = `new-concept-sentences/book1/${lessonCode}/${sentenceCode}.mp3`;
  const configuredBaseUrl = process.env.NEXT_PUBLIC_NEW_CONCEPT_AUDIO_BASE_URL?.replace(/\/+$/, "");

  if (configuredBaseUrl) {
    return `${configuredBaseUrl}/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
  }

  if (process.env.NODE_ENV !== "production") {
    return `/audio/new-concept-sentences/book1/${lessonCode}/${sentenceCode}.mp3`;
  }

  return getPublicStorageUrl("audio", storagePath);
}

export function getNewConceptPreviousLesson(lesson: NewConceptLesson) {
  return NEW_CONCEPT_LESSONS.find((candidate) => candidate.lessonNo === lesson.lessonNo - 1);
}

export function getNewConceptNextLesson(lesson: NewConceptLesson) {
  return NEW_CONCEPT_LESSONS.find((candidate) => candidate.lessonNo === lesson.lessonNo + 1);
}
