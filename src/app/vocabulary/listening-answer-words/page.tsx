import listeningAnswerWords from "@/data/vocabulary/ielts-listening-answer-words.json";
import { VocabularyListeningAnswerWords } from "@/components/vocabulary-listening-answer-words";
import { ProjectAccessPaywall } from "@/components/project-access-paywall";
import { hasListeningAnswerWordsAccess, IELTS_LISTENING_ANSWER_WORDS_PROJECT_KEY } from "@/lib/vocabulary/listening-answer-words-access";
import type { ListeningAnswerDeck, ListeningAnswerDeckId } from "@/lib/vocabulary/listening-answer-words";

export const dynamic = "force-dynamic";

const VALID_DECK_IDS = new Set<ListeningAnswerDeckId>(["core346", "answers683", "numbers208"]);

export default async function ListeningAnswerWordsPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string }>;
}) {
  const { deck } = await searchParams;
  const initialDeckId = deck && VALID_DECK_IDS.has(deck as ListeningAnswerDeckId)
    ? deck as ListeningAnswerDeckId
    : null;

  if (!await hasListeningAnswerWordsAccess()) {
    return <ProjectAccessPaywall projectKey={IELTS_LISTENING_ANSWER_WORDS_PROJECT_KEY} />;
  }

  return (
    <VocabularyListeningAnswerWords
      decks={listeningAnswerWords.decks as ListeningAnswerDeck[]}
      initialDeckId={initialDeckId}
    />
  );
}
