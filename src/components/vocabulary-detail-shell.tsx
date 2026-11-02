"use client";

import type { ReactNode } from "react";

import { VocabularyMobileBackLink } from "@/components/vocabulary-mobile-back-link";
import { VocabularyDetailHeading } from "@/components/vocabulary-detail-heading";
import type { LocalVocabularyEntry, VocabularyFormationPart } from "@/lib/vocabulary/local-vocabulary";

type VocabularyDetailShellProps = {
  backHref?: string;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  entry: LocalVocabularyEntry;
  formationParts?: VocabularyFormationPart[];
  headerAfterActions?: ReactNode;
  headerContent?: ReactNode;
  headerActions?: ReactNode;
  sidePanel?: ReactNode;
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
  formationParts,
  headerAfterActions,
  headerContent,
  headerActions,
  sidePanel,
  showBack = true,
  showHeader = true,
  showWord = true,
}: VocabularyDetailShellProps) {
  return (
    <div className={`vocabulary-detail-shell ${className}`.trim()}>
      {showHeader ? (
        <div className="word-page-head vocabulary-detail-shell-head vocabulary-learning-detail-head">
          {showBack ? (
            <VocabularyMobileBackLink ariaLabel="返回词汇列表" className="back-link" href={backHref} />
          ) : null}
          {showWord || headerContent ? (
            <VocabularyDetailHeading actions={headerActions} entry={entry} formationParts={formationParts} titleContent={headerContent} />
          ) : null}
        </div>
      ) : null}

      {headerAfterActions ? <div className="vocabulary-detail-shell-header-after-actions">{headerAfterActions}</div> : null}

      {children || sidePanel ? (
        <div className={`word-detail-grid vocabulary-detail-shell-grid vocabulary-learning-detail-grid${sidePanel ? "" : " without-side-panel"}`}>
          {children ? (
            <section aria-label="词条内容" className={`word-detail-main vocabulary-detail-shell-main vocabulary-learning-detail-main ${contentClassName}`.trim()}>
              {children}
            </section>
          ) : null}
          {sidePanel ? <aside className="word-side-panel vocabulary-detail-shell-side-panel">{sidePanel}</aside> : null}
        </div>
      ) : null}
    </div>
  );
}
