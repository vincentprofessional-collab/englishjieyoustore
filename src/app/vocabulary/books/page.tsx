import Link from "next/link";
import { getVocabularyEntriesByLevel } from "@/lib/vocabulary/local-vocabulary";

const SUPPORTED_LEVELS = new Set(["小学", "初中", "高中", "四级", "六级", "考研", "托雅", "SAT", "GRE"]);

export default async function VocabularyBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const { level } = await searchParams;
  const selectedLevel = level && SUPPORTED_LEVELS.has(level) ? level : "小学";
  const entries = getVocabularyEntriesByLevel(selectedLevel);

  return (
    <section className="stack vocabulary-book-page">
      <header className="directory-page-heading">
        <span>VOCABULARY BOOK</span>
        <h1>{selectedLevel === "托雅" ? "托福雅思词汇" : `${selectedLevel}词汇`}</h1>
        <p>{entries.length ? `当前展示前 ${entries.length} 个词汇，点击单词进入完整词典页。` : "该词汇书尚未导入词条。"}</p>
      </header>

      {entries.length ? (
        <div className="vocabulary-book-grid">
          {entries.map((entry) => (
            <Link className="vocabulary-book-card" href={`/vocabulary/${entry.normalizedWord}`} key={entry.normalizedWord}>
              <strong>{entry.word}</strong>
              <span>{entry.phonetic}</span>
              <p>{entry.definitionLines[0] ?? entry.definitionCn}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="directory-empty-state">当前目录没有可显示的真实词条。</div>
      )}
    </section>
  );
}
