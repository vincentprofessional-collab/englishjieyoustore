"use client";

import { useState } from "react";
import { adminRequest } from "@/lib/admin/request";
import type { BbcVocabularyItem } from "@/lib/articles/bbc";
import { normalizeBbcVocabularyTerm } from "@/lib/articles/bbc-vocabulary-merge";
import styles from "./bbc-syntax-inline-editor.module.css";

function vocabularyWords(text: string) {
  return normalizeBbcVocabularyTerm(text).replace(/[‘’]/g, "'").match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu) ?? [];
}

function findVocabularyIndex(
  items: BbcVocabularyItem[],
  sentence: string,
  start: number,
  end: number,
) {
  const selection = vocabularyWords(sentence.slice(start, end));
  if (!selection.length) return -1;

  const terms = items.map((item) =>
    [item.highlightTerm, item.term, item.lemma].flatMap((term) => term ? [vocabularyWords(term)] : []),
  );
  const exact = terms.findIndex((forms) => forms.some((words) => words.join(" ") === selection.join(" ")));
  if (exact !== -1 || selection.length !== 1) return exact;

  const position = vocabularyWords(sentence.slice(0, start)).length;
  const sentenceWords = vocabularyWords(sentence);
  const phrases = terms.flatMap((forms, index) => forms.some((words) => {
    if (words.length < 2) return false;
    return words.some((word, offset) => {
      const phraseStart = position - offset;
      return word === selection[0] && phraseStart >= 0
        && words.every((part, partIndex) => part === sentenceWords[phraseStart + partIndex]);
    });
  }) ? [index] : []);
  return phrases.length === 1 ? phrases[0] : -1;
}

type Props = {
  articleId: string;
  sentence: string;
  start: number;
  end: number;
  items: BbcVocabularyItem[];
  getDefinition: (item: BbcVocabularyItem) => string;
  onChange: (items: BbcVocabularyItem[]) => void;
};

export function BbcSelectedVocabularyEditor({ articleId, sentence, start, end, items, getDefinition, onChange }: Props) {
  const [draft, setDraft] = useState<{ term?: string; definition?: string }>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const selectedText = sentence.slice(start, end).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  const index = findVocabularyIndex(items, sentence, start, end);
  const item = items[index];
  const term = draft.term ?? item?.term ?? selectedText;
  const definition = draft.definition ?? (item ? getDefinition(item) : "");

  async function save(operation: "save" | "delete") {
    if (operation === "delete" && (!item || !window.confirm(`确定删除「${item.term}」？`))) return;

    setSaving(true);
    setMessage("");
    try {
      const result = await adminRequest("/api/admin/bbc-articles", {
        method: "PATCH",
        body: JSON.stringify({
          action: "editVocabulary",
          articleId,
          operation,
          index,
          previous: item && { term: item.term, entry: item.entry, definition: item.definition ?? "" },
          term,
          definition,
          selectedText,
        }),
      });
      if (!Array.isArray(result.vocabulary)) throw new Error("词汇保存结果暂时无法读取，请刷新后核对。");
      onChange(result.vocabulary);
      setDraft({});
      setMessage(operation === "delete" ? "词汇已删除。" : "词汇已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "暂时无法保存词汇，请重试。");
    } finally {
      setSaving(false);
    }
  }

  if (!selectedText) return null;

  return (
    <form className={styles.controls} onSubmit={(event) => { event.preventDefault(); void save("save"); }}>
      <label>
        <span>词汇</span>
        <input disabled={saving} maxLength={160} onChange={(event) => setDraft({ ...draft, term: event.target.value })} required value={term} />
      </label>
      <label>
        <span>释义</span>
        <input disabled={saving} maxLength={600} onChange={(event) => setDraft({ ...draft, definition: event.target.value })} placeholder="输入中文释义" required value={definition} />
      </label>
      <button disabled={saving || !term.trim() || !definition.trim()} type="submit">{item ? "保存词汇" : "新增词汇"}</button>
      {item ? <button disabled={saving} onClick={() => void save("delete")} type="button">删除词汇</button> : null}
      {message ? <span role="status">{message}</span> : null}
    </form>
  );
}
