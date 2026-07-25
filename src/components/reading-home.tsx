import Link from "next/link";
import { READING_PARTS, getReadingQuestionNumbers } from "@/lib/ielts/reading";

export function ReadingHome() {
  const totalQuestions = READING_PARTS.reduce(
    (total, part) => total + getReadingQuestionNumbers(part).length,
    0,
  );

  return (
    <section className="stack writing-home-page reading-home-page">
      <div className="writing-hero-panel reading-hero-panel ielts-module-hero">
        <div className="writing-hero-copy">
          <h1>IELTS READING</h1>
        </div>
      </div>

      <div className="writing-mode-panel reading-mode-panel">
        <div className="writing-mode-grid">
          <Link className="writing-mode-card practice" href="/reading/practice">
            <span>Practice</span>
            <strong>练习</strong>
            <p>按文章进入阅读工作台，保留原文、题目和底部题号导航。</p>
            <em>进入练习 →</em>
          </Link>
          <Link className="writing-mode-card mock" href="/reading/mock">
            <span>Mock Test</span>
            <strong>模考</strong>
            <p>{READING_PARTS.length} 篇文章，{totalQuestions} 道题，进入即开始 60 分钟倒计时。</p>
            <em>开始完整模考 →</em>
          </Link>
        </div>
      </div>
    </section>
  );
}
