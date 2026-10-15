export type GuideComment = {
  avatarUrl?: string;
  body: string;
  createdAt: string;
  displayName: string;
  id: string;
  isAdmin?: boolean;
  isGuest?: boolean;
  isPaidMember?: boolean;
  parentCommentId?: string | null;
  replyToCommentId?: string | null;
  userId?: string | null;
};

export type GuideCommentRow = {
  avatar_url?: string | null;
  body: string;
  created_at: string;
  display_name: string;
  id: string;
  is_admin?: boolean;
  is_guest?: boolean;
  is_paid_member?: boolean;
  parent_comment_id?: string | null;
  reply_to_comment_id?: string | null;
  user_id?: string | null;
};

export function parseGuideComment(comment: GuideCommentRow): GuideComment {
  return {
    avatarUrl: comment.avatar_url ?? undefined, body: comment.body, createdAt: comment.created_at,
    displayName: comment.display_name, id: comment.id, isAdmin: comment.is_admin === true,
    isGuest: comment.is_guest ?? !comment.user_id, isPaidMember: comment.is_paid_member ?? false,
    parentCommentId: comment.parent_comment_id ?? null, replyToCommentId: comment.reply_to_comment_id ?? null,
    userId: comment.user_id ?? null,
  };
}

export function buildGuideCommentTree(comments: GuideComment[]) {
  const byId = new Map(comments.map(comment => [comment.id, comment]));
  const parents = new Map<string, string | null>();
  for (const comment of byId.values()) {
    const candidate = comment.replyToCommentId || comment.parentCommentId;
    parents.set(comment.id, candidate && candidate !== comment.id && byId.has(candidate) ? candidate : null);
  }
  for (const id of byId.keys()) {
    const visited = new Set([id]);
    let parent = parents.get(id);
    while (parent) {
      if (visited.has(parent)) { parents.set(id, null); break; }
      visited.add(parent); parent = parents.get(parent);
    }
  }
  const children = new Map<string | null, GuideComment[]>();
  for (const comment of byId.values()) {
    const parent = parents.get(comment.id) ?? null;
    const group = children.get(parent) ?? [];
    group.push(comment); children.set(parent, group);
  }
  for (const group of children.values()) group.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  function descendantCount(id: string): number {
    return (children.get(id) ?? []).reduce((total, child) => total + 1 + descendantCount(child.id), 0);
  }
  function rootId(id: string): string {
    let root = id;
    while (parents.get(root)) root = parents.get(root)!;
    return root;
  }
  /** Administrator messages remain visible through any collapsed ancestor. */
  function visibleChildren(parent: string | null, expanded: boolean): GuideComment[] {
    return (children.get(parent) ?? []).flatMap(comment => expanded || comment.isAdmin
      ? [comment] : visibleChildren(comment.id, false));
  }
  return { byId, descendantCount, rootId, visibleChildren };
}
