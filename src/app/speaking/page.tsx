import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPageContent } from "@/lib/content/page-content";
import { speakingParts } from "@/lib/ielts/speaking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  description: "按 Part 1、Part 2、Part 3 和场景分类浏览 2020—2026 雅思口语真题。",
  title: "雅思口语历年真题｜英文解忧杂货铺",
};

export default async function SpeakingPage() {
  const content = await getPublishedPageContent("speaking");
  const totalQuestions = speakingParts.reduce((total, part) => total + part.count, 0);

  return (
    <section className="stack ielts-module-page speaking-home-page">
      <div className="writing-hero-panel ielts-module-hero speaking-hero-panel">
        <div className="writing-hero-copy">
          <span className="speaking-hero-kicker">IELTS · SPEAK WITH YOUR OWN VOICE</span>
          <h1>{content.title}</h1>
          <p>按 Part 1 / 2 / 3 整理历年真题，进入对应题库后可按场景浏览并收藏题目。</p>
        </div>
        <div className="speaking-hero-stats" aria-label="口语题库统计">
          <strong>{totalQuestions}</strong>
          <span>道合并去重真题</span>
          <small>覆盖 2020—2026 · 按场景分类整理</small>
        </div>
      </div>

      <section className="speaking-index-panel" aria-labelledby="speaking-index-title">
        <header className="speaking-section-heading">
          <div>
            <span>QUESTION ARCHIVE</span>
            <h2 id="speaking-index-title">按考试 Part 分类</h2>
          </div>
          <p>点击 Part 进入完整题库，查看场景分类、年份并收藏重点题目。</p>
        </header>

        <nav className="speaking-part-index" aria-label="雅思口语 Part 导航">
          {speakingParts.map((part) => (
            <Link href={`/speaking/${part.id}`} key={part.id}>
              <span>{part.label}</span>
              <strong>{part.count}</strong>
              <small>{part.timing}</small>
              <em aria-hidden="true">↗</em>
            </Link>
          ))}
        </nav>
      </section>
    </section>
  );
}
