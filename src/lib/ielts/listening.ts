import { supabase } from "@/lib/supabase/client";
import { getPublicStorageUrl } from "@/lib/supabase/storage";

type MaybeArray<T> = T | T[] | null;

type BookRow = {
  id: string;
  code: string;
  title: string;
  is_published?: boolean | null;
};

type TestRow = {
  id: string;
  test_no: number;
  title: string | null;
  module: string;
  is_published?: boolean | null;
  content_books: MaybeArray<BookRow>;
};

type SectionRow = {
  id: string;
  test_id?: string;
  section_no: number;
  title: string | null;
  question_count: number;
  time_limit_seconds: number | null;
  full_audio_path: string | null;
  question_image_path: string | null;
  tests: MaybeArray<TestRow>;
};

type QuestionRow = {
  id: string;
  question_no: number;
  question_type: string;
  prompt_text: string | null;
  sort_order: number;
  points: number;
};

type AnswerRow = {
  question_id: string;
  answer_text: string;
  normalized_answer: string | null;
  accepts_variants: string[] | null;
  sort_order: number;
};

type TranscriptRow = {
  id: string;
  sentence_no: number;
  speaker: string | null;
  english_text: string;
  chinese_text: string;
  audio_path: string | null;
  start_ms: number | null;
  end_ms: number | null;
  sort_order: number;
};

export type ListeningSectionSummary = {
  id: string;
  title: string;
  bookCode: string;
  bookTitle: string;
  testNo: number;
  testTitle: string;
  sectionNo: number;
  questionCount: number;
  timeLimitSeconds: number | null;
  fullAudioUrl: string | null;
  questionImageUrl: string | null;
  isPublished: boolean;
};

export type ListeningQuestion = {
  id: string;
  questionNo: number;
  questionType: string;
  promptText: string | null;
  points: number;
  answers: string[];
};

export type ListeningTranscriptSentence = {
  id: string;
  sentenceNo: number;
  speaker: string | null;
  englishText: string;
  chineseText: string;
  audioUrl: string | null;
  startMs: number | null;
  endMs: number | null;
};

export type ListeningPartLink = {
  id: string;
  sectionNo: number;
  title: string;
  questionCount: number;
};

export type ListeningSectionDetail = ListeningSectionSummary & {
  partLinks: ListeningPartLink[];
  questionImageUrls: string[];
  questions: ListeningQuestion[];
  transcriptSentences: ListeningTranscriptSentence[];
};

function pickOne<T>(value: MaybeArray<T>) {
  return Array.isArray(value) ? value[0] : value;
}

function splitQuestionImagePaths(questionImagePath: string | null) {
  return (questionImagePath ?? "")
    .split(/\r?\n/)
    .map((path) => path.trim())
    .filter(Boolean);
}

function mapSection(row: SectionRow): ListeningSectionSummary {
  const test = pickOne(row.tests);
  const book = pickOne(test?.content_books ?? null);
  const sectionTitle = row.title || `Section ${row.section_no}`;
  const testTitle = test?.title || `Test ${test?.test_no ?? "-"}`;
  const firstQuestionImagePath = splitQuestionImagePaths(row.question_image_path)[0] ?? null;

  return {
    id: row.id,
    title: sectionTitle,
    bookCode: book?.code ?? "unknown",
    bookTitle: book?.title ?? "未命名题册",
    testNo: test?.test_no ?? 0,
    testTitle,
    sectionNo: row.section_no,
    questionCount: row.question_count,
    timeLimitSeconds: row.time_limit_seconds,
    fullAudioUrl: getPublicStorageUrl("audio", row.full_audio_path),
    questionImageUrl: getPublicStorageUrl("images", firstQuestionImagePath),
    isPublished: Boolean(book?.is_published && test?.is_published),
  };
}

async function getQuestionImageUrls(questionImagePath: string | null) {
  return splitQuestionImagePaths(questionImagePath)
    .map((path) => getPublicStorageUrl("images", path))
    .filter((url): url is string => Boolean(url));
}

export async function getListeningSections() {
  const { data, error } = await supabase
    .from("test_sections")
    .select(
      `
        id,
        test_id,
        section_no,
        title,
        question_count,
        time_limit_seconds,
        full_audio_path,
        question_image_path,
        tests!inner (
          id,
          test_no,
          title,
          module,
          is_published,
          content_books (
            id,
            code,
            title,
            is_published
          )
        )
      `,
    )
    .eq("tests.module", "listening")
    .order("section_no", { ascending: true });

  if (error) {
    return { sections: [] as ListeningSectionSummary[], error: error.message };
  }

  const sections = ((data ?? []) as SectionRow[])
    .map(mapSection)
    .sort((a, b) => {
      const bookSort = a.bookCode.localeCompare(b.bookCode);
      if (bookSort !== 0) return bookSort;
      if (a.testNo !== b.testNo) return a.testNo - b.testNo;
      return a.sectionNo - b.sectionNo;
    });

  return { sections, error: null };
}

export async function getListeningSection(sectionId: string) {
  const { data: section, error: sectionError } = await supabase
    .from("test_sections")
    .select(
      `
        id,
        test_id,
        section_no,
        title,
        question_count,
        time_limit_seconds,
        full_audio_path,
        question_image_path,
        tests (
          id,
          test_no,
          title,
          module,
          is_published,
          content_books (
            id,
            code,
            title,
            is_published
          )
        )
      `,
    )
    .eq("id", sectionId)
    .maybeSingle();

  if (sectionError) {
    return { section: null, error: sectionError.message };
  }

  if (!section) {
    return { section: null, error: null };
  }

  const [{ data: questions, error: questionsError }, { data: transcript, error: transcriptError }] =
    await Promise.all([
      supabase
        .from("questions")
        .select("id,question_no,question_type,prompt_text,sort_order,points")
        .eq("section_id", sectionId)
        .order("sort_order", { ascending: true })
        .order("question_no", { ascending: true }),
      supabase
        .from("transcript_sentences")
        .select("id,sentence_no,speaker,english_text,chinese_text,audio_path,start_ms,end_ms,sort_order")
        .eq("section_id", sectionId)
        .order("sort_order", { ascending: true })
        .order("sentence_no", { ascending: true }),
    ]);

  if (questionsError || transcriptError) {
    return {
      section: null,
      error: questionsError?.message ?? transcriptError?.message ?? "读取听力内容失败",
    };
  }

  const questionRows = (questions ?? []) as QuestionRow[];
  const questionIds = questionRows.map((question) => question.id);
  let answers: AnswerRow[] = [];

  if (questionIds.length > 0) {
    const { data: answerRows, error: answersError } = await supabase
      .from("question_answers")
      .select("question_id,answer_text,normalized_answer,accepts_variants,sort_order")
      .in("question_id", questionIds)
      .order("sort_order", { ascending: true });

    if (answersError) {
      return { section: null, error: answersError.message };
    }

    answers = (answerRows ?? []) as AnswerRow[];
  }

  const answersByQuestionId = new Map<string, string[]>();
  for (const answer of answers) {
    const variants = [
      answer.answer_text,
      answer.normalized_answer,
      ...(answer.accepts_variants ?? []),
    ].filter(Boolean) as string[];
    answersByQuestionId.set(answer.question_id, [
      ...(answersByQuestionId.get(answer.question_id) ?? []),
      ...variants,
    ]);
  }

  const test = pickOne((section as SectionRow).tests);
  let partLinks: ListeningPartLink[] = [];

  if (test?.id) {
    const { data: siblingSections, error: siblingSectionsError } = await supabase
      .from("test_sections")
      .select("id,section_no,title,question_count")
      .eq("test_id", test.id)
      .order("section_no", { ascending: true });

    if (siblingSectionsError) {
      return { section: null, error: siblingSectionsError.message };
    }

    partLinks = ((siblingSections ?? []) as Pick<
      SectionRow,
      "id" | "section_no" | "title" | "question_count"
    >[]).map((item) => ({
      id: item.id,
      sectionNo: item.section_no,
      title: item.title || `Section ${item.section_no}`,
      questionCount: item.question_count,
    }));
  }

  const sectionSummary = mapSection(section as SectionRow);
  const questionImageUrls = await getQuestionImageUrls((section as SectionRow).question_image_path);
  const mappedSection: ListeningSectionDetail = {
    ...sectionSummary,
    partLinks,
    questionImageUrls,
    questions: questionRows.map((question) => ({
      id: question.id,
      questionNo: question.question_no,
      questionType: question.question_type,
      promptText: question.prompt_text,
      points: question.points,
      answers: Array.from(new Set(answersByQuestionId.get(question.id) ?? [])),
    })),
    transcriptSentences: ((transcript ?? []) as TranscriptRow[]).map((sentence) => ({
      id: sentence.id,
      sentenceNo: sentence.sentence_no,
      speaker: sentence.speaker,
      englishText: sentence.english_text,
      chineseText: sentence.chinese_text,
      audioUrl: getPublicStorageUrl("audio", sentence.audio_path),
      startMs: sentence.start_ms,
      endMs: sentence.end_ms,
    })),
  };

  return { section: mappedSection, error: null };
}
