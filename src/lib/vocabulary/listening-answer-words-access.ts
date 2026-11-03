import "server-only";

import { hasPaidProjectAccess } from "@/lib/vocabulary/learning-book-access";

export const IELTS_LISTENING_ANSWER_WORDS_PROJECT_KEY = "vocabulary.ielts-listening-answer-words";

export async function hasListeningAnswerWordsAccess() {
  return hasPaidProjectAccess(IELTS_LISTENING_ANSWER_WORDS_PROJECT_KEY);
}
