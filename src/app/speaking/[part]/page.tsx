import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpeakingQuestionFavoriteButton } from "@/components/speaking-question-favorite-button";
import {
  getSpeakingPart,
  groupSpeakingQuestions,
  speakingParts,
} from "@/lib/ielts/speaking";

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

  const groups = groupSpeakingQuestions(part.questions);

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

      <nav className="speaking-scene-index" aria-label={`${part.label} 场景导航`}>
        <span>场景导航</span>
        <div>
          {groups.map((group, index) => (
            <a href={`#scene-${index + 1}`} key={group.scene}>
              {group.scene}
              <small>{group.questions.length}</small>
            </a>
          ))}
        </div>
      </nav>

      <div className="speaking-scene-list">
        {groups.map((group, groupIndex) => (
          <section
            className="speaking-scene-section"
            id={`scene-${groupIndex + 1}`}
            key={group.scene}
          >
            <header>
              <span>{String(groupIndex + 1).padStart(2, "0")}</span>
              <div>
                <h2>{group.scene}</h2>
                <p>{group.questions.length} 道题</p>
              </div>
            </header>

            <ol>
              {group.questions.map((question, questionIndex) => (
                <li id={question.id} key={question.id}>
                  <span className="speaking-question-number">
                    {String(questionIndex + 1).padStart(2, "0")}
                  </span>
                  <div className="speaking-question-copy">
                    <strong>{question.question}</strong>
                    <span>{question.translation}</span>
                    {question.followUp ? <small>常见追问：{question.followUp}</small> : null}
                  </div>
                  <div className="speaking-question-actions">
                    <span>{question.year}</span>
                    <SpeakingQuestionFavoriteButton
                      partId={part.id}
                      partLabel={part.label}
                      question={question}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </section>
  );
}
