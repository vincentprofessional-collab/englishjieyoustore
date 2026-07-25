import { notFound } from "next/navigation";
import { ListeningPractice } from "@/components/listening-practice";
import { getListeningSection } from "@/lib/ielts/listening";
import { getVocabularyHintsForTexts } from "@/lib/vocabulary/local-vocabulary";

export const dynamic = "force-dynamic";

export default async function ListeningSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<{ mode?: string; review?: string }>;
}) {
  const { sectionId } = await params;
  const { mode, review } = await searchParams;
  const { section, error } = await getListeningSection(sectionId);

  if (error) {
    return (
      <section className="panel">
        <div className="eyebrow">Listening</div>
        <h1>读取失败</h1>
        <p className="lead">这套听力内容暂时无法读取：{error}</p>
      </section>
    );
  }

  if (!section) {
    notFound();
  }

  const vocabularyHints = getVocabularyHintsForTexts(
    [
      ...section.transcriptSentences.map((sentence) => sentence.englishText),
      ...section.questions.map((question) => question.promptText ?? ""),
    ],
  );
  const normalizedMode = mode === "practice" ? "practice" : "mock";
  const initialSubmitted = review === "1";

  return (
    <ListeningPractice
      key={`${section.id}:${normalizedMode}:${initialSubmitted ? "review" : "answer"}`}
      initialSubmitted={initialSubmitted}
      initialMode={normalizedMode}
      section={section}
      vocabularyHints={vocabularyHints}
    />
  );
}
