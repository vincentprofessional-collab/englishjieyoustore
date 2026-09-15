"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  loadFrontendPageOverride,
  saveFrontendPageOverride,
  type FrontendPageAddedBlock,
  type FrontendPageElementPatch,
  type FrontendPageOverride,
} from "@/lib/content/frontend-page-overrides";
import { supabase } from "@/lib/supabase/client";

const EDITABLE_SELECTOR = "h1,h2,h3,h4,h5,h6,p,li,span,strong,small,a,button,label,img";

function elementSelector(root: HTMLElement, element: HTMLElement) {
  const parts: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== root) {
    const parent: HTMLElement | null = current.parentElement;
    if (!parent) return "";
    const index = Array.from(parent.children).indexOf(current) + 1;
    parts.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
    current = parent;
  }

  return parts.join(" > ");
}

function applyPatches(root: HTMLElement, patches: FrontendPageElementPatch[]) {
  for (const patch of patches) {
    const element = root.querySelector<HTMLElement>(patch.selector);
    if (!element) continue;
    element.classList.toggle("frontend-content-hidden", Boolean(patch.hidden));
    if (element instanceof HTMLAnchorElement && typeof patch.href === "string") {
      element.href = safeContentUrl(patch.href, "#");
    }
    if (element instanceof HTMLImageElement) {
      if (typeof patch.src === "string") {
        const imageUrl = safeContentUrl(patch.src, "");
        if (imageUrl) element.src = imageUrl;
        else element.removeAttribute("src");
      }
      if (typeof patch.alt === "string") element.alt = patch.alt;
    }
    if (typeof patch.text === "string" && element.childElementCount === 0 && element.textContent !== patch.text) {
      element.textContent = patch.text;
    }
  }
}

function renderAddedBlock(block: FrontendPageAddedBlock) {
  if (block.kind === "heading") return <h2>{block.text}</h2>;
  if (block.kind === "link") return <a href={safeContentUrl(block.href, "#")}>{block.text}</a>;
  if (block.kind === "image") {
    const imageUrl = safeContentUrl(block.href, "");
    return imageUrl ? <img alt={block.text || "新增图片"} src={imageUrl} /> : null;
  }
  return <p>{block.text}</p>;
}

function safeContentUrl(value: string | undefined, fallback: string) {
  const url = value?.trim() ?? "";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return fallback;
}

export function FrontendPageAdmin({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState<FrontendPageOverride>({
    blocks: [],
    contentVersion: 1,
    patches: [],
    pathname,
  });
  const [adminUserId, setAdminUserId] = useState("");
  const [editing, setEditing] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedSelector, setSelectedSelector] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [selectedHidden, setSelectedHidden] = useState(false);
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedUrl, setSelectedUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [newBlock, setNewBlock] = useState<Omit<FrontendPageAddedBlock, "id">>({
    href: "",
    kind: "paragraph",
    text: "",
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setEditing(false);
    setPanelOpen(false);
    setSelectedSelector("");
    setMessage("");

    void loadFrontendPageOverride(pathname).then((nextContent) => {
      if (active) setContent(nextContent);
    });

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (active) setAdminUserId("");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (active) setAdminUserId(profile?.role === "admin" ? user.id : "");
    })();

    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    applyPatches(root, content.patches);
    const observer = new MutationObserver(() => applyPatches(root, content.patches));
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [content.patches, pathname]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !editing) return;
    const stableRoot = root;

    function selectElement(event: MouseEvent) {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target || target.closest(".frontend-page-admin-toolbar,.frontend-page-admin-panel")) return;
      const candidate = target.matches("a,img")
        ? target
        : target.closest<HTMLElement>(EDITABLE_SELECTOR);
      if (
        !candidate ||
        !stableRoot.contains(candidate) ||
        (candidate.childElementCount > 0 && candidate.tagName !== "A")
      ) return;
      event.preventDefault();
      event.stopPropagation();
      const selector = elementSelector(stableRoot, candidate);
      if (!selector) return;
      const existing = content.patches.find((patch) => patch.selector === selector);
      setSelectedSelector(selector);
      setSelectedTag(candidate.tagName);
      setSelectedText(
        existing?.text ??
          (candidate instanceof HTMLImageElement ? existing?.alt ?? candidate.alt : candidate.textContent) ??
          "",
      );
      setSelectedUrl(
        candidate instanceof HTMLAnchorElement
          ? existing?.href ?? candidate.getAttribute("href") ?? ""
          : candidate instanceof HTMLImageElement
            ? existing?.src ?? candidate.getAttribute("src") ?? ""
            : "",
      );
      setSelectedHidden(Boolean(existing?.hidden));
      setPanelOpen(true);
    }

    root.addEventListener("click", selectElement, true);
    return () => root.removeEventListener("click", selectElement, true);
  }, [content.patches, editing]);

  function updateSelectedPatch(patch: Partial<FrontendPageElementPatch>) {
    if (!selectedSelector) return;
    setContent((current) => {
      const existing = current.patches.find((item) => item.selector === selectedSelector);
      const nextPatch = {
        ...existing,
        hidden: selectedHidden,
        selector: selectedSelector,
        text: selectedText,
        ...(selectedTag === "A" ? { href: selectedUrl } : {}),
        ...(selectedTag === "IMG" ? { alt: selectedText, src: selectedUrl } : {}),
        ...patch,
      };
      const patches = existing
        ? current.patches.map((item) => (item.selector === selectedSelector ? nextPatch : item))
        : [...current.patches, nextPatch];
      return { ...current, patches };
    });
  }

  function addBlock() {
    if (!newBlock.text.trim() && newBlock.kind !== "image") return;
    setContent((current) => ({
      ...current,
      blocks: [
        ...current.blocks,
        { ...newBlock, id: `page-block-${crypto.randomUUID()}`, text: newBlock.text.trim() },
      ],
    }));
    setNewBlock({ href: "", kind: "paragraph", text: "" });
    setAdding(false);
  }

  async function save() {
    if (!adminUserId) return;
    setSaving(true);
    setMessage("");
    const error = await saveFrontendPageOverride(adminUserId, content);
    setMessage(error ? `保存失败：${error.message}` : "本页内容已保存并对前台生效。");
    setSaving(false);
  }

  const isAdminPage = pathname.startsWith("/admin");

  return (
    <>
      <div
        className={`frontend-page-content ${editing ? "frontend-admin-editing" : ""}`}
        data-page-content-root
        ref={rootRef}
      >
        {children}
        {content.blocks.length ? (
          <section className="frontend-added-content" aria-label="管理员新增内容">
            {content.blocks.map((block) => (
              <article
                className={block.hidden ? "frontend-added-block frontend-content-hidden" : "frontend-added-block"}
                key={block.id}
              >
                {renderAddedBlock(block)}
              </article>
            ))}
          </section>
        ) : null}
      </div>

      {adminUserId && !isAdminPage ? (
        <div className="frontend-page-admin-toolbar">
          <button
            className={editing ? "active" : ""}
            type="button"
            onClick={() => {
              setEditing(!editing);
              setPanelOpen(true);
            }}
          >
            {editing ? "结束点选" : "编辑本页"}
          </button>
          <button type="button" onClick={() => setAdding(true)}>增加内容</button>
          <button type="button" onClick={() => setPanelOpen(!panelOpen)}>内容列表</button>
          <Link href="/admin?view=chrome">编辑导航</Link>
        </div>
      ) : null}

      {adminUserId && panelOpen && !isAdminPage ? (
        <aside className="frontend-page-admin-panel">
          <header>
            <div>
              <strong>编辑当前页面</strong>
              <small>{pathname}</small>
            </div>
            <button type="button" onClick={() => setPanelOpen(false)}>×</button>
          </header>

          <p className="frontend-admin-tip">开启“编辑本页”后，点击页面中的文字进行修改或隐藏。</p>

          {selectedSelector ? (
            <section className="frontend-admin-card">
              <strong>已选择内容</strong>
              <textarea value={selectedText} onChange={(event) => setSelectedText(event.target.value)} />
              {selectedTag === "A" || selectedTag === "IMG" ? (
                <input
                  placeholder={selectedTag === "IMG" ? "图片地址" : "链接地址"}
                  value={selectedUrl}
                  onChange={(event) => setSelectedUrl(event.target.value)}
                />
              ) : null}
              <label>
                <input
                  checked={selectedHidden}
                  type="checkbox"
                  onChange={(event) => setSelectedHidden(event.target.checked)}
                />
                隐藏这项内容
              </label>
              <div>
                <button
                  type="button"
                  onClick={() =>
                    updateSelectedPatch({
                      hidden: selectedHidden,
                      text: selectedText,
                      ...(selectedTag === "A" ? { href: selectedUrl } : {}),
                      ...(selectedTag === "IMG" ? { alt: selectedText, src: selectedUrl } : {}),
                    })
                  }
                >
                  应用修改
                </button>
                <button
                  className="danger"
                  type="button"
                  onClick={() => {
                    setSelectedHidden(true);
                    updateSelectedPatch({ hidden: true });
                  }}
                >
                  删除/隐藏
                </button>
              </div>
            </section>
          ) : null}

          {adding ? (
            <section className="frontend-admin-card">
              <strong>增加内容</strong>
              <select
                value={newBlock.kind}
                onChange={(event) =>
                  setNewBlock((current) => ({
                    ...current,
                    kind: event.target.value as FrontendPageAddedBlock["kind"],
                  }))
                }
              >
                <option value="paragraph">正文</option>
                <option value="heading">标题</option>
                <option value="link">链接</option>
                <option value="image">图片</option>
              </select>
              <textarea
                placeholder={newBlock.kind === "image" ? "图片说明" : "输入内容"}
                value={newBlock.text}
                onChange={(event) => setNewBlock((current) => ({ ...current, text: event.target.value }))}
              />
              {newBlock.kind === "link" || newBlock.kind === "image" ? (
                <input
                  placeholder={newBlock.kind === "image" ? "图片地址" : "链接地址"}
                  value={newBlock.href ?? ""}
                  onChange={(event) => setNewBlock((current) => ({ ...current, href: event.target.value }))}
                />
              ) : null}
              <button type="button" onClick={addBlock}>加入页面</button>
            </section>
          ) : null}

          <section className="frontend-admin-card">
            <strong>已修改内容</strong>
            {content.patches.length === 0 ? <small>暂无修改</small> : null}
            {content.patches.map((patch) => (
              <div className="frontend-admin-list-row" key={patch.selector}>
                <span>{patch.text?.slice(0, 34) || patch.selector}</span>
                <button
                  type="button"
                  onClick={() =>
                    setContent((current) => ({
                      ...current,
                      patches: current.patches.map((item) =>
                        item.selector === patch.selector ? { ...item, hidden: !item.hidden } : item,
                      ),
                    }))
                  }
                >
                  {patch.hidden ? "显示" : "隐藏"}
                </button>
              </div>
            ))}
          </section>

          <section className="frontend-admin-card">
            <strong>新增内容</strong>
            {content.blocks.length === 0 ? <small>暂无新增内容</small> : null}
            {content.blocks.map((block) => (
              <div className="frontend-admin-list-row" key={block.id}>
                <span>{block.text || "图片"}</span>
                <button
                  type="button"
                  onClick={() =>
                    setContent((current) => ({
                      ...current,
                      blocks: current.blocks.map((item) =>
                        item.id === block.id ? { ...item, hidden: !item.hidden } : item,
                      ),
                    }))
                  }
                >
                  {block.hidden ? "显示" : "隐藏"}
                </button>
                <button
                  className="danger"
                  type="button"
                  onClick={() =>
                    setContent((current) => ({
                      ...current,
                      blocks: current.blocks.filter((item) => item.id !== block.id),
                    }))
                  }
                >
                  删除
                </button>
              </div>
            ))}
          </section>

          <button className="frontend-admin-save" disabled={saving} type="button" onClick={() => void save()}>
            {saving ? "保存中…" : "保存本页全部修改"}
          </button>
          {message ? <p className="admin-form-message">{message}</p> : null}
        </aside>
      ) : null}
    </>
  );
}
