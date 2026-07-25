"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { VocabularyDirectoryPronunciation } from "@/components/vocabulary-directory-pronunciation";
import type { VocabularyAutocompleteItem } from "@/lib/vocabulary/local-vocabulary";

type VocabularySearchAutocompleteProps = {
  initialQuery: string;
  suggestions: VocabularyAutocompleteItem[];
};

function normalizeSearchInput(value: string) {
  return value.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/gi, "");
}

function normalizeDefinitionSearchInput(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function includesChinese(value: string) {
  return /[\u3400-\u9fff]/u.test(value);
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("a, button, input, textarea, select"));
}

export function VocabularySearchAutocomplete({
  initialQuery,
  suggestions,
}: VocabularySearchAutocompleteProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const isChineseQuery = includesChinese(deferredQuery);
  const normalizedQuery = isChineseQuery
    ? normalizeDefinitionSearchInput(deferredQuery)
    : normalizeSearchInput(deferredQuery);
  const { totalSuggestionCount, visibleSuggestions } = useMemo(() => {
    if (!normalizedQuery) {
      return { totalSuggestionCount: 0, visibleSuggestions: [] };
    }

    const matchedSuggestions = suggestions
      .filter((item) =>
        isChineseQuery
          ? item.definitionSearchText.includes(normalizedQuery)
          : item.normalizedWord.includes(normalizedQuery),
      )
      .sort((a, b) => {
        const getRank = (item: VocabularyAutocompleteItem) => {
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

    return {
      totalSuggestionCount: matchedSuggestions.length,
      visibleSuggestions: matchedSuggestions.slice(0, 40),
    };
  }, [isChineseQuery, normalizedQuery, suggestions]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery, pathname]);

  return (
    <form action="/vocabulary" className="vocabulary-search" role="search">
      <div className="vocabulary-search-shell">
        <div className="vocabulary-search-row">
          <input
            autoComplete="off"
            autoFocus
            id="word-search"
            name="q"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="输入英文或中文"
            type="search"
            value={query}
          />
          <button className="button primary" type="submit">
            查询
          </button>
        </div>

        {visibleSuggestions.length > 0 ? (
          <div className="vocabulary-autocomplete-panel" aria-label="词汇联想">
            <p className="vocabulary-autocomplete-count">
              {totalSuggestionCount > visibleSuggestions.length
                ? `${totalSuggestionCount} 个备选词，显示前 ${visibleSuggestions.length} 个`
                : `${visibleSuggestions.length} 个备选词`}
            </p>
            <div className="vocabulary-autocomplete-table">
              {visibleSuggestions.map((item) => {
                const detailHref = `/vocabulary/${encodeURIComponent(item.normalizedWord)}`;

                function openDetailPage(event: MouseEvent<HTMLDivElement>) {
                  if (isInteractiveTarget(event.target)) {
                    return;
                  }

                  setQuery("");
                  router.push(detailHref);
                }

                function openDetailPageByKeyboard(event: KeyboardEvent<HTMLDivElement>) {
                  if (isInteractiveTarget(event.target) || (event.key !== "Enter" && event.key !== " ")) {
                    return;
                  }

                  event.preventDefault();
                  setQuery("");
                  router.push(detailHref);
                }

                return (
                  <div
                    aria-label={`查看 ${item.word} 词汇详情`}
                    className="vocabulary-autocomplete-row"
                    key={item.normalizedWord}
                    onClick={openDetailPage}
                    onKeyDown={openDetailPageByKeyboard}
                    role="link"
                    tabIndex={0}
                  >
                    <Link className="autocomplete-word-link" href={detailHref} onClick={() => setQuery("")}>
                      {item.word}
                    </Link>
                    <VocabularyDirectoryPronunciation
                      ukAudioUrl={item.ukAudioUrl}
                      ukPhonetic={item.ukPhonetic}
                      usAudioUrl={item.usAudioUrl}
                      usPhonetic={item.usPhonetic}
                      word={item.word}
                    />
                    <small>{item.level}</small>
                    <span className="autocomplete-word-definition">
                      <span>{item.definition}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </form>
  );
}
