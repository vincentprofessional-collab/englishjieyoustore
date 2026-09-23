"use client";

import Link from "next/link";
import { useState } from "react";

type VocabularyFormationPartProps = {
  href?: string;
  label: string;
  unlocked: boolean;
};

export function VocabularyFormationPart({ href, label, unlocked }: VocabularyFormationPartProps) {
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  if (unlocked && href) {
    return (
      <Link className="word-formation-part clickable" href={href}>
        {label}
      </Link>
    );
  }

  return (
    <>
      <button
        className="word-formation-part clickable is-locked"
        onClick={() => setIsPaywallOpen(true)}
        type="button"
      >
        {label}
        <span aria-hidden="true" className="word-formation-lock">🔒</span>
      </button>
      {isPaywallOpen ? (
        <div className="vocabulary-paywall-overlay" onClick={() => setIsPaywallOpen(false)} role="presentation">
          <div
            aria-labelledby="vocabulary-paywall-title"
            aria-modal="true"
            className="vocabulary-paywall-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <span className="vocabulary-paywall-kicker">词根词缀进阶内容</span>
            <h2 id="vocabulary-paywall-title">解锁词根词缀详情</h2>
            <p>其他词汇的词根、词缀关系与同源词内容，需要开通后查看。</p>
            <button className="button primary" onClick={() => setIsPaywallOpen(false)} type="button">
              知道了
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
