"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState, type CSSProperties } from "react";
import type { SiteChromeConfig } from "@/lib/content/site-chrome";
import { guidePostPagePlacementOptions, normalizeGuidePagePath } from "@/lib/content/guide-post-navigation";
import {
  DEFAULT_GUIDE_POSTS,
  GuideContentBlock,
  GuidePost,
  GuidePostRow,
  parseGuidePostRow,
} from "@/lib/guide/posts";
import { resolveCurrentMembership, type MembershipEntitlement, type MembershipProfile } from "@/lib/membership/current-membership";
import { supabase } from "@/lib/supabase/client";
import { getVisitorNumber } from "@/lib/visitor-identity";

type GuideBoardProps = {
  eyebrow?: string;
  compact?: boolean;
  homeLanding?: boolean;
  hideHeading?: boolean;
  hidePostChrome?: boolean;
  initialExpanded?: boolean;
  hideWhenEmpty?: boolean;
  emptyMessage?: string;
  initialPosts?: GuidePost[];
  initialPostCount?: number;
  postLimit?: number;
  placementPath?: string;
  title?: string;
};

type GuideComment = {
  avatarUrl?: string;
  body: string;
  createdAt: string;
  displayName: string;
  id: string;
  isGuest?: boolean;
  isPaidMember?: boolean;
  parentCommentId?: string | null;
  replyToCommentId?: string | null;
  userId?: string | null;
};

type GuideCommentRow = {
  avatar_url?: string | null;
  body: string;
  created_at: string;
  display_name: string;
  id: string;
  is_guest?: boolean;
  is_paid_member?: boolean;
  parent_comment_id?: string | null;
  reply_to_comment_id?: string | null;
  user_id?: string | null;
};

const LOCAL_COMMENTS_KEY = "ielts-platform.guideComments";
const LOCAL_LIKES_KEY = "ielts-platform.guideLikes";
const MAX_GUIDE_COMMENT_LENGTH = 800;

function parseGuideComment(comment: GuideCommentRow): GuideComment {
  return {
    avatarUrl: comment.avatar_url ?? undefined,
    body: comment.body,
    createdAt: comment.created_at,
    displayName: comment.display_name,
    id: comment.id,
    isGuest: comment.is_guest ?? !comment.user_id,
    isPaidMember: comment.is_paid_member ?? false,
    parentCommentId: comment.parent_comment_id ?? null,
    replyToCommentId: comment.reply_to_comment_id ?? null,
    userId: comment.user_id ?? null,
  };
}

async function loadGuideComments(postId: string): Promise<GuideComment[]> {
  try {
    const response = await fetch(`/api/guide-comments?postId=${encodeURIComponent(postId)}`, { cache: "no-store" });
    const result = (await response.json().catch(() => null)) as { comments?: GuideCommentRow[] } | null;
    if (response.ok && Array.isArray(result?.comments)) return result.comments.map(parseGuideComment);
  } catch {
    // Public Supabase reads remain available if membership enrichment is unavailable.
  }

  const threadedResult = await supabase
    .from("guide_comments")
    .select("id,display_name,avatar_url,body,created_at,user_id,parent_comment_id,reply_to_comment_id")
    .eq("post_id", postId)
    .eq("status", "published")
    .order("created_at", { ascending: true });
  const result = threadedResult.error
    ? await supabase
        .from("guide_comments")
        .select("id,display_name,avatar_url,body,created_at,user_id")
        .eq("post_id", postId)
        .eq("status", "published")
        .order("created_at", { ascending: true })
    : threadedResult;

  return result.error ? [] : ((result.data ?? []) as GuideCommentRow[]).map(parseGuideComment);
}

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
  titleOnly = false,
}: {
  hidePostChrome?: boolean;
  initialExpanded?: boolean;
  linkTitle?: boolean;
  post: GuidePost;
  titleOnly?: boolean;
}) {
  const [comments, setComments] = useState<GuideComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ rootId: string; targetId: string } | null>(null);
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);
  const [commentIdentity, setCommentIdentity] = useState({
    avatarUrl: "",
    displayName: "",
    isPaidMember: false,
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
    setCommentIdentity({ avatarUrl: "", displayName: getVisitorNumber(), isPaidMember: false });

    void supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      setUserId(user?.id ?? null);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name,avatar_url,member_number,membership_status,membership_expires_at")
          .eq("id", user.id)
          .maybeSingle();
        const { data: entitlements, error: entitlementsError } = await supabase
          .from("user_project_entitlements")
          .select("plan,status,starts_at,expires_at,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        const membership = resolveCurrentMembership(
          profile as MembershipProfile | null,
          (entitlements ?? []) as MembershipEntitlement[],
          Date.now(),
          !entitlementsError,
        );
        setCommentIdentity({
          avatarUrl: String(profile?.avatar_url ?? user.user_metadata?.avatar_url ?? ""),
          displayName: String(
            profile?.display_name ??
              user.user_metadata?.display_name ??
              user.email?.split("@")[0] ??
              getVisitorNumber(),
          ),
          isPaidMember: membership.state === "active",
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
      const localComments = readLocalRecord<GuideComment[]>(LOCAL_COMMENTS_KEY)[post.id] ?? [];
      const [loadedComments, likesResult] = await Promise.all([
        loadGuideComments(post.id),
        supabase
          .from("guide_post_likes")
          .select("post_id", { count: "exact", head: true })
          .eq("post_id", post.id),
      ]);

      if (!active) {
        return;
      }

      const knownIds = new Set(loadedComments.map((comment) => comment.id));
      setComments([...loadedComments, ...localComments.filter((comment) => !knownIds.has(comment.id))]);

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

  async function publishGuideComment(comment: GuideComment, isReply: boolean) {
    const keepLocal = () => {
      saveLocalComment(comment);
      setComments((current) => [...current, comment]);
    };

    if (post.id.startsWith("default-") || comment.parentCommentId?.startsWith("local-")) {
      keepLocal();
      return;
    }

    const { data, error } = await supabase
      .from("guide_comments")
      .insert({
        avatar_url: comment.avatarUrl || null,
        body: comment.body,
        display_name: comment.displayName,
        parent_comment_id: comment.parentCommentId ?? null,
        post_id: post.id,
        reply_to_comment_id: comment.replyToCommentId ?? null,
        status: "published",
        user_id: userId,
      })
      .select("id,display_name,avatar_url,body,created_at,user_id,parent_comment_id,reply_to_comment_id")
      .single();

    if (error || !data) {
      keepLocal();
      setInteractionMessage(isReply ? "回复已保存在当前设备，公共留言库尚未连接。" : "留言已保存在当前设备，公共留言库尚未连接。");
      return;
    }

    setComments((current) => [...current, {
      ...parseGuideComment(data as GuideCommentRow),
      isGuest: comment.isGuest,
      isPaidMember: comment.isPaidMember,
    }]);
    setInteractionMessage(isReply ? "回复发布成功。" : "留言发布成功。");
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = commentBody.trim();
    if (!body || body.length > MAX_GUIDE_COMMENT_LENGTH) return;

    const comment: GuideComment = {
      avatarUrl: commentIdentity.avatarUrl || undefined,
      body,
      createdAt: new Date().toISOString(),
      displayName: commentIdentity.displayName.trim() || getVisitorNumber(),
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      isGuest: !userId,
      isPaidMember: commentIdentity.isPaidMember,
      parentCommentId: null,
      replyToCommentId: null,
      userId,
    };
    setInteractionMessage("");
    setCommentBody("");
    await publishGuideComment(comment, false);
  }

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = replyBody.trim();
    if (!body || body.length > MAX_GUIDE_COMMENT_LENGTH || !replyingTo) return;

    const comment: GuideComment = {
      avatarUrl: commentIdentity.avatarUrl || undefined,
      body,
      createdAt: new Date().toISOString(),
      displayName: commentIdentity.displayName.trim() || getVisitorNumber(),
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      isGuest: !userId,
      isPaidMember: commentIdentity.isPaidMember,
      parentCommentId: replyingTo.rootId,
      replyToCommentId: replyingTo.targetId,
      userId,
    };
    setInteractionMessage("");
    setIsReplySubmitting(true);
    try {
      await publishGuideComment(comment, true);
      setReplyBody("");
      setReplyingTo(null);
    } finally {
      setIsReplySubmitting(false);
    }
  }

  const commentsById = new Map(comments.map((comment) => [comment.id, comment]));
  const rootComments = comments
    .filter((comment) => !comment.parentCommentId || !commentsById.has(comment.parentCommentId))
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

  function renderGuideComment(comment: GuideComment, rootId: string, isReply = false) {
    const isGuest = comment.isGuest ?? !comment.userId;
    const isPaidMember = comment.isPaidMember ?? false;
    const avatarLabel = isGuest ? "访" : isPaidMember ? "V" : comment.displayName.slice(0, 1).toUpperCase();

    return (
      <article className={`guide-comment-item ${isReply ? "guide-comment-reply" : ""}`} key={comment.id}>
        <div className={`guide-comment-avatar ${isGuest ? "is-guest" : isPaidMember ? "is-paid" : ""}`} aria-hidden="true">
          {!isGuest && !isPaidMember && comment.avatarUrl ? (
            // Public avatar URLs are supplied by the authenticated profile upload route.
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" decoding="async" loading="lazy" src={comment.avatarUrl} />
          ) : avatarLabel}
        </div>
        <div className="guide-comment-content">
          <header>
            <strong>{comment.displayName}</strong>
            <time>{formatGuideDate(comment.createdAt)}</time>
          </header>
          {comment.replyToCommentId && comment.replyToCommentId !== rootId ? (
            <small className="guide-comment-reply-target">
              回复 {commentsById.get(comment.replyToCommentId)?.displayName ?? "留言用户"}
            </small>
          ) : null}
          <p>{comment.body}</p>
          <button
            className="guide-comment-reply-button"
            onClick={() => setReplyingTo({ rootId, targetId: comment.id })}
            type="button"
          >回复</button>
        </div>
      </article>
    );
  }

  function renderReplyForm(rootId: string) {
    if (replyingTo?.rootId !== rootId) return null;
    const targetName = commentsById.get(replyingTo.targetId)?.displayName ?? "留言用户";

    return (
      <form className="guide-comment-reply-form" onSubmit={submitReply}>
        <label>
          <span>回复 {targetName}</span>
          <textarea
            autoFocus
            maxLength={MAX_GUIDE_COMMENT_LENGTH}
            onChange={(event) => setReplyBody(event.target.value)}
            placeholder="写下回复……"
            required
            rows={3}
            value={replyBody}
          />
        </label>
        <div>
          <button onClick={() => setReplyingTo(null)} type="button">取消</button>
          <button className="button primary" disabled={isReplySubmitting || !replyBody.trim()} type="submit">
            {isReplySubmitting ? "提交中…" : "发表回复"}
          </button>
        </div>
      </form>
    );
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
          {!titleOnly && post.author ? <small className="guide-post-author">作者：{post.author}</small> : null}
        </div>
        {!titleOnly ? <time className="guide-post-date" dateTime={post.publishedAt}>
          {formatGuideDate(post.publishedAt)}
        </time> : null}
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
            {rootComments.map((comment) => {
              const replies = comments
                .filter((candidate) => candidate.parentCommentId === comment.id)
                .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
              const hasReplyForm = replyingTo?.rootId === comment.id;
              return (
                <div className="guide-comment-thread" key={comment.id}>
                  {renderGuideComment(comment, comment.id)}
                  {replies.length || hasReplyForm ? (
                    <div className="guide-comment-replies">
                      {replies.map((reply) => renderGuideComment(reply, comment.id, true))}
                      {renderReplyForm(comment.id)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <form className="guide-comment-form" onSubmit={submitComment}>
            <label>
              <span>留言</span>
              <textarea
                maxLength={MAX_GUIDE_COMMENT_LENGTH}
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
  homeLanding = false,
  hideHeading = false,
  hidePostChrome = false,
  hideWhenEmpty = false,
  initialExpanded = false,
  emptyMessage = "当前没有帖子。",
  initialPosts,
  initialPostCount,
  postLimit,
  placementPath,
  title = "使用说明",
}: GuideBoardProps) {
  const [posts, setPosts] = useState<GuidePost[]>(() => initialPosts ?? (placementPath ? [] : DEFAULT_GUIDE_POSTS));
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPosts, setTotalPosts] = useState(initialPostCount ?? initialPosts?.length ?? DEFAULT_GUIDE_POSTS.length);
  const [isLoading, setIsLoading] = useState(initialPosts === undefined);
  const [loadError, setLoadError] = useState(false);
  const [isMobileHome, setIsMobileHome] = useState(false);
  const pageSize = postLimit ?? 50;

  useEffect(() => {
    if (!homeLanding) return;
    const media = window.matchMedia("(max-width: 820px)");
    const update = () => setIsMobileHome(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [homeLanding]);

  useEffect(() => {
    let active = true;

    async function loadPosts() {
      setIsLoading(true);
      let query = supabase
        .from("managed_content_pages")
        .select("id,slug,title,summary,meta_json,published_at,created_at", { count: "exact" })
        .like("slug", "guide-%")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (placementPath === "/") {
        query = query.or("meta_json->>pagePlacement.is.null,meta_json->>pagePlacement.eq./");
      } else if (placementPath) {
        query = query.eq("meta_json->>pagePlacement", placementPath);
      }

      const { data, error, count } = await query.range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      if (!active) {
        return;
      }

      if (error) {
        setLoadError(true);
        setIsLoading(false);
        return;
      }

      const nextRows = (data ?? []) as GuidePostRow[];
      setPosts(nextRows.map(parseGuidePostRow));
      setTotalPosts(count ?? data?.length ?? 0);
      setLoadError(false);
      setIsLoading(false);
    }

    void loadPosts();

    return () => {
      active = false;
    };
  }, [currentPage, pageSize, placementPath]);

  if (hideWhenEmpty && (!posts.length || isLoading)) {
    return null;
  }

  return (
    <section
      className={`stack guide-board-page ${compact ? "guide-board-compact" : ""} ${hidePostChrome ? "guide-board-home" : ""} ${homeLanding ? "guide-board-home-live" : ""}`}
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
        {posts.map((post) => (
          <GuidePostCard
            hidePostChrome={homeLanding || hidePostChrome}
            initialExpanded={homeLanding ? false : initialExpanded}
            key={post.id}
            post={post}
            titleOnly={homeLanding}
          />
        ))}
        {isLoading && isMobileHome ? (
          <p aria-live="polite" className="guide-post-empty">正在载入网站帖子…</p>
        ) : null}
        {!isLoading && posts.length === 0 ? (
          <p className="guide-post-empty">
            {loadError && isMobileHome ? "帖子暂时无法载入，请刷新重试。" : emptyMessage}
          </p>
        ) : null}
      </div>
      {postLimit && totalPosts > pageSize ? (
        <nav aria-label="帖子分页" className="guide-home-pagination">
          <button
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
            type="button"
          >
            上一页
          </button>
          <span>第 {currentPage + 1} 页 · 每页 {pageSize} 篇</span>
          <button
            disabled={(currentPage + 1) * pageSize >= totalPosts}
            onClick={() => setCurrentPage((page) => page + 1)}
            type="button"
          >
            下一页
          </button>
        </nav>
      ) : null}
    </section>
  );
}

export function GuidePostsOnNavigationPage({
  config,
}: {
  config: SiteChromeConfig;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const currentPath = normalizeGuidePagePath(`${pathname}${query ? `?${query}` : ""}`);
  const isHandledByDedicatedBoard =
    currentPath === "/" || currentPath === "/contact" || currentPath.startsWith("/contact/");
  const isAdminRoute = currentPath === "/admin" || currentPath.startsWith("/admin/");
  const isNavigationPage = config?.nav?.items?.length
    ? guidePostPagePlacementOptions(config).some(
    (option) => option.path === currentPath,
      )
    : false;

  if (!currentPath || isHandledByDedicatedBoard || isAdminRoute || !isNavigationPage) {
    return null;
  }

  return (
    <div className="guide-posts-under-page">
      <GuideBoard
        compact
        eyebrow="PAGE POSTS · 页面帖子"
        hideWhenEmpty
        initialExpanded
        placementPath={currentPath}
        title="页面帖子"
      />
    </div>
  );
}
