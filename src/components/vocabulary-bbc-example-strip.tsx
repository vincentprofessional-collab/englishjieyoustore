import { ContentShareButton } from "@/components/content-share-button";
import { VocabularyExampleArticleLink } from "@/components/vocabulary-example-article-link";
import { VocabularyExampleAudioButton, VocabularyExampleFavoriteButton } from "@/components/vocabulary-example-actions";
import type { VocabularyUsageExample } from "@/lib/vocabulary/examples";

export function VocabularyBbcExampleStrip({ examples }: { examples: VocabularyUsageExample[] }) {
  const bbcExamples = examples.filter((example) => example.bookCode === "BBC" && example.sourceType === "article");
  if (!bbcExamples.length) return null;

  return (
    <section aria-label="BBC 文章例句" className="vocabulary-bbc-example-strip">
      <header><strong>BBC 文章例句</strong><span>{bbcExamples.length} 句</span></header>
      <div className="vocabulary-bbc-example-strip-list">
        {bbcExamples.map((example) => (
          <article className="vocabulary-bbc-example-strip-card" key={example.id}>
            <VocabularyExampleArticleLink example={example}>
              <div className="vocabulary-usage-example-main">
                <p>{example.englishText}</p>
                {example.chineseText ? <span>{example.chineseText}</span> : null}
                <small>{example.sourceTitle}</small>
              </div>
            </VocabularyExampleArticleLink>
            <div className="vocabulary-usage-example-actions">
              {example.audioUrl ? <VocabularyExampleAudioButton audioUrl={example.audioUrl} /> : null}
              <VocabularyExampleFavoriteButton example={example} />
              <ContentShareButton label="分享例句" text={`${example.englishText}\n${example.chineseText ?? ""}`.trim()} title="BBC 英文例句" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
