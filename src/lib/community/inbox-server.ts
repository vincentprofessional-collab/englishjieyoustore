import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBbcArticleById } from "@/lib/articles/bbc";
import { EMPTY_READ_AT, readCommunityCursor, type CommunityItem, type CommunitySource } from "./inbox";

type CommentRow = {
  id: string; user_id: string | null; parent_comment_id: string | null; reply_to_comment_id: string | null;
  created_at: string; post_id?: string; article_id?: string; body?: string; display_name?: string; author_name?: string;
};
type PostRow = { id: string; title: string; slug: string; summary: string | null; created_at: string };
const tables = { guide: "guide_comments", bbc: "bbc_article_comments" };
const chunks = <T,>(items: T[], size = 150): T[][] => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

// Range every query so a Supabase row limit cannot silently drop older posts or replies.
async function allRows<T>(query: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const response = await query(offset, offset + 499);
    if (response.error) throw new Error("留言暂时无法读取，请稍后重试。");
    const rows = (response.data ?? []) as T[];
    result.push(...rows);
    if (rows.length < 500) return result;
  }
}

export async function loadCommunityInbox(client: SupabaseClient, userId: string, cursor: unknown, summary = false) {
  const readAt = readCommunityCursor(cursor);
  const ownPosts = await allRows<PostRow>((from, to) => client.from("managed_content_pages")
    .select("id,title,slug,summary,created_at").eq("created_by", userId).eq("status", "published").like("slug", "guide-%")
    .order("id").range(from, to));
  const authored: CommunityItem[] = ownPosts.map(row => ({ id: row.id, source: "guide", kind: "post", title: row.title,
    body: row.summary ?? "", author: "我", href: `/contact/${encodeURIComponent(row.slug)}`, createdAt: row.created_at }));
  const incoming: CommunityItem[] = [];
  for (const source of ["guide", "bbc"] as const) {
    const columns = `id,user_id,parent_comment_id,reply_to_comment_id,created_at,${source === "guide" ? "post_id" : "article_id"}${summary ? "" : `,body,${source === "guide" ? "display_name" : "author_name"}`}`;
    const base = () => {
      const query = client.from(tables[source]).select(columns);
      return source === "guide" ? query.eq("status", "published") : query;
    };
    const own = await allRows<CommentRow>((from, to) => base().eq("user_id", userId).order("id").range(from, to));
    const replies = new Map<string, CommentRow>();
    const matches: [string, string[]][] = [
      ["reply_to_comment_id", own.map(row => row.id)],
      ["parent_comment_id", own.filter(row => !row.parent_comment_id).map(row => row.id)],
      ...(source === "guide" ? [["post_id", ownPosts.map(row => row.id)] as [string, string[]]] : []),
    ];
    for (const [column, ids] of matches) {
      for (const group of chunks(ids)) {
        const rows = await allRows<CommentRow>((from, to) => base().in(column, group).order("id").range(from, to));
        for (const row of rows) if (row.user_id !== userId) replies.set(row.id, row);
      }
    }
    const posts = new Map(ownPosts.map(row => [row.id, row]));
    if (source === "guide") {
      const ids = [...new Set([...own, ...replies.values()].map(row => row.post_id!).filter(Boolean))].filter(id => !posts.has(id));
      for (const group of chunks(ids)) {
        const rows = await allRows<PostRow>((from, to) => client.from("managed_content_pages").select("id,title,slug,summary,created_at")
          .in("id", group).eq("status", "published").like("slug", "guide-%").order("id").range(from, to));
        for (const row of rows) posts.set(row.id, row);
      }
    }
    const toItem = (row: CommentRow): CommunityItem | null => {
      const post = source === "guide" ? posts.get(row.post_id!) : null;
      if (source === "guide" && !post) return null;
      return { id: row.id, source: source as CommunitySource, kind: "comment", body: row.body ?? "",
        author: row.display_name || row.author_name || "访客", createdAt: row.created_at,
        title: post?.title ?? getBbcArticleById(row.article_id!)?.title ?? `BBC ${row.article_id}`,
        href: source === "guide" ? `/contact/${encodeURIComponent(post!.slug)}` : `/articles/${encodeURIComponent(row.article_id!)}` };
    };
    incoming.push(...[...replies.values()].map(toItem).filter((item): item is CommunityItem => Boolean(item)));
    if (!summary) authored.push(...own.map(toItem).filter((item): item is CommunityItem => Boolean(item)));
  }
  const newestFirst = (a: CommunityItem, b: CommunityItem) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id);
  incoming.sort(newestFirst); authored.sort(newestFirst);
  return { unread: incoming.filter(row => Date.parse(row.createdAt) > Date.parse(readAt || EMPTY_READ_AT)).length,
    readAt, latestReplyAt: incoming[0]?.createdAt ?? null, ...(summary ? {} : { incoming, authored }) };
}
