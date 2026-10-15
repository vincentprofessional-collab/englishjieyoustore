"use client";

import { usePathname } from "next/navigation";
import { VocabularySearchAutocomplete } from "@/components/vocabulary-search-autocomplete";

function shouldHideGlobalVocabularySearch(pathname: string) {
  const isWordDetail = /^\/vocabulary\/[^/]+$/.test(pathname)
    && !["/vocabulary/books", "/vocabulary/pk", "/vocabulary/etymology"].includes(pathname);
  return pathname === "/vocabulary" || isWordDetail;
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
