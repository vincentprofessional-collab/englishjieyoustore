export const MEMBER_PLANS = { monthly: "月卡会员", quarterly: "季卡会员", yearly: "年卡会员", lifetime: "终身会员" } as const;
export type BbcEntitlement = {
  user_id: string; plan: string; status: string; project_key: string;
  starts_at: string; expires_at: string;
};
export type PublicBbcMember = { maskedAccount: string; plan: string; startedAt: string; expiresAt: string };

export function maskMemberAccount(account: string) {
  const at = account.lastIndexOf("@");
  const name = Array.from(at < 0 ? account : account.slice(0, at));
  const hidden = Math.min(3, name.length);
  return `${"*".repeat(hidden) || "***"}${name.slice(hidden).join("")}${at < 0 ? "" : account.slice(at)}`;
}

export function currentBbcEntitlements(rows: BbcEntitlement[], now = Date.now()) {
  const users = new Map<string, BbcEntitlement>();
  for (const row of rows) {
    const expires = row.expires_at.trim().toLowerCase();
    if (row.project_key !== "bbc" || row.status !== "active" || !(Date.parse(row.starts_at) <= now) ||
      !(expires === "infinity" || expires === "+infinity" || Date.parse(row.expires_at) > now) || !Object.hasOwn(MEMBER_PLANS, row.plan)) continue;
    const previous = users.get(row.user_id);
    if (!previous || Date.parse(row.starts_at) > Date.parse(previous.starts_at)) users.set(row.user_id, row);
  }
  return [...users.values()].sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at) || a.user_id.localeCompare(b.user_id));
}

export function publicBbcMembers(rows: BbcEntitlement[], accounts: Map<string, string>, now = Date.now()): PublicBbcMember[] {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });
  return currentBbcEntitlements(rows, now).map(row => ({
    maskedAccount: maskMemberAccount(accounts.get(row.user_id) ?? ""), plan: MEMBER_PLANS[row.plan as keyof typeof MEMBER_PLANS],
    startedAt: date.format(new Date(row.starts_at)),
    expiresAt: row.plan === "lifetime" || /^(?:\+)?infinity$/i.test(row.expires_at.trim()) ? "永久有效" : date.format(new Date(row.expires_at)),
  }));
}
