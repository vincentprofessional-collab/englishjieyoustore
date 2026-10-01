"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import styles from "@/components/article-inline-annotation-admin.module.css";
import { supabase } from "@/lib/supabase/client";
import { notifyArticleInlineAnnotationsUpdated } from "@/components/use-article-inline-annotations";
import type {
  ArticleInlineAnnotation,
  ArticleInlineLineStyle,
  ArticleInlineSourceDocument,
  ArticleInlineSourceSummary,
  ArticleInlineSourceType,
  ArticleInlineTextUnit,
} from "@/lib/article-inline-annotations";

const SOURCE_TYPES: { id: ArticleInlineSourceType; label: string }[] = [
  { id: "new-concept", label: "新概念英语" },
  { id: "ielts-reading", label: "雅思阅读文章" },
];

const LINE_STYLES: { id: ArticleInlineLineStyle; label: string }[] = [
  { id: "solid", label: "实线" },
  { id: "dashed", label: "虚线" },
  { id: "wavy", label: "波浪线" },
  { id: "thick", label: "加粗横线" },
];

type TextSelection = { end: number; selectedText: string; start: number; unitId: string };

async function getAdminToken() {
  const { data, error } = await supabase.auth.getSession();
  return error ? null : data.session?.access_token ?? null;
}

function selectionOffset(unit: HTMLElement, node: Node, nodeOffset: number) {
  const range = document.createRange();
  range.selectNodeContents(unit);
  range.setEnd(node, nodeOffset);
  return range.toString().length;
}

export function ArticleInlineAnnotationAdmin() {
  const [sourceType, setSourceType] = useState<ArticleInlineSourceType>("new-concept");
  const [sources, setSources] = useState<ArticleInlineSourceSummary[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [documentSource, setDocumentSource] = useState<ArticleInlineSourceDocument | null>(null);
  const [annotations, setAnnotations] = useState<ArticleInlineAnnotation[]>([]);
  const [savedAnnotations, setSavedAnnotations] = useState<ArticleInlineAnnotation[]>([]);
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [style, setStyle] = useState<ArticleInlineLineStyle>("solid");
  const [label, setLabel] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const hasUnsavedChanges = JSON.stringify(annotations) !== JSON.stringify(savedAnnotations);

  useEffect(() => {
    let active = true;
    setLoadingCatalog(true);
    setSourceId("");
    setDocumentSource(null);
    setAnnotations([]);
    setSavedAnnotations([]);
    setSelection(null);
    setMessage("");

    void (async () => {
      try {
      const token = await getAdminToken();
      if (!token) {
        if (active) {
          setMessage("管理员登录已失效，请重新登录。");
          setLoadingCatalog(false);
        }
        return;
      }
      const query = new URLSearchParams({ mode: "catalog", sourceType });
      const response = await fetch(`/api/article-inline-annotations?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!active) return;
      if (!response.ok) setMessage(payload?.error ?? "文章列表载入失败。");
      setSources(Array.isArray(payload?.sources) ? payload.sources : []);
      setLoadingCatalog(false);
      } catch {
        if (active) {
          setMessage("文章列表载入失败，请刷新后台后重试。");
          setLoadingCatalog(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [sourceType]);

  useEffect(() => {
    if (!sourceId) return;
    let active = true;
    setLoadingDocument(true);
    setDocumentSource(null);
    setAnnotations([]);
    setSavedAnnotations([]);
    setSelection(null);
    setEditingId(null);
    setLabel("");
    setPartOfSpeech("");
    setMessage("");

    void (async () => {
      try {
      const token = await getAdminToken();
      if (!token) {
        if (active) {
          setMessage("管理员登录已失效，请重新登录。");
          setLoadingDocument(false);
        }
        return;
      }
      const documentQuery = new URLSearchParams({ mode: "document", sourceId, sourceType });
      const publicQuery = new URLSearchParams({ sourceId, sourceType });
      const [documentResponse, annotationsResponse] = await Promise.all([
        fetch(`/api/article-inline-annotations?${documentQuery}`, {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
        }),
        fetch(`/api/article-inline-annotations?${publicQuery}`, { cache: "no-store" }),
      ]);
      const [documentPayload, annotationPayload] = await Promise.all([
        documentResponse.json().catch(() => null),
        annotationsResponse.json().catch(() => null),
      ]);
      if (!active) return;
      if (!documentResponse.ok) {
        setMessage(documentPayload?.error ?? "文章正文载入失败。");
      } else {
        setDocumentSource(documentPayload.document ?? null);
        const loadedAnnotations = Array.isArray(annotationPayload?.annotations) ? annotationPayload.annotations : [];
        setAnnotations(loadedAnnotations);
        setSavedAnnotations(loadedAnnotations);
      }
      setLoadingDocument(false);
      } catch {
        if (active) {
          setMessage("文章正文载入失败，请刷新后台后重试。");
          setLoadingDocument(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [sourceId, sourceType]);

  const filteredSources = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase();
    if (!normalized) return sources;
    return sources.filter((source) => `${source.label} ${source.title} ${source.id}`.toLocaleLowerCase().includes(normalized));
  }, [search, sources]);

  function changeSourceType(nextType: ArticleInlineSourceType) {
    if (nextType === sourceType) return;
    if (hasUnsavedChanges && !window.confirm("当前文章有尚未保存的标注，切换后会丢失这些修改。仍要切换吗？")) return;
    setSourceType(nextType);
  }

  function changeSourceId(nextId: string) {
    if (nextId === sourceId) return;
    if (hasUnsavedChanges && !window.confirm("当前文章有尚未保存的标注，切换后会丢失这些修改。仍要切换吗？")) return;
    setSourceId(nextId);
  }

  function handleTextSelection(event: MouseEvent<HTMLParagraphElement>, unit: ArticleInlineTextUnit) {
    const selected = window.getSelection();
    if (!selected || selected.isCollapsed || selected.rangeCount === 0) return;
    const range = selected.getRangeAt(0);
    const root = event.currentTarget;
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return;

    const raw = selected.toString();
    const leading = raw.match(/^\s*/)?.[0].length ?? 0;
    const trailing = raw.match(/\s*$/)?.[0].length ?? 0;
    const selectedText = raw.slice(leading, raw.length - trailing);
    if (!selectedText) return;
    const start = selectionOffset(root, range.startContainer, range.startOffset) + leading;
    const end = start + selectedText.length;
    setSelection({ end, selectedText, start, unitId: unit.id });
    setEditingId(null);
    setLabel("");
    setPartOfSpeech("");
    setMessage("");
  }

  function addOrUpdateAnnotation() {
    if (!selection || !label.trim()) {
      setMessage(selection ? "请填写线下方显示的文字内容。" : "请先用鼠标选择一个词或短语。 ");
      return;
    }
    const overlaps = annotations.some((annotation) =>
      annotation.id !== editingId &&
      annotation.unitId === selection.unitId &&
      selection.start < annotation.end &&
      selection.end > annotation.start,
    );
    if (overlaps) {
      setMessage("这个词或短语与现有标注重叠，请先修改或删除原标注。");
      return;
    }
    const item: ArticleInlineAnnotation = {
      end: selection.end,
      id: editingId ?? crypto.randomUUID(),
      label: label.trim(),
      partOfSpeech: partOfSpeech.trim(),
      selectedText: selection.selectedText,
      start: selection.start,
      style,
      unitId: selection.unitId,
    };
    setAnnotations((current) => {
      const withoutEdited = current.filter((annotation) => annotation.id !== editingId);
      return [...withoutEdited, item].sort((left, right) => left.unitId.localeCompare(right.unitId) || left.start - right.start);
    });
    setEditingId(null);
    setSelection(null);
    setLabel("");
    setPartOfSpeech("");
    window.getSelection()?.removeAllRanges();
    setMessage("标注已加入待保存列表；确认后点击页面上方“保存并更新前台”。");
  }

  function editAnnotation(item: ArticleInlineAnnotation) {
    setSelection({ end: item.end, selectedText: item.selectedText, start: item.start, unitId: item.unitId });
    setStyle(item.style);
    setLabel(item.label);
    setPartOfSpeech(item.partOfSpeech);
    setEditingId(item.id);
    setMessage(`正在修改“${item.selectedText}”的标注。`);
    document.getElementById(`inline-annotation-unit-${item.unitId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function save() {
    if (!documentSource) return;
    setSaving(true);
    setMessage("");
    try {
      const token = await getAdminToken();
      if (!token) {
        setMessage("管理员登录已失效，请重新登录。");
        setSaving(false);
        return;
      }
      const response = await fetch("/api/article-inline-annotations", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ annotations, sourceId, sourceType }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error ?? "保存失败，请检查标注内容后重试。");
        setSaving(false);
        return;
      }
      setAnnotations(payload.annotations);
      setSavedAnnotations(payload.annotations);
      notifyArticleInlineAnnotationsUpdated(sourceType, sourceId);
      setMessage("已保存，前台文章页已更新这些词汇标注和词性。");
    } catch {
      setMessage("保存时连接中断，请确认网络后重试。");
    }
    setSaving(false);
  }

  return (
    <section className={styles.admin}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>ARTICLE INLINE ANNOTATIONS</span>
          <h2>文章选词标注</h2>
          <p>选文章正文中的词或短语，设置线型、词性与线下说明，再保存到对应文章页。</p>
        </div>
        <button className="button primary" disabled={!documentSource || saving || !hasUnsavedChanges} onClick={() => void save()} type="button">
          {saving ? "保存中…" : hasUnsavedChanges ? "保存并更新前台" : "内容已保存"}
        </button>
      </header>

      <div className={styles.sourceTypes} aria-label="文章类别">
        {SOURCE_TYPES.map((item) => (
          <button className={sourceType === item.id ? styles.active : ""} key={item.id} onClick={() => changeSourceType(item.id)} type="button">
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.sourcePicker}>
        <label>
          <span>搜索文章</span>
          <input onChange={(event) => setSearch(event.target.value)} placeholder="标题、课次或编号" value={search} />
        </label>
        <label>
          <span>选择文章</span>
          <select onChange={(event) => changeSourceId(event.target.value)} value={sourceId}>
            <option value="">请选择</option>
            {filteredSources.map((source) => <option key={source.id} value={source.id}>{source.label} · {source.title}</option>)}
          </select>
        </label>
        {sourceId && documentSource ? <Link href={documentSource.href} target="_blank">打开前台页面 ↗</Link> : null}
      </div>

      {message ? <p className={styles.message} role="status">{message}</p> : null}
      {loadingCatalog || loadingDocument ? <p className={styles.empty}>正在载入文章…</p> : null}

      {documentSource ? (
        <div className={styles.workspace}>
          <div className={styles.units}>
            <div className={styles.documentTitle}>
              <h3>{documentSource.title}</h3>
              <span>{annotations.length} 条标注 · 选中正文即可添加</span>
            </div>
            {documentSource.units.map((unit) => {
              const unitAnnotations = annotations.filter((item) => item.unitId === unit.id).sort((a, b) => a.start - b.start);
              return (
                <article className={styles.unit} key={unit.id}>
                  <span className={styles.unitLabel}>{unit.label}</span>
                  <p
                    className={selection?.unitId === unit.id ? styles.selectedUnit : ""}
                    id={`inline-annotation-unit-${unit.id}`}
                    onMouseUp={(event) => handleTextSelection(event, unit)}
                  >
                    {unit.text}
                  </p>
                  {unitAnnotations.length ? (
                    <ul className={styles.annotationList}>
                      {unitAnnotations.map((item) => (
                        <li key={item.id}>
                          <span><strong>{item.selectedText}</strong>{item.partOfSpeech ? ` · ${item.partOfSpeech}` : ""} → {item.label}</span>
                          <button type="button" onClick={() => editAnnotation(item)}>修改</button>
                          <button type="button" onClick={() => setAnnotations((current) => current.filter((candidate) => candidate.id !== item.id))}>删除</button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              );
            })}
          </div>

          <aside className={styles.editor}>
            <h3>{editingId ? "修改标注" : "新增标注"}</h3>
            {selection ? (
              <div className={styles.selectionPreview}>
                <span>已选择</span>
                <strong>{selection.selectedText}</strong>
              </div>
            ) : <p className={styles.hint}>先在左侧文章正文中用鼠标框选一个词或几个词。</p>}
            <label>
              <span>线型</span>
              <select onChange={(event) => setStyle(event.target.value as ArticleInlineLineStyle)} value={style}>
                {LINE_STYLES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label>
              <span>词性</span>
              <input onChange={(event) => setPartOfSpeech(event.target.value)} placeholder="例如 n. / v. / adj." value={partOfSpeech} />
            </label>
            <label>
              <span>线下显示内容</span>
              <textarea onChange={(event) => setLabel(event.target.value)} placeholder="输入中文释义、用法或补充文字" rows={3} value={label} />
            </label>
            <button className="button secondary" disabled={!selection || !label.trim()} onClick={addOrUpdateAnnotation} type="button">
              {editingId ? "更新这条标注" : "加入标注"}
            </button>
            {selection ? <button className={styles.clearSelection} onClick={() => { setSelection(null); setEditingId(null); }} type="button">取消选择</button> : null}
            <div className={styles.preview}>
              <span className={styles[`preview-${style}`]}>{selection?.selectedText || "selected words"}</span>
              {partOfSpeech.trim() ? <small>{partOfSpeech}</small> : null}
              <em>{label.trim() || "线下说明"}</em>
            </div>
          </aside>
        </div>
      ) : null}
      {!documentSource && !loadingCatalog && !loadingDocument ? <p className={styles.empty}>选择类别和文章后，文章正文会显示在这里。</p> : null}
    </section>
  );
}
