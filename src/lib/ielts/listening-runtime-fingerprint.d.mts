export type ListeningFingerprintQuestion = {
  answerText?: unknown;
  answers?: unknown[];
  promptText?: unknown;
  questionNo?: unknown;
  questionType?: unknown;
  variants?: unknown[];
};

export function fingerprintListeningQuestions(
  questions: ListeningFingerprintQuestion[] | null | undefined,
): string;
