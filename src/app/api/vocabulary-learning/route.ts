import { NextResponse } from "next/server";
import {
  getAllVocabularyEntries,
} from "@/lib/vocabulary/local-vocabulary";
import {
  getLearningBookEntries,
  toLearningWord,
  toLearningWordFromFavorite,
  type FavoriteLearningWord,
  type LearningBookKey,
} from "@/lib/vocabulary/learning";

export const dynamic = "force-dynamic";

const validBookKeys = new Set<LearningBookKey | "全部">([
  "小学",
  "初中",
  "高中",
  "四级",
  "六级",
  "考研",
  "托雅",
  "SAT",
  "GMAT",
  "GRE",
  "未分级",
  "全部",
]);

export function GET(request: Request) {
  const requestedBook = new URL(request.url).searchParams.get("book") ?? "小学";
  const book = validBookKeys.has(requestedBook as LearningBookKey | "全部")
    ? (requestedBook as LearningBookKey | "全部")
    : "小学";
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
  const seen = new Set<string>();
  const words = favorites.flatMap((favorite) => {
    const id = favorite.id.trim().toLowerCase();
    if (!id || seen.has(id)) return [];
    seen.add(id);
    const entry = entriesById.get(id);
    return [entry ? toLearningWord(entry) : toLearningWordFromFavorite({ ...favorite, id })];
  });

  return NextResponse.json(
    { book: "生词本", sourceCount: words.length, words },
    { headers: { "Cache-Control": "no-store" } },
  );
}
