"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import styles from "./admin-bbc-article-upload.module.css";
import { readBbcRichPaste, serializeBbcArticlePaste } from "@/lib/articles/bbc-paste-markup";
import { adminRequest } from "@/lib/admin/request";
import { analyzeBbcAudio } from "@/lib/admin/bbc-audio-alignment";
import type { BbcArticle } from "@/lib/articles/bbc";
import { parseBbcArticleDateFromTitle, parseBbcArticlePaste, splitBbcArticleParagraphs } from "@/lib/articles/bbc-article-upload";
import { getBbcPdfQuizIssues, type BbcPdfQuiz } from "@/lib/articles/bbc-quiz";
import { AdminBbcPdfQuizEditor } from "@/components/admin-bbc-pdf-quiz-editor";

type UploadTicket = { headers: Record<string, string>; objectPath: string; uploadUrl: string };
type SentenceUploadTicket = UploadTicket & { sentenceNo: number };
type AudioPreparation = Awaited<ReturnType<typeof analyzeBbcAudio>>;

function uploadToR2(ticket: UploadTicket, file: File, onProgress: (value: number) => void, timeoutMs = 0) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", ticket.uploadUrl);
    Object.entries(ticket.headers).forEach(([name, value]) => request.setRequestHeader(name, value));
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    request.onerror = () => reject(new Error("音频上传未完成，可能是存储服务拒绝请求或传输中断。请重试或检查后台上传权限。"));
    request.timeout = timeoutMs;
    request.ontimeout = () => reject(new Error("MP3 上传超时。"));
    request.onabort = () => reject(new Error("音频上传已取消。"));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      reject(new Error(`Cloudflare R2 音频上传失败（HTTP ${request.status}）。`));
    };
    request.send(file);
  });
}

function readMp3DurationMs(file: File) {
  return new Promise<number | undefined>((resolve) => {
    const player = new Audio();
    const url = URL.createObjectURL(file);
    const finish = (duration?: number) => {
      clearTimeout(timeout);
      player.onloadedmetadata = null;
      player.onerror = null;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    const timeout = setTimeout(finish, 5_000);
    player.preload = "metadata";
    player.onloadedmetadata = () => finish(Number.isFinite(player.duration) && player.duration > 0
      ? Math.round(player.duration * 1000)
      : undefined);
    player.onerror = () => finish();
    player.src = url;
  });
}

export function AdminBbcArticleUpload() {
  const [text, setText] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioStatus, setAudioStatus] = useState<
    "waiting" | "analyzing" | "uploading" | "uploaded" | "failed"
  >("waiting");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [publishedHref, setPublishedHref] = useState("");
  const [saved, setSaved] = useState<{ article: BbcArticle; text: string } | null>(null);
  const [sentenceChoice, setSentenceChoice] = useState("");
  const [vocabularyChoice, setVocabularyChoice] = useState("");
  const [newTerm, setNewTerm] = useState("");
  const [newDefinition, setNewDefinition] = useState("");
  const [detailMessage, setDetailMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingAudio, setExistingAudio] = useState<{ objectPath: string } | null>(null);
  const [articles, setArticles] = useState<{ id: string; published: boolean; title: string; year: number }[]>([]);
  const [pdfQuiz, setPdfQuiz] = useState<BbcPdfQuiz | null>(null);
  const pdfQuizRef = useRef<BbcPdfQuiz | null>(null);
  const [pdfDirty, setPdfDirty] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMessage, setPdfMessage] = useState("");
  const detailsRef = useRef<HTMLElement>(null);
  const paragraphCount = useMemo(() => {
    const parsed = parseBbcArticlePaste(text, true);
    return typeof parsed === "string" ? undefined : splitBbcArticleParagraphs(parsed.english, "en").length;
  }, [text]);
  const audioJob = useRef<{ file: File; subtitleFile: File | null; sentenceKey: string; preparation?: AudioPreparation; objectPath?: string; uploaded: Map<number, string> } | null>(null);
  const selectedSentence = saved?.article.sentences?.find((sentence) => String(sentence.sentenceNo) === sentenceChoice);
  const selectedVocabulary = vocabularyChoice === "" ? undefined : saved?.article.vocabulary?.[Number(vocabularyChoice)];
  const detailsDisabled = busy || pdfBusy || saved?.text !== text;

  function updatePdfQuiz(quiz: BbcPdfQuiz | null, dirty = false) {
    pdfQuizRef.current = quiz;
    setPdfQuiz(quiz);
    setPdfDirty(dirty);
  }

  async function loadArticles() {
    const result = await adminRequest("/api/admin/bbc-articles");
    setArticles(result.articles);
  }
  useEffect(() => { void loadArticles().catch(() => undefined); }, []);

  function resetDetails() {
    setSentenceChoice("");
    setVocabularyChoice("");
    setNewTerm("");
    setNewDefinition("");
    setDetailMessage(null);
  }

  async function editArticle(id: string) {
    setBusy(true); setError(false); setMessage("");
    try {
      const result = await adminRequest(`/api/admin/bbc-articles?articleId=${encodeURIComponent(id)}`);
      const paste = serializeBbcArticlePaste(result.article);
      setText(paste);
      setSaved({ article: result.article, text: paste });
      resetDetails();
      updatePdfQuiz(result.article.quiz ?? null); setPdfMessage("");
      setEditingId(id); setAudioFile(null); setSubtitleFile(null); setAudioProgress(0); setAudioStatus("waiting");
      audioJob.current = null;
      setExistingAudio(result.objectPath ? { objectPath: result.objectPath } : null);
      setPublishedHref(`/articles/${id}${result.published ? "" : "?preview=draft"}`);
      setMessage("正文修改后可直接发布。逐句时间点和语法标注可在前端精读页校对。");
      requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ block: "start" }));
    } catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : "文章无法读取。"); }
    finally { setBusy(false); }
  }

  async function editDetails(action: "deleteSentence" | "deleteVocabulary" | "addVocabulary") {
    if (!saved || detailsDisabled) return;
    let fields;
    let success;
    if (action === "deleteSentence") {
      if (!selectedSentence || !window.confirm(`删除第 ${selectedSentence.sentenceNo} 句「${selectedSentence.english}」？`)) return;
      fields = { sentenceNo: selectedSentence.sentenceNo, english: selectedSentence.english };
      success = "已删除句子。";
    } else if (action === "deleteVocabulary") {
      if (!selectedVocabulary || !window.confirm(`从本篇文章删除「${selectedVocabulary.term}」？`)) return;
      fields = { index: Number(vocabularyChoice), term: selectedVocabulary.term };
      success = "已删除词汇。";
    } else {
      if (!newTerm.trim() || !newDefinition.trim()) return;
      fields = { term: newTerm, definition: newDefinition };
      success = "已添加词汇。";
    }
    setBusy(true);
    setDetailMessage(null);
    try {
      const result = await adminRequest("/api/admin/bbc-articles", {
        method: "PATCH",
        body: JSON.stringify({ action, articleId: saved.article.id, ...fields }),
      });
      const paste = serializeBbcArticlePaste(result.article);
      setText(paste);
      setSaved({ article: result.article, text: paste });
      if (action === "deleteSentence") setSentenceChoice("");
      if (action === "deleteVocabulary") setVocabularyChoice("");
      if (action === "addVocabulary") { setNewTerm(""); setNewDefinition(""); }
      setDetailMessage({ text: [success, ...(result.warnings ?? [])].join(" ") });
    } catch (cause) {
      setDetailMessage({ error: true, text: cause instanceof Error ? cause.message : "修改未保存，请稍后再试。" });
    } finally {
      setBusy(false);
    }
  }

  async function importPdf(file: File | undefined) {
    if (!file) return;
    setPdfBusy(true); setPdfMessage("正在读取 PDF……");
    try {
      let quiz: BbcPdfQuiz | undefined;
      if (file.size <= 4 * 1024 * 1024) {
        // Safari uses the same server reader as other browsers, without loading
        // a PDF worker or relying on newer browser iterator APIs.
        const body = new FormData();
        body.set("file", file);
        setPdfMessage("正在识别 PDF 题目与答案……");
        try {
          quiz = (await adminRequest("/api/admin/bbc-pdf-quiz", { method: "POST", body, signal: AbortSignal.timeout(25_000) })).quiz;
        } catch (cause) {
          // A reader/transport failure can still be recovered by the local reader.
          if (cause instanceof Error && /PDF 内容|PDF 练习|登录|权限/.test(cause.message)) throw cause;
        }
      }
      if (!quiz) {
        const { readBbcPdf, parseBbcPdfQuiz } = await import("@/lib/admin/bbc-pdf-import");
        const { pages, pdfSha256 } = await readBbcPdf(file, (page, total) => setPdfMessage(`正在识别 PDF 第 ${page}/${total} 页……`));
        quiz = parseBbcPdfQuiz(pages, { pdf: file.name, pdfSha256 });
      }
      updatePdfQuiz(quiz, true);
      setPdfMessage(`已识别 ${quiz.summary?.length ?? 0} 道总结句选择题、${quiz.matching?.length ?? 0} 道段落主旨配对题、${quiz.quiz.length} 道阅读题、${quiz.exercise.length} 道填空题。`);
    } catch (cause) { setPdfMessage(`${cause instanceof Error ? cause.message : "PDF 无法识别，请核对文件。"}已保留现有练习，可以继续发布文章。`); }
    finally { setPdfBusy(false); }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const publish = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") !== "align";
    setError(false);
    setMessage("");
    const parsed = parseBbcArticlePaste(text, true);
    if (typeof parsed === "string") {
      setError(true);
      setMessage(parsed);
      return;
    }
    const date = parseBbcArticleDateFromTitle(parsed.dateTitle)!;
    if (editingId && date.id !== editingId) {
      setError(true);
      setMessage("修改已上传文章时，请保留原标题中的日期。");
      return;
    }

    setBusy(true);
    let objectPath = existingAudio?.objectPath ?? "";
    let alignment: AudioPreparation | undefined;
    let durationMs: number | undefined;
    let sentenceAudioFiles: { sentenceNo: number; objectPath: string }[] = [];
    const reviewWarnings: string[] = [];
    const api = "/api/admin/bbc-articles";

    try {
      if (audioFile) {
        let job = audioJob.current;
        if (job?.file !== audioFile || (job.objectPath && !job.objectPath.startsWith(`bbc/${date.year}/${date.id}/`))) {
          job = { file: audioFile, subtitleFile: null, sentenceKey: "", uploaded: new Map() };
          audioJob.current = job;
        }
        try {
          if (!/\.mp3$/i.test(audioFile.name) || !audioFile.size || audioFile.size > 200 * 1024 * 1024) {
            throw new Error("请选择不超过 200 MB 的 MP3 文件。");
          }
          if (!job.objectPath) {
            setAudioProgress(0);
            setAudioStatus("uploading");
            setMessage("正在上传完整原声……");
            const ticket = await adminRequest(api, {
              body: JSON.stringify({ action: "presign", filename: audioFile.name, size: audioFile.size, title: parsed.dateTitle }),
              method: "POST",
              signal: AbortSignal.timeout(15_000),
            }) as UploadTicket;
            await uploadToR2(ticket, audioFile, setAudioProgress, 180_000);
            job.objectPath = ticket.objectPath;
          }
          objectPath = job.objectPath;
          setAudioProgress(100);
          setAudioStatus("uploaded");
        } catch (cause) {
          setAudioStatus("failed");
          reviewWarnings.push(cause instanceof Error ? cause.message : "原声暂未上传，可稍后补传。");
        }

        if (job.objectPath && (subtitleFile || !publish)) {
          try {
            if (subtitleFile && subtitleFile.size > 5 * 1024 * 1024) {
              throw new Error("字幕文件超过 5 MB，可稍后换文件补做切分。");
            }
            setAudioStatus("analyzing");
            setMessage("正在读取文章句子……");
            const prepared = await adminRequest(api, {
              body: JSON.stringify({ action: "prepare", text, allowIncomplete: true }),
              method: "POST",
              signal: AbortSignal.timeout(15_000),
            }) as { article: BbcArticle };
            const sentences = prepared.article.sentences ?? [];
            const sentenceKey = JSON.stringify(sentences.map((sentence) => sentence.english));
            if (job.sentenceKey !== sentenceKey || job.subtitleFile !== subtitleFile) {
              job.sentenceKey = sentenceKey;
              job.subtitleFile = subtitleFile;
              job.preparation = undefined;
              job.uploaded.clear();
            }
            alignment = job.preparation ??= await analyzeBbcAudio(audioFile, sentences, setMessage, subtitleFile ?? undefined);
            if (alignment.reviewSentenceNos.length) {
              const numbers = alignment.reviewSentenceNos;
              reviewWarnings.push(`建议试听校对第 ${numbers.slice(0, 12).join("、")} 句${numbers.length > 12 ? `等 ${numbers.length} 句` : ""}。`);
            }
            const ranges = new Map(alignment.timings.map((range) => [range.sentenceNo, range]));
            const missing = alignment.clips.filter(({ sentenceNo }) => !job.uploaded.has(sentenceNo));
            if (missing.length) {
              setMessage("正在上传独立小音频……");
              const { tickets } = await adminRequest(api, {
                body: JSON.stringify({
                  action: "presign-sentences", objectPath,
                  files: missing.map(({ sentenceNo, file }) => ({ ...ranges.get(sentenceNo), sentenceNo, size: file.size })),
                }),
                method: "POST",
                signal: AbortSignal.timeout(15_000),
              }) as { tickets: SentenceUploadTicket[] };
              const files = new Map(missing.map((clip) => [clip.sentenceNo, clip.file]));
              const deadline = Date.now() + 45_000;
              for (let first = 0; first < tickets.length && Date.now() < deadline; first += 6) {
                await Promise.allSettled(tickets.slice(first, first + 6).map(async (ticket) => {
                  const file = files.get(ticket.sentenceNo);
                  if (!file) return;
                  await uploadToR2(ticket, file, () => undefined, Math.max(1, Math.min(15_000, deadline - Date.now())));
                  job.uploaded.set(ticket.sentenceNo, ticket.objectPath);
                }));
              }
            }
          } catch (cause) {
            reviewWarnings.push(cause instanceof Error ? cause.message : "逐句切分暂未完成，可稍后校对。");
          }
          sentenceAudioFiles = [...job.uploaded].map(([sentenceNo, path]) => ({ sentenceNo, objectPath: path }));
          setAudioStatus("uploaded");
        }
        if (job.objectPath) durationMs = alignment?.durationMs ?? await readMp3DurationMs(audioFile).catch(() => undefined);
      } else if (subtitleFile) {
        reviewWarnings.push("请同时选择本篇 MP3，便于按字幕补做逐句播放。");
      }

      setMessage(publish ? "正在发布文章……" : "正在保存文章……");
      const submittedQuiz = pdfQuizRef.current;
      const payload = await adminRequest(api, {
        body: JSON.stringify({ text, objectPath, durationMs, timings: alignment?.timings, sentenceAudioFiles, quiz: submittedQuiz, allowIncomplete: true, publish, reviewWarnings }),
        method: "PUT",
      });
      if (audioJob.current?.objectPath && payload.objectPath !== audioJob.current.objectPath) audioJob.current = null;
      setSaved({ article: payload.article, text });
      resetDetails();
      if (pdfQuizRef.current === submittedQuiz) updatePdfQuiz(payload.article.quiz ?? null);
      setEditingId(payload.articleId);
      setExistingAudio(payload.objectPath ? { objectPath: payload.objectPath } : null);
      setPublishedHref(`/articles/${payload.articleId}${payload.published ? "" : "?preview=draft"}`);
      const warnings = [...new Set<string>([...reviewWarnings, ...(payload.reviewWarnings ?? [])])];
      setMessage(`${payload.published ? "文章已发布。" : "草稿已保存，可直接发布。"}${payload.audioIncluded ? "已关联完整原声。" : "可稍后补传原声。"}${payload.timedSentenceCount ?? 0}/${payload.sentenceCount} 句可单句播放，其中 ${payload.sentenceAudioCount ?? 0} 个独立小音频。${warnings.length ? "\n" + warnings.join("\n") : ""}`);
      void loadArticles().catch(() => undefined);
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : "文章保存失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <div>
          <span>BBC · ARTICLE PUBLISHING</span>
          <h2>{editingId ? "修改 BBC 文章" : "上传 BBC 文章"}</h2>
          <p>可直接发布正文与完整原声，再到前端精读页校对。也可先自动对齐音频，保存为草稿。</p>
        </div>
      </header>

      {saved ? (
        <section className={styles.details} aria-label="句子与词汇" ref={detailsRef}>
          <h3>句子与词汇</h3>
          <p>{saved.text !== text ? "正文有未保存的修改，请先保存正文。" : "这里的修改会立即保存。已发布文章会同步更新。"}</p>
          <div className={styles.form}>
            <div className={styles.detailField}>
              <label>
                <span>选择要删除的句子</span>
                <select disabled={detailsDisabled} value={sentenceChoice} onChange={(event) => setSentenceChoice(event.target.value)}>
                  <option value="">选择句子</option>
                  {saved.article.sentences?.map((sentence) => <option key={sentence.sentenceNo} value={sentence.sentenceNo}>{sentence.sentenceNo}. {sentence.english}</option>)}
                </select>
              </label>
              <button className="button secondary" type="button" disabled={detailsDisabled || !selectedSentence} onClick={() => void editDetails("deleteSentence")}>删除句子</button>
            </div>
            <div className={styles.detailField}>
              <label>
                <span>选择要删除的词汇</span>
                <select disabled={detailsDisabled} value={vocabularyChoice} onChange={(event) => setVocabularyChoice(event.target.value)}>
                  <option value="">{saved.article.vocabulary?.length ? "选择词汇" : "本篇暂无词汇"}</option>
                  {saved.article.vocabulary?.map((item, index) => <option key={index} value={index}>{item.term}</option>)}
                </select>
              </label>
              <button className="button secondary" type="button" disabled={detailsDisabled || !selectedVocabulary} onClick={() => void editDetails("deleteVocabulary")}>删除词汇</button>
            </div>
          </div>
          <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void editDetails("addVocabulary"); }}>
            <label>
              <span>词汇或短语</span>
              <input disabled={detailsDisabled} maxLength={160} value={newTerm} onChange={(event) => setNewTerm(event.target.value)} placeholder="例如：roller coaster" required />
            </label>
            <label>
              <span>释义</span>
              <input disabled={detailsDisabled} maxLength={600} value={newDefinition} onChange={(event) => setNewDefinition(event.target.value)} placeholder="例如：过山车" required />
            </label>
            <div className={`${styles.actions} ${styles.full}`}>
              <button className="button secondary" type="submit" disabled={detailsDisabled || !newTerm.trim() || !newDefinition.trim()}>添加词汇</button>
            </div>
          </form>
          {detailMessage ? <p aria-live="polite" className={`${styles.message} ${detailMessage.error ? styles.error : ""}`}>{detailMessage.text}</p> : null}
        </section>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.full}>
          <span>文章全文</span>
          <textarea
            maxLength={700_000}
            readOnly={busy}
            onChange={(event) => setText(event.target.value)}
            onPaste={(event) => {
              const richText = readBbcRichPaste(event.clipboardData.getData("text/html"));
              if (!richText) return;
              event.preventDefault();
              const input = event.currentTarget;
              const start = input.selectionStart;
              const end = input.selectionEnd;
              setText((current) => current.slice(0, start) + richText + current.slice(end));
              requestAnimationFrame(() => input.setSelectionRange(start + richText.length, start + richText.length));
            }}
            placeholder={"260202-Protecting your photos in a digital age 如何在数字时代保管你的照片\n\nEnglish paragraph...\n中文段落……\n\n词汇表\n1. **term** /phonetic/ n. 中文释义\n   例句：An English example.\n   翻译：对应的中文翻译。"}
            required
            rows={24}
            value={text}
          />
          <small>首行是标题，英文与中文逐段对应，编号词条自动归入右侧词汇栏。粘贴带格式的原文会保留波浪线；纯文本也可用 ~~词语~~ 标记波浪线。可在文章内容后追加“# 全文逐句词性+句子成分标注”及“## 句1”格式的标注。未匹配的语法标注会列入待校对提示。</small>
        </label>
        <label className={styles.full}>
          <span>文章练习 PDF（可选）</span>
          <input accept=".pdf,application/pdf" disabled={busy || pdfBusy} onChange={(event) => { void importPdf(event.target.files?.[0]); event.target.value = ""; }} type="file" />
          <small>支持可选中文字的 BBC PDF，最大 30 MB。自动整理段落主旨配对、阅读理解和选词填空。缺少答案的题目可先保存，在这里核对补齐。</small>
        </label>
        {pdfMessage ? <p aria-live="polite" className={`${styles.message} ${styles.full}`}>{pdfMessage}</p> : null}
        {saved && pdfDirty ? <p className={`${styles.message} ${styles.full}`}>PDF 题目有未保存的修改。请保存草稿或更新文章。</p> : null}
        {pdfQuiz ? <AdminBbcPdfQuizEditor quiz={pdfQuiz} onChange={(quiz) => updatePdfQuiz(quiz, true)} disabled={busy || pdfBusy} paragraphCount={paragraphCount} /> : null}
        <label className={styles.full}>
          <span>MP3 音频{existingAudio ? "（已有关联音频，可替换）" : ""}</span>
          <input accept=".mp3,audio/mpeg" disabled={busy} onChange={(event) => { setAudioFile(event.target.files?.[0] ?? null); audioJob.current = null; setAudioProgress(0); setAudioStatus("waiting"); }} type="file" />
          <small>{audioFile ? `${audioFile.name} · ${(audioFile.size / 1024 / 1024).toFixed(1)} MB` : existingAudio ? "已关联原音频。英文句子没有改动时会保留原有时间轴。" : "最大 200 MB。选择字幕后，发布时会按字幕为匹配到的英文句子生成单句播放。"}</small>
        </label>
        <label className={styles.full}>
          <span>时间戳字幕（可选）</span>
          <input accept=".srt,.vtt,.lrc,application/x-subrip,text/vtt,text/plain" disabled={busy} onChange={(event) => { setSubtitleFile(event.target.files?.[0] ?? null); }} type="file" />
          <small>{subtitleFile ? `${subtitleFile.name} · 按英文匹配，直接使用字幕时间戳切分` : "用于自动对齐。支持与 MP3 对应的 SRT、VTT 或 LRC，最大 5 MB。"}</small>
        </label>
        {audioFile ? (
          <div aria-label="MP3 音频上传进度" aria-valuemax={100} aria-valuemin={0} aria-valuenow={audioProgress} className={styles.progress} role="progressbar">
            <span>{audioStatus === "uploaded" ? "音频已上传" : audioStatus === "analyzing" ? subtitleFile ? "正在按字幕时间戳切分小音频" : "正在识别原声并切分小音频" : audioStatus === "uploading" ? `音频上传中 ${audioProgress}%` : audioStatus === "failed" ? "音频上传失败，请重试" : "等待上传"}</span>
            <div className={styles.progressTrack}><i style={{ width: `${audioProgress}%` }} /></div>
          </div>
        ) : null}
        {message ? <p aria-live="polite" className={`${styles.message} ${error ? styles.error : ""} ${styles.full}`}>{message}</p> : null}
        {publishedHref ? <Link className={`${styles.publishedLink} ${styles.full}`} href={publishedHref} target="_blank">{publishedHref.includes("preview=draft") ? "打开草稿前端校改 ↗" : "打开文章前端 ↗"}</Link> : null}
        <div className={`${styles.actions} ${styles.full}`}>
          {editingId ? <button className="button secondary" disabled={busy || pdfBusy} onClick={() => { setEditingId(null); setSaved(null); resetDetails(); setExistingAudio(null); setText(""); setAudioFile(null); setSubtitleFile(null); audioJob.current = null; updatePdfQuiz(null); setPdfMessage(""); setMessage(""); setPublishedHref(""); }} type="button">新建文章</button> : null}
          <button className="button primary" disabled={busy || !text.trim()} type="submit" value="publish">直接发布</button>
          <button className="button secondary" disabled={busy || !text.trim()} type="submit" value="align">
            {editingId ? "自动对齐并保存修改" : "自动对齐并保存草稿"}
          </button>
        </div>
      </form>
      {articles.length ? <section className={styles.articleList}><h3>已上传文章</h3>{articles.map((article) => <div key={article.id}><span>{article.id} · {article.title} · {article.published ? "已发布" : "草稿"}</span><button className="button secondary" disabled={busy || pdfBusy} onClick={() => void editArticle(article.id)} type="button">编辑文章</button><Link className="button secondary" href={`/articles/${article.id}${article.published ? "" : "?preview=draft"}`} target="_blank">{article.published ? "打开前端 ↗" : "前端校改 ↗"}</Link></div>)}</section> : null}
    </section>
  );
}
