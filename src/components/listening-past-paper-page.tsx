"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AudioPlayer,
  DEFAULT_AUDIO_PLAYER_SETTINGS,
  type AudioPlayerSettings,
} from "@/components/audio-player";
import type { PastPaperRecord } from "@/lib/ielts/past-papers";
import styles from "@/components/listening-past-paper-page.module.css";

type OriginalDisplayMode = "english" | "bilingual" | "chinese";

function getWordCount(paper: PastPaperRecord) {
  return (
    paper.transcriptBlocks
      .map((block) => block.english)
      .join(" ")
      .match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)?.length ?? 0
  );
}

export function ListeningPastPaperPage({
  audioUrl,
  paper,
}: {
  audioUrl: string | null;
  paper: PastPaperRecord;
}) {
  const [audioSettings, setAudioSettings] = useState<AudioPlayerSettings>(() => ({
    ...DEFAULT_AUDIO_PLAYER_SETTINGS,
    subtitleMode: "bilingual",
  }));
  const [displayMode, setDisplayMode] = useState<OriginalDisplayMode>("bilingual");
  const [isOriginalVisible, setIsOriginalVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReadingTimerRunning, setIsReadingTimerRunning] = useState(false);
  const [readingSeconds, setReadingSeconds] = useState(0);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isReadingTimerRunning) return;
    const timer = window.setInterval(() => setReadingSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isReadingTimerRunning]);

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(document.fullscreenElement === workspaceRef.current);
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  function toggleReadingTimer() {
    setIsReadingTimerRunning((current) => !current);
  }

  async function toggleFullscreen() {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    try {
      if (document.fullscreenElement === workspace) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await workspace.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      setIsFullscreen(false);
    }
  }

  return (
    <section className="stack bbc-article-page">
      <div className="page-heading bbc-article-hero">
        <div className="bbc-article-hero-top">
          <Link className="bbc-detail-back-link" href="/listening/past-papers">
            ← 返回
          </Link>
          <span className="bbc-article-title-id">{paper.sourceId}</span>
          <div className="bbc-article-actions">
            <span className="eyebrow">IELTS LISTENING</span>
          </div>
        </div>
        <h1>
          <span className="bbc-article-title-line" lang="en">
            {paper.title}
          </span>
        </h1>
        <div className="bbc-article-word-count">
          文本段 <b className="stat-number">{paper.transcriptBlocks.length}</b> · 词数{" "}
          <b className="stat-number">{getWordCount(paper)}</b>
        </div>
      </div>

      <div className="bbc-article-study" ref={workspaceRef}>
        {paper.audioStatus === "missing" ? (
          <div className="notice warning">
            原文已导入；当前资料目录中没有找到与这篇原文匹配的音频。
          </div>
        ) : null}

        {audioUrl ? (
          <section className="bbc-full-audio-panel">
            <div className="bbc-full-audio">
              <AudioPlayer
                hasSelectedRate
                onSettingsChange={(nextSettings) =>
                  setAudioSettings((current) => ({ ...current, ...nextSettings }))
                }
                settings={audioSettings}
                settingsPlacement="none"
                src={audioUrl}
                title={`${paper.title} 完整音频`}
              />
            </div>
          </section>
        ) : null}

        <div className={`bbc-article-columns without-vocabulary ${!isOriginalVisible ? "original-hidden" : ""}`}>
          <section className="bbc-original-panel">
            <header className="bbc-original-head">
              <button
                aria-label={isReadingTimerRunning ? "暂停阅读计时" : "开始阅读计时"}
                aria-pressed={isReadingTimerRunning}
                className={`bbc-reading-timer ${isReadingTimerRunning ? "active" : ""}`}
                onClick={toggleReadingTimer}
                type="button"
              >
                <span>
                  {String(Math.floor(readingSeconds / 60)).padStart(2, "0")}:
                  {String(readingSeconds % 60).padStart(2, "0")}
                </span>
                <span aria-hidden="true">◷</span>
              </button>

              <div className="bbc-original-actions">
                {(["english", "bilingual", "chinese"] as OriginalDisplayMode[]).map((mode) => (
                  <button
                    aria-pressed={displayMode === mode}
                    className={displayMode === mode ? styles.displayActive : undefined}
                    key={mode}
                    onClick={() => setDisplayMode(mode)}
                    type="button"
                  >
                    {mode === "english" ? "英文" : mode === "bilingual" ? "中英" : "中文"}
                  </button>
                ))}
                <button
                  onClick={() => setIsOriginalVisible((current) => !current)}
                  type="button"
                >
                  {isOriginalVisible ? "隐藏原文" : "显示原文"}
                </button>
                <button
                  aria-pressed={isFullscreen}
                  className={isFullscreen ? styles.toggleActive : undefined}
                  onClick={toggleFullscreen}
                  type="button"
                >
                  {isFullscreen ? "退出全屏" : "全屏"}
                </button>
              </div>
            </header>

            {isOriginalVisible ? (
              <div className={`bbc-original-copy ${displayMode === "bilingual" ? "bilingual" : ""}`}>
                {paper.transcriptBlocks.map((block) => (
                  <div className="bbc-original-text-block" key={`${paper.sourceId}-${block.blockNo}`}>
                    {displayMode !== "chinese" ? <p lang="en">{block.english}</p> : null}
                    {displayMode !== "english" ? (
                      <p className="bbc-original-chinese" lang="zh-CN">
                        {block.chinese}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </section>
  );
}
