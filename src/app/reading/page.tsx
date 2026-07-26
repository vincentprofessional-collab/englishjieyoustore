import { ReadingHome } from "@/components/reading-home";
import { getPublishedPageContent } from "@/lib/content/page-content";

export const dynamic = "force-dynamic";

export default async function ReadingPage() {
  const content = await getPublishedPageContent("reading");

  return <ReadingHome content={content} />;
}
