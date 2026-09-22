import { VocabularySearchAutocomplete } from "@/components/vocabulary-search-autocomplete";

export const dynamic = "force-dynamic";

export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  return (
    <section className="stack vocabulary-page">
      <div className="vocabulary-hero">
        <VocabularySearchAutocomplete initialQuery={query} />
      </div>
    </section>
  );
}
