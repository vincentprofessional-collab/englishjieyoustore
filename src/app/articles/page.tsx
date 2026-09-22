import { ArticlesHome } from "@/components/articles-home";
import { BBC_YEARS, getBbcArticlesByYear } from "@/lib/articles/bbc";
import { getPublishedPageContent } from "@/lib/content/page-content";

export const revalidate = 60;

export default async function ArticlesPage() {
  const content = await getPublishedPageContent("articles");
  const yearGroups = BBC_YEARS.map((year) => ({
    articles: getBbcArticlesByYear(year).map((article) => ({
      id: article.id,
      title: article.title,
      titleChinese: article.titleChinese,
    })),
    year,
  }));

  return <ArticlesHome content={content} yearGroups={yearGroups} />;
}
