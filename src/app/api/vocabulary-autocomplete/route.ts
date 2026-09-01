import { NextResponse } from "next/server";

import { sortVocabularyAutocompleteItems } from "@/lib/vocabulary/autocomplete-ranking";
import { getBbcVocabularyAutocompleteItems } from "@/lib/articles/bbc-vocabulary";
import {
  getDatabaseVocabularyAutocompleteItems,
  getVocabularyAutocompleteItems,
  type VocabularyAutocompleteItem,
} from "@/lib/vocabulary/local-vocabulary";

export const dynamic = "force-dynamic";

function normalizeSearchInput(value: string) {
  return value.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/gi, "");
}

function normalizeDefinitionSearchInput(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function includesChinese(value: string) {
  return /[\u3400-\u9fff]/u.test(value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const requestedLimit = Number(searchParams.get("limit") ?? 40);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 80) : 40;
  const isChineseQuery = includesChinese(query);
  const normalizedQuery = isChineseQuery
    ? normalizeDefinitionSearchInput(query)
    : normalizeSearchInput(query);

  if (!normalizedQuery) {
    return NextResponse.json({ suggestions: [], total: 0 });
  }

  const localSuggestions = getVocabularyAutocompleteItems()
    .filter((item) =>
      isChineseQuery
        ? item.definitionSearchText.includes(normalizedQuery)
        : item.normalizedWord.includes(normalizedQuery),
    );
  const bbcPhraseSuggestions = getBbcVocabularyAutocompleteItems()
    .filter((item) =>
      isChineseQuery
        ? item.definitionSearchText.includes(normalizedQuery)
        : item.normalizedWord.includes(normalizedQuery),
    );
  const databaseSuggestions = await getDatabaseVocabularyAutocompleteItems({
    isChineseQuery,
    limit: Math.max(limit * 2, 40),
    query,
  });
  const suggestionMap = new Map<string, VocabularyAutocompleteItem>();

  for (const item of [...localSuggestions, ...bbcPhraseSuggestions, ...databaseSuggestions]) {
    suggestionMap.set(item.normalizedWord, item);
  }

  const matchedSuggestions = [...suggestionMap.values()];
  const sortedSuggestions = sortVocabularyAutocompleteItems(
    matchedSuggestions,
    normalizedQuery,
    isChineseQuery,
  );

  return NextResponse.json({
    suggestions: sortedSuggestions.slice(0, limit),
    total: matchedSuggestions.length,
  });
}
