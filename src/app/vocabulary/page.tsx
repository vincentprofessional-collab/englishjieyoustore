import { VocabularySearchAutocomplete } from "@/components/vocabulary-search-autocomplete";
import { getVocabularyAutocompleteItems } from "@/lib/vocabulary/local-vocabulary";

export const dynamic = "force-dynamic";

export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const autocompleteItems = getVocabularyAutocompleteItems();

  return (
    <section className="stack vocabulary-page">
      <div className="vocabulary-hero">
        <VocabularySearchAutocomplete initialQuery={query} suggestions={autocompleteItems} />
      </div>
    </section>
  );
}
