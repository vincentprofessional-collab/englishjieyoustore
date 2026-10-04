import { NextResponse } from "next/server";
import {
  getAllVocabularyEntries,
} from "@/lib/vocabulary/local-vocabulary";
import {
  getLearningBookEntries,
  LEARNING_BOOKS,
  toLearningWord,
  toLearningWordFromFavorite,
  type FavoriteLearningWord,
  type LearningBookKey,
  type LearningWord,
} from "@/lib/vocabulary/learning";
import { getSupplementalLearningWords } from "@/lib/vocabulary/supplemental-learning-books";

export const dynamic = "force-dynamic";

const validBookKeys = new Set<LearningBookKey | "全部">([
  ...LEARNING_BOOKS.map((book) => book.key),
  "全部",
]);

let supplementalFavoriteIndex: Map<string, LearningWord> | null = null;

function getSupplementalFavoriteIndex() {
  if (supplementalFavoriteIndex) return supplementalFavoriteIndex;
  const books = ["地道表达", "俚语俗语"] as const;
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
        { book, sourceCount: supplementalWords.length, words: supplementalWords },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  }
  const entries = getAllVocabularyEntries();
  const words = getLearningBookEntries(entries, book).map(toLearningWord);

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
  const rawFavorites: unknown = payload && typeof payload === "object" && "favorites" in payload
    ? payload.favorites
    : null;
  const favorites = (Array.isArray(rawFavorites) ? rawFavorites as unknown[] : [])
    .filter((item): item is FavoriteLearningWord => item !== null && typeof item === "object" && "id" in item && "word" in item && typeof item.id === "string" && typeof item.word === "string");
  const entriesById = new Map(
    getAllVocabularyEntries().map((entry) => [entry.normalizedWord.toLowerCase(), entry]),
  );
  const supplementalFavorites = getSupplementalFavoriteIndex();
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
    { book: "生词本", sourceCount: words.length, words },
    { headers: { "Cache-Control": "no-store" } },
  );
}
