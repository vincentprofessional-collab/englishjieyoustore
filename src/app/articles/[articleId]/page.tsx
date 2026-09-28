import { notFound } from "next/navigation";
import ArticleDetailPage from "@/components/bbc-article-detail-page";
import { BbcArticleComments } from "@/components/bbc-article-comments";
import { GuideBoard } from "@/components/guide-board";
import { ProjectAccessPaywall } from "@/components/project-access-paywall";
import { BBC_ARTICLES, getBbcArticleById } from "@/lib/articles/bbc";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import syntax2026 from "@/data/bbc/2026-syntax.json";
import type { BbcSyntaxSentenceData } from "@/components/bbc-syntax-sentence";

export const dynamicParams = false;
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return BBC_ARTICLES.map((article) => ({ articleId: article.id }));
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  const article = getBbcArticleById(articleId);

  if (!article) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();
  const { data: hasAccess, error } = await supabase.rpc("can_access_project", {
    _project_key: "bbc",
  });

  if (error || hasAccess !== true) {
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

  const syntaxSentences = process.env.NODE_ENV === "development" && article.year === 2026
    ? (syntax2026 as Record<string, BbcSyntaxSentenceData[]>)[article.id]
    : undefined;

  return <ArticleDetailPage article={article} syntaxSentences={syntaxSentences} />;
}
