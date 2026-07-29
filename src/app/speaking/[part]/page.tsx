import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpeakingQuestionArchive } from "@/components/speaking-question-archive";
import { getSpeakingPart, speakingParts } from "@/lib/ielts/speaking";

export function generateStaticParams() {
  return speakingParts.map((part) => ({ part: part.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ part: string }>;
}): Promise<Metadata> {
  const { part: partId } = await params;
  const part = getSpeakingPart(partId);

  if (!part) {
    return {};
  }

  return {
    description: `${part.label} 历年雅思口语真题，按场景分类并标注年份。`,
    title: `${part.label} 雅思口语真题｜英文解忧杂货铺`,
  };
}

export default async function SpeakingPartPage({
  params,
}: {
  params: Promise<{ part: string }>;
}) {
  const { part: partId } = await params;
  const part = getSpeakingPart(partId);

  if (!part) {
    notFound();
  }

  return (
    <section className="stack speaking-library-page">
      <nav className="speaking-library-breadcrumb" aria-label="面包屑">
        <Link href="/speaking">IELTS Speaking</Link>
        <span aria-hidden="true">/</span>
        <strong>{part.label}</strong>
      </nav>

      <header className="speaking-library-hero">
        <div>
          <span>QUESTION ARCHIVE · 2020—2026</span>
          <h1>{part.label}</h1>
          <p>{part.description}</p>
        </div>
        <dl>
          <div>
            <dt>题目</dt>
            <dd>{part.count}</dd>
          </div>
          <div>
            <dt>场景</dt>
            <dd>{part.sceneCount}</dd>
          </div>
        </dl>
      </header>

      <SpeakingQuestionArchive part={part} />
    </section>
  );
}
