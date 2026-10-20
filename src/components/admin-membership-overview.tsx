"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminRequest } from "@/lib/admin/request";
import { formatProjectPrice } from "@/lib/access-control";

type SalesPeriod = "day" | "month" | "quarter" | "year";
type SalesSummary = {
  totalMembers: number;
  totalQualifications: number;
  totalSalesCny: number;
  projects: { key: string; title: string; members: number }[];
  series: Record<SalesPeriod, { label: string; amountCny: number }[]>;
};
type SalesMember = {
  id: string;
  account: string;
  project: string;
  plan: string;
  priceCny: number | null;
  purchasedAt: string | null;
  expiresAt: string;
};
type MemberPage = { total: number; offset: number; limit: number; hasMore: boolean; items: SalesMember[] };
type Partition<T> = { data: T | null; error: string; lastUpdatedAt: string | null; loading: boolean };
const emptyPartition = <T,>(): Partition<T> => ({ data: null, error: "", lastUpdatedAt: null, loading: false });

function partitionMessage(label: string, state: Partition<unknown>) {
  if (state.error) return <p className="admin-card-note" role="alert">{label}读取失败：{state.error}{state.lastUpdatedAt ? ` 保留上次成功数据（${new Date(state.lastUpdatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}）。` : " 暂无成功读取的数据。"}</p>;
  if (state.loading && !state.data) return <p className="admin-card-note" role="status">正在读取{label}……</p>;
  return state.lastUpdatedAt ? <p className="admin-card-note">{label}更新于 {new Date(state.lastUpdatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</p> : null;
}

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : "会员统计读取失败，请重试。";
}

export function AdminMembershipOverview({ refreshKey }: { refreshKey: number }) {
  const [summary, setSummary] = useState<Partition<SalesSummary>>(emptyPartition);
  const [members, setMembers] = useState<Partition<MemberPage>>(emptyPartition);
  const [retry, setRetry] = useState(0);
  const refreshController = useRef<AbortController | null>(null);
  const pageController = useRef<AbortController | null>(null);
  const refreshInFlight = useRef(false);
  const mounted = useRef(false);
  const currentOffset = useRef(0);
  const resumeAfterVisibility = useRef(false);
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  const loadMemberPage = useCallback(async (offset: number, parentSignal?: AbortSignal) => {
    if (pageController.current) return;
    const controller = new AbortController();
    const abortChild = () => controller.abort();
    if (parentSignal?.aborted) controller.abort();
    else parentSignal?.addEventListener("abort", abortChild, { once: true });
    pageController.current = controller;
    setMembers((current) => ({ ...current, error: "", loading: true }));
    try {
      const page = await adminRequest(`/api/admin/membership-sales?view=members&offset=${offset}&limit=20`, { signal: controller.signal }) as MemberPage;
      if (controller.signal.aborted || !mounted.current) return;
      currentOffset.current = page.offset;
      setMembers({ data: page, error: "", lastUpdatedAt: new Date().toISOString(), loading: false });
    } catch (reason) {
      if (controller.signal.aborted || !mounted.current) return;
      setMembers((current) => ({ ...current, error: errorMessage(reason), loading: false }));
    } finally {
      parentSignal?.removeEventListener("abort", abortChild);
      if (pageController.current === controller) pageController.current = null;
      if (resumeAfterVisibility.current && document.visibilityState === "visible" && mounted.current && !refreshInFlight.current) {
        resumeAfterVisibility.current = false;
        queueMicrotask(() => void refreshRef.current());
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!mounted.current || !refreshKey || document.visibilityState === "hidden" || refreshInFlight.current) return;
    refreshInFlight.current = true;
    const controller = new AbortController();
    refreshController.current = controller;
    setSummary((current) => ({ ...current, error: "", loading: true }));
    const summaryRequest = adminRequest("/api/admin/membership-sales?view=summary", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted && mounted.current) setSummary({ data: data as SalesSummary, error: "", lastUpdatedAt: new Date().toISOString(), loading: false });
      })
      .catch((reason) => {
        if (!controller.signal.aborted && mounted.current) setSummary((current) => ({ ...current, error: errorMessage(reason), loading: false }));
      });
    const pageRequest = loadMemberPage(currentOffset.current, controller.signal);
    try {
      await Promise.all([summaryRequest, pageRequest]);
    } finally {
      if (refreshController.current === controller) refreshController.current = null;
      refreshInFlight.current = false;
      if (resumeAfterVisibility.current && !pageController.current && document.visibilityState === "visible" && mounted.current) {
        resumeAfterVisibility.current = false;
        queueMicrotask(() => void refreshRef.current());
      }
    }
  }, [loadMemberPage, refreshKey]);
  refreshRef.current = refresh;

  useEffect(() => {
    mounted.current = true;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (refreshInFlight.current || pageController.current) resumeAfterVisibility.current = true;
        refreshController.current?.abort();
        pageController.current?.abort();
        setSummary((current) => ({ ...current, loading: false }));
        setMembers((current) => ({ ...current, loading: false }));
      } else void refreshRef.current();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      mounted.current = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      refreshController.current?.abort();
      pageController.current?.abort();
      refreshController.current = null;
      pageController.current = null;
      refreshInFlight.current = false;
      resumeAfterVisibility.current = false;
    };
  }, []);

  useEffect(() => { void refresh(); }, [refresh, retry]);

  const report = summary.data;
  return <section className="admin-editor-card admin-membership-overview" aria-label="会员与销售统计">
    <h3>现有付费会员与销售统计</h3>
    {partitionMessage("会员和销售汇总", summary)}
    {partitionMessage("会员明细", members)}
    {(summary.error || members.error) && <button onClick={() => setRetry((value) => value + 1)} type="button">重试统计</button>}
    {report ? <MembershipSalesContent summary={report} members={members} onPage={loadMemberPage} /> : null}
  </section>;
}

function MembershipSalesContent({ summary, members, onPage }: {
  summary: SalesSummary;
  members: Partition<MemberPage>;
  onPage: (offset: number) => Promise<void>;
}) {
  const [period, setPeriod] = useState<SalesPeriod>("day");
  const page = members.data;
  const series = summary.series[period] ?? [];
  const maximum = Math.max(1, ...series.map((point) => point.amountCny));
  const width = 800, height = 220, left = 62, right = 24, top = 24, bottom = 36;
  const x = (index: number) => left + index / Math.max(1, series.length - 1) * (width - left - right);
  const y = (amount: number) => height - bottom - amount / maximum * (height - top - bottom);
  const path = series.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.amountCny)}`).join(" ");
  const date = (value: string) => /^(?:\+)?infinity$/i.test(value) ? "永久有效" : new Date(value).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" });

  return <div className="admin-membership-content">
    <div className="admin-membership-kpis"><div><span>现有会员</span><strong>{summary.totalMembers} 名</strong></div><div><span>有效项目资格</span><strong>{summary.totalQualifications} 项</strong></div><div><span>累计确认销售额</span><strong>{formatProjectPrice(summary.totalSalesCny)}</strong></div></div>
    <div className="admin-membership-projects">{summary.projects.map((project) => <span key={project.key}>{project.title} <strong>{project.members} 名</strong></span>)}</div>
    <div className="admin-membership-table-scroll"><table><thead><tr><th>会员</th><th>付费项目</th><th>会员类型</th><th>价格</th><th>购买日期</th><th>到期日期</th></tr></thead><tbody>{page?.items.map((member) => <tr key={member.id}><td>{member.account}</td><td>{member.project}</td><td>{member.plan}</td><td>{member.priceCny === null ? "" : formatProjectPrice(member.priceCny)}</td><td>{member.purchasedAt ? <time dateTime={member.purchasedAt}>{date(member.purchasedAt)}</time> : ""}</td><td><time dateTime={/infinity/i.test(member.expiresAt) ? undefined : member.expiresAt}>{date(member.expiresAt)}</time></td></tr>)}</tbody></table></div>
    {page && !page.items.length ? <p>目前没有有效的会员资格。</p> : null}
    {page && page.total > page.limit ? <nav aria-label="后台会员翻页" className="admin-membership-pagination"><button disabled={members.loading || page.offset === 0} onClick={() => void onPage(Math.max(0, page.offset - page.limit))} type="button">上一页</button><span>{Math.floor(page.offset / page.limit) + 1} / {Math.ceil(page.total / page.limit)}</span><button disabled={members.loading || !page.hasMore} onClick={() => void onPage(page.offset + page.limit)} type="button">下一页</button></nav> : null}
    <p className="admin-membership-note">会员名单按当前生效资格去重；无付款订单的会员仍列出，价格与购买日期留空。</p>
    <header className="admin-sales-chart-head"><h4>销售金额趋势</h4><nav aria-label="销售统计周期">{([["day", "每日"], ["month", "每月"], ["quarter", "每季"], ["year", "每年"]] as const).map(([key, label]) => <button aria-pressed={period === key} key={key} onClick={() => setPeriod(key)} type="button">{label}</button>)}</nav></header>
    <svg aria-label={`${{ day: "每日", month: "每月", quarter: "每季", year: "每年" }[period]}销售金额趋势图，单位：元`} className="admin-sales-chart" role="img" viewBox={`0 0 ${width} ${height}`}>
      {[0, .5, 1].map((ratio) => <g key={ratio}><line stroke="#dce5e8" x1={left} x2={width - right} y1={y(maximum * ratio)} y2={y(maximum * ratio)} /><text textAnchor="end" x={left - 10} y={y(maximum * ratio) + 4}>{Math.round(maximum * ratio * 100) / 100}</text></g>)}
      <path d={path} fill="none" stroke="#287ba2" strokeLinejoin="round" strokeWidth="3" />
      {series.map((point, index) => <circle cx={x(index)} cy={y(point.amountCny)} fill="#287ba2" key={point.label} r="4"><title>{point.label}：{formatProjectPrice(point.amountCny)}</title></circle>)}
      <text x={left} y={height - 8}>{series[0]?.label}</text><text textAnchor="end" x={width - right} y={height - 8}>{series.at(-1)?.label}</text>
    </svg>
    <p className="admin-membership-note">销售额按已确认付款订单统计；手工开通资格不计入销售额。</p>
    <details className="admin-sales-detail"><summary>查看金额明细</summary><table><thead><tr><th>日期 / 周期</th><th>销售额</th></tr></thead><tbody>{series.map((point) => <tr key={point.label}><td>{point.label}</td><td>{formatProjectPrice(point.amountCny)}</td></tr>)}</tbody></table></details>
  </div>;
}
