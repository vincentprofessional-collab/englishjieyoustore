"use client";

import { FormEvent, useEffect, useState, type CSSProperties } from "react";
import {
  DEFAULT_GUIDE_POSTS,
  GuideContentBlock,
  GuidePost,
  GuidePostRow,
  parseGuidePostRow,
} from "@/lib/guide/posts";
import { supabase } from "@/lib/supabase/client";

type GuideBoardProps = {
  eyebrow: string;
  summary: string;
  title: string;
};

type GuideComment = {
  body: string;
  createdAt: string;
  displayName: string;
  id: string;
};

const LOCAL_COMMENTS_KEY = "ielts-platform.guideComments";
const LOCAL_LIKES_KEY = "ielts-platform.guideLikes";

const FONT_FAMILIES: Record<GuideContentBlock["fontFamily"], string> = {
  georgia: 'Georgia, "Times New Roman", serif',
  kaiti: '"KaiTi", "STKaiti", "Noto Serif SC", serif',
  sans: 'Arial, "PingFang SC", "Microsoft YaHei", sans-serif',
  serif: '"Songti SC", "SimSun", "Noto Serif SC", serif',
};

function readLocalRecord<T>(key: string): Record<string, T> {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as Record<string, T>) : {};
  } catch {
    return {};
  }
}

function writeLocalRecord<T>(key: string, value: Record<string, T>) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function formatGuideDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function blockStyle(block: GuideContentBlock): CSSProperties {
  return {
    fontFamily: FONT_FAMILIES[block.fontFamily],
    fontSize: `${block.fontSize}px`,
    textAlign: block.align,
  };
}

function GuideBlock({ block }: { block: GuideContentBlock }) {
  const style = blockStyle(block);

  if (block.type === "heading") {
    return block.text ? <h3 style={style}>{block.text}</h3> : null;
  }

  if (block.type === "image") {
    return block.url ? (
      <figure className="guide-post-media" style={{ textAlign: block.align }}>
        {/* Admin-controlled public media URLs are intentionally rendered without image optimization. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={block.caption || ""} src={block.url} />
        {block.caption ? <figcaption>{block.caption}</figcaption> : null}
      </figure>
    ) : null;
  }

  if (block.type === "video") {
    return block.url ? (
      <figure className="guide-post-media" style={{ textAlign: block.align }}>
        <video controls playsInline preload="metadata" src={block.url} />
        {block.caption ? <figcaption>{block.caption}</figcaption> : null}
      </figure>
    ) : null;
  }

  if (block.type === "link") {
    return block.url ? (
      <p className="guide-post-link-line" style={style}>
        <a href={block.url} rel="noreferrer" target="_blank">
          {block.text || block.url}
          <span aria-hidden="true">↗</span>
        </a>
      </p>
    ) : null;
  }

  return block.text ? <p style={style}>{block.text}</p> : null;
}

function GuidePostCard({ post }: { post: GuidePost }) {
  const [comments, setComments] = useState<GuideComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentName, setCommentName] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [interactionMessage, setInteractionMessage] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const localLikes = readLocalRecord<boolean>(LOCAL_LIKES_KEY);
    const localComments = readLocalRecord<GuideComment[]>(LOCAL_COMMENTS_KEY);
    setIsLiked(Boolean(localLikes[post.id]));
    setLikeCount(localLikes[post.id] ? 1 : 0);
    setComments(localComments[post.id] ?? []);

    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      setUserId(user?.id ?? null);
      setCommentName(
        String(user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? ""),
      );
    });
  }, [post.id]);

  useEffect(() => {
    if (!expanded || post.id.startsWith("default-")) {
      return;
    }

    let active = true;

    async function loadInteractions() {
      const [commentsResult, likesResult] = await Promise.all([
        supabase
          .from("guide_comments")
          .select("id,display_name,body,created_at")
          .eq("post_id", post.id)
          .eq("status", "published")
          .order("created_at", { ascending: true }),
        supabase
          .from("guide_post_likes")
          .select("post_id", { count: "exact", head: true })
          .eq("post_id", post.id),
      ]);

      if (!active) {
        return;
      }

      if (!commentsResult.error) {
        setComments(
          (commentsResult.data ?? []).map((comment) => ({
            body: comment.body,
            createdAt: comment.created_at,
            displayName: comment.display_name,
            id: comment.id,
          })),
        );
      }

      if (!likesResult.error) {
        setLikeCount(likesResult.count ?? 0);
      }

      if (userId) {
        const { data, error } = await supabase
          .from("guide_post_likes")
          .select("post_id")
          .eq("post_id", post.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (active && !error) {
          setIsLiked(Boolean(data));
        }
      }
    }

    void loadInteractions();

    return () => {
      active = false;
    };
  }, [expanded, post.id, userId]);

  function saveLocalLike(nextLiked: boolean) {
    const localLikes = readLocalRecord<boolean>(LOCAL_LIKES_KEY);
    const nextLikes = { ...localLikes, [post.id]: nextLiked };
    writeLocalRecord(LOCAL_LIKES_KEY, nextLikes);
  }

  async function toggleLike() {
    setInteractionMessage("");
    const nextLiked = !isLiked;

    if (!userId || post.id.startsWith("default-")) {
      saveLocalLike(nextLiked);
      setIsLiked(nextLiked);
      setLikeCount((current) => Math.max(0, current + (nextLiked ? 1 : -1)));
      if (!userId) {
        setInteractionMessage("登录后，点赞会在不同设备间同步。");
      }
      return;
    }

    const result = nextLiked
      ? await supabase.from("guide_post_likes").insert({
          post_id: post.id,
          user_id: userId,
        })
      : await supabase
          .from("guide_post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", userId);

    if (result.error) {
      saveLocalLike(nextLiked);
      setInteractionMessage("点赞已保存在当前设备，公共互动库尚未连接。");
    }

    setIsLiked(nextLiked);
    setLikeCount((current) => Math.max(0, current + (nextLiked ? 1 : -1)));
  }

  function saveLocalComment(comment: GuideComment) {
    const localComments = readLocalRecord<GuideComment[]>(LOCAL_COMMENTS_KEY);
    writeLocalRecord(LOCAL_COMMENTS_KEY, {
      ...localComments,
      [post.id]: [...(localComments[post.id] ?? []), comment],
    });
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = commentBody.trim();
    const displayName = commentName.trim();

    if (!body || !displayName) {
      return;
    }

    const optimisticComment: GuideComment = {
      body,
      createdAt: new Date().toISOString(),
      displayName,
      id: `local-${Date.now()}`,
    };

    setInteractionMessage("");
    setCommentBody("");

    if (post.id.startsWith("default-")) {
      saveLocalComment(optimisticComment);
      setComments((current) => [...current, optimisticComment]);
      setInteractionMessage("留言已保存在当前设备。");
      return;
    }

    const { data, error } = await supabase
      .from("guide_comments")
      .insert({
        body,
        display_name: displayName,
        post_id: post.id,
        status: "published",
        user_id: userId,
      })
      .select("id,display_name,body,created_at")
      .single();

    if (error || !data) {
      saveLocalComment(optimisticComment);
      setComments((current) => [...current, optimisticComment]);
      setInteractionMessage("留言已保存在当前设备，公共留言库尚未连接。");
      return;
    }

    setComments((current) => [
      ...current,
      {
        body: data.body,
        createdAt: data.created_at,
        displayName: data.display_name,
        id: data.id,
      },
    ]);
    setInteractionMessage("留言发布成功。");
  }

  return (
    <article className={`guide-post-card ${expanded ? "expanded" : ""}`}>
      <header className="guide-post-card-head">
        <div className="guide-post-number" aria-hidden="true">
          帖
        </div>
        <div>
          <span>{formatGuideDate(post.publishedAt)}</span>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </div>
      </header>

      {expanded ? (
        <div className="guide-post-content">
          {post.blocks.map((block) => (
            <GuideBlock block={block} key={block.id} />
          ))}
        </div>
      ) : null}

      <footer className="guide-post-actions">
        <button
          aria-expanded={expanded}
          className="guide-read-button"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? "收起内容" : "阅读全文与留言"}
          <span aria-hidden="true">{expanded ? "↑" : "↓"}</span>
        </button>
        <button
          aria-label={isLiked ? `取消点赞 ${post.title}` : `点赞 ${post.title}`}
          aria-pressed={isLiked}
          className={`guide-like-button ${isLiked ? "active" : ""}`}
          onClick={() => void toggleLike()}
          type="button"
        >
          <span aria-hidden="true">♥</span>
          {likeCount}
        </button>
        <span>{comments.length} 条留言</span>
      </footer>

      {expanded ? (
        <section className="guide-comment-section" aria-label={`${post.title} 留言`}>
          <header>
            <span>COMMENTS · 留言</span>
            <strong>{comments.length} 条</strong>
          </header>
          <div className="guide-comment-list">
            {comments.length ? (
              comments.map((comment) => (
                <article key={comment.id}>
                  <div className="guide-comment-avatar" aria-hidden="true">
                    {comment.displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <header>
                      <strong>{comment.displayName}</strong>
                      <time>{formatGuideDate(comment.createdAt)}</time>
                    </header>
                    <p>{comment.body}</p>
                  </div>
                </article>
              ))
            ) : (
              <p className="guide-comment-empty">还没有留言，欢迎留下第一个问题或建议。</p>
            )}
          </div>
          <form className="guide-comment-form" onSubmit={submitComment}>
            <label>
              <span>昵称</span>
              <input
                maxLength={30}
                onChange={(event) => setCommentName(event.target.value)}
                placeholder="怎么称呼你"
                required
                value={commentName}
              />
            </label>
            <label>
              <span>留言</span>
              <textarea
                maxLength={800}
                onChange={(event) => setCommentBody(event.target.value)}
                placeholder="写下你的问题、建议或使用感受"
                required
                rows={4}
                value={commentBody}
              />
            </label>
            <div>
              <small>{interactionMessage || "请友善交流，不要发布敏感个人信息。"}</small>
              <button className="button primary" type="submit">
                发布留言
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </article>
  );
}

export function GuideBoard({ eyebrow, summary, title }: GuideBoardProps) {
  const [loadMessage, setLoadMessage] = useState("");
  const [posts, setPosts] = useState<GuidePost[]>(DEFAULT_GUIDE_POSTS);

  useEffect(() => {
    let active = true;

    async function loadPosts() {
      const { data, error } = await supabase
        .from("managed_content_pages")
        .select("id,slug,title,summary,meta_json,published_at,created_at")
        .like("slug", "guide-%")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(50);

      if (!active) {
        return;
      }

      if (error) {
        setLoadMessage("当前显示基础使用说明。");
        return;
      }

      if (data?.length) {
        setPosts((data as GuidePostRow[]).map(parseGuidePostRow));
        setLoadMessage("");
      }
    }

    void loadPosts();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="stack guide-board-page">
      <section className="guide-board-hero">
        <div>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{summary}</p>
        </div>
        <aside>
          <strong>{String(posts.length).padStart(2, "0")}</strong>
          <span>篇使用说明</span>
          <small>{loadMessage || "持续更新中"}</small>
        </aside>
      </section>

      <section className="guide-board-heading">
        <div>
          <span>GUIDE BOARD</span>
          <h2>帖子与使用指南</h2>
        </div>
        <p>按发布时间由新到旧排列。打开帖子后可以点赞，也可以在下方留言交流。</p>
      </section>

      <div className="guide-post-list">
        {posts.map((post) => (
          <GuidePostCard key={post.id} post={post} />
        ))}
      </div>
    </main>
  );
}
