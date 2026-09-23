import { ArticlesHome } from "@/components/articles-home";
import { BBC_DEFAULT_YEAR, BBC_YEARS, getBbcArticlesByYear } from "@/lib/articles/bbc";
import { getPublishedPageContent } from "@/lib/content/page-content";

export const revalidate = 60;

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const content = await getPublishedPageContent("articles");
  const requestedYear = Number((await searchParams).year);
  const selectedYear = BBC_YEARS.includes(requestedYear) ? requestedYear : BBC_DEFAULT_YEAR;
  const yearGroups = BBC_YEARS.map((year) => ({
    articles: [...getBbcArticlesByYear(year)]
      .sort((left, right) => right.id.localeCompare(left.id))
      .map((article) => ({
        id: article.id,
        title: article.title,
        titleChinese: article.titleChinese,
      })),
    year,
  }));

  return <ArticlesHome content={content} selectedYear={selectedYear} yearGroups={yearGroups} />;
}
