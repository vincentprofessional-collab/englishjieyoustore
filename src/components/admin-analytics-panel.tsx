"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type PopularPage = { path: string; views: number };
type DailyVisitor = {
  date: string;
  registered_visitors: number;
  returning_anonymous_visitors: number;
  first_time_visitors: number;
  registrations: number;
};
type DashboardSnapshot = {
  daily_visitors?: DailyVisitor[];
  popular_pages?: PopularPage[];
};

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
      if (!result?.daily_visitors?.some((row) => Object.hasOwn(row, "first_time_visitors"))) {
        throw new Error("每日首次访问统计尚未启用；请在 Supabase 执行 supabase/034_admin_first_time_visitors.sql。");
      }
      setSnapshot({
        daily_visitors: (result?.daily_visitors ?? []).map((row) => ({
          ...row,
          registered_visitors: Number(row.registered_visitors),
          returning_anonymous_visitors: Number(row.returning_anonymous_visitors),
          first_time_visitors: Number(row.first_time_visitors ?? 0),
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
  const todayVisitors = dailyVisitors.find((row) => row.date === today) ?? dailyVisitors[0];
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
        {snapshot ? (
          <div className="admin-daily-metric-grid">
            <article className="admin-daily-metric-card">
              <span>已注册用户今日访问</span>
              <strong>{todayVisitors?.registered_visitors ?? 0}</strong>
            </article>
            <article className="admin-daily-metric-card">
              <span>曾来访匿名用户今日回访</span>
              <strong>{todayVisitors?.returning_anonymous_visitors ?? 0}</strong>
            </article>
            <article className="admin-daily-metric-card">
              <span>今日首次打开网站</span>
              <strong>{todayVisitors?.first_time_visitors ?? 0}</strong>
            </article>
            <article className="admin-daily-metric-card">
              <span>今日新注册用户</span>
              <strong>{todayVisitors?.registrations ?? 0}</strong>
            </article>
          </div>
        ) : (
          <p className="admin-empty-text">{isLoading ? "正在读取每日统计…" : "点击右上角“刷新数据”查看统计。"}</p>
        )}
        <p className="admin-analytics-refresh-note">首次打开和匿名回访按浏览器本地标识估算；清除浏览器数据或更换设备后会按新访客统计。</p>
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
