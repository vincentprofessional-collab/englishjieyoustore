import levelOneData from "@/data/new-concept/level-1.json";
import levelTwoData from "@/data/new-concept/level-2.json";

export type NewConceptLesson = {
  audioFile: string | null;
  audioPath: string | null;
  bookCode?: string;
  chinese: string[];
  exercise: string[];
  fullChineseTranslation?: string;
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
  sourceWord?: string;
  sourceAudioArchive?: string;
  title: string;
};

export type NewConceptArticleTextBlock = { chinese: string; english: string };

export function getNewConceptArticleTextBlocks(lesson: NewConceptLesson): NewConceptArticleTextBlock[] {
  const englishLines = lesson.kind === "dialogue" ? lesson.english : lesson.exercise;
  const chineseLines = lesson.kind === "dialogue" ? lesson.chinese : [];
  const blocks: NewConceptArticleTextBlock[] = [];
  let english = "";
  let chinese = "";

  englishLines.forEach((line, index) => {
    english = [english, line.trim()].filter(Boolean).join(" ");
    chinese += chineseLines[index] ?? "";
    const endsWithSentencePunctuation = /[.!?。！？]["'’”’」』)\]]*$/.test(line.trim());

    if (endsWithSentencePunctuation || index === englishLines.length - 1) {
      blocks.push({ chinese, english });
      english = "";
      chinese = "";
    }
  });

  return blocks;
}

const RAW_NEW_CONCEPT_BOOK = levelOneData as NewConceptBook;
const RAW_NEW_CONCEPT_BOOK_TWO = levelTwoData as NewConceptBook;

const OCR_ARTIFACT_LINE_INDEXES: Record<number, number[]> = {
  27: [0],
  33: [0, 1, 2],
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
    .replace(/^TIM\s+(?=Yes, sir)/, "TIM: ")
    .replace(/^ANN\s+(?=No, thank you)/, "ANN: ")
    .replace(/\bJENNY No\./g, "JENNY: No.")
    .replace(/\bLINDA Please give/g, "LINDA: Please give")
    .replace(/\bKATE I'm sure/g, "KATE: I'm sure")
    .replace(/^SILL:/, "JILL:")
    .replace(/^HLL:/, "JILL:")
    .replace(/\bMR\.?\s*HALL[,.]\s*/g, "MR. HALL: ")
    .replace(/\bMR\.?HALL:/g, "MR. HALL:")
    .replace(/\bMR\. HALL (?=David Hall)/g, "MR. HALL: ")
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

// Book 1 keeps the original audio-backed dialogue subset; Book 2 is imported
// as a complete, PDF-checked 96-lesson collection.
const NEW_CONCEPT_BOOK_ONE: NewConceptBook = {
  ...RAW_NEW_CONCEPT_BOOK,
  lessons: RAW_NEW_CONCEPT_BOOK.lessons.filter(
    (lesson) => lesson.kind === "dialogue" && Boolean(lesson.audioPath),
  ).map(normalizeNewConceptLesson),
};

const NEW_CONCEPT_BOOK_TWO: NewConceptBook = {
  ...RAW_NEW_CONCEPT_BOOK_TWO,
  lessons: RAW_NEW_CONCEPT_BOOK_TWO.lessons as NewConceptLesson[],
};

export const NEW_CONCEPT_BOOKS = [NEW_CONCEPT_BOOK_ONE, NEW_CONCEPT_BOOK_TWO];
export const NEW_CONCEPT_LESSONS = NEW_CONCEPT_BOOKS.flatMap((book) => book.lessons);
export const NEW_CONCEPT_BOOK = NEW_CONCEPT_BOOK_ONE;
export const NEW_CONCEPT_UNITS = Array.from({ length: 6 }, (_, index) => {
  const start = index * 24 + 1;
  const end = Math.min(start + 23, Math.max(...NEW_CONCEPT_BOOK_ONE.lessons.map((lesson) => lesson.lessonNo)));

  return {
    end,
    lessons: NEW_CONCEPT_BOOK_ONE.lessons.filter(
      (lesson) => lesson.lessonNo >= start && lesson.lessonNo <= end,
    ),
    start,
    unit: index + 1,
  };
});

export function getNewConceptLessonById(lessonId: string) {
  return NEW_CONCEPT_LESSONS.find((lesson) => lesson.id === lessonId);
}

export function getNewConceptPreviousLesson(lesson: NewConceptLesson) {
  const lessonsInBook = NEW_CONCEPT_LESSONS
    .filter((candidate) => (candidate.bookCode ?? NEW_CONCEPT_BOOK_ONE.bookCode) === (lesson.bookCode ?? NEW_CONCEPT_BOOK_ONE.bookCode))
    .sort((first, second) => first.lessonNo - second.lessonNo);
  const index = lessonsInBook.findIndex((candidate) => candidate.id === lesson.id);
  return index > 0 ? lessonsInBook[index - 1] : undefined;
}

export function getNewConceptNextLesson(lesson: NewConceptLesson) {
  const lessonsInBook = NEW_CONCEPT_LESSONS
    .filter((candidate) => (candidate.bookCode ?? NEW_CONCEPT_BOOK_ONE.bookCode) === (lesson.bookCode ?? NEW_CONCEPT_BOOK_ONE.bookCode))
    .sort((first, second) => first.lessonNo - second.lessonNo);
  const index = lessonsInBook.findIndex((candidate) => candidate.id === lesson.id);
  return index >= 0 ? lessonsInBook[index + 1] : undefined;
}
