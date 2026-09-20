"use client";

import Link from "next/link";
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
  const selectedGroup = yearGroups.find((group) => group.year === selectedYear);

  return (
    <section className="stack bbc-home-page">
      <header className="directory-page-heading">
        <div className="eyebrow">{content.eyebrow}</div>
        <h1>BBC随身英语 · {selectedYear}</h1>
        {content.summary ? <p className="lead">{content.summary}</p> : null}
      </header>

      <div className="bbc-year-panel">
        <div className="bbc-year-list">
          <div className="bbc-year-item">
            <div className="bbc-article-list bbc-article-list-visible">
              {selectedGroup?.articles.map((article) => (
                <Link
                  className="bbc-article-card"
                  href={`/articles/${article.id}`}
                  key={article.id}
                >
                  <strong>
                    {article.id}-{article.title}
                    {article.titleChinese ? ` ${article.titleChinese}` : ""}
                  </strong>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
