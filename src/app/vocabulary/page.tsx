import Link from "next/link";
import { VocabularySearchAutocomplete } from "@/components/vocabulary-search-autocomplete";
import { getVocabularyRootAffixDirectory } from "@/lib/vocabulary/local-vocabulary";

export const dynamic = "force-dynamic";

export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const directory = getVocabularyRootAffixDirectory();

  return (
    <section className="stack vocabulary-page">
      <div className="vocabulary-hero">
        <VocabularySearchAutocomplete initialQuery={query} />
      </div>
      <section className="vocabulary-root-affix-directory" aria-labelledby="vocabulary-directory-title">
        <div className="vocabulary-directory-heading">
          <div>
            <h1 id="vocabulary-directory-title">词根词缀词典</h1>
          </div>
          <span className="vocabulary-directory-count">{directory.length} 个词根/词缀</span>
        </div>
        <div className="vocabulary-root-affix-grid">
          {directory.map((item) => (
            <Link className="vocabulary-root-affix-card" href={item.href} key={`${item.kind}-${item.key}`}>
              <strong>{item.label}</strong>
              <span>{item.kind} · {item.count} 个相关词</span>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
