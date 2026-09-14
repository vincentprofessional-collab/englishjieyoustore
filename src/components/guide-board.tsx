"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, type CSSProperties } from "react";
import {
  DEFAULT_GUIDE_POSTS,
  GuideContentBlock,
  GuidePost,
  GuidePostRow,
  parseGuidePostRow,
} from "@/lib/guide/posts";
import { supabase } from "@/lib/supabase/client";
import { getVisitorNumber } from "@/lib/visitor-identity";

type GuideBoardProps = {
  eyebrow?: string;
  compact?: boolean;
  hideHeading?: boolean;
  hidePostChrome?: boolean;
  postLimit?: number;
  title?: string;
};

type GuideComment = {
  avatarUrl?: string;
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
    backgroundColor: block.backgroundColor || undefined,
    color: block.color || undefined,
    fontFamily: FONT_FAMILIES[block.fontFamily],
    fontSize: `${block.fontSize}px`,
    fontStyle: block.italic ? "italic" : undefined,
    fontWeight: block.bold ? 800 : undefined,
    textAlign: block.align,
    textDecoration: [block.underline ? "underline" : "", block.strike ? "line-through" : ""].filter(Boolean).join(" ") || undefined,
  };
}

function renderBlockText(block: GuideContentBlock) {
  return block.html ? (
    <span dangerouslySetInnerHTML={{ __html: block.html }} />
  ) : (
    block.text
  );
}

function GuideBlock({ block }: { block: GuideContentBlock }) {
  const style = blockStyle(block);

  if (block.type === "heading") {
    return block.text ? <h3 style={style}>{renderBlockText(block)}</h3> : null;
  }

  if (block.type === "image") {
    return block.url ? (
      <figure className="guide-post-media" style={{ textAlign: block.align }}>
        {/* Admin-controlled public media URLs are intentionally rendered without image optimization. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={block.caption || ""} decoding="async" loading="lazy" src={block.url} style={{ height: block.height ? `${block.height}px` : undefined, objectFit: block.height ? "fill" : undefined, width: block.width ? `${block.width}px` : undefined }} />
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

  if (block.type === "audio") {
    return block.url ? (
      <figure className="guide-post-media" style={{ textAlign: block.align }}>
        <audio controls preload="metadata" src={block.url} />
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

  return block.text ? <p style={style}>{renderBlockText(block)}</p> : null;
}

function GuidePostCard({
  hidePostChrome = false,
  initialExpanded = false,
  linkTitle = true,
  post,
}: {
  hidePostChrome?: boolean;
  initialExpanded?: boolean;
  linkTitle?: boolean;
  post: GuidePost;
}) {
  const [comments, setComments] = useState<GuideComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentIdentity, setCommentIdentity] = useState({
    avatarUrl: "",
    displayName: "",
  });
  const [expanded, setExpanded] = useState(initialExpanded);
  const [interactionMessage, setInteractionMessage] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  function toggleExpanded() {
    setExpanded((current) => !current);
  }

  useEffect(() => {
    const localLikes = readLocalRecord<boolean>(LOCAL_LIKES_KEY);
    const localComments = readLocalRecord<GuideComment[]>(LOCAL_COMMENTS_KEY);
    setIsLiked(Boolean(localLikes[post.id]));
    setLikeCount(localLikes[post.id] ? 1 : 0);
    setComments(localComments[post.id] ?? []);
    setCommentIdentity({ avatarUrl: "", displayName: getVisitorNumber() });

    void supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      setUserId(user?.id ?? null);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name,avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        setCommentIdentity({
          avatarUrl: String(profile?.avatar_url ?? user.user_metadata?.avatar_url ?? ""),
          displayName: String(
            profile?.display_name ??
              user.user_metadata?.display_name ??
              user.email?.split("@")[0] ??
              getVisitorNumber(),
          ),
        });
      }
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
          .select("id,display_name,avatar_url,body,created_at")
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
            avatarUrl: comment.avatar_url ?? undefined,
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
    const displayName = commentIdentity.displayName.trim() || getVisitorNumber();

    if (!body) {
      return;
    }

    const optimisticComment: GuideComment = {
      avatarUrl: commentIdentity.avatarUrl || undefined,
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
        avatar_url: commentIdentity.avatarUrl || null,
        body,
        display_name: displayName,
        post_id: post.id,
        status: "published",
        user_id: userId,
      })
      .select("id,display_name,avatar_url,body,created_at")
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
        avatarUrl: data.avatar_url ?? undefined,
      },
    ]);
    setInteractionMessage("留言发布成功。");
  }

  return (
    <article className={`guide-post-card ${expanded ? "expanded" : ""}`}>
      <header className="guide-post-card-head">
        {!hidePostChrome ? (
          <div className="guide-post-number" aria-hidden="true">
            告
          </div>
        ) : null}
        <div className="guide-post-title-block">
          {hidePostChrome ? (
            linkTitle ? (
              <Link className="guide-post-title-button" href={`/contact/${post.slug}`}>
                {post.title}
              </Link>
            ) : (
              <h2>{post.title}</h2>
            )
          ) : (
            linkTitle ? (
              <Link className="guide-post-title-link" href={`/contact/${post.slug}`}>
                {post.title}
              </Link>
            ) : (
              <h2>{post.title}</h2>
            )
          )}
          {!hidePostChrome ? <p>{post.excerpt}</p> : null}
          {post.author ? <small className="guide-post-author">作者：{post.author}</small> : null}
        </div>
        <time className="guide-post-date" dateTime={post.publishedAt}>
          {formatGuideDate(post.publishedAt)}
        </time>
      </header>

      {expanded ? (
        <div className="guide-post-content">
          {post.blocks.map((block) => (
            <GuideBlock block={block} key={block.id} />
          ))}
        </div>
      ) : null}

      {!hidePostChrome ? (
        <footer className="guide-post-actions">
          <div className="guide-post-action-buttons">
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
          </div>
        </footer>
      ) : null}

      {expanded ? (
        <section className="guide-comment-section" aria-label={`${post.title} 留言`}>
          <div className="guide-comment-list">
            {comments.length ? (
              comments.map((comment) => (
                <article key={comment.id}>
                  <div className="guide-comment-avatar" aria-hidden="true">
                    {comment.avatarUrl ? (
                      // Public avatar URLs are supplied by the authenticated profile upload route.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" decoding="async" loading="lazy" src={comment.avatarUrl} />
                    ) : (
                      comment.displayName.slice(0, 1).toUpperCase()
                    )}
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
            ) : null}
          </div>
          <form className="guide-comment-form" onSubmit={submitComment}>
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

export function GuidePostDetail({ post }: { post: GuidePost }) {
  return (
    <section className="stack guide-post-detail-page">
      <GuidePostCard initialExpanded linkTitle={false} post={post} />
    </section>
  );
}

export function GuideBoard({
  compact = false,
  eyebrow = "GUIDE · 使用说明",
  hideHeading = false,
  hidePostChrome = false,
  postLimit,
  title = "使用说明",
}: GuideBoardProps) {
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
        return;
      }

      if (data?.length) {
        setPosts((data as GuidePostRow[]).map(parseGuidePostRow));
      }
    }

    void loadPosts();

    return () => {
      active = false;
    };
  }, []);

  const visiblePosts = postLimit ? posts.slice(0, postLimit) : posts;

  return (
    <section
      className={`stack guide-board-page ${compact ? "guide-board-compact" : ""} ${hidePostChrome ? "guide-board-home" : ""}`}
    >
      {!hideHeading ? (
        <section className="guide-board-heading">
          <div>
            <span>{eyebrow}</span>
            <h2>{title}</h2>
          </div>
        </section>
      ) : null}

      <div className="guide-post-list">
        {visiblePosts.map((post) => (
          <GuidePostCard hidePostChrome={hidePostChrome} key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
