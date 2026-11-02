"use client";

import Link from "next/link";
import { useState } from "react";
import type { CSSProperties } from "react";

type VocabularyFormationPartProps = {
  href?: string;
  label: string;
  style?: CSSProperties;
  unlocked: boolean;
};

export function VocabularyFormationPart({ href, label, style, unlocked }: VocabularyFormationPartProps) {
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  if (unlocked && href) {
    return (
      <Link className="word-formation-part clickable" href={href} style={style}>
        {label}
      </Link>
    );
  }

  return (
    <>
      <button
        className="word-formation-part clickable is-locked"
        onClick={() => setIsPaywallOpen(true)}
        style={style}
        type="button"
      >
        {label}
        <span aria-hidden="true" className="word-formation-lock">🔒</span>
      </button>
      {isPaywallOpen ? (
        <div className="vocabulary-paywall-overlay" onClick={() => setIsPaywallOpen(false)} role="presentation">
          <div
            aria-label="词根词缀提示"
            aria-modal="true"
            className="vocabulary-paywall-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <p>暂未达到可公开学习的质量标准</p>
            <button className="button primary" onClick={() => setIsPaywallOpen(false)} type="button">
              知道了
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
