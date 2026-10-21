"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type PopularPage = { path: string; views: number };
type DailyVisitor = {
  date: string;
  registered_visitors: number;
  returning_anonymous_visitors: number;
  registrations: number;
};
type DashboardSnapshot = {
  daily_visitors?: DailyVisitor[];
  popular_pages?: PopularPage[];
};

function formatVisitDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function getShanghaiToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function AdminAnalyticsPanel() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const loadInFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (loadInFlight.current || document.visibilityState === "hidden") return;
    loadInFlight.current = true;
    setIsLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc("get_admin_dashboard_snapshot", { p_days: 1 });

      if (error) {
        if (error.code === "42883" || error.message.includes("get_admin_dashboard_snapshot")) {
          throw new Error("统计函数尚未创建；部署前请在 Supabase 执行 supabase/033_admin_daily_visitors.sql。");
        }
        throw error;
      }

      const result = data as DashboardSnapshot | null;
      setSnapshot({
        daily_visitors: (result?.daily_visitors ?? []).map((row) => ({
          ...row,
          registered_visitors: Number(row.registered_visitors),
          returning_anonymous_visitors: Number(row.returning_anonymous_visitors),
          registrations: Number(row.registrations),
        })),
        popular_pages: (result?.popular_pages ?? []).map((row) => ({ ...row, views: Number(row.views) })),
      });
    } catch (error) {
      setMessage(`无法读取网站统计：${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      loadInFlight.current = false;
      setIsLoading(false);
    }
  }, []);

  const today = getShanghaiToday();
  const dailyVisitors = snapshot?.daily_visitors ?? [];
  const pages = snapshot?.popular_pages ?? [];

  return (
    <section className="admin-analytics-panel">
      <header className="admin-editor-heading">
        <div>
          <span>Analytics</span>
          <h2>网站数据后台</h2>
          <p className="admin-analytics-refresh-note">访客和注册统计为今天；热门页面统计近 7 天。点击刷新时一次读取全部数据。</p>
        </div>
        <button className="button secondary" disabled={isLoading} type="button" onClick={() => void refresh()}>
          {isLoading ? "读取中..." : "刷新数据"}
        </button>
      </header>

      {message ? <p className="admin-form-message error">{message}</p> : null}

      <section className="admin-editor-card">
        <header className="admin-compact-heading">
          <h3>今日访客与注册</h3>
          <span>中国标准时间</span>
        </header>
        <div className="admin-daily-visitors-scroll">
          <table className="admin-daily-visitors-table">
            <thead>
              <tr>
                <th scope="col">日期</th>
                <th scope="col">已注册用户访问</th>
                <th scope="col">匿名访客回访</th>
                <th scope="col">今日注册</th>
              </tr>
            </thead>
            <tbody>
              {dailyVisitors.length ? dailyVisitors.map((row) => (
                <tr className={row.date === today ? "is-today" : ""} key={row.date}>
                  <th scope="row">{formatVisitDate(row.date)}{row.date === today ? <span>今天</span> : null}</th>
                  <td>{row.registered_visitors}</td>
                  <td>{row.returning_anonymous_visitors}</td>
                  <td>{row.registrations}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="admin-empty-text">{isLoading ? "正在读取每日统计…" : snapshot ? "暂无访客记录。" : "点击右上角“刷新数据”查看统计。"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="admin-analytics-refresh-note">匿名回访按浏览器本地随机标识估算；清除浏览器数据或更换设备后会按新访客统计。</p>
      </section>

      <section className="admin-editor-card">
        <header className="admin-compact-heading">
          <h3>近 7 天热门页面 Top 20</h3>
          <span>最近 7 天</span>
        </header>
        <div className="admin-table">
          {pages.length ? pages.map((page, index) => (
            <div key={page.path}>
              <span>{index + 1}</span>
              <div className="admin-page-link-cell">
                <Link href={page.path} title={page.path}>{page.path}</Link>
              </div>
              <small>{page.views} 次访问</small>
            </div>
          )) : (
            <p className="admin-empty-text">
              {isLoading ? "正在读取热门页面…" : snapshot ? "暂无页面访问记录。" : "点击右上角“刷新数据”查看统计。"}
            </p>
          )}
        </div>
      </section>
    </section>
  );
}
