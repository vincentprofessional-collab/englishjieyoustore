"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  LEARNING_BOOKS,
  type LearningWord,
} from "@/lib/vocabulary/learning";
import {
  normalizeVocabularyLearningContent,
  type LearningBookOption,
  type LearningBookWordChanges,
  type VocabularyLearningContent,
} from "@/lib/vocabulary/learning-content";
import { loadVocabularyLearningContent, saveVocabularyLearningContent } from "@/lib/vocabulary/learning-content-admin";
import styles from "./admin-vocabulary-content-editor.module.css";

type AdminBook = LearningBookOption & { custom?: boolean; deleted?: boolean };
type WordForm = {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definitionCn: string;
  englishDefinition: string;
  example: string;
  exampleTranslation: string;
  note: string;
};

const EMPTY_FORM: WordForm = {
  word: "", phonetic: "", partOfSpeech: "", definitionCn: "", englishDefinition: "", example: "", exampleTranslation: "", note: "",
};

function bookChanges(state: VocabularyLearningContent, key: string): LearningBookWordChanges {
  return state.entries[key] ?? { overrides: {}, additions: [] };
}

function splitLines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function toWordForm(word?: LearningWord): WordForm {
  if (!word) return EMPTY_FORM;
  return {
    word: word.word,
    phonetic: word.phonetic,
    partOfSpeech: word.partOfSpeech,
    definitionCn: word.definitionLines.join("\n") || word.definitionCn,
    englishDefinition: word.englishDefinitions.join("\n"),
    example: word.englishExamples.join("\n"),
    exampleTranslation: (word.englishExampleTranslations ?? []).join("\n"),
    note: [word.extension, ...word.reviewNotes].filter(Boolean).join("\n"),
  };
}

function toAdminBooks(content: VocabularyLearningContent): AdminBook[] {
  const builtIn = LEARNING_BOOKS.map((book) => {
    const override = content.books[book.key];
    return {
      key: book.key,
      label: override?.label || book.label,
      description: override?.description || book.description,
      ...(override?.deleted ? { deleted: true } : {}),
    };
  });
  const builtInKeys = new Set<string>(LEARNING_BOOKS.map((book) => book.key));
  const custom = Object.entries(content.books)
    .filter(([key, value]) => !builtInKeys.has(key) && value.custom)
    .map(([key, value]) => ({ key, label: value.label || key, description: value.description || "自定义词汇书", custom: true, ...(value.deleted ? { deleted: true } : {}) }));
  return [...builtIn, ...custom];
}

function createWord(form: WordForm, bookKey: string, existing?: LearningWord): LearningWord {
  const normalizedWord = form.word.trim();
  const definitions = splitLines(form.definitionCn);
  const englishDefinitions = splitLines(form.englishDefinition);
  const examples = splitLines(form.example);
  const translations = splitLines(form.exampleTranslation);
  const notes = splitLines(form.note);
  const generatedId = `admin:${bookKey}:${normalizedWord.toLowerCase().replace(/\s+/g, "-")}:${Date.now().toString(36)}`;
  return {
    antonyms: existing?.antonyms ?? [],
    bbcExampleSource: existing?.bbcExampleSource,
    definitionCn: definitions.join("；"),
    definitionGroups: existing?.definitionGroups ?? [],
    definitionLines: definitions,
    englishDefinitions,
    englishExamples: examples,
    englishExampleTranslations: translations,
    extension: notes[0] ?? "",
    etymologySource: existing?.etymologySource ?? "",
    etymologyStory: existing?.etymologyStory ?? "",
    formation: existing?.formation ?? "",
    ...(existing?.frequencyRank === undefined ? {} : { frequencyRank: existing.frequencyRank }),
    id: existing?.id ?? generatedId,
    inflections: existing?.inflections ?? [],
    level: bookKey,
    partOfSpeech: form.partOfSpeech.trim(),
    phonetic: form.phonetic.trim(),
    reviewNotes: notes.slice(1),
    root: existing?.root ?? "",
    synonyms: existing?.synonyms ?? [],
    ukAudioUrl: existing?.ukAudioUrl ?? "",
    ukPhonetic: existing?.ukPhonetic ?? form.phonetic.trim(),
    usAudioUrl: existing?.usAudioUrl ?? "",
    usPhonetic: existing?.usPhonetic ?? form.phonetic.trim(),
    word: normalizedWord,
  };
}

export function AdminVocabularyContentEditor({ adminUserId }: { adminUserId: string }) {
  const [content, setContent] = useState<VocabularyLearningContent>({ books: {}, entries: {} });
  const [selectedBook, setSelectedBook] = useState("初中");
  const [bookLoadNonce, setBookLoadNonce] = useState(0);
  const [words, setWords] = useState<LearningWord[]>([]);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [form, setForm] = useState<WordForm>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [newBookLabel, setNewBookLabel] = useState("");
  const [newBookDescription, setNewBookDescription] = useState("");
  const [bookLabel, setBookLabel] = useState("");
  const [bookDescription, setBookDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingWords, setIsLoadingWords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const books = useMemo(() => toAdminBooks(content), [content]);
  const booksRef = useRef(books);
  booksRef.current = books;
  const currentBook = books.find((book) => book.key === selectedBook);
  const selectedWord = words.find((word) => word.id === selectedWordId) ?? null;
  const filteredWords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const result = query
      ? words.filter((word) => `${word.word} ${word.partOfSpeech} ${word.definitionCn} ${word.englishDefinitions.join(" ")}`.toLocaleLowerCase().includes(query))
      : words;
    return result.slice(0, 120);
  }, [search, words]);

  useEffect(() => {
    let cancelled = false;
    void loadVocabularyLearningContent().then((value) => {
      if (cancelled) return;
      const normalized = normalizeVocabularyLearningContent(value);
      setContent(normalized);
      const firstVisible = toAdminBooks(normalized).find((book) => !book.deleted);
      if (firstVisible) setSelectedBook(firstVisible.key);
    }).catch((error: unknown) => {
      if (!cancelled) setMessage(error instanceof Error ? error.message : "读取词汇内容失败。");
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const book = booksRef.current.find((item) => item.key === selectedBook);
    setBookLabel(book?.label ?? "");
    setBookDescription(book?.description ?? "");
    setSearch("");
    setSelectedWordId(null);
    setForm(EMPTY_FORM);
    if (!book || book.deleted) {
      setWords([]);
      return;
    }
    const controller = new AbortController();
    setIsLoadingWords(true);
    void fetch(`/api/vocabulary-learning?book=${encodeURIComponent(selectedBook)}&direct=1`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("读取词汇列表失败");
        return await response.json() as { words?: LearningWord[] };
      })
      .then((payload) => {
        if (!controller.signal.aborted) setWords(Array.isArray(payload.words) ? payload.words.filter((word) => word.level === selectedBook) : []);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "读取词汇列表失败。");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingWords(false);
      });
    return () => controller.abort();
  }, [bookLoadNonce, selectedBook]);

  async function persist(next: VocabularyLearningContent, success: string) {
    setIsSaving(true);
    setMessage("");
    try {
      await saveVocabularyLearningContent(adminUserId, next);
      setContent(next);
      setMessage(success);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? `保存失败：${error.message}` : "保存失败，请重试。");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function saveBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookLabel.trim()) {
      setMessage("词汇书名称不能为空。");
      return;
    }
    const next = normalizeVocabularyLearningContent(content);
    const current = next.books[selectedBook] ?? {};
    next.books[selectedBook] = { ...current, label: bookLabel.trim(), description: bookDescription.trim(), deleted: false };
    if (await persist(next, "词汇书信息已保存并发布。")) {
      setBookLabel(bookLabel.trim());
    }
  }

  async function addBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = newBookLabel.trim();
    if (!label) return;
    const key = `custom-book-${Date.now().toString(36)}`;
    const next = normalizeVocabularyLearningContent(content);
    next.books[key] = { label, description: newBookDescription.trim() || "自定义词汇书", custom: true };
    if (await persist(next, "新词汇书已添加并发布。")) {
      setNewBookLabel("");
      setNewBookDescription("");
      setSelectedBook(key);
    }
  }

  async function deleteBook() {
    if (!currentBook || currentBook.deleted || !window.confirm(`确定删除“${currentBook.label}”词汇书及其中词条？`)) return;
    const next = normalizeVocabularyLearningContent(content);
    next.books[selectedBook] = { label: currentBook.label, description: currentBook.description, ...(currentBook.custom ? { custom: true } : {}), deleted: true };
    if (await persist(next, "词汇书已删除并发布。")) {
      setWords([]);
      setSelectedWordId(null);
      setForm(EMPTY_FORM);
      const fallback = books.find((book) => !book.deleted && book.key !== selectedBook);
      if (fallback) setSelectedBook(fallback.key);
    }
  }

  async function restoreBook(book: AdminBook) {
    const next = normalizeVocabularyLearningContent(content);
    next.books[book.key] = { label: book.label.replace(/^\(已删除\)\s*/, ""), description: book.description, ...(book.custom ? { custom: true } : {}), deleted: false };
    if (await persist(next, "词汇书已恢复并发布。")) {
      setSelectedBook(book.key);
      setBookLoadNonce((value) => value + 1);
    }
  }

  function selectWord(word: LearningWord) {
    setSelectedWordId(word.id);
    setForm(toWordForm(word));
  }

  async function saveWord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = form.word.trim();
    if (!text) {
      setMessage("词汇或短语不能为空。");
      return;
    }
    const duplicate = words.find((word) => word.id !== selectedWordId && word.word.trim().toLocaleLowerCase() === text.toLocaleLowerCase());
    if (duplicate) {
      setMessage(`“${text}”已存在于当前词汇书。`);
      return;
    }
    const next = normalizeVocabularyLearningContent(content);
    const changes = bookChanges(next, selectedBook);
    const existing = selectedWord ?? undefined;
    const updated = createWord(form, selectedBook, existing);
    const isAddition = existing ? changes.additions.some((word) => word.id === existing.id) : true;
    if (isAddition) {
      const index = changes.additions.findIndex((word) => word.id === updated.id);
      if (index >= 0) changes.additions[index] = updated;
      else changes.additions.push(updated);
    } else {
      changes.overrides[updated.id] = { word: updated };
    }
    next.entries[selectedBook] = changes;
    if (await persist(next, existing ? "词条已修改并发布。" : "词条已添加并发布。")) {
      setWords((current) => existing
        ? current.map((word) => word.id === updated.id ? updated : word)
        : [...current, updated]);
      setSelectedWordId(updated.id);
      setForm(toWordForm(updated));
    }
  }

  async function deleteWord(word: LearningWord) {
    if (!window.confirm(`确定删除“${word.word}”？`)) return;
    const next = normalizeVocabularyLearningContent(content);
    const changes = bookChanges(next, selectedBook);
    if (changes.additions.some((item) => item.id === word.id)) {
      changes.additions = changes.additions.filter((item) => item.id !== word.id);
      if (word.id.startsWith("bbc-inline-phrase:")) changes.overrides[word.id] = { deleted: true };
      else delete changes.overrides[word.id];
    } else {
      changes.overrides[word.id] = { deleted: true };
    }
    next.entries[selectedBook] = changes;
    if (await persist(next, "词条已删除并发布。")) {
      setWords((current) => current.filter((item) => item.id !== word.id));
      if (selectedWordId === word.id) {
        setSelectedWordId(null);
        setForm(EMPTY_FORM);
      }
    }
  }

  function startNewWord() {
    setSelectedWordId(null);
    setForm(EMPTY_FORM);
  }

  return <section className={`admin-editor-card ${styles.editor}`}>
    <header className={styles.heading}>
      <div><span className="eyebrow">VOCABULARY CONTENT</span><h2>背单词词汇书与词条</h2><p>新增、编辑和删除词汇书、单词、短语、地道表达及俚语俗语。保存后前台词汇页立即读取新内容。</p></div>
      {isSaving ? <span role="status">保存中…</span> : null}
    </header>
    {message ? <p className={styles.message} role="status">{message}</p> : null}
    {isLoading ? <p>正在读取词汇管理数据…</p> : <div className={styles.layout}>
      <section className={styles.panel}>
        <h3>词汇书</h3>
        <label>选择词汇书<select onChange={(event) => setSelectedBook(event.target.value)} value={selectedBook}>{books.map((book) => <option key={book.key} value={book.key}>{book.deleted ? `（已删除）${book.label}` : book.label}</option>)}</select></label>
        {currentBook ? <>
          {currentBook.deleted ? <button className="button secondary" disabled={isSaving} onClick={() => void restoreBook(currentBook)} type="button">恢复这本词汇书</button> : <>
            <form className={styles.form} onSubmit={(event) => void saveBook(event)}>
              <label>名称<input onChange={(event) => setBookLabel(event.target.value)} value={bookLabel} /></label>
              <label>说明<textarea onChange={(event) => setBookDescription(event.target.value)} rows={2} value={bookDescription} /></label>
              <button className="button secondary" disabled={isSaving} type="submit">保存词汇书信息</button>
            </form>
            <button className={styles.danger} disabled={isSaving} onClick={() => void deleteBook()} type="button">删除词汇书</button>
          </>}
        </> : null}
        <form className={styles.form} onSubmit={(event) => void addBook(event)}>
          <h4>新增词汇书</h4>
          <label>名称<input onChange={(event) => setNewBookLabel(event.target.value)} value={newBookLabel} /></label>
          <label>说明<input onChange={(event) => setNewBookDescription(event.target.value)} value={newBookDescription} /></label>
          <button className="button secondary" disabled={isSaving || !newBookLabel.trim()} type="submit">新增词汇书</button>
        </form>
        <p className={styles.hint}>每个词条只能属于一本词汇书；原有分级词汇的累计范围规则保持不变。</p>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeading}><div><h3>{currentBook?.label ?? "词条"} · 词条管理</h3><p>{words.length.toLocaleString()} 条当前词汇，列表最多显示 120 条，可用搜索定位。</p></div><button className="button secondary" disabled={!currentBook || currentBook.deleted} onClick={startNewWord} type="button">新增词条</button></div>
        {!currentBook || currentBook.deleted ? <p className={styles.hint}>请先选择或恢复一本词汇书。</p> : <div className={styles.wordsLayout}>
          <div className={styles.wordList}>
            <label>搜索<input onChange={(event) => setSearch(event.target.value)} placeholder="词汇、词性或释义" value={search} /></label>
            {isLoadingWords ? <p>读取词条…</p> : filteredWords.length ? filteredWords.map((word) => <article className={`${styles.wordRow} ${selectedWordId === word.id ? styles.active : ""}`} key={word.id}>
              <button className={styles.wordSelect} onClick={() => selectWord(word)} type="button"><strong>{word.word}</strong><span>{word.partOfSpeech} · {word.definitionCn}</span></button>
              <button aria-label={`删除 ${word.word}`} className={styles.deleteSmall} disabled={isSaving} onClick={() => void deleteWord(word)} type="button">删除</button>
            </article>) : <p className={styles.hint}>没有匹配词条。</p>}
            {words.length > filteredWords.length && !search.trim() ? <small className={styles.hint}>当前仅显示前 120 条；请搜索后继续定位。</small> : null}
          </div>
          <form className={styles.wordForm} onSubmit={(event) => void saveWord(event)}>
            <h4>{selectedWord ? `修改：${selectedWord.word}` : "新增词条"}</h4>
            <label>单词或短语<input onChange={(event) => setForm((value) => ({ ...value, word: event.target.value }))} required value={form.word} /></label>
            <div className={styles.formRow}><label>音标<input onChange={(event) => setForm((value) => ({ ...value, phonetic: event.target.value }))} value={form.phonetic} /></label><label>词性／类型<input onChange={(event) => setForm((value) => ({ ...value, partOfSpeech: event.target.value }))} placeholder="n. / phr. / idiom" value={form.partOfSpeech} /></label></div>
            <label>中文释义（可分行）<textarea onChange={(event) => setForm((value) => ({ ...value, definitionCn: event.target.value }))} rows={3} value={form.definitionCn} /></label>
            <label>英文释义（可分行）<textarea onChange={(event) => setForm((value) => ({ ...value, englishDefinition: event.target.value }))} rows={2} value={form.englishDefinition} /></label>
            <label>例句（可分行）<textarea onChange={(event) => setForm((value) => ({ ...value, example: event.target.value }))} rows={2} value={form.example} /></label>
            <label>例句翻译（可分行）<textarea onChange={(event) => setForm((value) => ({ ...value, exampleTranslation: event.target.value }))} rows={2} value={form.exampleTranslation} /></label>
            <label>补充说明<small>首行作为扩展说明，其余行保存在复习备注中。</small><textarea onChange={(event) => setForm((value) => ({ ...value, note: event.target.value }))} rows={2} value={form.note} /></label>
            <div className={styles.formActions}><button className="button primary" disabled={isSaving} type="submit">{selectedWord ? "保存修改并发布" : "添加并发布"}</button>{selectedWord ? <button className="button secondary" disabled={isSaving} onClick={startNewWord} type="button">取消修改</button> : null}</div>
          </form>
        </div>}
      </section>
    </div>}
  </section>;
}
