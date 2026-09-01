"use client";

import type { ReactNode } from "react";
import { getVocabularyExampleHref } from "@/lib/vocabulary/example-links";
import type { VocabularyUsageExample } from "@/lib/vocabulary/examples";

type VocabularyExampleArticleLinkProps = {
  children: ReactNode;
  example: VocabularyUsageExample;
};

export function VocabularyExampleArticleLink({
  children,
  example,
}: VocabularyExampleArticleLinkProps) {
  const href = getVocabularyExampleHref(example);

  if (!href) {
    return <>{children}</>;
  }

  return (
    <a className="vocabulary-usage-example-link" href={href}>
      {children}
    </a>
  );
}
