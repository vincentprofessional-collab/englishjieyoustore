import { HomeStyleLab } from "@/components/home-style-lab";
import { getPublishedPageContent } from "@/lib/content/page-content";

export const revalidate = 60;

export default async function HomePage() {
  const content = await getPublishedPageContent("home");

  return <HomeStyleLab content={content} />;
}
