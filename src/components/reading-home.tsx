import Link from "next/link";
import { READING_TESTS, getReadingQuestionNumbers } from "@/lib/ielts/reading";
import type { ManagedPageContent } from "@/lib/content/page-content";

function getQuestionCount(test: (typeof READING_TESTS)[number]) {
  return new Set(test.parts.flatMap((part) => getReadingQuestionNumbers(part))).size;
}

export function ReadingHome({ content }: { content: ManagedPageContent }) {
  const defaultTest = READING_TESTS[0];
  const totalQuestions = getQuestionCount(defaultTest);
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
                      .replace("3 篇文章", `${defaultTest.parts.length} 篇文章`)
                      .replace("40 道题", `${totalQuestions} 道题`)
                  : item.description}
              </p>
              <em>{item.actionLabel}</em>
            </Link>
          ))}
        </div>
      </div>

      <div className="reading-home-library-panel">
        <div className="listening-library-head">
          <Link className="back-link" href="/training">
            ← 返回雅思专项
          </Link>
          <div>
            <span>cambridge reading</span>
            <strong>当前已上线套题</strong>
          </div>
        </div>

        <div className="reading-home-test-grid">
          {READING_TESTS.map((test) => (
            <article className="reading-home-test-card" key={test.id}>
              <div>
                <span>{test.bookTitle}</span>
                <strong>Test {test.testNo}</strong>
                <small>{test.parts.length} 篇文章 · {getQuestionCount(test)} 题</small>
              </div>
              <div className="reading-home-test-actions">
                <Link href={`/reading/practice/${test.id}`}>逐篇练习</Link>
                <Link href={`/reading/mock/${test.id}`}>完整模考</Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
