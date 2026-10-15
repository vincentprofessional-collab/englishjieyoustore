import { MEMBER_PLANS } from "./granted-members";

export type SalesPeriod = "day" | "month" | "quarter" | "year";
export type SalesOrder = { id: string; user_id: string; project_key: string; plan: string; status: string; amount_cny: string | number; fulfilled_at: string | null };
export type GrantedMembership = { id: string; user_id: string; project_key: string; plan: string; status: string; starts_at: string; expires_at: string };
export type MembershipSalesReport = {
  totalMembers: number; totalQualifications: number; totalSalesCny: number;
  projects: { key: string; title: string; members: number }[];
  members: { id: string; account: string; project: string; plan: string; priceCny: number | null; purchasedAt: string | null; expiresAt: string }[];
  series: Record<SalesPeriod, { label: string; amountCny: number }[]>;
};
const chinaDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function salesPeriodKey(value: string, period: SalesPeriod) {
  const day = chinaDate(new Date(value));
  if (period === "day") return day;
  if (period === "month") return day.slice(0, 7);
  if (period === "quarter") return `${day.slice(0, 4)}-Q${Math.ceil(Number(day.slice(5, 7)) / 3)}`;
  return day.slice(0, 4);
}

export function buildSalesSeries(orders: SalesOrder[], period: SalesPeriod, now = Date.now()) {
  const [year, month, day] = chinaDate(new Date(now)).split("-").map(Number);
  const length = { day: 30, month: 12, quarter: 8, year: 5 }[period];
  const keys = Array.from({ length }, (_, index) => {
    const back = length - 1 - index;
    const date = period === "day" ? new Date(Date.UTC(year, month - 1, day - back, 4))
      : period === "month" ? new Date(Date.UTC(year, month - 1 - back, 1, 4))
      : period === "quarter" ? new Date(Date.UTC(year, Math.floor((month - 1) / 3) * 3 - back * 3, 1, 4))
      : new Date(Date.UTC(year - back, 0, 1, 4));
    return salesPeriodKey(date.toISOString(), period);
  });
  const amounts = new Map(keys.map(key => [key, 0]));
  for (const order of orders) {
    if (!isConfirmedOrder(order, now)) continue;
    const key = salesPeriodKey(order.fulfilled_at!, period);
    if (amounts.has(key)) amounts.set(key, amounts.get(key)! + Number(order.amount_cny));
  }
  return keys.map(label => ({ label, amountCny: round(amounts.get(label)!) }));
}

function isConfirmedOrder(order: SalesOrder, now: number) {
  return order.status === "fulfilled" && order.fulfilled_at && Number.isFinite(Date.parse(order.fulfilled_at)) && Date.parse(order.fulfilled_at) <= now && Number.isFinite(Number(order.amount_cny)) && Number(order.amount_cny) >= 0;
}

export function buildMembershipSalesReport(
  entitlements: GrantedMembership[], orders: SalesOrder[], profiles: { id: string; email: string | null; display_name: string | null }[],
  projects: { project_key: string; title: string }[], now = Date.now(),
): MembershipSalesReport {
  const current = new Map<string, GrantedMembership>();
  for (const row of entitlements) {
    const expires = row.expires_at.trim().toLowerCase();
    if (row.status !== "active" || !(Date.parse(row.starts_at) <= now) || !(expires === "infinity" || expires === "+infinity" || Date.parse(row.expires_at) > now)) continue;
    const key = `${row.user_id}:${row.project_key}`, existing = current.get(key);
    if (!existing || Date.parse(row.starts_at) > Date.parse(existing.starts_at)) current.set(key, row);
  }
  const titles = new Map(projects.map(row => [row.project_key, row.title]));
  const accounts = new Map(profiles.map(row => [row.id, row.email || row.display_name || "已注册用户"]));
  const confirmed = new Map<string, SalesOrder>();
  const paidOrders = [...new Map(orders.map(row => [row.id, row])).values()].filter(row => isConfirmedOrder(row, now));
  for (const order of paidOrders) {
    const key = `${order.user_id}:${order.project_key}:${order.plan}`, previous = confirmed.get(key);
    if (!previous || Date.parse(order.fulfilled_at!) > Date.parse(previous.fulfilled_at!)) confirmed.set(key, order);
  }
  const active = [...current.values()].sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at) || a.id.localeCompare(b.id));
  const projectCounts = new Map<string, number>();
  for (const row of active) projectCounts.set(row.project_key, (projectCounts.get(row.project_key) ?? 0) + 1);
  return {
    totalMembers: new Set(active.map(row => row.user_id)).size, totalQualifications: active.length,
    totalSalesCny: round(paidOrders.reduce((sum, order) => sum + Number(order.amount_cny), 0)),
    projects: [...projectCounts].map(([key, members]) => ({ key, members, title: titles.get(key) ?? key })),
    members: active.map(row => {
      const order = confirmed.get(`${row.user_id}:${row.project_key}:${row.plan}`);
      return { id: row.id, account: accounts.get(row.user_id) ?? "已注册用户", project: titles.get(row.project_key) ?? row.project_key,
        plan: MEMBER_PLANS[row.plan as keyof typeof MEMBER_PLANS] ?? row.plan,
        priceCny: order ? Number(order.amount_cny) : null, purchasedAt: order?.fulfilled_at ?? null, expiresAt: row.expires_at };
    }),
    series: Object.fromEntries((["day", "month", "quarter", "year"] as const).map(period => [period, buildSalesSeries(paidOrders, period, now)])) as MembershipSalesReport["series"],
  };
}
