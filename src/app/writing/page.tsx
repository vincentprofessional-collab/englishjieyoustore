import { WritingHome } from "@/components/writing-home";
import { getPublishedPageContent } from "@/lib/content/page-content";

export const dynamic = "force-dynamic";

export default async function WritingPage() {
  const content = await getPublishedPageContent("writing");

  return <WritingHome content={content} />;
}
