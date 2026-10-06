"use client";

import Link from "next/link";
import { useState } from "react";
import type { ManagedPageContent } from "@/lib/content/page-content";

export type BbcArticleListGroup = {
  articles: {
    date: string;
    id: string;
    title: string;
    titleChinese?: string;
  }[];
  year: number;
};

export function ArticlesHome({
  content,
  selectedYear,
  yearGroups,
}: {
  content: ManagedPageContent;
  selectedYear: number;
  yearGroups: BbcArticleListGroup[];
}) {
  const activeGroup = yearGroups.find((group) => group.year === selectedYear) ?? yearGroups[0];
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const monthGroups = new Map<string, BbcArticleListGroup["articles"]>();
  for (const article of activeGroup?.articles ?? []) {
    const month = article.date.slice(0, 7);
    const articles = monthGroups.get(month) ?? [];
    articles.push(article);
    monthGroups.set(month, articles);
  }

  function renderArticleCard(article: BbcArticleListGroup["articles"][number], selectable: boolean) {
    const isSelected = selectedArticles.includes(article.id);
    return (
      <div className="bbc-article-card" key={article.id}>
        <Link className="bbc-article-card-link" href={`/articles/${article.id}`}>
          <span className="bbc-article-list-meta">{article.date.replaceAll("-", ".")} <span aria-hidden="true">·</span> <span className="bbc-article-list-id">{article.id}</span></span>
          <strong>{article.title}</strong>
          {article.titleChinese ? <span className="bbc-article-list-translation">{article.titleChinese}</span> : null}
        </Link>
        {selectable ? (
          <button
            aria-label={`${isSelected ? "取消选择" : "选择"}文章 ${article.title}`}
            aria-pressed={isSelected}
            className="bbc-article-select"
            onClick={() => toggleArticleSelection(article.id)}
            type="button"
          >
            <span aria-hidden="true" className={isSelected ? "choice-dot selected" : "choice-dot"} />
          </button>
        ) : null}
      </div>
    );
  }

  function toggleArticleSelection(articleId: string) {
    setSelectedArticles((current) =>
      current.includes(articleId)
        ? current.filter((id) => id !== articleId)
        : [...current, articleId],
    );
  }

  return (
    <section className="stack bbc-home-page">
      <div className="page-heading bbc-hero">
        <div className="eyebrow">{content.eyebrow}</div>
        <h1>{content.title}</h1>
        {content.summary ? <p className="lead">{content.summary}</p> : null}
      </div>

      <div className="bbc-year-panel bbc-year-browser bbc-desktop-article-list">
        <section className="bbc-selected-year" aria-label={`${activeGroup?.year ?? selectedYear} 年文章`}>
          <header>
            <span>文章列表</span>
          </header>
          <div className="bbc-article-list">
            {[...monthGroups].map(([month, articles]) => (
              <section className="bbc-article-month-group" key={month}>
                <h2>{Number(month.slice(5, 7))} 月</h2>
                {articles.map((article) => renderArticleCard(article, true))}
              </section>
            ))}
          </div>
        </section>
      </div>

      <div className="bbc-year-panel bbc-year-browser bbc-mobile-article-list">
        <nav aria-label="按年份浏览 BBC 文章" className="bbc-mobile-year-list">
          {yearGroups.map((group) => <Link aria-current={group.year === activeGroup?.year ? "page" : undefined} className={group.year === activeGroup?.year ? "active" : ""} href={`/articles?year=${group.year}`} key={group.year}>
            <span>{group.year}</span><small>{group.articles.length} 篇</small>
          </Link>)}
        </nav>
        <section className="bbc-selected-year" aria-label={`${activeGroup?.year ?? selectedYear} 年文章`}>
          <header>
            <span>{activeGroup?.year ?? selectedYear} 年文章</span>
            <small>{activeGroup?.articles.length ?? 0} 篇</small>
          </header>
          <div className="bbc-article-list">
            {[...monthGroups].map(([month, articles]) => (
              <section className="bbc-article-month-group" key={month}>
                <h2>{Number(month.slice(5, 7))} 月</h2>
                {articles.map((article) => renderArticleCard(article, false))}
              </section>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
