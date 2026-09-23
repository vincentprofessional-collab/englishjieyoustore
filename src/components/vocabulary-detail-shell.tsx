"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { VocabularyFavoriteButton } from "@/components/vocabulary-favorite-button";
import { VocabularyInlinePronunciation } from "@/components/vocabulary-pronunciation";
import { VocabularyShareButton } from "@/components/vocabulary-share-button";
import type { LocalVocabularyEntry } from "@/lib/vocabulary/local-vocabulary";

type VocabularyDetailShellProps = {
  backHref?: string;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  entry: LocalVocabularyEntry;
  headerActions?: ReactNode;
  showBack?: boolean;
  showHeader?: boolean;
  showWord?: boolean;
};

export function VocabularyDetailShell({
  backHref = "/vocabulary",
  children,
  className = "",
  contentClassName = "",
  entry,
  headerActions,
  showBack = true,
  showHeader = true,
  showWord = true,
}: VocabularyDetailShellProps) {
  const actions = headerActions ?? (
    <>
      <VocabularyFavoriteButton entry={entry} />
      <VocabularyShareButton entry={entry} />
    </>
  );

  return (
    <div className={`vocabulary-detail-shell ${className}`.trim()}>
      {showHeader ? (
        <div className="word-page-head vocabulary-detail-shell-head vocabulary-learning-detail-head">
          {showBack ? <Link className="back-link" href={backHref}>← 返回</Link> : null}
          <div className="word-title-row word-detail-title-row vocabulary-detail-shell-title-row vocabulary-learning-detail-title-row">
            <div className={`word-title-primary ${showWord ? "" : "is-hidden"}`}>
              {showWord ? (
                <>
                  <h1>{entry.word}</h1>
                  <div className="word-title-meta">
                    <VocabularyInlinePronunciation
                      ukAudioUrl={entry.ukAudioUrl}
                      ukPhonetic={entry.ukPhonetic || entry.phonetic}
                      usAudioUrl={entry.usAudioUrl}
                      usPhonetic={entry.usPhonetic || entry.phonetic}
                      word={entry.word}
                    />
                    {entry.level ? <span className="vocabulary-level-badge">{entry.level}</span> : null}
                  </div>
                </>
              ) : null}
            </div>
            <div className="word-title-tools word-title-actions vocabulary-detail-shell-actions vocabulary-learning-word-header-actions">
              {actions}
            </div>
          </div>
        </div>
      ) : null}

      {children ? (
        <div className="word-detail-grid vocabulary-detail-shell-grid vocabulary-learning-detail-grid">
          <section aria-label="词条内容" className={`word-detail-main vocabulary-detail-shell-main vocabulary-learning-detail-main ${contentClassName}`.trim()}>
            {children}
          </section>
        </div>
      ) : null}
    </div>
  );
}
