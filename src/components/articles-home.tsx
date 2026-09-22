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
  yearGroups,
}: {
  content: ManagedPageContent;
  yearGroups: BbcArticleListGroup[];
}) {
  const [openYears, setOpenYears] = useState<number[]>([]);

  function toggleYear(year: number) {
    setOpenYears((current) =>
      current.includes(year) ? current.filter((item) => item !== year) : [...current, year],
    );
  }

  return (
    <section className="stack bbc-home-page">
      <div className="page-heading bbc-hero">
        <div className="eyebrow">{content.eyebrow}</div>
        <h1>{content.title}</h1>
        {content.summary ? <p className="lead">{content.summary}</p> : null}
      </div>

      <div className="bbc-year-panel">
        <div className="bbc-year-list">
          {yearGroups.map((group) => {
            const isOpen = openYears.includes(group.year);

            return (
              <div className="bbc-year-item" key={group.year}>
                <button
                  aria-expanded={isOpen}
                  className="bbc-year-banner"
                  type="button"
                  onClick={() => toggleYear(group.year)}
                >
                  <span>{group.year}</span>
                  <i>{isOpen ? "▾" : "▸"}</i>
                </button>
                <div className="bbc-article-list">
                  {isOpen
                    ? group.articles.map((article) => (
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
                      ))
                    : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
