"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BbcSyntaxSentence,
  type BbcSyntaxLevel,
  type BbcSyntaxLayerKey,
  type BbcSyntaxDisplayMode,
  type BbcSyntaxSentenceData,
  type BbcSyntaxSpan,
  type BbcSyntaxTokenRange,
} from "@/components/bbc-syntax-sentence";
import type { ArticleInlineAnnotation, ArticleInlineLineStyle } from "@/lib/article-inline-annotations";
import { supabase } from "@/lib/supabase/client";
import { notifyArticleInlineAnnotationsUpdated } from "@/components/use-article-inline-annotations";
import styles from "./bbc-syntax-inline-editor.module.css";

const SYNTAX_LEVELS = [1, 2, 3, 4, 5] as const;

function layerKey(level: BbcSyntaxLevel): BbcSyntaxLayerKey {
  return `level${level}` as BbcSyntaxLayerKey;
}

type Props = {
  allInlineAnnotations: ArticleInlineAnnotation[];
  allSentences: BbcSyntaxSentenceData[];
  articleId: string;
  data: BbcSyntaxSentenceData;
  displayMode: BbcSyntaxDisplayMode;
  inlineAnnotations: ArticleInlineAnnotation[];
  onInlineAnnotationsChange: (annotations: ArticleInlineAnnotation[]) => void;
  onSentenceChange: (sentence: BbcSyntaxSentenceData) => void;
  sentenceNo: number;
  showPos: boolean;
  translation: ReactNode;
};

function spanText(sentence: BbcSyntaxSentenceData, span: BbcSyntaxSpan) {
  const first = sentence.tokens[span.start];
  const last = sentence.tokens[span.end - 1];
  return first && last ? sentence.text.slice(first.start, last.end) : "";
}

function tokenRangeText(sentence: BbcSyntaxSentenceData, range: BbcSyntaxTokenRange) {
  const first = sentence.tokens[range.start];
  const last = sentence.tokens[range.end - 1];
  return first && last ? sentence.text.slice(first.start, last.end) : "";
}

export function BbcSyntaxInlineEditor({
  allInlineAnnotations,
  allSentences,
  articleId,
  data,
  displayMode,
  inlineAnnotations,
  onInlineAnnotationsChange,
  onSentenceChange,
  sentenceNo,
  showPos,
  translation,
}: Props) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState<BbcSyntaxTokenRange | null>(null);
  const [level, setLevel] = useState<BbcSyntaxLevel>(1);
  const [editingSpan, setEditingSpan] = useState<{ end: number; level: BbcSyntaxLevel; start: number } | null>(null);
  const [label, setLabel] = useState("主语");
  const [pos, setPos] = useState("");
  const [selectedInlineId, setSelectedInlineId] = useState("");
  const [lineStyle, setLineStyle] = useState<ArticleInlineLineStyle>("solid");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function check() {
      const { data: auth, error } = await supabase.auth.getUser();
      if (!auth.user || error) {
        if (active) setIsAdmin(false);
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
      if (active) setIsAdmin(profile?.role === "admin");
    }
    void check();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => void check());
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setSelection(null);
    setEditingSpan(null);
    setSelectedInlineId("");
    setMessage("");
  }, [articleId, sentenceNo]);

  const selectedPos = useMemo(() => {
    if (!selection) return "";
    const values = data.tokens.slice(selection.start, selection.end).filter((token) => token.pos !== "PUNCT").map((token) => token.pos);
    return values.length && values.every((value) => value === values[0]) ? values[0] : "";
  }, [data.tokens, selection]);
  const allSpans = useMemo(() => SYNTAX_LEVELS.flatMap((spanLevel) =>
    (data[layerKey(spanLevel)] ?? []).map((span) => ({ level: spanLevel, span }))), [data]);

  function selectRange(range: BbcSyntaxTokenRange) {
    setSelection(range);
    setPos("");
    const exact = allSpans.find(({ span }) => span.start === range.start && span.end === range.end);
    if (exact) {
      setLevel(exact.level);
      setLabel(exact.span.label);
      setEditingSpan({ end: exact.span.end, level: exact.level, start: exact.span.start });
    } else {
      setEditingSpan(null);
      setLabel(level === 1 ? "主语" : level === 2 ? "定语" : "中心成分");
    }
    setMessage("");
  }

  function selectToken(tokenIndex: number) {
    setEditing(true);
    setEditingSpan(null);
    setSelectedInlineId("");
    selectRange({ start: tokenIndex, end: tokenIndex + 1 });
  }

  function selectComponent(spanLevel: BbcSyntaxLevel, span: BbcSyntaxSpan) {
    setEditing(true);
    setLevel(spanLevel);
    setLabel(span.label);
    setSelection({ start: span.start, end: span.end });
    setEditingSpan({ end: span.end, level: spanLevel, start: span.start });
    setSelectedInlineId("");
    setMessage("已选中语法成分，可修改名称、范围或删除。");
  }

  function selectInlineAnnotation(annotation: ArticleInlineAnnotation) {
    const matched = data.tokens.map((token, index) => ({ token, index }))
      .filter(({ token }) => token.start < annotation.end && token.end > annotation.start);
    if (!matched.length) return;
    setEditing(true);
    setSelection({ start: matched[0].index, end: matched[matched.length - 1].index + 1 });
    setSelectedInlineId(annotation.id);
    setLineStyle(annotation.style);
    setMessage("已选中这条下划线标注，可修改线型后保存。");
  }

  function changeSelectedPos(nextPos: string) {
    const normalizedPos = nextPos.trim().slice(0, 32);
    if (!selection || !normalizedPos) return;
    const tokens = data.tokens.map((token, index) =>
      index >= selection.start && index < selection.end && token.pos !== "PUNCT" ? { ...token, pos: normalizedPos } : token,
    );
    onSentenceChange({ ...data, tokens });
    setPos(normalizedPos);
    setMessage("词性已修改，点击“保存并更新文章”后生效。");
  }

  function applyComponent() {
    if (!selection || !label.trim()) return;
    const targetLevel = editingSpan?.level ?? level;
    const targetKey = layerKey(targetLevel);
    const spans = [...(data[targetKey] ?? [])];
    const parentSpans = targetLevel > 1 ? data[layerKey((targetLevel - 1) as BbcSyntaxLevel)] ?? [] : [];
    const hasParent = targetLevel === 1 || parentSpans.some((parent) =>
      selection.start >= parent.start && selection.end <= parent.end);
    const originalIndex = editingSpan
      ? spans.findIndex((span) => span.start === editingSpan.start && span.end === editingSpan.end)
      : -1;
    if (editingSpan && originalIndex < 0) {
      setEditingSpan(null);
    }
    if (originalIndex >= 0) {
      const siblings = spans.filter((_, index) => index !== originalIndex);
      if (targetLevel === 1 && siblings.some((span) => selection.start < span.end && selection.end > span.start)) {
        setMessage("新范围与其他主句成分重叠，请调整选区。");
        return;
      }
      if (!hasParent) {
        setMessage(`第 ${targetLevel} 级成分需要完整落在一个第 ${targetLevel - 1} 级成分范围内。`);
        return;
      }
      const descendants = SYNTAX_LEVELS.filter((candidateLevel) => candidateLevel > targetLevel)
        .flatMap((candidateLevel) => data[layerKey(candidateLevel)] ?? [])
        .filter((child) => child.start >= spans[originalIndex].start && child.end <= spans[originalIndex].end);
      if (descendants.some((child) => child.start < selection.start || child.end > selection.end)) {
        setMessage("新范围必须完整包含所有下一级成分，请先调整或删除子成分。");
        return;
      }
      spans[originalIndex] = { ...spans[originalIndex], start: selection.start, end: selection.end, label: label.trim() };
      spans.sort((left, right) => left.start - right.start || left.end - right.end);
      onSentenceChange({ ...data, [targetKey]: spans });
      setEditingSpan(null);
      setMessage("语法成分范围/名称已更新，点击“保存并更新文章”后生效。");
      return;
    }
    const exactIndex = spans.findIndex((span) => span.start === selection.start && span.end === selection.end);
    if (exactIndex >= 0) {
      spans[exactIndex] = { ...spans[exactIndex], label: label.trim() };
    } else {
      if (targetLevel === 1 && spans.some((span) => selection.start < span.end && selection.end > span.start)) {
        setMessage("选区与已有主句成分重叠。请拖选原标注的完整范围进行修改，或先删除重叠标注。");
        return;
      }
      if (!hasParent) {
        setMessage(`第 ${targetLevel} 级成分需要完整落在一个第 ${targetLevel - 1} 级成分范围内。请先标注上一级成分。`);
        return;
      }
      spans.push({ label: label.trim(), start: selection.start, end: selection.end });
      spans.sort((left, right) => left.start - right.start || left.end - right.end);
    }
    onSentenceChange({ ...data, [targetKey]: spans });
    setEditingSpan(null);
    setMessage("语法成分已更新，点击“保存并更新文章”后生效。");
  }

  function loadSpan(spanLevel: BbcSyntaxLevel, span: BbcSyntaxSpan) {
    setLevel(spanLevel);
    setLabel(span.label);
    setSelection({ start: span.start, end: span.end });
    setEditingSpan({ end: span.end, level: spanLevel, start: span.start });
    setSelectedInlineId("");
    setMessage("已选中这条成分标注。也可以在原文中拖选新的范围。");
  }

  function deleteSpan(spanLevel: BbcSyntaxLevel, span: BbcSyntaxSpan) {
    const nextData: BbcSyntaxSentenceData = { ...data };
    for (const currentLevel of SYNTAX_LEVELS) {
      if (currentLevel < spanLevel) continue;
      const key = layerKey(currentLevel);
      nextData[key] = (data[key] ?? []).filter((item) => currentLevel === spanLevel
        ? item !== span
        : !(item.start >= span.start && item.end <= span.end));
    }
    onSentenceChange(nextData);
    setEditingSpan(null);
    setMessage("语法成分已删除，点击“保存并更新文章”后生效。");
  }

  function changeSelectedLineStyle(nextStyle: ArticleInlineLineStyle) {
    setLineStyle(nextStyle);
    if (!selectedInlineId) return;
    onInlineAnnotationsChange(allInlineAnnotations.map((annotation) =>
      annotation.id === selectedInlineId ? { ...annotation, style: nextStyle } : annotation,
    ));
    setMessage("下划线样式已修改，点击“保存并更新文章”后生效。");
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const { data: auth, error } = await supabase.auth.getSession();
      const token = error ? null : auth.session?.access_token;
      if (!token) throw new Error("管理员登录已失效，请重新登录。");
      const [syntaxResponse, inlineResponse] = await Promise.all([
        fetch("/api/bbc-syntax-annotations", {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ articleId, sentences: allSentences }),
        }),
        fetch("/api/article-inline-annotations", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ sourceType: "bbc", sourceId: articleId, annotations: allInlineAnnotations }),
        }),
      ]);
      const [syntaxPayload, inlinePayload] = await Promise.all([
        syntaxResponse.json().catch(() => null), inlineResponse.json().catch(() => null),
      ]);
      const errors = [
        !syntaxResponse.ok ? (syntaxPayload?.error ?? "词性/语法成分保存失败") : "",
        !inlineResponse.ok ? (inlinePayload?.error ?? "下划线保存失败") : "",
      ].filter(Boolean);
      if (errors.length) throw new Error(errors.join("；"));
      notifyArticleInlineAnnotationsUpdated("bbc", articleId);
      setMessage("已保存。词性、语法成分和下划线标注已更新。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存语法标注失败。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.root}>
      <BbcSyntaxSentence
        data={data}
        displayMode={displayMode}
        embedded
        inlineAnnotations={inlineAnnotations}
        onInlineAnnotationClick={isAdmin ? selectInlineAnnotation : undefined}
        onPosTokenClick={isAdmin ? selectToken : undefined}
        onSyntaxSpanClick={isAdmin ? selectComponent : undefined}
        onTokenRangeSelect={isAdmin && editing ? selectRange : undefined}
        sentenceNo={sentenceNo}
        showPos={showPos}
        translation={translation}
        vocabularyWordIndexes={new Set<number>()}
        waveTerms={[]}
      />
      {isAdmin ? (
        <div className={styles.editor}>
          {!editing ? <div className={styles.editorHeader}>
            <button onClick={() => setEditing(true)} type="button">编辑本句</button>
          </div> : null}
          {editing ? (
            <>
              <div className={styles.selection}>
                <span>当前选区</span>
                <strong>{selection ? tokenRangeText(data, selection) : "拖选原文中的词汇或短语"}</strong>
              </div>
              <div className={styles.controls}>
                <label>
                  <span>词性</span>
                  <input
                    aria-label="输入词性"
                    disabled={!selection}
                    maxLength={32}
                    onChange={(event) => setPos(event.target.value)}
                    placeholder="输入词性"
                    value={pos || selectedPos}
                  />
                </label>
                <button disabled={!selection || !(pos || selectedPos)} onClick={() => changeSelectedPos(pos || selectedPos)} type="button">修改选中词性</button>
                <label>
                  <span>成分层级</span>
                  <select onChange={(event) => {
                    const nextLevel = Number(event.target.value) as BbcSyntaxLevel;
                    setLevel(nextLevel);
                    setEditingSpan(null);
                    if (selection) setLabel(nextLevel === 1 ? "主语" : nextLevel === 2 ? "定语" : "中心成分");
                  }} value={level}>
                    <option value={1}>一级成分</option>
                    <option value={2}>二级嵌套</option>
                    <option value={3}>三级嵌套</option>
                    <option value={4}>四级嵌套</option>
                    <option value={5}>五级嵌套</option>
                  </select>
                </label>
                <label className={styles.labelInput}>
                  <span>语法成分</span>
                  <input onChange={(event) => setLabel(event.target.value)} value={label} />
                </label>
                <button disabled={!selection || !label.trim()} onClick={applyComponent} type="button">{editingSpan ? "修改成分" : "添加 / 修改成分"}</button>
                <label>
                  <span>下划线样式</span>
                  <select disabled={!selectedInlineId} onChange={(event) => changeSelectedLineStyle(event.target.value as ArticleInlineLineStyle)} value={lineStyle}>
                    <option value="solid">实线</option>
                    <option value="dashed">虚线</option>
                    <option value="wavy">波浪线</option>
                    <option value="thick">粗实线</option>
                  </select>
                </label>
                <div className={styles.editorActions}>
                  <button className={styles.save} disabled={saving} onClick={() => void save()} type="button">{saving ? "保存中…" : "保存并更新文章"}</button>
                  <button aria-pressed="true" className={styles.active} onClick={() => setEditing(false)} type="button">退出编辑</button>
                </div>
              </div>
              <div className={styles.spanList}>
                {allSpans.length ? allSpans.map(({ level: spanLevel, span }, index) => (
                  <div className={styles.spanItem} key={`${spanLevel}-${span.start}-${span.end}-${index}`}>
                    <button className={styles.spanText} onClick={() => loadSpan(spanLevel, span)} type="button">
                      <span>{spanLevel === 1 ? "一级成分" : `${spanLevel}级嵌套`} · {span.label}</span>
                      <strong>{spanText(data, span)}</strong>
                    </button>
                    <button aria-label={`删除${spanLevel}级${span.label}`} onClick={() => deleteSpan(spanLevel, span)} type="button">删除</button>
                  </div>
                )) : <p className={styles.hint}>本句暂无语法成分标注。</p>}
              </div>
              {message ? <p className={styles.message} role="status">{message}</p> : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
