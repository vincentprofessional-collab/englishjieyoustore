import { HomeStyleLab } from "@/components/home-style-lab";
import { getPublishedPageContent } from "@/lib/content/page-content";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const content = await getPublishedPageContent("home");

  return <HomeStyleLab content={content} />;
}
