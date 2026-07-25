"use client";

import { usePathname } from "next/navigation";
import { VocabularySearchAutocomplete } from "@/components/vocabulary-search-autocomplete";
import type { VocabularyAutocompleteItem } from "@/lib/vocabulary/local-vocabulary";

type GlobalVocabularySearchProps = {
  suggestions: VocabularyAutocompleteItem[];
};

function shouldHideGlobalVocabularySearch(pathname: string) {
  if (pathname === "/vocabulary") {
    return true;
  }

  return false;
}

export function GlobalVocabularySearch({ suggestions }: GlobalVocabularySearchProps) {
  const pathname = usePathname();

  if (shouldHideGlobalVocabularySearch(pathname)) {
    return null;
  }

  return (
    <section className="global-vocabulary-search-strip" aria-label="全站查单词">
      <VocabularySearchAutocomplete initialQuery="" suggestions={suggestions} />
    </section>
  );
}
