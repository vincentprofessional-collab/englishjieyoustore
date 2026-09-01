"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AdminAnalyticsPanel } from "@/components/admin-analytics-panel";
import { AdminBbcArticleEditor } from "@/components/admin-bbc-article-editor";
import { AdminHomeEditor } from "@/components/admin-home-editor";
import { AdminEntitlementManager } from "@/components/admin-entitlement-manager";
import { AdminSiteChromeEditor } from "@/components/admin-site-chrome-editor";
import { AdminJuniorHighQuestionEditor } from "@/components/admin-junior-high-question-editor";
import { AdminSeniorHighQuestionEditor } from "@/components/admin-senior-high-question-editor";
import { GuidePostAdmin } from "@/components/guide-post-admin";
import { supabase } from "@/lib/supabase/client";

type AdminState = "checking" | "signed-out" | "forbidden" | "ready" | "error";
type AdminView =
  | "analytics"
  | "access"
  | "home"
  | "chrome"
  | "guide"
  | "bbc-vocabulary"
  | "junior-high-questions"
  | "senior-high-questions";

export function AdminContentManager() {
  const [activeView, setActiveView] = useState<AdminView>("analytics");
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  useEffect(() => {
    void checkAdminAccess();
  }, []);

  async function checkAdminAccess() {
    setAdminState("checking");
    setAuthMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setAdminUserId(null);
      setAdminState("signed-out");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      setAuthMessage(`无法验证管理员身份：${profileError.message}`);
      setAdminState("error");
      return;
    }

    if (profile.role !== "admin") {
      setAdminUserId(null);
      setAdminState("forbidden");
      return;
    }

    setAdminUserId(user.id);
    setAdminState("ready");
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSigningIn(true);
    setAuthMessage("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthMessage(`登录失败：${error.message}`);
      setIsSigningIn(false);
      return;
    }

    setPassword("");
    await checkAdminAccess();
    setIsSigningIn(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setAdminUserId(null);
    setAdminState("signed-out");
    setAuthMessage("");
  }

  if (adminState === "checking") {
    return (
      <section className="admin-gate panel">
        <div className="eyebrow">Admin</div>
        <h1>正在验证管理员身份…</h1>
      </section>
    );
  }

  if (adminState === "signed-out") {
    return (
      <section className="admin-gate">
        <div className="admin-gate-copy">
          <div className="eyebrow">Admin access</div>
          <h1>登录网站后台</h1>
          <p>只有数据库中标记为管理员的账号可以查看数据和发布内容。</p>
        </div>
        <form className="admin-login-card" onSubmit={handleSignIn}>
          <label htmlFor="admin-email">管理员邮箱</label>
          <input
            autoComplete="email"
            id="admin-email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
          <label htmlFor="admin-password">密码</label>
          <input
            autoComplete="current-password"
            id="admin-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          <button className="button primary" disabled={isSigningIn} type="submit">
            {isSigningIn ? "登录中…" : "登录后台"}
          </button>
          {authMessage ? <p className="admin-form-message error">{authMessage}</p> : null}
        </form>
      </section>
    );
  }

  if (adminState === "forbidden") {
    return (
      <section className="admin-gate panel">
        <div className="eyebrow">Access denied</div>
        <h1>这个账号不是管理员。</h1>
        <p className="lead">
          请先在 Supabase 的 profiles 表中，将该账号的 role 设置为 admin。
        </p>
        <button className="button secondary" type="button" onClick={handleSignOut}>
          退出并更换账号
        </button>
      </section>
    );
  }

  if (adminState === "error") {
    return (
      <section className="admin-gate panel">
        <div className="eyebrow">Admin error</div>
        <h1>后台暂时无法载入。</h1>
        <p className="lead">{authMessage}</p>
        <button className="button secondary" type="button" onClick={checkAdminAccess}>
          重新检查
        </button>
      </section>
    );
  }

  return (
    <section className="admin-workspace">
      <header className="admin-workspace-header">
        <div>
          <span>CONTENT ADMIN · V2</span>
          <h1>网站后台</h1>
          <p>查看网站数据，维护导航底部，并发布公告栏帖子。</p>
        </div>
        <div className="admin-header-actions">
          <Link className="button secondary" href="/contact" target="_blank">
            查看公告栏 ↗
          </Link>
          <Link className="button secondary" href="/" target="_blank">
            打开首页 ↗
          </Link>
          <button className="button secondary" type="button" onClick={handleSignOut}>
            退出
          </button>
        </div>
      </header>

      <div className="admin-view-tabs" role="tablist" aria-label="后台视图">
        <button
          className={activeView === "analytics" ? "active" : ""}
          type="button"
          onClick={() => setActiveView("analytics")}
        >
          数据后台
        </button>
        <button
          className={activeView === "access" ? "active" : ""}
          type="button"
          onClick={() => setActiveView("access")}
        >
          项目开通
        </button>
        <button
          className={activeView === "home" ? "active" : ""}
          type="button"
          onClick={() => setActiveView("home")}
        >
          首页
        </button>
        <button
          className={activeView === "chrome" ? "active" : ""}
          type="button"
          onClick={() => setActiveView("chrome")}
        >
          导航底部
        </button>
        <button
          className={activeView === "guide" ? "active" : ""}
          type="button"
          onClick={() => setActiveView("guide")}
        >
          公告栏发帖
        </button>
        <button
          className={activeView === "bbc-vocabulary" ? "active" : ""}
          type="button"
          onClick={() => setActiveView("bbc-vocabulary")}
        >
          BBC词汇
        </button>
        <button
          className={activeView === "junior-high-questions" ? "active" : ""}
          type="button"
          onClick={() => setActiveView("junior-high-questions")}
        >
          中考题目
        </button>
        <button
          className={activeView === "senior-high-questions" ? "active" : ""}
          type="button"
          onClick={() => setActiveView("senior-high-questions")}
        >
          高考题目
        </button>
      </div>

      {activeView === "analytics" ? <AdminAnalyticsPanel /> : null}

      {activeView === "access" ? <AdminEntitlementManager /> : null}

      {activeView === "home" && adminUserId ? (
        <AdminHomeEditor adminUserId={adminUserId} />
      ) : null}

      {activeView === "chrome" && adminUserId ? (
        <AdminSiteChromeEditor adminUserId={adminUserId} />
      ) : null}

      {activeView === "guide" && adminUserId ? (
        <GuidePostAdmin adminUserId={adminUserId} />
      ) : null}

      {activeView === "bbc-vocabulary" && adminUserId ? (
        <AdminBbcArticleEditor adminUserId={adminUserId} />
      ) : null}

      {activeView === "junior-high-questions" && adminUserId ? (
        <AdminJuniorHighQuestionEditor adminUserId={adminUserId} />
      ) : null}

      {activeView === "senior-high-questions" && adminUserId ? (
        <AdminSeniorHighQuestionEditor adminUserId={adminUserId} />
      ) : null}
    </section>
  );
}
