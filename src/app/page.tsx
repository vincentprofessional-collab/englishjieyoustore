import { HomeStyleLab } from "@/components/home-style-lab";
import { getCachedPublishedPageContent } from "@/lib/content/page-content-server";
import { getCachedPublishedHomePosts } from "@/lib/guide/home-posts-server";

export const revalidate = 300;

export default async function HomePage() {
  const [content, homePosts] = await Promise.all([
    getCachedPublishedPageContent("home"),
    getCachedPublishedHomePosts(),
  ]);

  return <HomeStyleLab content={content} initialPosts={homePosts?.posts} initialPostCount={homePosts?.total} />;
}
