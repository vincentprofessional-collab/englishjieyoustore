import { NextResponse } from "next/server";

import { getVocabularyAutocompleteItems } from "@/lib/vocabulary/local-vocabulary";

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

export function GET(request: Request) {
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

  const matchedSuggestions = getVocabularyAutocompleteItems()
    .filter((item) =>
      isChineseQuery
        ? item.definitionSearchText.includes(normalizedQuery)
        : item.normalizedWord.includes(normalizedQuery),
    )
    .sort((a, b) => {
      const getRank = (item: ReturnType<typeof getVocabularyAutocompleteItems>[number]) => {
        if (isChineseQuery) {
          const definitionIndex = item.definitionSearchText.indexOf(normalizedQuery);

          return definitionIndex < 0 ? Number.MAX_SAFE_INTEGER : definitionIndex;
        }

        if (item.normalizedWord === normalizedQuery) {
          return 0;
        }

        if (item.normalizedWord.startsWith(normalizedQuery)) {
          return 1;
        }

        return 2;
      };
      const rankDelta = getRank(a) - getRank(b);

      if (rankDelta !== 0) {
        return rankDelta;
      }

      if (a.normalizedWord.length !== b.normalizedWord.length) {
        return a.normalizedWord.length - b.normalizedWord.length;
      }

      return a.normalizedWord.localeCompare(b.normalizedWord);
    });

  return NextResponse.json({
    suggestions: matchedSuggestions.slice(0, limit),
    total: matchedSuggestions.length,
  });
}
