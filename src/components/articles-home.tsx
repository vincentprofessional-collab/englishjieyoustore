"use client";

import Link from "next/link";
import { useState } from "react";
import type { ManagedPageContent } from "@/lib/content/page-content";

export type BbcArticleListGroup = {
  articles: {
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

      <div className="bbc-year-panel bbc-year-browser">
        <section className="bbc-selected-year" aria-label={`${activeGroup?.year ?? selectedYear} 年文章`}>
          <header>
            <span>文章列表</span>
          </header>
          <div className="bbc-article-list">
            {activeGroup?.articles.map((article) => {
              const isSelected = selectedArticles.includes(article.id);

              return (
                <div className="bbc-article-card" key={article.id}>
                  <Link className="bbc-article-card-link" href={`/articles/${article.id}`}>
                    <strong>
                      {article.id}-{article.title}
                      {article.titleChinese ? ` ${article.titleChinese}` : ""}
                    </strong>
                  </Link>
                  <button
                    aria-label={`${isSelected ? "取消选择" : "选择"}文章 ${article.title}`}
                    aria-pressed={isSelected}
                    className="bbc-article-select"
                    onClick={() => toggleArticleSelection(article.id)}
                    type="button"
                  >
                    <span aria-hidden="true" className={isSelected ? "choice-dot selected" : "choice-dot"} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
