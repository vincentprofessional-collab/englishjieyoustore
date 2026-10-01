"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BbcSyntaxSentence,
  type BbcSyntaxDisplayMode,
  type BbcSyntaxSentenceData,
  type BbcSyntaxSpan,
  type BbcSyntaxTokenRange,
} from "@/components/bbc-syntax-sentence";
import type { ArticleInlineAnnotation, ArticleInlineLineStyle } from "@/lib/article-inline-annotations";
import { supabase } from "@/lib/supabase/client";
import { notifyArticleInlineAnnotationsUpdated } from "@/components/use-article-inline-annotations";
import styles from "./bbc-syntax-inline-editor.module.css";

const POS_OPTIONS = [
  ["ADJ", "形容词"], ["ADP", "介词"], ["ADV", "副词"], ["AUX", "助动词"], ["CCONJ", "并列连词"],
  ["DET", "限定词"], ["INTJ", "感叹词"], ["NOUN", "名词"], ["NUM", "数词"], ["PART", "小品词"],
  ["PRON", "代词"], ["PROPN", "专有名词"], ["SCONJ", "从属连词"], ["SYM", "符号"], ["VERB", "动词"], ["X", "其他"],
] as const;

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
  const [level, setLevel] = useState<"level1" | "level2">("level1");
  const [editingSpan, setEditingSpan] = useState<{ end: number; level: "level1" | "level2"; start: number } | null>(null);
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
  const allSpans = useMemo(() => ([
    ...data.level1.map((span) => ({ level: "level1" as const, span })),
    ...data.level2.map((span) => ({ level: "level2" as const, span })),
  ]), [data.level1, data.level2]);

  function selectRange(range: BbcSyntaxTokenRange) {
    setSelection(range);
    setPos("");
    const exact = [
      ...data.level1.map((span) => ({ level: "level1" as const, span })),
      ...data.level2.map((span) => ({ level: "level2" as const, span })),
    ].find(({ span }) => span.start === range.start && span.end === range.end);
    if (exact) {
      setLevel(exact.level);
      setLabel(exact.span.label);
      setEditingSpan({ end: exact.span.end, level: exact.level, start: exact.span.start });
    } else {
      if (!editingSpan) setLabel(level === "level1" ? "主语" : "定语");
    }
    setMessage("");
  }

  function selectToken(tokenIndex: number) {
    setEditing(true);
    setEditingSpan(null);
    setSelectedInlineId("");
    selectRange({ start: tokenIndex, end: tokenIndex + 1 });
  }

  function selectComponent(spanLevel: "level1" | "level2", span: BbcSyntaxSpan) {
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
    if (!selection || !nextPos) return;
    const tokens = data.tokens.map((token, index) =>
      index >= selection.start && index < selection.end && token.pos !== "PUNCT" ? { ...token, pos: nextPos } : token,
    );
    onSentenceChange({ ...data, tokens });
    setPos(nextPos);
    setMessage("词性已修改，点击“保存并更新文章”后生效。");
  }

  function applyComponent() {
    if (!selection || !label.trim()) return;
    const targetLevel = editingSpan?.level ?? level;
    const spans = [...data[targetLevel]];
    const originalIndex = editingSpan
      ? spans.findIndex((span) => span.start === editingSpan.start && span.end === editingSpan.end)
      : -1;
    if (editingSpan && originalIndex < 0) {
      setEditingSpan(null);
    }
    if (originalIndex >= 0) {
      const siblings = spans.filter((_, index) => index !== originalIndex);
      if (targetLevel === "level1" && siblings.some((span) => selection.start < span.end && selection.end > span.start)) {
        setMessage("新范围与其他主句成分重叠，请调整选区。");
        return;
      }
      if (targetLevel === "level2" && !data.level1.some((parent) => selection.start >= parent.start && selection.end <= parent.end)) {
        setMessage("嵌套成分需要完整落在一个主句成分范围内。");
        return;
      }
      spans[originalIndex] = { ...spans[originalIndex], start: selection.start, end: selection.end, label: label.trim() };
      spans.sort((left, right) => left.start - right.start || left.end - right.end);
      onSentenceChange({ ...data, [targetLevel]: spans });
      setEditingSpan(null);
      setMessage("语法成分范围/名称已更新，点击“保存并更新文章”后生效。");
      return;
    }
    const exactIndex = spans.findIndex((span) => span.start === selection.start && span.end === selection.end);
    if (exactIndex >= 0) {
      spans[exactIndex] = { ...spans[exactIndex], label: label.trim() };
    } else {
      if (targetLevel === "level1" && spans.some((span) => selection.start < span.end && selection.end > span.start)) {
        setMessage("选区与已有主句成分重叠。请拖选原标注的完整范围进行修改，或先删除重叠标注。");
        return;
      }
      if (targetLevel === "level2" && !data.level1.some((parent) => selection.start >= parent.start && selection.end <= parent.end)) {
        setMessage("从属成分需要完整落在一个主句成分范围内。请先标注对应的主句成分。");
        return;
      }
      spans.push({ label: label.trim(), start: selection.start, end: selection.end });
      spans.sort((left, right) => left.start - right.start || left.end - right.end);
    }
    onSentenceChange({ ...data, [targetLevel]: spans });
    setEditingSpan(null);
    setMessage("语法成分已更新，点击“保存并更新文章”后生效。");
  }

  function loadSpan(spanLevel: "level1" | "level2", span: BbcSyntaxSpan) {
    setLevel(spanLevel);
    setLabel(span.label);
    setSelection({ start: span.start, end: span.end });
    setEditingSpan({ end: span.end, level: spanLevel, start: span.start });
    setSelectedInlineId("");
    setMessage("已选中这条成分标注。也可以在原文中拖选新的范围。");
  }

  function deleteSpan(spanLevel: "level1" | "level2", span: BbcSyntaxSpan) {
    const nextLevel1 = spanLevel === "level1"
      ? data.level1.filter((item) => item !== span)
      : data.level1;
    const nextLevel2 = spanLevel === "level2"
      ? data.level2.filter((item) => item !== span)
      : data.level2.filter((item) => !(item.start >= span.start && item.end <= span.end));
    onSentenceChange({ ...data, level1: nextLevel1, level2: nextLevel2 });
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
                  <select disabled={!selection} onChange={(event) => setPos(event.target.value)} value={pos || selectedPos}>
                    <option value="">选择词性</option>
                    {POS_OPTIONS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                  </select>
                </label>
                <button disabled={!selection || !(pos || selectedPos)} onClick={() => changeSelectedPos(pos || selectedPos)} type="button">修改选中词性</button>
                <label>
                  <span>成分层级</span>
                  <select onChange={(event) => setLevel(event.target.value as "level1" | "level2")} value={level}>
                    <option value="level1">主句成分</option>
                    <option value="level2">嵌套成分</option>
                  </select>
                </label>
                <button onClick={() => { setEditingSpan(null); setMessage("新建成分：拖选原文范围后填写语法成分。"); }} type="button">新建成分</button>
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
                      <span>{spanLevel === "level1" ? "主句" : "嵌套"} · {span.label}</span>
                      <strong>{spanText(data, span)}</strong>
                    </button>
                    <button aria-label={`删除${span.label}`} onClick={() => deleteSpan(spanLevel, span)} type="button">删除</button>
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
