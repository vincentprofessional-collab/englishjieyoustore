"use client";

import { usePathname } from "next/navigation";
import { VocabularySearchAutocomplete } from "@/components/vocabulary-search-autocomplete";

function shouldHideGlobalVocabularySearch(pathname: string) {
  if (pathname === "/vocabulary") {
    return true;
  }

  return false;
}

export function GlobalVocabularySearch() {
  const pathname = usePathname();

  if (shouldHideGlobalVocabularySearch(pathname)) {
    return null;
  }

  return (
    <section className="global-vocabulary-search-strip" aria-label="全站查单词">
      <VocabularySearchAutocomplete initialQuery="" />
    </section>
  );
}
