import { VocabularySearchAutocomplete } from "@/components/vocabulary-search-autocomplete";
import { MobileWordHub } from "@/components/mobile-section-hubs";

export const dynamic = "force-dynamic";

export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; mode?: string; q?: string }>;
}) {
  const { mode, q } = await searchParams;
  const query = q?.trim() ?? "";
  const showMobileHub = !query && mode !== "search";

  return (
    <>
      {showMobileHub ? <div className="mobile-vocabulary-landing"><MobileWordHub /></div> : null}
      <section className={`stack vocabulary-page ${showMobileHub ? "vocabulary-page-search-fallback" : ""}`}>
        <div className="vocabulary-hero">
          <VocabularySearchAutocomplete initialQuery={query} autoFocus={!showMobileHub} />
        </div>
      </section>
    </>
  );
}
