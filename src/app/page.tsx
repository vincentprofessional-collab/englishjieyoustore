import { HomeStyleLab } from "@/components/home-style-lab";
import { parseGuidePostRow, type GuidePostRow } from "@/lib/guide/posts";
import { getPublishedPageContent } from "@/lib/content/page-content";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const revalidate = 60;

async function getPublishedHomePosts() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, count, error } = await supabase
      .from("managed_content_pages")
      .select("id,slug,title,summary,meta_json,published_at,created_at", { count: "exact" })
      .like("slug", "guide-%")
      .eq("status", "published")
      .or("meta_json->>pagePlacement.is.null,meta_json->>pagePlacement.eq./")
      .order("published_at", { ascending: false })
      .range(0, 49);

    if (error) return undefined;
    return {
      posts: ((data ?? []) as GuidePostRow[]).map(parseGuidePostRow),
      total: count ?? data?.length ?? 0,
    };
  } catch {
    return undefined;
  }
}

export default async function HomePage() {
  const [content, homePosts] = await Promise.all([
    getPublishedPageContent("home"),
    getPublishedHomePosts(),
  ]);

  return <HomeStyleLab content={content} initialPosts={homePosts?.posts} initialPostCount={homePosts?.total} />;
}
