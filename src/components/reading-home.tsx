import Link from "next/link";
import { READING_PARTS, getReadingQuestionNumbers } from "@/lib/ielts/reading";
import type { ManagedPageContent } from "@/lib/content/page-content";

export function ReadingHome({ content }: { content: ManagedPageContent }) {
  const totalQuestions = READING_PARTS.reduce(
    (total, part) => total + getReadingQuestionNumbers(part).length,
    0,
  );
  const items = content.items.filter((item) => item.enabled);

  return (
    <section className="stack writing-home-page reading-home-page">
      <div className="writing-hero-panel reading-hero-panel ielts-module-hero">
        <div className="writing-hero-copy">
          <h1>{content.title}</h1>
          {content.summary ? <p>{content.summary}</p> : null}
        </div>
      </div>

      <div className="writing-mode-panel reading-mode-panel">
        <div className="writing-mode-grid">
          {items.map((item, index) => (
            <Link
              className={`writing-mode-card ${index % 2 === 0 ? "practice" : "mock"}`}
              href={item.href || "/reading"}
              key={item.id}
            >
              <span>{item.eyebrow}</span>
              <strong>{item.title}</strong>
              <p>
                {item.id === "mock"
                  ? item.description
                      .replace("3 篇文章", `${READING_PARTS.length} 篇文章`)
                      .replace("40 道题", `${totalQuestions} 道题`)
                  : item.description}
              </p>
              <em>{item.actionLabel}</em>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
