"use client";

import { useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin/request";
import { formatProjectPrice } from "@/lib/access-control";
import type { MembershipSalesReport, SalesPeriod } from "@/lib/payment/membership-sales";

export function AdminMembershipOverview({ refreshKey }: { refreshKey: number }) {
  const [report, setReport] = useState<MembershipSalesReport | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!refreshKey) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => { setError("会员统计读取超时，请重试。"); controller.abort(); }, 20000);
    setError("");
    void adminRequest("/api/admin/membership-sales", { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setReport(data as MembershipSalesReport); })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "会员统计读取失败。"); }).finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [refreshKey, retry]);
  return <section className="admin-editor-card admin-membership-overview" aria-label="会员与销售统计">
    <h3>现有付费会员与销售统计</h3>
    {error ? <p role="alert">{error} <button onClick={() => setRetry(value => value + 1)} type="button">重试</button></p> : null}
    {report ? <MembershipSalesContent report={report} /> : !error ? <p role="status">正在读取会员与销售统计……</p> : null}
  </section>;
}

export function MembershipSalesContent({ report }: { report: MembershipSalesReport }) {
  const [period, setPeriod] = useState<SalesPeriod>("day");
  const [page, setPage] = useState(0);
  const selectedPage = Math.min(page, Math.max(0, Math.ceil(report.members.length / 20) - 1));
  const series = report.series[period], maximum = Math.max(1, ...series.map(point => point.amountCny));
  const width = 800, height = 220, left = 62, right = 24, top = 24, bottom = 36;
  const x = (index: number) => left + index / Math.max(1, series.length - 1) * (width - left - right);
  const y = (amount: number) => height - bottom - amount / maximum * (height - top - bottom);
  const path = series.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.amountCny)}`).join(" ");
  const date = (value: string) => /^(?:\+)?infinity$/i.test(value) ? "永久有效" : new Date(value).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" });
  return <div className="admin-membership-content">
    <div className="admin-membership-kpis"><div><span>现有会员</span><strong>{report.totalMembers} 名</strong></div><div><span>有效项目资格</span><strong>{report.totalQualifications} 项</strong></div><div><span>累计确认销售额</span><strong>{formatProjectPrice(report.totalSalesCny)}</strong></div></div>
    <div className="admin-membership-projects">{report.projects.map(project => <span key={project.key}>{project.title} <strong>{project.members} 名</strong></span>)}</div>
    <div className="admin-membership-table-scroll"><table><thead><tr><th>会员</th><th>付费项目</th><th>会员类型</th><th>价格</th><th>购买日期</th><th>到期日期</th></tr></thead><tbody>{report.members.slice(selectedPage * 20, (selectedPage + 1) * 20).map(member => <tr key={member.id}><td>{member.account}</td><td>{member.project}</td><td>{member.plan}</td><td>{member.priceCny === null ? "" : formatProjectPrice(member.priceCny)}</td><td>{member.purchasedAt ? <time dateTime={member.purchasedAt}>{date(member.purchasedAt)}</time> : ""}</td><td><time dateTime={/infinity/i.test(member.expiresAt) ? undefined : member.expiresAt}>{date(member.expiresAt)}</time></td></tr>)}</tbody></table></div>
    {!report.members.length ? <p>目前没有有效的会员资格。</p> : null}
    {report.members.length > 20 ? <nav aria-label="后台会员翻页" className="admin-membership-pagination"><button disabled={!selectedPage} onClick={() => setPage(selectedPage - 1)} type="button">上一页</button><span>{selectedPage + 1} / {Math.ceil(report.members.length / 20)}</span><button disabled={(selectedPage + 1) * 20 >= report.members.length} onClick={() => setPage(selectedPage + 1)} type="button">下一页</button></nav> : null}
    <p className="admin-membership-note">无付款订单的会员仍列出，价格与购买日期留空。</p>
    <header className="admin-sales-chart-head"><h4>销售金额趋势</h4><nav aria-label="销售统计周期">{([ ["day", "每日"], ["month", "每月"], ["quarter", "每季"], ["year", "每年"] ] as const).map(([key, label]) => <button aria-pressed={period === key} key={key} onClick={() => setPeriod(key)} type="button">{label}</button>)}</nav></header>
    <svg aria-label={`${{ day: "每日", month: "每月", quarter: "每季", year: "每年" }[period]}销售金额趋势图，单位：元`} className="admin-sales-chart" role="img" viewBox={`0 0 ${width} ${height}`}>
      {[0, .5, 1].map(ratio => <g key={ratio}><line stroke="#dce5e8" x1={left} x2={width - right} y1={y(maximum * ratio)} y2={y(maximum * ratio)} /><text textAnchor="end" x={left - 10} y={y(maximum * ratio) + 4}>{Math.round(maximum * ratio * 100) / 100}</text></g>)}
      <path d={path} fill="none" stroke="#287ba2" strokeLinejoin="round" strokeWidth="3" />
      {series.map((point, index) => <circle cx={x(index)} cy={y(point.amountCny)} fill="#287ba2" key={point.label} r="4"><title>{point.label}：{formatProjectPrice(point.amountCny)}</title></circle>)}
      <text x={left} y={height - 8}>{series[0]?.label}</text><text textAnchor="end" x={width - right} y={height - 8}>{series.at(-1)?.label}</text>
    </svg>
    <p className="admin-membership-note">销售额按已确认付款订单统计；无付款订单的开通资格不计入销售额。</p>
    <details className="admin-sales-detail"><summary>查看金额明细</summary><table><thead><tr><th>日期 / 周期</th><th>销售额</th></tr></thead><tbody>{series.map(point => <tr key={point.label}><td>{point.label}</td><td>{formatProjectPrice(point.amountCny)}</td></tr>)}</tbody></table></details>
  </div>;
}
