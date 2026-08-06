export type VocabularyAutocompleteRankItem = {
  definitionSearchText: string;
  normalizedWord: string;
  word: string;
};

export type VocabularyFamilyRankItem = {
  normalizedWord: string;
};

type FamilySuffixRule = {
  rank: number;
  replacements: string[];
  suffix: string;
};

const FAMILY_SUFFIX_RULES: FamilySuffixRule[] = [
  { rank: 10, replacements: [""], suffix: "s" },
  { rank: 10, replacements: ["", "y"], suffix: "es" },
  { rank: 20, replacements: [""], suffix: "d" },
  { rank: 20, replacements: ["", "e"], suffix: "ed" },
  { rank: 30, replacements: ["", "e"], suffix: "ing" },
  { rank: 50, replacements: [""], suffix: "er" },
  { rank: 50, replacements: [""], suffix: "or" },
  { rank: 50, replacements: [""], suffix: "ure" },
  { rank: 50, replacements: [""], suffix: "ion" },
  { rank: 50, replacements: ["", "e"], suffix: "tion" },
  { rank: 50, replacements: ["", "e"], suffix: "ation" },
  { rank: 50, replacements: [""], suffix: "ment" },
  { rank: 50, replacements: [""], suffix: "ness" },
  { rank: 50, replacements: ["", "y"], suffix: "ity" },
];

function getDefinitionIndex(item: VocabularyAutocompleteRankItem, normalizedQuery: string) {
  const definitionIndex = item.definitionSearchText.indexOf(normalizedQuery);

  return definitionIndex < 0 ? Number.MAX_SAFE_INTEGER : definitionIndex;
}

function getEnglishMatchRank(item: VocabularyAutocompleteRankItem, normalizedQuery: string) {
  if (item.normalizedWord === normalizedQuery) {
    return 0;
  }

  if (item.normalizedWord.startsWith(normalizedQuery)) {
    return 1;
  }

  return 2;
}

function getFamilyKey(normalizedWord: string, normalizedQuery: string) {
  if (!normalizedWord.startsWith(normalizedQuery)) {
    return normalizedWord;
  }

  const familyKeyLength = normalizedQuery.length < 4 ? 4 : normalizedQuery.length;
  return normalizedWord.slice(0, Math.min(familyKeyLength, normalizedWord.length));
}

function getFamilyVariantRank(normalizedWord: string, familyKey: string) {
  const suffix = normalizedWord.slice(familyKey.length);

  if (!suffix) {
    return 0;
  }

  if (suffix === "s" || suffix === "es") {
    return 10;
  }

  if (suffix === "d" || suffix === "ed") {
    return 20;
  }

  if (suffix === "ing") {
    return 30;
  }

  if (suffix.startsWith("-")) {
    return 40;
  }

  if (["er", "or", "ure", "ion", "tion", "ation", "ment", "ness", "ity"].includes(suffix)) {
    return 50;
  }

  return 80;
}

function getKnownFamilyRank(normalizedWord: string, knownBaseWords: Set<string>) {
  const hyphenBase = normalizedWord.split("-")[0];

  if (hyphenBase && hyphenBase !== normalizedWord && knownBaseWords.has(hyphenBase)) {
    return {
      familyKey: hyphenBase,
      variantRank: 40,
    };
  }

  for (const rule of FAMILY_SUFFIX_RULES) {
    if (!normalizedWord.endsWith(rule.suffix) || normalizedWord.length <= rule.suffix.length + 2) {
      continue;
    }

    const stem = normalizedWord.slice(0, -rule.suffix.length);

    for (const replacement of rule.replacements) {
      const familyKey = `${stem}${replacement}`;

      if (familyKey !== normalizedWord && knownBaseWords.has(familyKey)) {
        return {
          familyKey,
          variantRank: rule.rank,
        };
      }
    }
  }

  return {
    familyKey: normalizedWord,
    variantRank: 0,
  };
}

export function sortVocabularyFamilyItems<T extends VocabularyFamilyRankItem>(
  items: T[],
  getFallbackRank: (item: T) => number,
) {
  const knownBaseWords = new Set(items.map((item) => item.normalizedWord));
  const rankedItems = items.map((item, index) => ({
    fallbackRank: getFallbackRank(item),
    familyRank: getKnownFamilyRank(item.normalizedWord, knownBaseWords),
    index,
    item,
  }));
  const familyFallbackRanks = new Map<string, number>();

  for (const rankedItem of rankedItems) {
    const currentRank = familyFallbackRanks.get(rankedItem.familyRank.familyKey);
    familyFallbackRanks.set(
      rankedItem.familyRank.familyKey,
      Math.min(currentRank ?? Number.MAX_SAFE_INTEGER, rankedItem.fallbackRank),
    );
  }

  return rankedItems
    .sort((left, right) => {
      const familyDelta =
        (familyFallbackRanks.get(left.familyRank.familyKey) ?? Number.MAX_SAFE_INTEGER) -
        (familyFallbackRanks.get(right.familyRank.familyKey) ?? Number.MAX_SAFE_INTEGER);

      if (familyDelta !== 0) {
        return familyDelta;
      }

      if (left.familyRank.familyKey !== right.familyRank.familyKey) {
        return left.fallbackRank - right.fallbackRank;
      }

      const variantDelta = left.familyRank.variantRank - right.familyRank.variantRank;

      if (variantDelta !== 0) {
        return variantDelta;
      }

      const fallbackDelta = left.fallbackRank - right.fallbackRank;

      if (fallbackDelta !== 0) {
        return fallbackDelta;
      }

      if (left.item.normalizedWord.length !== right.item.normalizedWord.length) {
        return left.item.normalizedWord.length - right.item.normalizedWord.length;
      }

      return left.index - right.index;
    })
    .map((rankedItem) => rankedItem.item);
}

export function sortVocabularyAutocompleteItems<T extends VocabularyAutocompleteRankItem>(
  items: T[],
  normalizedQuery: string,
  isChineseQuery: boolean,
) {
  return [...items].sort((left, right) => {
    if (isChineseQuery) {
      const definitionDelta =
        getDefinitionIndex(left, normalizedQuery) - getDefinitionIndex(right, normalizedQuery);

      if (definitionDelta !== 0) {
        return definitionDelta;
      }

      if (left.normalizedWord.length !== right.normalizedWord.length) {
        return left.normalizedWord.length - right.normalizedWord.length;
      }

      return left.normalizedWord.localeCompare(right.normalizedWord);
    }

    const rankDelta =
      getEnglishMatchRank(left, normalizedQuery) - getEnglishMatchRank(right, normalizedQuery);

    if (rankDelta !== 0) {
      return rankDelta;
    }

    const leftFamilyKey = getFamilyKey(left.normalizedWord, normalizedQuery);
    const rightFamilyKey = getFamilyKey(right.normalizedWord, normalizedQuery);

    if (leftFamilyKey !== rightFamilyKey) {
      return leftFamilyKey.localeCompare(rightFamilyKey);
    }

    const variantDelta =
      getFamilyVariantRank(left.normalizedWord, leftFamilyKey) -
      getFamilyVariantRank(right.normalizedWord, rightFamilyKey);

    if (variantDelta !== 0) {
      return variantDelta;
    }

    if (left.normalizedWord.length !== right.normalizedWord.length) {
      return left.normalizedWord.length - right.normalizedWord.length;
    }

    return left.normalizedWord.localeCompare(right.normalizedWord);
  });
}
