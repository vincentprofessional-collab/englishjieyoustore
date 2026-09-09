export const FAVORITE_QUESTIONS_STORAGE_KEY = "ielts-platform.favoriteQuestions";

type BbcQuizFavoriteInput = {
  answer: string;
  articleId: string;
  articleTitle: string;
  kind: "matching" | "quiz" | "exercise";
  options: string[];
  prompt: string;
  questionNumber: number;
  userAnswer: string;
};

type FavoriteQuestion = {
  category: "wrong";
  correctAnswer: string;
  href: string;
  id: string;
  options: string[];
  origin: "bbc";
  prompt: string;
  questionNumber: string;
  questionType: "multiple-choice";
  quizKind: "matching" | "quiz" | "exercise";
  savedAt: string;
  sourceTitle: string;
  title: string;
  userAnswer: string;
};

export function getBbcQuizFavoriteId(articleId: string, kind: "matching" | "quiz" | "exercise", questionNumber: number) {
  return `bbc-wrong:${articleId}:${kind}-${questionNumber}`;
}

function readFavoriteQuestions(storage: Storage): FavoriteQuestion[] {
  const rawValue = storage.getItem(FAVORITE_QUESTIONS_STORAGE_KEY);
  if (!rawValue) return [];

  try {
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? (parsedValue as FavoriteQuestion[]) : [];
  } catch {
    return [];
  }
}

function writeFavoriteQuestions(storage: Storage, questions: FavoriteQuestion[]) {
  storage.setItem(
    FAVORITE_QUESTIONS_STORAGE_KEY,
    JSON.stringify(
      [...questions].sort(
        (left, right) => new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime(),
      ),
    ),
  );
}

export function syncWrongBbcQuizFavorite(input: BbcQuizFavoriteInput) {
  try {
    const storage = window.localStorage;
    const id = getBbcQuizFavoriteId(input.articleId, input.kind, input.questionNumber);
    const currentQuestions = readFavoriteQuestions(storage);
    const existingQuestion = currentQuestions.find((question) => question.id === id);

    if (input.userAnswer === input.answer) {
      if (!existingQuestion) return { ok: true, status: "not-saved" as const };

      writeFavoriteQuestions(storage, currentQuestions.filter((question) => question.id !== id));
      return { ok: true, status: "removed" as const };
    }

    if (existingQuestion) return { ok: true, status: "already-saved" as const };

    const question: FavoriteQuestion = {
      category: "wrong",
      correctAnswer: input.answer,
      href: `/articles/${input.articleId}#bbc-article-quiz-${input.kind}-${input.questionNumber}`,
      id,
      options: input.options,
      origin: "bbc",
      prompt: input.prompt,
      questionNumber: `${input.kind}-${input.questionNumber}`,
      questionType: "multiple-choice",
      quizKind: input.kind,
      savedAt: new Date().toISOString(),
      sourceTitle: `BBC ${input.articleId} ${input.articleTitle}`,
      title: `BBC ${input.articleId} · ${input.kind === "matching" ? "配对题" : input.kind === "quiz" ? "选择题" : "选词填空"} 第${input.questionNumber}题`,
      userAnswer: input.userAnswer,
    };

    writeFavoriteQuestions(storage, [...currentQuestions, question]);
    return { ok: true, status: "saved" as const };
  } catch {
    return { ok: false, status: "failed" as const };
  }
}
