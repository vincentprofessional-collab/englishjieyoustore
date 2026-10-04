import "server-only";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { parseGuidePostRow, type GuidePostRow } from "@/lib/guide/posts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const getCachedPublishedHomePosts = unstable_cache(
  async () => {
    if (!supabaseUrl || !supabaseAnonKey) return null;

    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, count, error } = await supabase
        .from("managed_content_pages")
        .select("id,slug,title,summary,meta_json,published_at,created_at", { count: "exact" })
        .like("slug", "guide-%")
        .eq("status", "published")
        .or("meta_json->>pagePlacement.is.null,meta_json->>pagePlacement.eq./")
        .order("published_at", { ascending: false })
        .range(0, 49);

      if (error) return null;
      return {
        posts: ((data ?? []) as GuidePostRow[]).map(parseGuidePostRow),
        total: count ?? data?.length ?? 0,
      };
    } catch {
      return null;
    }
  },
  ["published-home-posts"],
  { revalidate: 300, tags: ["published-home-posts"] },
);
