"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FAVORITE_WORDS_CHANGED_EVENT, FAVORITE_WORDS_STORAGE_KEY, type FavoriteLearningWord } from "@/lib/vocabulary/learning";
import styles from "./vocabulary-excel-import.module.css";

const MAX_WORDS = 10_000;
const WORD_HEADERS = new Set(["word", "words", "vocabulary", "english", "englishword", "englishwords", "英文", "词汇", "单词", "英文词汇", "英文单词"]);

function normalizeTerm(value: string) {
  return value.normalize("NFKC").replace(/[‘’]/g, "'").replace(/[‐‑–—]/g, "-").replace(/\s+/g, " ").trim();
}

function termKey(value: string) {
  // Match dictionary/favorite IDs while keeping the complete display spelling.
  return normalizeTerm(value).toLowerCase().replace(/^[^a-z]+|[^a-z]+$/gi, "");
}

function englishTerm(value: unknown) {
  if (typeof value !== "string") return null;
  const term = normalizeTerm(value);
  return term.length <= 120 && /[a-z]/i.test(term) && /^[\p{Script=Latin}\p{M} .'-]+$/u.test(term) ? term : null;
}

function selectVocabularyColumn(rows: unknown[][]) {
  const headerColumn = rows[0].findIndex((cell) => typeof cell === "string"
    && WORD_HEADERS.has(normalizeTerm(cell).toLowerCase().replace(/[\s_-]/g, "")));
  if (headerColumn >= 0) return { column: headerColumn, start: 1 };
  const counts = Array<number>(Math.max(...rows.map((row) => row.length))).fill(0);
  for (const row of rows) row.forEach((cell, index) => { if (englishTerm(cell)) counts[index] += 1; });
  return { column: counts.indexOf(Math.max(...counts)), start: 0 };
}

function readExistingFavorites(): FavoriteLearningWord[] {
  const raw = window.localStorage.getItem(FAVORITE_WORDS_STORAGE_KEY);
  if (!raw) return [];
  const items: unknown = JSON.parse(raw);
  if (!Array.isArray(items) || !items.every((item) => item && typeof item === "object"
    && typeof item.id === "string" && typeof item.word === "string")) {
    throw new Error("现有生词本数据无法读取，请先恢复生词本后再导入。");
  }
  return items;
}

export function VocabularyExcelImport({ onClose, onStudy }: { onClose: () => void; onStudy: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ added: number; duplicate: number; skipped: number; total: number } | null>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    return () => { if (previousFocus instanceof HTMLElement) previousFocus.focus(); };
  }, []);

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) return;
    setError("");
    setResult(null);
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError("请选择 .xlsx 或 .xls 格式的 Excel 文件。");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Excel 文件不能超过 10 MB。");
      return;
    }
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", sheetRows: MAX_WORDS + 2, cellFormula: false, cellHTML: false });
      let rows: unknown[][] = [];
      for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name];
        if (!sheet["!ref"]) continue;
        if (sheet["!fullref"]) {
          const fullRange = XLSX.utils.decode_range(sheet["!fullref"]);
          if (fullRange.e.r - fullRange.s.r + 1 > MAX_WORDS + 1) throw new Error("每次最多导入 10,000 行，请拆分文件后再上传。");
        }
        const range = XLSX.utils.decode_range(sheet["!ref"]);
        range.e.c = Math.min(range.e.c, 49);
        range.e.r = Math.min(range.e.r, MAX_WORDS + 1);
        if (range.s.c > range.e.c) continue;
        rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: null, range });
        if (rows.length) break;
      }
      if (!rows.length) throw new Error("Excel 中没有可导入的词汇。");
      const { column, start } = selectVocabularyColumn(rows);
      if (rows.length - start > MAX_WORDS) throw new Error("每次最多导入 10,000 行，请拆分文件后再上传。");
      const existing = readExistingFavorites();
      const seen = new Set(existing.flatMap((item) => [termKey(item.id), termKey(item.word)]));
      const added: (FavoriteLearningWord & { savedAt: string })[] = [];
      const savedAt = new Date().toISOString();
      let duplicate = 0;
      let skipped = 0;
      for (const row of rows.slice(start)) {
        const word = englishTerm(row[column]);
        if (!word) { skipped += 1; continue; }
        const id = termKey(word);
        if (seen.has(id)) { duplicate += 1; continue; }
        seen.add(id);
        added.push({ id, word, savedAt, definitionCn: "", definitionLines: [], partOfSpeech: "", phonetic: "" });
      }
      if (!added.length && !duplicate) throw new Error("没有找到英文词汇。请将英文单词放在同一列，可使用“英文词汇”作为列名。");
      if (added.length) {
        // Write once after parsing succeeds; retain every existing favorite's metadata.
        window.localStorage.setItem(FAVORITE_WORDS_STORAGE_KEY, JSON.stringify([...added, ...existing]));
        window.dispatchEvent(new Event(FAVORITE_WORDS_CHANGED_EVENT));
      }
      setResult({ added: added.length, duplicate, skipped, total: added.length + existing.length });
    } catch (cause) {
      const message = cause instanceof DOMException && cause.name === "QuotaExceededError"
        ? "浏览器存储空间不足，请减少本次导入的词汇数量。"
        : cause instanceof Error ? cause.message : "Excel 导入失败，请检查文件后重试。";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vocabulary-learning-settings-backdrop">
      <div
        aria-labelledby="vocabulary-excel-import-title"
        aria-modal="true"
        className={styles.dialog}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !busy) { event.stopPropagation(); onClose(); }
          if (event.key !== "Tab") return;
          const controls = dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)");
          if (!controls?.length) { event.preventDefault(); return; }
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className={styles.heading}>
          <h2 id="vocabulary-excel-import-title">自建生词本</h2>
          <button aria-label="关闭自建生词本" disabled={busy} onClick={onClose} ref={closeRef} type="button">×</button>
        </div>
        <p>上传 Excel，将一列英文单词或短语加入生词本。可使用“英文词汇”作为列名。</p>
        <p>读取第一张有内容的工作表；支持 .xlsx、.xls，每次最多 10,000 行、10 MB。</p>
        <label className={styles.filePicker}>
          <span>选择 Excel 文件</span>
          <input accept=".xlsx,.xls" disabled={busy} onChange={(event) => void importFile(event)} type="file" />
        </label>
        <p className={styles.note}>导入词汇与文章中收藏的词汇合并，重复词汇不会覆盖原有释义。生词本保存在当前浏览器中。</p>
        {busy ? <p aria-live="polite" role="status">正在导入词汇…</p> : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {result ? <div aria-live="polite" className={styles.result} role="status">
          <strong>导入完成：新增 {result.added.toLocaleString()} 个词汇</strong>
          <p>已跳过 {result.duplicate.toLocaleString()} 个重复词汇、{result.skipped.toLocaleString()} 行空白或非英文内容。生词本共 {result.total.toLocaleString()} 个词汇。</p>
          <button onClick={onStudy} type="button">进入生词本</button>
        </div> : null}
      </div>
    </div>
  );
}
