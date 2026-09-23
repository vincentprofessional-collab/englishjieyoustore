import { notFound } from "next/navigation";
import ArticleDetailPage from "@/components/bbc-article-detail-page";
import { ProjectAccessPaywall } from "@/components/project-access-paywall";
import { BBC_ARTICLES, getBbcArticleById } from "@/lib/articles/bbc";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
    return <ProjectAccessPaywall projectKey="bbc" />;
  }

  return <ArticleDetailPage article={article} />;
}
