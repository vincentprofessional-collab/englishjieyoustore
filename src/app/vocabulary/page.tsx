import Link from "next/link";
import { getVocabularyRootAffixDirectory } from "@/lib/vocabulary/local-vocabulary";

export const dynamic = "force-dynamic";

export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string }>;
}) {
  const { kind } = await searchParams;
  const directory = getVocabularyRootAffixDirectory();
  const selectedKind = kind === "prefix" || kind === "suffix" ? kind : "root";
  const visibleDirectory = directory.filter((item) => {
    const label = item.label.trim();
    const isSuffix = /\bsuffix\b|后缀/i.test(label) || /^(?:Latin\s+)?-[a-z]+\b/i.test(label);
    const isPrefix = !isSuffix && !/PIE root/i.test(label) && (
      /\bprefix\b|前缀/i.test(label) ||
      /(?:^|\s)\*?[a-z]+-(?=\s|,|$)/i.test(label)
    );

    return selectedKind === "suffix" ? isSuffix : selectedKind === "prefix" ? isPrefix : !isPrefix && !isSuffix;
  });
  const selectedLabel = selectedKind === "root" ? "词根" : selectedKind === "prefix" ? "前缀" : "后缀";

  return (
    <section className="stack vocabulary-page">
      <section className="vocabulary-root-affix-directory" aria-labelledby="vocabulary-directory-title">
        <h1 className="sr-only" id="vocabulary-directory-title">{selectedLabel}</h1>
        <div className="vocabulary-root-affix-grid">
          {visibleDirectory.map((item) => (
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
