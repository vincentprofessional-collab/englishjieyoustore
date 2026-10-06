import { ArticlesHome } from "@/components/articles-home";
import { BBC_DEFAULT_YEAR, BBC_YEARS, getBbcArticlesByYear } from "@/lib/articles/bbc";
import { getUploadedBbcArticles } from "@/lib/articles/bbc-uploaded-content";
import { getPublishedPageContent } from "@/lib/content/page-content";

export const revalidate = 60;

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const content = await getPublishedPageContent("articles");
  const uploadedArticles = await getUploadedBbcArticles();
  const requestedYear = Number((await searchParams).year);
  const allYears = [...new Set([...BBC_YEARS, ...uploadedArticles.map(({ article }) => article.year)])]
    .sort((left, right) => right - left);
  const selectedYear = allYears.includes(requestedYear)
    ? requestedYear
    : uploadedArticles[0]?.article.year ?? BBC_DEFAULT_YEAR;
  const yearGroups = allYears.map((year) => ({
    articles: [...getBbcArticlesByYear(year)]
      .sort((left, right) => right.id.localeCompare(left.id))
      .map((article) => ({
        date: article.date,
        id: article.id,
        title: article.title,
        titleChinese: article.titleChinese,
      })),
    year,
  }));

  for (const group of yearGroups) {
    const uploadsForYear = uploadedArticles
      .filter(({ article }) => article.year === group.year)
      .map(({ article }) => ({
        date: article.date,
        id: article.id,
        title: article.title,
        titleChinese: article.titleChinese,
      }));
    group.articles.unshift(...uploadsForYear);
  }

  return <ArticlesHome content={content} selectedYear={selectedYear} yearGroups={yearGroups} />;
}
