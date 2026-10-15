import { notFound } from "next/navigation";
import { GuidePostDetail } from "@/components/guide-board";
import {
  DEFAULT_GUIDE_POSTS,
  GuidePostRow,
  parseGuidePostRow,
} from "@/lib/guide/posts";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseGuideComment, type GuideComment } from "@/lib/guide/comments";
import { loadPublicGuideComments, serviceClient } from "@/lib/guide/public-comments";

export const dynamic = "force-dynamic";

export default async function GuidePostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let post = DEFAULT_GUIDE_POSTS.find((candidate) => candidate.slug === slug);

  if (!post) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("managed_content_pages")
      .select("id,slug,title,summary,meta_json,published_at,created_at")
      .eq("slug", slug)
      .like("slug", "guide-%")
      .eq("status", "published")
      .maybeSingle();

    if (!error && data) {
      post = parseGuidePostRow(data as GuidePostRow);
    }
  }

  if (!post) {
    notFound();
  }

  let initialComments: GuideComment[] | undefined;
  if (!post.id.startsWith("default-")) {
    try {
      const db = serviceClient();
      if (db) initialComments = (await loadPublicGuideComments(db, post.id)).map(parseGuideComment);
    } catch {
      // Keep the article available; the client retries when comments are temporarily unavailable.
    }
  }

  return <GuidePostDetail initialComments={initialComments} post={post} />;
}
