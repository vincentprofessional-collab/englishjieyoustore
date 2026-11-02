import { NextResponse } from "next/server";
import {
  getAllVocabularyEntries,
} from "@/lib/vocabulary/local-vocabulary";
import {
  getLearningBookEntries,
  LEARNING_BOOKS,
  toLearningWord,
  toLearningWordFromFavorite,
  SUPPLEMENTAL_LEARNING_BOOK_KEYS,
  type FavoriteLearningWord,
  type LearningBookKey,
  type LearningWord,
} from "@/lib/vocabulary/learning";
import { getSupplementalLearningWords } from "@/lib/vocabulary/supplemental-learning-books";
import { withExistingStudyExamples } from "@/lib/vocabulary/study-examples";
import totalFrequencyData from "@/data/vocabulary/total-frequency-ranks.json";

export const dynamic = "force-dynamic";

const validBookKeys = new Set<LearningBookKey | "全部">([
  ...LEARNING_BOOKS.map((book) => book.key),
  "全部",
]);
const totalFrequencyRanks = (totalFrequencyData as { rankByWord: Record<string, number> }).rankByWord;

let supplementalFavoriteIndex: Map<string, LearningWord> | null = null;

function getSupplementalFavoriteIndex() {
  if (supplementalFavoriteIndex) return supplementalFavoriteIndex;
  const books = SUPPLEMENTAL_LEARNING_BOOK_KEYS;
  supplementalFavoriteIndex = new Map(books.flatMap((book) =>
    (getSupplementalLearningWords(book) ?? []).map((word) => [
      `${word.level}:${word.word.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/gi, "")}`,
      word,
    ] as const),
  ));
  return supplementalFavoriteIndex;
}

export function GET(request: Request) {
  const requestedBook = new URL(request.url).searchParams.get("book") ?? "小学";
  const book = validBookKeys.has(requestedBook as LearningBookKey | "全部")
    ? (requestedBook as LearningBookKey | "全部")
    : "小学";
  if (book !== "全部") {
    const supplementalWords = getSupplementalLearningWords(book);
    if (supplementalWords) {
      return NextResponse.json(
        { book, sourceCount: supplementalWords.length, words: supplementalWords.map(withExistingStudyExamples) },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  }
  const entries = getAllVocabularyEntries();
  const words = getLearningBookEntries(entries, book)
    .map(toLearningWord)
    .map((word) => ({ ...word, frequencyRank: totalFrequencyRanks[word.id] ?? word.frequencyRank }))
    .map(withExistingStudyExamples);

  return NextResponse.json(
    {
      book,
      sourceCount: entries.length,
      words,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);
  const hasWordIds = Boolean(payload && typeof payload === "object" && "wordIds" in payload);
  const rawWordIds: unknown = payload && typeof payload === "object" && "wordIds" in payload
    ? payload.wordIds
    : null;
  const rawFavorites: unknown = payload && typeof payload === "object" && "favorites" in payload
    ? payload.favorites
    : null;
  const favorites = (Array.isArray(rawFavorites) ? rawFavorites as unknown[] : [])
    .filter((item): item is FavoriteLearningWord => item !== null && typeof item === "object" && "id" in item && "word" in item && typeof item.id === "string" && typeof item.word === "string");
  const entriesById = new Map(
    getAllVocabularyEntries().map((entry) => [entry.normalizedWord.toLowerCase(), entry]),
  );
  const supplementalFavorites = getSupplementalFavoriteIndex();
  if (hasWordIds) {
    const supplementalById = new Map([...supplementalFavorites.values()].map((word) => [word.id.toLowerCase(), word]));
    const favoritesById = new Map(favorites.map((favorite) => [favorite.id.trim().toLowerCase(), favorite]));
    const requestedIds = [...new Set((Array.isArray(rawWordIds) ? rawWordIds : [])
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0 && id.length <= 120)
      .map((id) => id.trim().toLowerCase()))].slice(0, 50_000);
    const words = requestedIds.flatMap((id) => {
      const entry = entriesById.get(id);
      const word = entry
        ? toLearningWord(entry)
        : supplementalById.get(id)
          ?? (favoritesById.has(id) ? toLearningWordFromFavorite({ ...favoritesById.get(id)!, id }) : null);
      return word ? [{
        id: word.id,
        word: word.word,
        phonetic: word.phonetic,
        level: word.level,
        definitionLines: word.definitionLines,
        frequencyRank: totalFrequencyRanks[word.id] ?? word.frequencyRank,
      }] : [];
    });
    return NextResponse.json(
      { book: "学习词汇表", sourceCount: words.length, words },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const seen = new Set<string>();
  const words = favorites.flatMap((favorite) => {
    const id = favorite.id.trim().toLowerCase();
    if (!id || seen.has(id)) return [];
    seen.add(id);
    const entry = entriesById.get(id);
    const supplemental = supplementalFavorites.get(`${favorite.level ?? ""}:${id}`);
    return [supplemental ?? (entry ? toLearningWord(entry) : toLearningWordFromFavorite({ ...favorite, id }))];
  });

  return NextResponse.json(
    { book: "生词本", sourceCount: words.length, words: words.map(withExistingStudyExamples) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
