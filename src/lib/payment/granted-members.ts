export const MEMBER_PLANS = { monthly: "月卡会员", quarterly: "季卡会员", yearly: "年卡会员", lifetime: "终身会员" } as const;
export type BbcEntitlement = {
  user_id: string; plan: string; status: string; project_key: string;
  starts_at: string; expires_at: string;
};
export type PublicBbcMember = { maskedAccount: string; plan: string; startedAt: string };

export function maskMemberAccount(account: string) {
  const characters = account.split("@")[0].replace(/[^a-z0-9]/gi, "");
  // Conceal the first three characters, all middle characters, and the email domain.
  return `***${characters.length > 3 ? characters.slice(-Math.min(2, characters.length - 3)) : ""}`;
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
  return currentBbcEntitlements(rows, now).map(row => ({
    maskedAccount: maskMemberAccount(accounts.get(row.user_id) ?? ""), plan: MEMBER_PLANS[row.plan as keyof typeof MEMBER_PLANS],
    startedAt: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(row.starts_at)),
  }));
}
