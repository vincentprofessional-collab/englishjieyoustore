export type MemberPlan = "monthly" | "quarterly" | "yearly" | "lifetime";
export type MembershipState = "active" | "expired" | "guest";

export type MembershipProfile = {
  member_number?: number | null;
  membership_expires_at?: string | null;
  membership_status?: string | null;
};

export type MembershipEntitlement = {
  created_at?: string | null;
  expires_at: string;
  plan: string;
  starts_at: string;
  status: string;
};

export function readMemberPlan(value: unknown): MemberPlan | null {
  return value === "monthly" || value === "quarterly" || value === "yearly" || value === "lifetime"
    ? value
    : null;
}

export function resolveCurrentMembership(
  profile: MembershipProfile | null | undefined,
  entitlements: readonly MembershipEntitlement[],
  now = Date.now(),
  allowLegacyFallback = true,
): { plan: MemberPlan | null; state: MembershipState } {
  const activeEntitlement = entitlements
    .filter((item) => item.status === "active")
    .filter((item) => {
      const startsAt = Date.parse(item.starts_at);
      const expiresAt = item.expires_at.trim().toLowerCase();
      return startsAt <= now && (
        expiresAt === "infinity" || expiresAt === "+infinity" || Date.parse(item.expires_at) > now
      );
    })
    .map((item) => readMemberPlan(item.plan))
    .find((plan): plan is MemberPlan => plan !== null) ?? null;

  if (activeEntitlement) return { plan: activeEntitlement, state: "active" };

  const mayUseLegacyProfile = allowLegacyFallback && entitlements.length === 0;
  if (mayUseLegacyProfile && profile?.membership_status === "lifetime") {
    return { plan: "lifetime", state: "active" };
  }
  if (mayUseLegacyProfile && profile?.membership_status === "paid") {
    const expiresAt = profile.membership_expires_at;
    if (!expiresAt || Date.parse(expiresAt) > now) return { plan: "yearly", state: "active" };
  }

  return {
    plan: null,
    state: entitlements.length > 0 || profile?.member_number != null ? "expired" : "guest",
  };
}
