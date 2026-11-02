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
import styles from "./frontend-page-admin.module.css";

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
  if (block.kind === "module") return (
    <section className="word-detail-section">
      <h2>{block.text}</h2>
      <div className={styles.addedModuleContent}>
        {(block.content ?? "").split(/\r?\n/).map((line, index) => line.trim() ? <p key={`${index}-${line}`}>{line}</p> : null)}
      </div>
    </section>
  );
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

export function FrontendPageAdmin({ children, title = "编辑当前页面" }: { children: React.ReactNode; title?: string }) {
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
  const [selectedScopeSelector, setSelectedScopeSelector] = useState("");
  const [selectedModuleHidden, setSelectedModuleHidden] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectedHidden, setSelectedHidden] = useState(false);
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedUrl, setSelectedUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [newBlock, setNewBlock] = useState<Omit<FrontendPageAddedBlock, "id">>({
    content: "",
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
    setSelectedScopeSelector("");
    setSelectedModuleHidden(false);
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
      if (!target || target.closest("[data-frontend-page-admin-control]")) return;
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
      const moduleElement = candidate.closest<HTMLElement>(".word-detail-section,.vocabulary-lookup-section");
      const scopeSelector = moduleElement ? elementSelector(stableRoot, moduleElement) : selector;
      const existing = content.patches.find((patch) => patch.selector === selector);
      const existingScope = content.patches.find((patch) => patch.selector === scopeSelector);
      setSelectedSelector(selector);
      setSelectedScopeSelector(scopeSelector);
      setSelectedModuleHidden(Boolean(existingScope?.hidden));
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
    if (newBlock.kind === "module" ? !newBlock.text.trim() : !newBlock.text.trim() && newBlock.kind !== "image") return;
    setContent((current) => ({
      ...current,
      blocks: [
        ...current.blocks,
        { ...newBlock, content: newBlock.content?.trim() ?? "", id: `page-block-${crypto.randomUUID()}`, text: newBlock.text.trim() },
      ],
    }));
    setNewBlock({ content: "", href: "", kind: "paragraph", text: "" });
    setAdding(false);
  }

  function toggleSelectedModule() {
    if (!selectedScopeSelector || selectedScopeSelector === selectedSelector) return;
    const hidden = !selectedModuleHidden;
    setSelectedModuleHidden(hidden);
    setContent((current) => {
      const existing = current.patches.find((patch) => patch.selector === selectedScopeSelector);
      const nextPatch = { ...existing, hidden, selector: selectedScopeSelector };
      return {
        ...current,
        patches: existing
          ? current.patches.map((patch) => patch.selector === selectedScopeSelector ? nextPatch : patch)
          : [...current.patches, nextPatch],
      };
    });
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
        className={`${styles.pageContent} ${editing ? styles.editing : ""}`}
        data-page-content-root
        ref={rootRef}
      >
        {children}
        {content.blocks.length ? (
          <section className={styles.addedContent} aria-label="管理员新增内容">
            {content.blocks.map((block) => (
              <article
                className={`${styles.addedBlock} ${block.hidden ? styles.hidden : ""}`}
                key={block.id}
              >
                {renderAddedBlock(block)}
              </article>
            ))}
          </section>
        ) : null}
      </div>

      {adminUserId && !isAdminPage ? (
        <div className={styles.toolbar} data-frontend-page-admin-control>
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
          <button type="button" onClick={() => { setNewBlock({ content: "", href: "", kind: "module", text: "" }); setAdding(true); setPanelOpen(true); }}>增加模块/内容</button>
          <button type="button" onClick={() => setPanelOpen(!panelOpen)}>内容列表</button>
          <Link className={styles.navLink} href="/admin?view=chrome">编辑导航</Link>
        </div>
      ) : null}

      {adminUserId && panelOpen && !isAdminPage ? (
        <aside className={styles.panel} data-frontend-page-admin-control>
          <header>
            <div>
              <strong>{title}</strong>
              <small>{pathname}</small>
            </div>
            <button type="button" onClick={() => setPanelOpen(false)}>×</button>
          </header>

          <p className={styles.tip}>开启编辑后，点击模块标题可修改标题或隐藏整个模块；点击模块内容可修改、隐藏。新增的模块也能继续编辑或删除。</p>

          {selectedSelector ? (
            <section className={styles.card}>
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
                {selectedScopeSelector && selectedScopeSelector !== selectedSelector ? <button
                  type="button"
                  onClick={toggleSelectedModule}
                >
                  {selectedModuleHidden ? "恢复整个模块" : "删除/隐藏整个模块"}
                </button> : null}
                <button
                  className={styles.danger}
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
            <section className={styles.card}>
              <strong>新增模块或页面内容</strong>
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
                <option value="module">完整模块</option>
                <option value="link">链接</option>
                <option value="image">图片</option>
              </select>
              {newBlock.kind === "module" ? <>
                <input placeholder="模块标题" value={newBlock.text} onChange={(event) => setNewBlock((current) => ({ ...current, text: event.target.value }))} />
                <textarea placeholder="模块内容，可分行填写" value={newBlock.content ?? ""} onChange={(event) => setNewBlock((current) => ({ ...current, content: event.target.value }))} />
              </> : <textarea
                placeholder={newBlock.kind === "image" ? "图片说明" : "输入内容"}
                value={newBlock.text}
                onChange={(event) => setNewBlock((current) => ({ ...current, text: event.target.value }))}
              />}
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

          <section className={styles.card}>
            <strong>已修改内容</strong>
            {content.patches.length === 0 ? <small>暂无修改</small> : null}
            {content.patches.map((patch) => (
              <div className={styles.listRow} key={patch.selector}>
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

          <section className={styles.card}>
            <strong>新增内容</strong>
            {content.blocks.length === 0 ? <small>暂无新增内容</small> : null}
            {content.blocks.map((block) => (
              <div className={styles.listRow} key={block.id}>
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
                  className={styles.danger}
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

          <button className={styles.save} disabled={saving} type="button" onClick={() => void save()}>
            {saving ? "保存中…" : "保存本页全部修改"}
          </button>
          {message ? <p className="admin-form-message">{message}</p> : null}
        </aside>
      ) : null}
    </>
  );
}
