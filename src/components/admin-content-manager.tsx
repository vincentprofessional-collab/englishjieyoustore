"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminInlinePreview } from "@/components/admin-inline-preview";
import {
  MANAGED_PAGE_DEFINITIONS,
  ManagedPageContent,
  ManagedPageItem,
  ManagedPageSlug,
  getManagedPageDefinition,
  mergeManagedPageContent,
} from "@/lib/content/page-content";
import { supabase } from "@/lib/supabase/client";

type AdminState = "checking" | "signed-out" | "forbidden" | "ready" | "error";

type ManagedPageRow = {
  id: string;
  meta_json: unknown;
  published_at: string | null;
  slug: ManagedPageSlug;
  status: "draft" | "published" | "archived";
  summary: string | null;
  title: string;
  updated_at: string | null;
};

function rowToContent(row: ManagedPageRow | undefined, slug: ManagedPageSlug) {
  if (!row) {
    return getManagedPageDefinition(slug).content;
  }

  return mergeManagedPageContent(slug, {
    ...(row.meta_json && typeof row.meta_json === "object" ? row.meta_json : {}),
    summary: row.summary,
    title: row.title,
  });
}

function createEditableCopy(content: ManagedPageContent): ManagedPageContent {
  return {
    ...content,
    items: content.items.map((item) => ({ ...item })),
  };
}

export function AdminContentManager() {
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pageRows, setPageRows] = useState<Partial<Record<ManagedPageSlug, ManagedPageRow>>>(
    {},
  );
  const [selectedSlug, setSelectedSlug] = useState<ManagedPageSlug>("home");
  const [draft, setDraft] = useState<ManagedPageContent>(() =>
    createEditableCopy(getManagedPageDefinition("home").content),
  );
  const [saveMessage, setSaveMessage] = useState("");
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  const selectedDefinition = useMemo(
    () => getManagedPageDefinition(selectedSlug),
    [selectedSlug],
  );
  const selectedRow = pageRows[selectedSlug];
  const showPageActions = ["home", "training", "news", "contact"].includes(selectedSlug);

  useEffect(() => {
    void checkAdminAccess();
  }, []);

  async function loadPages() {
    const slugs = MANAGED_PAGE_DEFINITIONS.map((page) => page.slug);
    const { data, error } = await supabase
      .from("managed_content_pages")
      .select("id,slug,title,summary,status,meta_json,published_at,updated_at")
      .in("slug", slugs);

    if (error) {
      setAuthMessage(`无法读取后台内容：${error.message}`);
      setAdminState("error");
      return;
    }

    const nextRows: Partial<Record<ManagedPageSlug, ManagedPageRow>> = {};
    (data ?? []).forEach((row) => {
      if (slugs.includes(row.slug as ManagedPageSlug)) {
        nextRows[row.slug as ManagedPageSlug] = row as ManagedPageRow;
      }
    });

    setPageRows(nextRows);
    setDraft(createEditableCopy(rowToContent(nextRows[selectedSlug], selectedSlug)));
    setAdminState("ready");
  }

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
    await loadPages();
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

  function selectPage(slug: ManagedPageSlug) {
    setSelectedSlug(slug);
    setDraft(createEditableCopy(rowToContent(pageRows[slug], slug)));
    setSaveMessage("");
  }

  function updateDraft<K extends keyof ManagedPageContent>(
    key: K,
    value: ManagedPageContent[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaveMessage("");
  }

  function updateItem(index: number, patch: Partial<ManagedPageItem>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
    setSaveMessage("");
  }

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.items.length) {
      return;
    }

    const items = [...draft.items];
    [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
    updateDraft("items", items);
  }

  function restoreDefaults() {
    setDraft(createEditableCopy(selectedDefinition.content));
    setSaveMessage("已恢复默认内容，尚未发布。");
  }

  async function publishPage() {
    if (!adminUserId) {
      setSaveMessage("管理员身份已失效，请重新登录。");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");
    const now = new Date().toISOString();
    const payload = {
      access_feature_key: null,
      created_by: adminUserId,
      is_paid_only: false,
      meta_json: draft,
      module: selectedDefinition.module,
      published_at: now,
      slug: selectedDefinition.slug,
      status: "published",
      summary: draft.summary,
      template_key: "site_announcement_page",
      title: draft.title,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("managed_content_pages")
      .upsert(payload, { onConflict: "slug" })
      .select("id,slug,title,summary,status,meta_json,published_at,updated_at")
      .single();

    if (error) {
      setSaveMessage(`发布失败：${error.message}`);
      setIsSaving(false);
      return;
    }

    setPageRows((current) => ({
      ...current,
      [selectedSlug]: data as ManagedPageRow,
    }));
    setSaveMessage("发布成功，刷新对应前台页面即可看到更新。");
    setIsSaving(false);
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
          <h1>登录内容后台</h1>
          <p>只有数据库中标记为管理员的账号可以读取和发布页面内容。</p>
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
          <span>CONTENT ADMIN · V1</span>
          <h1>页面内容后台</h1>
          <p>编辑文字、按钮和页面区块；音频、题库答案与用户数据不会出现在这里。</p>
        </div>
        <div className="admin-header-actions">
          <Link className="button secondary" href={selectedDefinition.path} target="_blank">
            打开前台页面 ↗
          </Link>
          <button className="button secondary" type="button" onClick={handleSignOut}>
            退出
          </button>
        </div>
      </header>

      <div className="admin-layout">
        <nav className="admin-page-nav" aria-label="可编辑页面">
          <strong>页面</strong>
          {MANAGED_PAGE_DEFINITIONS.map((page) => {
            const isSelected = selectedSlug === page.slug;
            const isPublished = pageRows[page.slug]?.status === "published";

            return (
              <button
                aria-current={isSelected ? "page" : undefined}
                className={isSelected ? "active" : ""}
                key={page.slug}
                type="button"
                onClick={() => selectPage(page.slug)}
              >
                <span>{page.label}</span>
                <small>{isPublished ? "已发布" : "使用默认内容"}</small>
              </button>
            );
          })}
        </nav>

        <div className="admin-live-column">
          <AdminInlinePreview
            content={draft}
            definition={selectedDefinition}
            onItemChange={updateItem}
            onPageChange={(key, value) => updateDraft(key, value)}
          />
        </div>

        <div className="admin-editor-column">
          <div className="admin-publish-card">
            <p>在中间页面上直接点文字修改。点发布后，正式网站会读取这次修改。</p>
            <button className="button primary" disabled={isSaving} type="button" onClick={publishPage}>
              {isSaving ? "发布中…" : "发布更新"}
            </button>
            <button className="button secondary" disabled={isSaving} type="button" onClick={restoreDefaults}>
              恢复默认内容
            </button>
            {saveMessage ? (
              <p className={`admin-form-message ${saveMessage.includes("失败") ? "error" : ""}`}>
                {saveMessage}
              </p>
            ) : null}
          </div>

          <section className="admin-editor-card">
            <header className="admin-editor-heading">
              <div>
                <span>{selectedDefinition.path}</span>
                <h2>{selectedDefinition.label}</h2>
              </div>
              <span className={`admin-status ${selectedRow ? "published" : ""}`}>
                {selectedRow ? "已发布到数据库" : "尚未发布 · 当前使用代码默认内容"}
              </span>
            </header>

            <div className="admin-field-grid">
              <label>
                <span>页面小标题</span>
                <input
                  onChange={(event) => updateDraft("eyebrow", event.target.value)}
                  value={draft.eyebrow}
                />
              </label>
              <label className="admin-field-wide">
                <span>页面主标题</span>
                <textarea
                  onChange={(event) => updateDraft("title", event.target.value)}
                  rows={2}
                  value={draft.title}
                />
              </label>
              <label className="admin-field-wide">
                <span>页面说明</span>
                <textarea
                  onChange={(event) => updateDraft("summary", event.target.value)}
                  rows={4}
                  value={draft.summary}
                />
              </label>
            </div>

            {showPageActions ? (
              <div className="admin-action-editor">
                <h3>页面按钮</h3>
                <div className="admin-field-grid">
                  <label>
                    <span>主按钮文字</span>
                    <input
                      onChange={(event) => updateDraft("primaryLabel", event.target.value)}
                      value={draft.primaryLabel}
                    />
                  </label>
                  <label>
                    <span>主按钮链接</span>
                    <input
                      onChange={(event) => updateDraft("primaryHref", event.target.value)}
                      placeholder="/example"
                      value={draft.primaryHref}
                    />
                  </label>
                  {selectedSlug === "home" ? (
                    <>
                      <label>
                        <span>次按钮文字</span>
                        <input
                          onChange={(event) =>
                            updateDraft("secondaryLabel", event.target.value)
                          }
                          value={draft.secondaryLabel}
                        />
                      </label>
                      <label>
                        <span>次按钮链接</span>
                        <input
                          onChange={(event) =>
                            updateDraft("secondaryHref", event.target.value)
                          }
                          placeholder="/example"
                          value={draft.secondaryHref}
                        />
                      </label>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          {draft.items.length ? (
            <section className="admin-editor-card">
              <header className="admin-editor-heading">
                <div>
                  <span>SECTIONS</span>
                  <h2>页面区块</h2>
                </div>
                <small>可修改、隐藏和调整顺序</small>
              </header>

              <div className="admin-section-list">
                {draft.items.map((item, index) => (
                  <article className={`admin-section-item ${item.enabled ? "" : "disabled"}`} key={item.id}>
                    <header>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{item.title}</strong>
                      <div>
                        <button
                          aria-label={`上移 ${item.title}`}
                          disabled={index === 0}
                          type="button"
                          onClick={() => moveItem(index, -1)}
                        >
                          ↑
                        </button>
                        <button
                          aria-label={`下移 ${item.title}`}
                          disabled={index === draft.items.length - 1}
                          type="button"
                          onClick={() => moveItem(index, 1)}
                        >
                          ↓
                        </button>
                        <label className="admin-toggle">
                          <input
                            checked={item.enabled}
                            type="checkbox"
                            onChange={(event) =>
                              updateItem(index, { enabled: event.target.checked })
                            }
                          />
                          <span>{item.enabled ? "显示" : "隐藏"}</span>
                        </label>
                      </div>
                    </header>

                    <div className="admin-field-grid compact">
                      <label>
                        <span>区块小标题</span>
                        <input
                          aria-label={`区块 ${index + 1} 小标题`}
                          onChange={(event) =>
                            updateItem(index, { eyebrow: event.target.value })
                          }
                          value={item.eyebrow}
                        />
                      </label>
                      <label>
                        <span>区块标题</span>
                        <input
                          aria-label={`区块 ${index + 1} 标题`}
                          onChange={(event) =>
                            updateItem(index, { title: event.target.value })
                          }
                          value={item.title}
                        />
                      </label>
                      <label className="admin-field-wide">
                        <span>区块说明</span>
                        <textarea
                          aria-label={`区块 ${index + 1} 说明`}
                          onChange={(event) =>
                            updateItem(index, { description: event.target.value })
                          }
                          rows={3}
                          value={item.description}
                        />
                      </label>
                      <label>
                        <span>跳转链接</span>
                        <input
                          aria-label={`区块 ${index + 1} 链接`}
                          onChange={(event) => updateItem(index, { href: event.target.value })}
                          placeholder="/example"
                          value={item.href}
                        />
                      </label>
                      <label>
                        <span>入口文字</span>
                        <input
                          aria-label={`区块 ${index + 1} 入口文字`}
                          onChange={(event) =>
                            updateItem(index, { actionLabel: event.target.value })
                          }
                          value={item.actionLabel}
                        />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
