import { notFound } from "next/navigation";
import ArticleDetailPage from "@/components/bbc-article-detail-page";
import { BbcArticleComments } from "@/components/bbc-article-comments";
import { GuideBoard } from "@/components/guide-board";
import { ProjectAccessPaywall } from "@/components/project-access-paywall";
import { BBC_ARTICLES, getBbcArticleById } from "@/lib/articles/bbc";
import { getUploadedBbcArticle } from "@/lib/articles/bbc-uploaded-content";
import { getPaidContentKey } from "@/lib/access-control";
import { claimPaidContentAccess } from "@/lib/free-preview-access-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isFreeBbc2015ArticleUnlocked } from "@/lib/articles/bbc-free-access.mjs";
import syntax2026 from "@/data/bbc/2026-syntax.json";
import { normalizeBbcSyntaxSentenceEdits } from "@/lib/bbc-syntax-annotation-edits";
import type { BbcSyntaxSentenceData } from "@/components/bbc-syntax-sentence";

export const dynamicParams = true;
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return BBC_ARTICLES.map((article) => ({ articleId: article.id }));
}

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ articleId: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { articleId } = await params;
  const { preview } = await searchParams;
  const article = getBbcArticleById(articleId) ?? await getUploadedBbcArticle(articleId);

  if (!article) {
    notFound();
  }

  const canonicalSyntaxSentences = article.year === 2026
    ? (syntax2026 as Record<string, BbcSyntaxSentenceData[]>)[article.id]
    : undefined;

  if (process.env.NODE_ENV === "development" && preview === "mobile") {
    return <ArticleDetailPage article={article} syntaxSentences={canonicalSyntaxSentences} />;
  }

  const hasPublicRelease = article.year === 2015 && isFreeBbc2015ArticleUnlocked(article.id);
  const hasAccess = hasPublicRelease || await claimPaidContentAccess(
    "bbc",
    getPaidContentKey("bbc-article", article.id),
    1,
  );

  if (!hasAccess) {
    return (
      <>
        <ProjectAccessPaywall projectKey="bbc" />
        <BbcArticleComments articleId={article.id} />
        <div className="guide-posts-under-page guide-article-posts">
          <GuideBoard
            compact
            eyebrow="PAGE POSTS · 页面帖子"
            initialExpanded
            placementPath={`/articles?year=${article.year}`}
            title="页面帖子"
            emptyMessage="这个页面还没有发布帖子。"
          />
        </div>
      </>
    );
  }

  let syntaxSentences = canonicalSyntaxSentences;
  if (canonicalSyntaxSentences) {
    const supabase = await createServerSupabaseClient();
    const { data: syntaxOverride } = await supabase
      .from("bbc_article_syntax_overrides")
      .select("sentences")
      .eq("article_id", article.id)
      .maybeSingle();
    if (syntaxOverride) {
      syntaxSentences = normalizeBbcSyntaxSentenceEdits(syntaxOverride.sentences, canonicalSyntaxSentences) ?? canonicalSyntaxSentences;
    }
  }

  return <ArticleDetailPage article={article} syntaxSentences={syntaxSentences} />;
}
