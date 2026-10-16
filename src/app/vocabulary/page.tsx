import { VocabularySearchAutocomplete } from "@/components/vocabulary-search-autocomplete";
import { VocabularyLookupEntry } from "@/components/vocabulary-lookup-entry";

export const dynamic = "force-dynamic";

export default async function VocabularyPage({ searchParams }: { searchParams: Promise<{ mode?: string; q?: string }> }) {
  const { mode, q } = await searchParams;
  const query = q?.trim() ?? "";
  return <section className="stack vocabulary-page vocabulary-lookup-landing">
    <div className="vocabulary-hero"><VocabularySearchAutocomplete initialQuery={query} autoFocus={Boolean(query) || mode === "search"} /></div>
    {!query && mode !== "search" ? <VocabularyLookupEntry word="baby" backHref="/vocabulary?mode=search" /> : null}
  </section>;
}
