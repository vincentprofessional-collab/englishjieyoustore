export type CommunitySource = "guide" | "bbc";
export type CommunityItem = {
  id: string;
  source: CommunitySource;
  kind: "post" | "comment";
  body: string;
  author: string;
  title: string;
  href: string;
  createdAt: string;
};
export type CommunityInbox = {
  unread: number;
  readAt: string;
  latestReplyAt: string | null;
  incoming?: CommunityItem[];
  authored?: CommunityItem[];
};
export const COMMUNITY_READ_KEY = "community_read_at";
export const EMPTY_READ_AT = "1970-01-01T00:00:00.000Z";

export function readCommunityCursor(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString() : EMPTY_READ_AT;
}

export function nextCommunityCursor(existing: unknown, requested: string, now = Date.now()) {
  return new Date(Math.max(Date.parse(readCommunityCursor(existing)), Math.min(Date.parse(requested), now))).toISOString();
}
