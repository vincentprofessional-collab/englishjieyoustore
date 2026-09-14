"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type AdminComment = {
  avatar_url: string | null;
  body: string;
  created_at: string;
  display_name: string;
  id: string;
  postTitle: string;
};

export function GuideCommentsAdmin() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    void loadComments();
  }, []);

  async function loadComments() {
    setIsLoading(true);
    const [commentsResult, postsResult] = await Promise.all([
      supabase
        .from("guide_comments")
        .select("id,post_id,display_name,avatar_url,body,created_at")
        .order("created_at", { ascending: false }),
      supabase.from("managed_content_pages").select("id,title").like("slug", "guide-%"),
    ]);

    if (commentsResult.error || postsResult.error) {
      setMessage(`无法读取留言：${commentsResult.error?.message ?? postsResult.error?.message}`);
      setIsLoading(false);
      return;
    }

    const postTitles = new Map(
      (postsResult.data ?? []).map((post) => [post.id, post.title]),
    );
    setComments(
      (commentsResult.data ?? []).map((comment) => ({
        avatar_url: comment.avatar_url,
        body: comment.body,
        created_at: comment.created_at,
        display_name: comment.display_name,
        id: comment.id,
        postTitle: postTitles.get(comment.post_id) ?? "已删除的帖子",
      })),
    );
    setMessage("");
    setIsLoading(false);
  }

  async function deleteComment(comment: AdminComment) {
    if (!window.confirm(`确定删除“${comment.display_name}”的这条留言吗？删除后无法恢复。`)) {
      return;
    }

    setDeletingId(comment.id);
    setMessage("");
    const { error } = await supabase.from("guide_comments").delete().eq("id", comment.id);

    if (error) {
      setMessage(`删除失败：${error.message}`);
      setDeletingId(null);
      return;
    }

    setComments((current) => current.filter((item) => item.id !== comment.id));
    setDeletingId(null);
    setMessage("留言已删除。");
  }

  return (
    <section className="guide-comments-admin">
      <header className="guide-comments-admin-heading">
        <div>
          <span>COMMENTS · 留言管理</span>
          <h2>文章留言</h2>
          <p>可查看所有文章留言，删除不合适的内容。</p>
        </div>
        <button className="button secondary" onClick={() => void loadComments()} type="button">
          刷新留言
        </button>
      </header>

      {message ? <p className="admin-form-message">{message}</p> : null}
      {isLoading ? <p>正在读取留言…</p> : null}
      {!isLoading && !comments.length ? <p>目前还没有文章留言。</p> : null}
      <div className="guide-comments-admin-list">
        {comments.map((comment) => (
          <article className="guide-comments-admin-item" key={comment.id}>
            <div className="guide-comment-avatar" aria-hidden="true">
              {comment.avatar_url ? (
                // Avatars are public URLs written by the authenticated upload route.
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" decoding="async" loading="lazy" src={comment.avatar_url} />
              ) : (
                comment.display_name.slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="guide-comments-admin-body">
              <header>
                <strong>{comment.display_name}</strong>
                <time>{new Date(comment.created_at).toLocaleString("zh-CN")}</time>
              </header>
              <small>{comment.postTitle}</small>
              <p>{comment.body}</p>
            </div>
            <button
              className="button danger"
              disabled={deletingId === comment.id}
              onClick={() => void deleteComment(comment)}
              type="button"
            >
              {deletingId === comment.id ? "删除中…" : "删除留言"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
