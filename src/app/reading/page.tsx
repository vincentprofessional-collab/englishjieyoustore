import { ReadingHome } from "@/components/reading-home";
import { getPublishedPageContent } from "@/lib/content/page-content";

export const revalidate = 60;

export default async function ReadingPage() {
  const content = await getPublishedPageContent("reading");

  return <ReadingHome content={content} />;
}
