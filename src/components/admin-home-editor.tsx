"use client";

import { useEffect, useState } from "react";
import {
  MANAGED_PAGE_CONTENT_VERSION,
  type ManagedPageContent,
  type ManagedPageItem,
  getManagedPageDefinition,
  mergeManagedPageContent,
} from "@/lib/content/page-content";
import { supabase } from "@/lib/supabase/client";

type ManagedHomeRow = {
  id: string;
  meta_json: unknown;
  published_at: string | null;
  status: "draft" | "published" | "archived";
  summary: string | null;
  title: string;
  updated_at: string | null;
};

function copyContent(content: ManagedPageContent): ManagedPageContent {
  return {
    ...content,
    items: content.items.map((item) => ({ ...item })),
  };
}

function createModule(): ManagedPageItem {
  return {
    actionLabel: "进入模块",
    actionLabelColor: "#0f6b4f",
    actionLabelFontSize: 15,
    boxed: false,
    description: "",
    descriptionColor: "#706855",
    descriptionFontSize: 15,
    enabled: true,
    eyebrow: "New Module",
    eyebrowColor: "#c89419",
    eyebrowFontSize: 12,
    href: "/",
    id: `home-module-${crypto.randomUUID()}`,
    kind: "primary",
    tone: "auto",
    title: "新学习模块",
    titleColor: "#17231d",
    titleFontSize: 24,
  };
}

function TextStyleFields({
  color,
  fontSize,
  label,
  onColorChange,
  onFontSizeChange,
}: {
  color: string;
  fontSize: number;
  label: string;
  onColorChange: (value: string) => void;
  onFontSizeChange: (value: number) => void;
}) {
  return (
    <>
      <label>
        <span>{label}字号</span>
        <input
          max={160}
          min={10}
          type="number"
          value={fontSize}
          onChange={(event) => onFontSizeChange(Number(event.target.value))}
        />
      </label>
      <label className="admin-color-field">
        <span>{label}颜色</span>
        <input
          aria-label={`${label}颜色`}
          type="color"
          value={color}
          onChange={(event) => onColorChange(event.target.value)}
        />
      </label>
    </>
  );
}

export function AdminHomeEditor({ adminUserId }: { adminUserId: string }) {
  const definition = getManagedPageDefinition("home");
  const [draft, setDraft] = useState<ManagedPageContent>(() =>
    copyContent(definition.content),
  );
  const [row, setRow] = useState<ManagedHomeRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadHome();
  }, []);

  async function loadHome() {
    setIsLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("managed_content_pages")
      .select("id,title,summary,status,meta_json,published_at,updated_at")
      .eq("slug", "home")
      .maybeSingle();

    if (error) {
      setMessage(`无法读取首页内容：${error.message}`);
      setIsLoading(false);
      return;
    }

    if (data) {
      const homeRow = data as ManagedHomeRow;
      setRow(homeRow);
      setDraft(
        copyContent(
          mergeManagedPageContent("home", {
            ...(homeRow.meta_json && typeof homeRow.meta_json === "object"
              ? homeRow.meta_json
              : {}),
            summary: homeRow.summary,
            title: homeRow.title,
          }),
        ),
      );
    } else {
      setRow(null);
      setDraft(copyContent(definition.content));
    }

    setIsLoading(false);
  }

  function updateDraft<K extends keyof ManagedPageContent>(
    key: K,
    value: ManagedPageContent[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  function updateItem(index: number, patch: Partial<ManagedPageItem>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
    setMessage("");
  }

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.items.length) return;

    const items = [...draft.items];
    [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
    updateDraft("items", items);
  }

  function deleteItem(index: number) {
    updateDraft(
      "items",
      draft.items.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  async function publishHome() {
    setIsSaving(true);
    setMessage("");
    const now = new Date().toISOString();
    const content = {
      ...draft,
      contentVersion: MANAGED_PAGE_CONTENT_VERSION,
    };

    const { data, error } = await supabase
      .from("managed_content_pages")
      .upsert(
        {
          access_feature_key: null,
          created_by: adminUserId,
          is_paid_only: false,
          meta_json: content,
          module: definition.module,
          published_at: now,
          slug: definition.slug,
          status: "published",
          summary: content.summary,
          template_key: "site_announcement_page",
          title: content.title,
          updated_at: now,
        },
        { onConflict: "slug" },
      )
      .select("id,title,summary,status,meta_json,published_at,updated_at")
      .single();

    if (error) {
      setMessage(`发布失败：${error.message}`);
      setIsSaving(false);
      return;
    }

    setRow(data as ManagedHomeRow);
    setDraft(copyContent(content));
    setMessage("首页已发布，刷新前台首页即可看到更新。");
    setIsSaving(false);
  }

  if (isLoading) {
    return <section className="admin-editor-card">正在读取首页内容…</section>;
  }

  return (
    <div className="admin-editor-column admin-home-editor">
      <section className="admin-publish-card">
        <strong>首页内容管理</strong>
        <small>
          修改后点击发布，正式首页会读取本次内容。红框中的统计数字已从前台删除。
        </small>
        <button
          className="button primary"
          disabled={isSaving}
          type="button"
          onClick={publishHome}
        >
          {isSaving ? "发布中…" : "发布首页更新"}
        </button>
        <button
          className="button secondary"
          disabled={isSaving}
          type="button"
          onClick={() => {
            setDraft(copyContent(definition.content));
            setMessage("已恢复代码默认内容，点击发布后才会生效。");
          }}
        >
          恢复默认内容
        </button>
        {message ? (
          <p className={`admin-form-message ${message.includes("失败") || message.includes("无法") ? "error" : ""}`}>
            {message}
          </p>
        ) : null}
      </section>

      <section className="admin-editor-card">
        <header className="admin-editor-heading">
          <div>
            <span>HOME · /</span>
            <h2>首页主视觉</h2>
          </div>
          <span className={`admin-status ${row?.status === "published" ? "published" : ""}`}>
            {row?.status === "published" ? "已发布到数据库" : "使用代码默认内容"}
          </span>
        </header>

        <div className="admin-field-grid">
          <label className="admin-field-wide">
            <span>顶部小标题</span>
            <input
              value={draft.eyebrow}
              onChange={(event) => updateDraft("eyebrow", event.target.value)}
            />
          </label>
          <TextStyleFields
            color={draft.eyebrowColor ?? "#0f6b4f"}
            fontSize={draft.eyebrowFontSize ?? 13}
            label="顶部小标题"
            onColorChange={(value) => updateDraft("eyebrowColor", value)}
            onFontSizeChange={(value) => updateDraft("eyebrowFontSize", value)}
          />
          <label className="admin-field-wide">
            <span>首页主标题</span>
            <textarea
              rows={3}
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
            />
          </label>
          <TextStyleFields
            color={draft.titleColor ?? "#17231d"}
            fontSize={draft.titleFontSize ?? 72}
            label="首页主标题"
            onColorChange={(value) => updateDraft("titleColor", value)}
            onFontSizeChange={(value) => updateDraft("titleFontSize", value)}
          />
          <label className="admin-field-wide">
            <span>首页说明</span>
            <textarea
              rows={4}
              value={draft.summary}
              onChange={(event) => updateDraft("summary", event.target.value)}
            />
          </label>
          <TextStyleFields
            color={draft.summaryColor ?? "#706855"}
            fontSize={draft.summaryFontSize ?? 18}
            label="首页说明"
            onColorChange={(value) => updateDraft("summaryColor", value)}
            onFontSizeChange={(value) => updateDraft("summaryFontSize", value)}
          />
        </div>
      </section>

      <section className="admin-editor-card">
        <header className="admin-editor-heading">
          <div>
            <span>MODULES</span>
            <h2>首页学习模块</h2>
            <p>可编辑、显示或隐藏、调整顺序，也可以新增和删除模块。</p>
          </div>
          <button
            className="button secondary"
            type="button"
            onClick={() => updateDraft("items", [...draft.items, createModule()])}
          >
            新增模块
          </button>
        </header>

        <div className="admin-section-list">
          {draft.items.map((item, index) => (
            <article
              className={`admin-section-item ${item.enabled ? "" : "disabled"}`}
              key={item.id}
            >
              <header>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.title || "未命名模块"}</strong>
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
                  <button
                    className="admin-delete-module"
                    type="button"
                    onClick={() => deleteItem(index)}
                  >
                    删除
                  </button>
                </div>
              </header>

              <div className="admin-field-grid compact">
                <label>
                  <span>模块小标题</span>
                  <input
                    value={item.eyebrow}
                    onChange={(event) =>
                      updateItem(index, { eyebrow: event.target.value })
                    }
                  />
                </label>
                <TextStyleFields
                  color={item.eyebrowColor ?? "#c89419"}
                  fontSize={item.eyebrowFontSize ?? 12}
                  label="模块小标题"
                  onColorChange={(value) =>
                    updateItem(index, { eyebrowColor: value })
                  }
                  onFontSizeChange={(value) =>
                    updateItem(index, { eyebrowFontSize: value })
                  }
                />
                <label>
                  <span>模块标题</span>
                  <input
                    value={item.title}
                    onChange={(event) =>
                      updateItem(index, { title: event.target.value })
                    }
                  />
                </label>
                <TextStyleFields
                  color={item.titleColor ?? "#17231d"}
                  fontSize={item.titleFontSize ?? 24}
                  label="模块标题"
                  onColorChange={(value) =>
                    updateItem(index, { titleColor: value })
                  }
                  onFontSizeChange={(value) =>
                    updateItem(index, { titleFontSize: value })
                  }
                />
                <label className="admin-field-wide">
                  <span>模块说明</span>
                  <textarea
                    rows={3}
                    value={item.description}
                    onChange={(event) =>
                      updateItem(index, { description: event.target.value })
                    }
                  />
                </label>
                <TextStyleFields
                  color={item.descriptionColor ?? "#706855"}
                  fontSize={item.descriptionFontSize ?? 15}
                  label="模块说明"
                  onColorChange={(value) =>
                    updateItem(index, { descriptionColor: value })
                  }
                  onFontSizeChange={(value) =>
                    updateItem(index, { descriptionFontSize: value })
                  }
                />
                <label>
                  <span>跳转链接</span>
                  <input
                    value={item.href}
                    onChange={(event) =>
                      updateItem(index, { href: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>入口文字</span>
                  <input
                    value={item.actionLabel}
                    onChange={(event) =>
                      updateItem(index, { actionLabel: event.target.value })
                    }
                  />
                </label>
                <TextStyleFields
                  color={item.actionLabelColor ?? "#0f6b4f"}
                  fontSize={item.actionLabelFontSize ?? 15}
                  label="入口文字"
                  onColorChange={(value) =>
                    updateItem(index, { actionLabelColor: value })
                  }
                  onFontSizeChange={(value) =>
                    updateItem(index, { actionLabelFontSize: value })
                  }
                />
                <label>
                  <span>模块颜色</span>
                  <select
                    value={item.tone}
                    onChange={(event) =>
                      updateItem(index, {
                        tone: event.target.value as ManagedPageItem["tone"],
                      })
                    }
                  >
                    <option value="auto">自动</option>
                    <option value="cream">米白</option>
                    <option value="green">绿色</option>
                    <option value="gold">金色</option>
                  </select>
                </label>
                <label className="admin-checkbox-field">
                  <input
                    checked={item.boxed}
                    type="checkbox"
                    onChange={(event) =>
                      updateItem(index, { boxed: event.target.checked })
                    }
                  />
                  <span>显示背景框</span>
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
