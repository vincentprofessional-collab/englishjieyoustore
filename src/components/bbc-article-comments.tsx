"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import styles from "./bbc-article-comments.module.css";

type ArticleComment = {
  author_name: string;
  avatar_url?: string | null;
  body: string;
  created_at: string;
  id: string;
  member_number?: number | null;
  member_plan?: "monthly" | "quarterly" | "yearly" | "lifetime" | null;
  membership_state?: "active" | "expired" | "guest" | null;
  parent_comment_id?: string | null;
  reply_to_comment_id?: string | null;
  user_id?: string | null;
};

type CommentIdentity = {
  avatarUrl: string | null;
  displayName: string;
  memberNumber: number | null;
  memberPlan: ArticleComment["member_plan"];
  membershipState: NonNullable<ArticleComment["membership_state"]>;
  userId: string;
};

type CommentProfile = {
  avatar_url?: string | null;
  display_name?: string | null;
  member_number?: number | null;
  membership_expires_at?: string | null;
  membership_status?: string | null;
  role?: string | null;
};

type CommentEntitlement = {
  created_at?: string | null;
  expires_at: string;
  plan: string;
  starts_at: string;
  status: string;
};

const MAX_COMMENTS = 100;
const MAX_BODY_LENGTH = 1000;
const MAX_EXPANDED_REPLIES = 5;

function commentsStorageKey(articleId: string) {
  return `ielts-platform.bbc-comments.${articleId}`;
}

function readLocalComments(articleId: string): ArticleComment[] {
  try {
    const saved = window.localStorage.getItem(commentsStorageKey(articleId));
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ArticleComment =>
      Boolean(
        item &&
        typeof item.id === "string" &&
        typeof item.author_name === "string" &&
        typeof item.body === "string" &&
        typeof item.created_at === "string",
      ),
    ).slice(0, MAX_COMMENTS);
  } catch {
    return [];
  }
}

function saveLocalComments(articleId: string, comments: ArticleComment[]) {
  try {
    window.localStorage.setItem(commentsStorageKey(articleId), JSON.stringify(comments.slice(0, MAX_COMMENTS)));
  } catch {
    // The comment remains in the current view if browser storage is unavailable.
  }
}

function formatMemberNumber(value: number | null | undefined) {
  return value == null ? null : String(value);
}

function memberPlanLabel(plan: ArticleComment["member_plan"]) {
  if (plan === "lifetime") return "终身会员";
  if (plan === "yearly") return "年卡会员";
  if (plan === "quarterly") return "季卡会员";
  if (plan === "monthly") return "月卡会员";
  return null;
}

function membershipAvatarClass(state: NonNullable<ArticleComment["membership_state"]>) {
  if (state === "active") return styles.avatarFallbackActive;
  if (state === "expired") return styles.avatarFallbackExpired;
  return styles.avatarFallbackGuest;
}

function getInitiallyExpandedThreads(comments: ArticleComment[]) {
  const replyCounts = new Map<string, number>();
  for (const comment of comments) {
    if (comment.parent_comment_id) {
      replyCounts.set(comment.parent_comment_id, (replyCounts.get(comment.parent_comment_id) ?? 0) + 1);
    }
  }
  return new Set(
    [...replyCounts]
      .filter(([, count]) => count <= MAX_EXPANDED_REPLIES)
      .map(([rootId]) => rootId),
  );
}

export function BbcArticleComments({ articleId }: { articleId: string }) {
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [authorName, setAuthorName] = useState("访客");
  const [identity, setIdentity] = useState<CommentIdentity | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isIdentityLoading, setIsIdentityLoading] = useState(true);
  const [body, setBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ rootId: string; targetId: string } | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(() => new Set());
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<"loading" | "remote" | "local" | "unavailable">("loading");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    const isLocalPreview = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    const localComments = isLocalPreview ? readLocalComments(articleId) : [];
    setComments(localComments);
    setExpandedThreads(getInitiallyExpandedThreads(localComments));

    if (isLocalPreview) {
      setStorageMode("local");
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const response = await fetch(`/api/bbc-article-comments?articleId=${encodeURIComponent(articleId)}`, {
          cache: "no-store",
        });
        const result = (await response.json().catch(() => null)) as { comments?: ArticleComment[] } | null;
        if (!cancelled && response.ok && Array.isArray(result?.comments)) {
          const remoteComments = result.comments;
          const knownIds = new Set(remoteComments.map((comment) => comment.id));
          const mergedComments = [
            ...remoteComments,
            ...localComments.filter((comment) => !knownIds.has(comment.id)),
          ].slice(0, MAX_COMMENTS);
          setComments(mergedComments);
          setExpandedThreads(getInitiallyExpandedThreads(mergedComments));
          setStorageMode("remote");
          return;
        }
      } catch {
        // Fall back to public Supabase reads when the server endpoint is unavailable.
      }
      if (cancelled) return;

      const withIdentity = await supabase
        .from("bbc_article_comments")
        .select("id,author_name,body,created_at,user_id,avatar_url,member_plan,member_number,parent_comment_id,reply_to_comment_id")
        .eq("article_id", articleId)
        .order("created_at", { ascending: false })
        .limit(MAX_COMMENTS);
      const result = withIdentity.error
        ? await supabase
            .from("bbc_article_comments")
            .select("id,author_name,body,created_at")
            .eq("article_id", articleId)
            .order("created_at", { ascending: false })
            .limit(MAX_COMMENTS)
        : withIdentity;

      if (cancelled) return;
      if (result.error) {
        setStorageMode("unavailable");
        return;
      }
      const remoteComments = (result.data ?? []) as ArticleComment[];
      const knownIds = new Set(remoteComments.map((comment) => comment.id));
      const mergedComments = [
        ...remoteComments,
        ...localComments.filter((comment) => !knownIds.has(comment.id)),
      ].slice(0, MAX_COMMENTS);
      setComments(mergedComments);
      setExpandedThreads(getInitiallyExpandedThreads(mergedComments));
      setStorageMode("remote");
    })();

    return () => {
      cancelled = true;
    };
  }, [articleId]);

  useEffect(() => {
    let cancelled = false;

    async function loadIdentity() {
      setIsIdentityLoading(true);
      const { data: { user }, error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error || !user) {
        setIdentity(null);
        setIsAdmin(false);
        setAuthorName("访客");
        setIsIdentityLoading(false);
        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("display_name,avatar_url,membership_status,membership_expires_at,member_number,role")
        .eq("id", user.id)
        .maybeSingle();
      const profile = (profileResult.error
        ? (await supabase
            .from("profiles")
            .select("display_name,avatar_url,membership_status,membership_expires_at,role")
            .eq("id", user.id)
            .maybeSingle()).data
        : profileResult.data) as CommentProfile | null;
      const now = new Date();
      const { data: entitlements } = await supabase
        .from("user_project_entitlements")
        .select("plan,status,starts_at,expires_at,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;

      const planRank: Record<string, number> = { monthly: 1, quarterly: 2, yearly: 3, lifetime: 4 };
      const knownEntitlements = (entitlements ?? []) as CommentEntitlement[];
      const activeEntitlements = knownEntitlements.filter((entitlement) =>
        entitlement.status === "active" &&
        new Date(entitlement.starts_at).getTime() <= now.getTime() &&
        new Date(entitlement.expires_at).getTime() > now.getTime(),
      );
      const entitlementPlan = activeEntitlements
        .map((entitlement) => entitlement.plan as NonNullable<ArticleComment["member_plan"]>)
        .sort((left, right) => (planRank[right] ?? 0) - (planRank[left] ?? 0))[0] ?? null;
      const historicalPlan = knownEntitlements
        .map((entitlement) => entitlement.plan as NonNullable<ArticleComment["member_plan"]>)
        .sort((left, right) => (planRank[right] ?? 0) - (planRank[left] ?? 0))[0] ?? null;
      const legacyPlan = profile?.membership_status === "lifetime"
        ? "lifetime"
        : profile?.membership_status === "paid"
          ? "yearly"
          : null;
      const displayName = String(
        profile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "注册用户",
      ).trim().slice(0, 40) || "注册用户";
      const profileMemberNumber = profile?.member_number;
      const memberPlan = entitlementPlan ?? legacyPlan ?? historicalPlan;
      const membershipState: NonNullable<ArticleComment["membership_state"]> = entitlementPlan ||
        profile?.membership_status === "lifetime" ||
        (profile?.membership_status === "paid" &&
          (!profile.membership_expires_at || new Date(profile.membership_expires_at).getTime() > now.getTime()))
        ? "active"
        : memberPlan || profile?.member_number != null
          ? "expired"
          : "guest";
      setIsAdmin(profile?.role === "admin");
      const memberNumber = membershipState !== "guest" && typeof profileMemberNumber === "number" && Number.isInteger(profileMemberNumber)
        ? profileMemberNumber
        : null;

      setIdentity({
        avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        displayName,
        memberNumber,
        memberPlan,
        membershipState,
        userId: user.id,
      });
      if (["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) {
        setComments((current) => {
          const next = current.map((comment) => comment.user_id === user.id
            ? { ...comment, member_number: memberNumber, member_plan: memberPlan, membership_state: membershipState }
            : comment);
          saveLocalComments(articleId, next);
          return next;
        });
      }
      setAuthorName(displayName);
      setIsIdentityLoading(false);
    }

    void loadIdentity();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        window.setTimeout(() => void loadIdentity(), 0);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [articleId]);

  async function persistComment(
    cleanBody: string,
    parentCommentId: string | null = null,
    replyToCommentId: string | null = null,
  ): Promise<{ comment: ArticleComment; local: boolean } | null> {
    const cleanName = identity?.displayName ?? (authorName.trim().slice(0, 40) || "访客");
    if (storageMode === "loading" || storageMode === "unavailable") {
      setNotice("在线留言暂不可用，请稍后再试。");
      return null;
    }

    const localThread = parentCommentId?.startsWith("local-") ?? false;
    if (storageMode === "remote" && !localThread) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch("/api/bbc-article-comments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            articleId,
            authorName: cleanName,
            body: cleanBody,
            parentCommentId,
            replyToCommentId,
            website: honeypot,
          }),
        });
        const result = (await response.json().catch(() => null)) as
          | { comment?: ArticleComment; error?: string }
          | null;

        if (response.status === 429) {
          setNotice(result?.error ?? "留言过于频繁，请稍后再试。");
          return null;
        }
        if (response.ok && result?.comment) {
          return { comment: result.comment as ArticleComment, local: false };
        }

        setStorageMode("unavailable");
        setNotice("在线留言暂不可用，请稍后再试。");
        return null;
      } catch {
        setStorageMode("unavailable");
        setNotice("在线留言暂不可用，请稍后再试。");
        return null;
      }
    }
    if (localThread) setNotice("这条回复仅保存在当前浏览器。");

    const next: ArticleComment = {
      author_name: cleanName,
      avatar_url: identity?.avatarUrl ?? null,
      body: cleanBody,
      created_at: new Date().toISOString(),
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      member_number: identity?.memberNumber ?? null,
      member_plan: identity?.memberPlan ?? null,
      membership_state: identity?.membershipState ?? "guest",
      parent_comment_id: parentCommentId,
      reply_to_comment_id: replyToCommentId,
      user_id: identity?.userId ?? null,
    };
    const nextComments = [...readLocalComments(articleId), next].slice(-MAX_COMMENTS);
    saveLocalComments(articleId, nextComments);
    return { comment: next, local: true };
  }

  function addCommentToState(result: { comment: ArticleComment; local: boolean }) {
    setComments((current) => {
      const next = [...current, result.comment].slice(-MAX_COMMENTS);
      if (result.local) saveLocalComments(articleId, next);
      return next;
    });
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!cleanBody || cleanBody.length > MAX_BODY_LENGTH) return;

    setIsSubmitting(true);
    setNotice("");
    const result = await persistComment(cleanBody);
    if (result) {
      addCommentToState(result);
      setBody("");
    }
    setIsSubmitting(false);
  }

  async function submitReply(event: FormEvent<HTMLFormElement>, rootId: string, targetId: string) {
    event.preventDefault();
    const cleanBody = replyBody.trim();
    if (!cleanBody || cleanBody.length > MAX_BODY_LENGTH) return;

    setIsReplySubmitting(true);
    setNotice("");
    const result = await persistComment(cleanBody, rootId, targetId);
    if (result) {
      addCommentToState(result);
      setReplyBody("");
      setReplyingTo(null);
      const replyCount = comments.filter((comment) => comment.parent_comment_id === rootId).length + 1;
      setExpandedThreads((current) => {
        const next = new Set(current);
        if (replyCount > MAX_EXPANDED_REPLIES) next.delete(rootId);
        else next.add(rootId);
        return next;
      });
    }
    setIsReplySubmitting(false);
  }

  function normalizeThreadExpansionAfterDelete(comment: ArticleComment) {
    const rootId = comment.parent_comment_id ?? comment.id;
    const remainingReplies = comment.parent_comment_id
      ? comments.filter((item) => item.parent_comment_id === rootId && item.id !== comment.id).length
      : 0;
    setExpandedThreads((current) => {
      const next = new Set(current);
      if (!comment.parent_comment_id || remainingReplies === 0 || remainingReplies > MAX_EXPANDED_REPLIES) {
        next.delete(rootId);
      } else {
        next.add(rootId);
      }
      return next;
    });
  }

  async function deleteComment(commentId: string) {
    if (!isAdmin || !window.confirm("确定删除这条留言吗？")) return;
    const target = comments.find((comment) => comment.id === commentId);
    if (!target) return;
    setDeletingCommentId(commentId);
    setNotice("");

    const updateLocalComments = () => {
      setComments((current) => {
        const next = current.filter((comment) =>
          comment.id !== commentId && !(target.parent_comment_id == null && comment.parent_comment_id === commentId),
        );
        saveLocalComments(articleId, next);
        return next;
      });
    };

    if (target.id.startsWith("local-")) {
      updateLocalComments();
      normalizeThreadExpansionAfterDelete(target);
      setNotice("留言已删除。");
      setDeletingCommentId(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("bbc_article_comments")
        .delete()
        .eq("article_id", articleId)
        .eq("id", commentId)
        .select("id")
        .maybeSingle();
      if (error) {
        setNotice("删除留言失败，请稍后重试。");
        return;
      }
      if (!data) {
        setNotice("这条留言不存在或已被删除。");
        return;
      }

      setComments((current) => current.filter((comment) =>
        comment.id !== commentId && !(target.parent_comment_id == null && comment.parent_comment_id === commentId),
      ));
      normalizeThreadExpansionAfterDelete(target);
      setNotice("留言已删除。");
    } catch {
      setNotice("删除留言失败，请稍后重试。");
    } finally {
      setDeletingCommentId(null);
    }
  }

  function renderCommentHeader(comment: ArticleComment) {
    const membershipState = comment.membership_state ?? (
      comment.member_plan ? "active" : comment.member_number != null ? "expired" : "guest"
    );
    const number = membershipState !== "guest" ? formatMemberNumber(comment.member_number) : null;
    const plan = memberPlanLabel(comment.member_plan);
    const avatarTone = membershipAvatarClass(membershipState);
    return (
      <div className={styles.commentHeader}>
        <span className={styles.avatarWrap}>
          {comment.avatar_url ? (
            <img alt="" className={styles.avatar} loading="lazy" src={comment.avatar_url} />
          ) : (
            <span aria-hidden="true" className={`${styles.avatarFallback} ${avatarTone}`}>{membershipState === "guest" ? "客" : "V"}</span>
          )}
        </span>
        {plan || number ? (
          <span className={`${styles.memberBadge} ${membershipState === "expired" ? styles.memberBadgeExpired : styles.memberBadgeActive}`}>
            {number ? `${number}号` : ""}{plan ?? "会员"}
          </span>
        ) : null}
        <strong className={styles.authorName}>{comment.author_name}</strong>
        <time dateTime={comment.created_at}>
          {new Date(comment.created_at).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" })}
        </time>
      </div>
    );
  }

  function renderReplyForm(rootId: string, targetId: string, targetName: string) {
    if (replyingTo?.rootId !== rootId || replyingTo.targetId !== targetId) return null;

    return (
      <form className={styles.replyForm} onSubmit={(event) => submitReply(event, rootId, targetId)}>
        <span>回复 {targetName}</span>
        <textarea
          maxLength={MAX_BODY_LENGTH}
          onChange={(event) => setReplyBody(event.target.value)}
          placeholder="写下回复……"
          required
          rows={2}
          value={replyBody}
        />
        <div>
          <button onClick={() => setReplyingTo(null)} type="button">取消</button>
          <button disabled={isReplySubmitting || !replyBody.trim()} type="submit">
            {isReplySubmitting ? "提交中…" : "发表回复"}
          </button>
        </div>
      </form>
    );
  }

  const commentsById = new Map(comments.map((comment) => [comment.id, comment]));
  const rootComments = comments
    .filter((comment) => !comment.parent_comment_id || !commentsById.has(comment.parent_comment_id))
    .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());

  return (
    <section aria-labelledby={`${articleId}-comments-heading`} className={styles.section}>
      <div className={styles.headingRow}>
        <h2 id={`${articleId}-comments-heading`}>文章评论</h2>
        <span>{comments.length} 条</span>
      </div>
      <form className={styles.form} onSubmit={submitComment}>
        {identity ? (
          <div className={styles.identityPreview}>
            <span className={styles.previewAvatar}>
              {identity.avatarUrl ? <img alt="" className={styles.avatar} src={identity.avatarUrl} /> : (
                <span className={`${styles.avatarFallback} ${membershipAvatarClass(identity.membershipState)}`}>
                  {identity.membershipState === "guest" ? "客" : "V"}
                </span>
              )}
            </span>
            {identity.membershipState !== "guest" ? (
              <span className={`${styles.memberBadge} ${identity.membershipState === "expired" ? styles.memberBadgeExpired : styles.memberBadgeActive}`}>
                {identity.memberNumber != null ? `${identity.memberNumber}号` : ""}{memberPlanLabel(identity.memberPlan) ?? "会员"}
              </span>
            ) : null}
            <strong>{identity.displayName}</strong>
            <small>使用注册资料留言</small>
          </div>
        ) : (
          <label className={styles.nameField}>
            昵称
            <input
              autoComplete="nickname"
              maxLength={40}
              onChange={(event) => setAuthorName(event.target.value)}
              value={authorName}
            />
          </label>
        )}
        <label className={styles.bodyField}>
          留言
          <textarea
            maxLength={MAX_BODY_LENGTH}
            onChange={(event) => setBody(event.target.value)}
            placeholder="写下你的想法……"
            required
            rows={4}
            value={body}
          />
        </label>
        <label aria-hidden="true" className={styles.honeypot}>
          网站
          <input
            autoComplete="off"
            onChange={(event) => setHoneypot(event.target.value)}
            tabIndex={-1}
            value={honeypot}
          />
        </label>
        <div className={styles.formFooter}>
          <span>{notice || (storageMode === "local" ? "本地预览留言仅保存在当前浏览器" : storageMode === "unavailable" ? "在线留言暂不可用" : "访客也可以留言")}</span>
          <button disabled={isSubmitting || isIdentityLoading || storageMode === "loading" || storageMode === "unavailable" || !body.trim()} type="submit">
            {isSubmitting ? "提交中…" : "发表留言"}
          </button>
        </div>
      </form>
      {rootComments.length ? (
        <ol className={styles.list}>
          {rootComments.map((comment) => {
            const replies = comments
              .filter((candidate) => candidate.parent_comment_id === comment.id)
              .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
            const isExpanded = expandedThreads.has(comment.id);

            return (
              <li className={styles.comment} key={comment.id}>
                {renderCommentHeader(comment)}
                <p>{comment.body}</p>
                <div className={styles.commentActions}>
                  <button
                    onClick={() => {
                      setReplyingTo({ rootId: comment.id, targetId: comment.id });
                    }}
                    type="button"
                  >回复</button>
                  {isAdmin ? (
                    <button disabled={deletingCommentId === comment.id} onClick={() => void deleteComment(comment.id)} type="button">
                      {deletingCommentId === comment.id ? "删除中…" : "删除"}
                    </button>
                  ) : null}
                  {replies.length ? (
                    <button
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedThreads((current) => {
                        const next = new Set(current);
                        if (next.has(comment.id)) next.delete(comment.id);
                        else next.add(comment.id);
                        return next;
                      })}
                      type="button"
                    >{isExpanded ? "收起回复" : `展开 ${replies.length} 条回复`}</button>
                  ) : null}
                </div>
                {renderReplyForm(comment.id, comment.id, comment.author_name)}
                {isExpanded && replies.length ? (
                  <ol className={styles.replyList}>
                    {replies.map((reply) => (
                      <li className={styles.replyComment} key={reply.id}>
                        {renderCommentHeader(reply)}
                        {reply.reply_to_comment_id && reply.reply_to_comment_id !== comment.id ? (
                          <small className={styles.replyTarget}>
                            回复 {commentsById.get(reply.reply_to_comment_id)?.author_name ?? "留言用户"}
                          </small>
                        ) : null}
                        <p>{reply.body}</p>
                        <button
                          className={styles.replyAction}
                          onClick={() => {
                            setReplyingTo({ rootId: comment.id, targetId: reply.id });
                            setExpandedThreads((current) => new Set(current).add(comment.id));
                          }}
                          type="button"
                        >回复</button>
                        {isAdmin ? (
                          <button
                            className={styles.replyAction}
                            disabled={deletingCommentId === reply.id}
                            onClick={() => void deleteComment(reply.id)}
                            type="button"
                          >{deletingCommentId === reply.id ? "删除中…" : "删除"}</button>
                        ) : null}
                        {renderReplyForm(comment.id, reply.id, reply.author_name)}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className={styles.empty}>还没有留言，来说第一句吧。</p>
      )}
    </section>
  );
}
