"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { VocabularySearchAutocomplete } from "@/components/vocabulary-search-autocomplete";

export function GlobalVocabularySearch() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialQuery = pathname === "/vocabulary" ? searchParams.get("q") ?? "" : "";

  return (
    <section className="global-vocabulary-search-strip" aria-label="全站查单词">
      <VocabularySearchAutocomplete initialQuery={initialQuery} />
    </section>
  );
}
