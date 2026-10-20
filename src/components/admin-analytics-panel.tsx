"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type PopularPage = { path: string; views: number };
type PopularPageRow = { path: string; views: number | string };

export function AdminAnalyticsPanel() {
  const [pages, setPages] = useState<PopularPage[] | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const loadInFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (loadInFlight.current || document.visibilityState === "hidden") return;
    loadInFlight.current = true;
    setIsLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc("get_admin_popular_pages", {
        p_limit: 20,
        p_since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (error) {
        if (error.code === "42883" || error.message.includes("get_admin_popular_pages")) {
          throw new Error("统计函数尚未创建；部署前请在 Supabase 执行 supabase/032_admin_popular_pages.sql。");
        }
        throw error;
      }
      setPages((data ?? []).map((row: PopularPageRow) => ({ path: row.path, views: Number(row.views) })));
    } catch (error) {
      setMessage(`无法读取热门页面：${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      loadInFlight.current = false;
      setIsLoading(false);
    }
  }, []);

  return (
    <section className="admin-analytics-panel">
      <header className="admin-editor-heading">
        <div>
          <span>Analytics</span>
          <h2>网站数据后台</h2>
          <p className="admin-analytics-refresh-note">统计已登录用户和匿名访客最近 7 天访问量；点击刷新时才查询前 20 个页面。</p>
        </div>
        <button className="button secondary" disabled={isLoading} type="button" onClick={() => void refresh()}>
          {isLoading ? "读取中..." : "刷新数据"}
        </button>
      </header>

      {message ? <p className="admin-form-message error">{message}</p> : null}

      <section className="admin-editor-card">
        <header className="admin-compact-heading">
          <h3>热门页面 Top 20</h3>
          <span>最近 7 天</span>
        </header>
        <div className="admin-table">
          {pages?.length ? pages.map((page, index) => (
            <div key={page.path}>
              <span>{index + 1}</span>
              <div className="admin-page-link-cell">
                <Link href={page.path} title={page.path}>{page.path}</Link>
              </div>
              <small>{page.views} 次访问</small>
            </div>
          )) : (
            <p className="admin-empty-text">
              {isLoading ? "正在读取热门页面…" : pages === null ? "点击右上角“刷新数据”查看统计。" : "暂无页面访问记录。"}
            </p>
          )}
        </div>
      </section>
    </section>
  );
}
