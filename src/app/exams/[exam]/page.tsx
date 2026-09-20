import Link from "next/link";
import { notFound } from "next/navigation";
import { getVocabularyEntriesByLevel } from "@/lib/vocabulary/local-vocabulary";

const EXAMS = {
  cet4: { label: "大学四级", level: "四级" },
  cet6: { label: "大学六级", level: "六级" },
} as const;

const SECTION_LABELS = {
  knowledge: "知识点",
  papers: "历年真题",
  types: "题型",
} as const;

export default async function CollegeExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ exam: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const { exam } = await params;
  const { section } = await searchParams;
  const examConfig = EXAMS[exam as keyof typeof EXAMS];
  if (!examConfig) notFound();

  const selectedSection = section && section in SECTION_LABELS
    ? section as keyof typeof SECTION_LABELS
    : "knowledge";
  const entries = selectedSection === "knowledge"
    ? getVocabularyEntriesByLevel(examConfig.level, 120)
    : [];

  return (
    <section className="stack college-exam-page">
      <header className="directory-page-heading">
        <span>{exam.toUpperCase()}</span>
        <h1>{examConfig.label} · {SECTION_LABELS[selectedSection]}</h1>
      </header>

      {selectedSection === "knowledge" ? (
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
        <div className="directory-empty-state">当前仓库尚未导入经过校验的{SECTION_LABELS[selectedSection]}内容。</div>
      )}
    </section>
  );
}
