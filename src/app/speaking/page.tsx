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
          <h1>{content.title}</h1>
        </div>
      </div>

      <section className="speaking-index-panel" aria-labelledby="speaking-index-title">
        <header className="speaking-section-heading">
          <h2 className="speaking-section-total" id="speaking-index-title">
            <strong>{totalQuestions}</strong>
            <span>道合并去重真题</span>
          </h2>
          <p>覆盖 2020—2026 · 按场景分类整理</p>
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
