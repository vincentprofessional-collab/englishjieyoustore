import Link from "next/link";
import type { PastPaperRecord } from "@/lib/ielts/past-papers";
import { getPastPaperDetailHref } from "@/lib/ielts/past-papers";

export function ListeningPastPapersHome({
  papers,
  source,
}: {
  papers: PastPaperRecord[];
  source: {
    audioAvailableCount: number;
    missingAudio: Array<{ sourceId: string; title: string }>;
    sectionCount: number;
  };
}) {
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
            {source.sectionCount} 篇 · {source.audioAvailableCount} 篇音频可用
          </span>
        </div>

        {source.missingAudio.length ? (
          <div className="notice warning">
            {source.missingAudio.map((paper) => `${paper.sourceId} ${paper.title}`).join("；")} 暂无匹配音频，
            已保留文本并标注状态。
          </div>
        ) : null}

        <div className="bbc-article-list">
          {papers.map((paper) => (
            <Link
              className="bbc-article-card"
              href={getPastPaperDetailHref(paper.sourceId)}
              key={paper.sourceId}
            >
              <strong>
                {String(paper.sourceNumber).padStart(3, "0")} · {paper.sourceId} · {paper.title}
                {paper.audioStatus === "missing" ? " · 音频待补" : ""}
              </strong>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
