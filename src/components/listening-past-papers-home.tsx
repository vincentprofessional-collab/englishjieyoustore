"use client";

import Link from "next/link";
import { useState } from "react";
import type { PastPaperListItem } from "@/lib/ielts/past-papers";
import { getPastPaperDetailHref } from "@/lib/ielts/past-papers";

const SECTION_NUMBERS = [1, 2, 3, 4] as const;

export function ListeningPastPapersHome({
  papers,
  source,
}: {
  papers: PastPaperListItem[];
  source: {
    audioAvailableCount: number;
    recordCount: number;
    sectionCount: number;
  };
}) {
  const [openSections, setOpenSections] = useState<number[]>([]);

  function toggleSection(sectionNo: number) {
    setOpenSections((current) =>
      current.includes(sectionNo)
        ? current.filter((item) => item !== sectionNo)
        : [...current, sectionNo],
    );
  }

  return (
    <section className="stack bbc-home-page listening-past-papers-home">
      <div className="page-heading bbc-hero">
        <div className="eyebrow">IELTS LISTENING · PAST PAPERS</div>
        <h1>IELTS LISTENING</h1>
        <p className="lead">
          历年真题中英文听力原文。页面只保留音频与文本，按照 BBC 文章的阅读、播放与显示逻辑呈现。
        </p>
      </div>

      <div className="bbc-year-panel">
        <div className="bbc-player-top">
          <strong>历年真题 · 中英文本</strong>
          <span>
            {source.sectionCount} 个 Section · {source.recordCount} 篇 · {source.audioAvailableCount} 个音频
          </span>
        </div>

        <div className="bbc-year-list">
          {SECTION_NUMBERS.map((sectionNo) => {
            const sectionPapers = papers.filter((paper) => paper.sectionNo === sectionNo);
            const isOpen = openSections.includes(sectionNo);

            return (
              <div className="bbc-year-item" key={sectionNo}>
                <button
                  aria-expanded={isOpen}
                  className="bbc-year-banner"
                  onClick={() => toggleSection(sectionNo)}
                  type="button"
                >
                  <span>
                    Section {sectionNo} · {sectionPapers.length} 篇
                  </span>
                  <i>{isOpen ? "▾" : "▸"}</i>
                </button>
                {isOpen ? (
                  <div className="bbc-article-list">
                    {sectionPapers.map((paper) => (
                      <Link
                        className="bbc-article-card"
                        href={getPastPaperDetailHref(paper.slug)}
                        key={paper.slug}
                      >
                        <strong>{paper.title}</strong>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
