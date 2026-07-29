"use client";

import { ChangeEvent, useEffect, useState } from "react";
import {
  createGuideBlock,
  GuideBlockType,
  GuideContentBlock,
  GuidePostRow,
  parseGuidePostRow,
} from "@/lib/guide/posts";
import { supabase } from "@/lib/supabase/client";

type GuidePostAdminProps = {
  adminUserId: string;
};

type AdminGuidePostRow = GuidePostRow & {
  status: "archived" | "draft" | "published";
  updated_at: string | null;
};

type GuideDraft = {
  blocks: GuideContentBlock[];
  excerpt: string;
  id: string | null;
  publishedAt: string | null;
  slug: string | null;
  status: AdminGuidePostRow["status"];
  title: string;
};

const EMPTY_DRAFT: GuideDraft = {
  blocks: [createGuideBlock()],
  excerpt: "",
  id: null,
  publishedAt: null,
  slug: null,
  status: "draft",
  title: "",
};

const BLOCK_LABELS: Record<GuideBlockType, string> = {
  heading: "小标题",
  image: "图片",
  link: "链接",
  paragraph: "正文段落",
  video: "视频",
};

function createEmptyDraft(): GuideDraft {
  return {
    ...EMPTY_DRAFT,
    blocks: [createGuideBlock()],
  };
}

function rowToDraft(row: AdminGuidePostRow): GuideDraft {
  const post = parseGuidePostRow(row);

  return {
    blocks: post.blocks.map((block) => ({ ...block })),
    excerpt: post.excerpt,
    id: row.id,
    publishedAt: row.published_at,
    slug: row.slug,
    status: row.status,
    title: row.title,
  };
}

function firstText(blocks: GuideContentBlock[]) {
  return blocks.find((block) => block.text.trim())?.text.trim() ?? "";
}

function firstImage(blocks: GuideContentBlock[]) {
  return blocks.find((block) => block.type === "image" && block.url)?.url ?? null;
}

function safeFilename(filename: string) {
  const parts = filename.split(".");
  const extension = parts.length > 1 ? `.${parts.pop()!.toLowerCase()}` : "";
  const stem = parts
    .join(".")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${stem || "guide-image"}${extension}`;
}

export function GuidePostAdmin({ adminUserId }: GuidePostAdminProps) {
  const [draft, setDraft] = useState<GuideDraft>(createEmptyDraft);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState<AdminGuidePostRow[]>([]);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);

  useEffect(() => {
    void loadPosts();
  }, []);

  async function loadPosts(preferredId?: string) {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("managed_content_pages")
      .select("id,slug,title,summary,status,meta_json,published_at,created_at,updated_at")
      .like("slug", "guide-%")
      .order("updated_at", { ascending: false });

    if (error) {
      setMessage(`无法读取帖子：${error.message}`);
      setIsLoading(false);
      return;
    }

    const nextRows = (data ?? []) as AdminGuidePostRow[];
    setRows(nextRows);

    const selectedRow =
      nextRows.find((row) => row.id === preferredId) ??
      (draft.id ? nextRows.find((row) => row.id === draft.id) : undefined);

    if (selectedRow) {
      setDraft(rowToDraft(selectedRow));
    }

    setIsLoading(false);
  }

  function startNewPost() {
    setDraft(createEmptyDraft());
    setMessage("");
  }

  function updateBlock(blockId: string, patch: Partial<GuideContentBlock>) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === blockId ? { ...block, ...patch } : block,
      ),
    }));
    setMessage("");
  }

  function changeBlockType(blockId: string, type: GuideBlockType) {
    updateBlock(blockId, {
      caption: "",
      fontSize: type === "heading" ? 28 : 18,
      text: "",
      type,
      url: "",
    });
  }

  function addBlock(type: GuideBlockType) {
    setDraft((current) => ({
      ...current,
      blocks: [...current.blocks, createGuideBlock(type)],
    }));
    setMessage("");
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.blocks.length) {
      return;
    }

    const blocks = [...draft.blocks];
    [blocks[index], blocks[nextIndex]] = [blocks[nextIndex], blocks[index]];
    setDraft((current) => ({ ...current, blocks }));
    setMessage("");
  }

  function removeBlock(blockId: string) {
    setDraft((current) => {
      const blocks = current.blocks.filter((block) => block.id !== blockId);
      return {
        ...current,
        blocks: blocks.length ? blocks : [createGuideBlock()],
      };
    });
    setMessage("");
  }

  async function uploadImage(
    blockId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("请选择图片文件。");
      return;
    }

    setUploadingBlockId(blockId);
    setMessage("");
    const objectPath = `site/guide/${Date.now()}-${safeFilename(file.name)}`;
    const { error } = await supabase.storage.from("images").upload(objectPath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      setMessage(`图片上传失败：${error.message}`);
      setUploadingBlockId(null);
      return;
    }

    const { data } = supabase.storage.from("images").getPublicUrl(objectPath);
    updateBlock(blockId, { url: data.publicUrl });
    setMessage("图片上传成功。");
    setUploadingBlockId(null);
  }

  async function savePost(status: "draft" | "published") {
    const title = draft.title.trim();
    const excerpt = draft.excerpt.trim() || firstText(draft.blocks).slice(0, 140);

    if (!title) {
      setMessage("请先填写帖子标题。");
      return;
    }

    if (!draft.blocks.some((block) => block.text.trim() || block.url.trim())) {
      setMessage("请至少填写一个正文、链接、图片或视频区块。");
      return;
    }

    setIsSaving(true);
    setMessage("");
    const now = new Date().toISOString();
    const slug = draft.slug ?? `guide-${Date.now().toString(36)}`;
    const payload = {
      access_feature_key: null,
      cover_image_url: firstImage(draft.blocks),
      created_by: adminUserId,
      is_paid_only: false,
      meta_json: {
        blocks: draft.blocks,
        excerpt,
        kind: "guide-post",
      },
      module: "site",
      published_at:
        status === "published" ? draft.publishedAt ?? now : draft.publishedAt,
      slug,
      status,
      summary: excerpt,
      template_key: "site_announcement_page",
      title,
      updated_at: now,
    };

    const query = draft.id
      ? supabase.from("managed_content_pages").update(payload).eq("id", draft.id)
      : supabase.from("managed_content_pages").insert(payload);
    const { data, error } = await query
      .select("id,slug,title,summary,status,meta_json,published_at,created_at,updated_at")
      .single();

    if (error || !data) {
      setMessage(`保存失败：${error?.message ?? "未返回帖子数据"}`);
      setIsSaving(false);
      return;
    }

    setMessage(status === "published" ? "帖子已发布到使用说明页面。" : "草稿已保存。");
    await loadPosts(data.id);
    setIsSaving(false);
  }

  return (
    <section className="guide-admin">
      <header className="guide-admin-heading">
        <div>
          <span>GUIDE POSTS · 使用说明</span>
          <h2>帖子发布后台</h2>
          <p>组合正文、链接、图片和视频区块，设置字体、字号与对齐方式后直接发布。</p>
        </div>
        <button className="button secondary" onClick={startNewPost} type="button">
          ＋ 新建帖子
        </button>
      </header>

      <div className="guide-admin-layout">
        <aside className="guide-admin-posts">
          <header>
            <strong>帖子</strong>
            <span>{rows.length}</span>
          </header>
          {isLoading ? <p>正在读取帖子…</p> : null}
          {!isLoading && !rows.length ? <p>还没有后台帖子，可以先新建一篇。</p> : null}
          {rows.map((row) => (
            <button
              className={draft.id === row.id ? "active" : ""}
              key={row.id}
              onClick={() => {
                setDraft(rowToDraft(row));
                setMessage("");
              }}
              type="button"
            >
              <span>{row.status === "published" ? "已发布" : "草稿"}</span>
              <strong>{row.title}</strong>
              <small>{row.updated_at ? new Date(row.updated_at).toLocaleDateString("zh-CN") : ""}</small>
            </button>
          ))}
        </aside>

        <div className="guide-admin-editor">
          <section className="guide-admin-card">
            <div className="guide-admin-field-grid">
              <label className="wide">
                <span>帖子标题</span>
                <input
                  maxLength={120}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="例如：如何使用雅思听力练习"
                  value={draft.title}
                />
              </label>
              <label className="wide">
                <span>列表摘要</span>
                <textarea
                  maxLength={240}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, excerpt: event.target.value }))
                  }
                  placeholder="用一两句话说明这篇帖子能解决什么问题"
                  rows={3}
                  value={draft.excerpt}
                />
              </label>
            </div>
          </section>

          <section className="guide-admin-card">
            <header className="guide-blocks-heading">
              <div>
                <span>CONTENT BLOCKS</span>
                <h3>正文区块</h3>
              </div>
              <small>每个区块都可以单独设置格式和顺序</small>
            </header>

            <div className="guide-block-editor-list">
              {draft.blocks.map((block, index) => (
                <article className="guide-block-editor" key={block.id}>
                  <header>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <select
                      aria-label={`第 ${index + 1} 个区块类型`}
                      onChange={(event) =>
                        changeBlockType(block.id, event.target.value as GuideBlockType)
                      }
                      value={block.type}
                    >
                      {Object.entries(BLOCK_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <div>
                      <button
                        aria-label="上移区块"
                        disabled={index === 0}
                        onClick={() => moveBlock(index, -1)}
                        type="button"
                      >
                        ↑
                      </button>
                      <button
                        aria-label="下移区块"
                        disabled={index === draft.blocks.length - 1}
                        onClick={() => moveBlock(index, 1)}
                        type="button"
                      >
                        ↓
                      </button>
                      <button
                        aria-label="删除区块"
                        className="danger"
                        onClick={() => removeBlock(block.id)}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  </header>

                  <div className="guide-format-toolbar">
                    <label>
                      <span>字体</span>
                      <select
                        onChange={(event) =>
                          updateBlock(block.id, {
                            fontFamily: event.target.value as GuideContentBlock["fontFamily"],
                          })
                        }
                        value={block.fontFamily}
                      >
                        <option value="serif">宋体 / 衬线</option>
                        <option value="sans">黑体 / 无衬线</option>
                        <option value="kaiti">楷体</option>
                        <option value="georgia">Georgia</option>
                      </select>
                    </label>
                    <label>
                      <span>字号</span>
                      <select
                        onChange={(event) =>
                          updateBlock(block.id, { fontSize: Number(event.target.value) })
                        }
                        value={block.fontSize}
                      >
                        {[14, 16, 18, 20, 24, 28, 32, 36, 42].map((size) => (
                          <option key={size} value={size}>
                            {size}px
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="guide-align-controls" aria-label="文字对齐">
                      {(["left", "center", "right"] as const).map((align) => (
                        <button
                          aria-pressed={block.align === align}
                          className={block.align === align ? "active" : ""}
                          key={align}
                          onClick={() => updateBlock(block.id, { align })}
                          type="button"
                        >
                          {align === "left" ? "左" : align === "center" ? "中" : "右"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {block.type === "paragraph" || block.type === "heading" ? (
                    <textarea
                      aria-label={`${BLOCK_LABELS[block.type]}内容`}
                      onChange={(event) => updateBlock(block.id, { text: event.target.value })}
                      placeholder={block.type === "heading" ? "输入小标题" : "输入正文内容"}
                      rows={block.type === "heading" ? 2 : 5}
                      value={block.text}
                    />
                  ) : null}

                  {block.type === "link" ? (
                    <div className="guide-admin-field-grid">
                      <label>
                        <span>链接文字</span>
                        <input
                          onChange={(event) => updateBlock(block.id, { text: event.target.value })}
                          placeholder="查看详细说明"
                          value={block.text}
                        />
                      </label>
                      <label>
                        <span>链接地址</span>
                        <input
                          onChange={(event) => updateBlock(block.id, { url: event.target.value })}
                          placeholder="https://..."
                          type="url"
                          value={block.url}
                        />
                      </label>
                    </div>
                  ) : null}

                  {block.type === "image" ? (
                    <div className="guide-admin-field-grid">
                      <label>
                        <span>图片地址</span>
                        <input
                          onChange={(event) => updateBlock(block.id, { url: event.target.value })}
                          placeholder="https://..."
                          value={block.url}
                        />
                      </label>
                      <label>
                        <span>图片说明</span>
                        <input
                          onChange={(event) =>
                            updateBlock(block.id, { caption: event.target.value })
                          }
                          placeholder="可选"
                          value={block.caption}
                        />
                      </label>
                      <label className="guide-upload-control">
                        <span>或从电脑上传</span>
                        <input
                          accept="image/*"
                          disabled={uploadingBlockId === block.id}
                          onChange={(event) => void uploadImage(block.id, event)}
                          type="file"
                        />
                      </label>
                    </div>
                  ) : null}

                  {block.type === "video" ? (
                    <div className="guide-admin-field-grid">
                      <label>
                        <span>视频直链</span>
                        <input
                          onChange={(event) => updateBlock(block.id, { url: event.target.value })}
                          placeholder="https://.../video.mp4"
                          type="url"
                          value={block.url}
                        />
                      </label>
                      <label>
                        <span>视频说明</span>
                        <input
                          onChange={(event) =>
                            updateBlock(block.id, { caption: event.target.value })
                          }
                          placeholder="可选"
                          value={block.caption}
                        />
                      </label>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="guide-add-blocks">
              <span>添加：</span>
              {Object.entries(BLOCK_LABELS).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => addBlock(type as GuideBlockType)}
                  type="button"
                >
                  ＋ {label}
                </button>
              ))}
            </div>
          </section>

          <footer className="guide-admin-publish">
            <div>
              <strong>{draft.id ? `正在编辑：${draft.title || "未命名帖子"}` : "正在新建帖子"}</strong>
              <span>
                {draft.status === "published" ? "当前已发布" : "当前为草稿"}
                {message ? ` · ${message}` : ""}
              </span>
            </div>
            <button
              className="button secondary"
              disabled={isSaving}
              onClick={() => void savePost("draft")}
              type="button"
            >
              保存草稿
            </button>
            <button
              className="button primary"
              disabled={isSaving}
              onClick={() => void savePost("published")}
              type="button"
            >
              {isSaving ? "保存中…" : "发布到使用说明"}
            </button>
          </footer>
        </div>
      </div>
    </section>
  );
}
