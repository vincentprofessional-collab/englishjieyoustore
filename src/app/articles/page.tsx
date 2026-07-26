import { ArticlesHome } from "@/components/articles-home";
import { getPublishedPageContent } from "@/lib/content/page-content";

export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const content = await getPublishedPageContent("articles");

  return <ArticlesHome content={content} />;
}
