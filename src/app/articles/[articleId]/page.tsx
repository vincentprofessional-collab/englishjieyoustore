import { notFound } from "next/navigation";
import ArticleDetailPage from "@/components/bbc-article-detail-page";
import { ProjectAccessGate } from "@/components/project-access-gate";
import { BBC_ARTICLES, getBbcArticleById } from "@/lib/articles/bbc";
import { getPaidContentKey } from "@/lib/access-control";

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

  return (
    <ProjectAccessGate
      contentKey={getPaidContentKey("bbc-article", article.id)}
      projectKey="bbc"
    >
      <ArticleDetailPage article={article} />
    </ProjectAccessGate>
  );
}
