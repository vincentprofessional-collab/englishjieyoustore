import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getAllVocabularyEntries,
} from "@/lib/vocabulary/local-vocabulary";
import {
  toLearningWord,
  toLearningWordFromFavorite,
  SUPPLEMENTAL_LEARNING_BOOK_KEYS,
  type FavoriteLearningWord,
  type LearningWord,
} from "@/lib/vocabulary/learning";
import { getSupplementalLearningWords } from "@/lib/vocabulary/supplemental-learning-books";
import { withExistingStudyExamples } from "@/lib/vocabulary/study-examples";
import totalFrequencyData from "@/data/vocabulary/total-frequency-ranks.json";
import {
  EMPTY_VOCABULARY_LEARNING_CONTENT,
  VOCABULARY_LEARNING_CONTENT_SLUG,
  applyVocabularyLearningOverrides,
  getLearningBookCounts as getManagedBookCounts,
  getLearningWordsForBook,
  getManagedLearningBooks,
  normalizeVocabularyLearningContent,
} from "@/lib/vocabulary/learning-content";

export const dynamic = "force-dynamic";

const totalFrequencyRanks = (totalFrequencyData as { rankByWord: Record<string, number> }).rankByWord;

async function getManagedContentState() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return EMPTY_VOCABULARY_LEARNING_CONTENT;
  try {
    const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.from("managed_content_pages").select("meta_json").eq("slug", VOCABULARY_LEARNING_CONTENT_SLUG).eq("status", "published").maybeSingle();
    return error ? EMPTY_VOCABULARY_LEARNING_CONTENT : normalizeVocabularyLearningContent(data?.meta_json);
  } catch {
    return EMPTY_VOCABULARY_LEARNING_CONTENT;
  }
}

function getBaseLearningWords() {
  const entries = getAllVocabularyEntries();
  const words: LearningWord[] = entries.map(toLearningWord).map((word) => ({ ...word, frequencyRank: totalFrequencyRanks[word.id] }));
  for (const book of SUPPLEMENTAL_LEARNING_BOOK_KEYS) words.push(...(getSupplementalLearningWords(book) ?? []));
  return { entries, words };
}

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

export async function GET(request: Request) {
  const state = await getManagedContentState();
  const { entries, words: baseWords } = getBaseLearningWords();
  const managedBooks = getManagedLearningBooks(state);
  const words = applyVocabularyLearningOverrides(baseWords, state);
  const requestedBook = new URL(request.url).searchParams.get("book") ?? "小学";
  if (new URL(request.url).searchParams.get("catalog") === "1") {
    return NextResponse.json({
      books: managedBooks,
      bookCounts: getManagedBookCounts(words, managedBooks),
      sourceCount: entries.length,
    }, { headers: { "Cache-Control": "no-store" } });
  }
  const validBooks = new Set(managedBooks.map((item) => item.key));
  const book = (validBooks.has(requestedBook) || requestedBook === "全部")
    ? requestedBook
    : "小学";
  const selectedWords = (new URL(request.url).searchParams.get("direct") === "1"
    ? words.filter((word) => word.level === book)
    : getLearningWordsForBook(words, book)).map(withExistingStudyExamples);

  return NextResponse.json(
    {
      book,
      sourceCount: entries.length,
      words: selectedWords,
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
