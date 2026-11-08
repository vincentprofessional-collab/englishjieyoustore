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
    "waiting" | "analyzing" | "analysis-failed" | "uploading" | "uploaded" | "failed"
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
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMessage, setPdfMessage] = useState("");
  const [pdfError, setPdfError] = useState(false);
  const detailsRef = useRef<HTMLElement>(null);
  const paragraphCount = useMemo(() => {
    const parsed = parseBbcArticlePaste(text, true);
    return typeof parsed === "string" ? undefined : splitBbcArticleParagraphs(parsed.english, "en").length;
  }, [text]);
  const audioJob = useRef<{ file: File; subtitleFile: File | null; sentenceKey: string; preparation?: AudioPreparation; objectPath?: string; uploaded: Map<number, string> } | null>(null);
  const selectedSentence = saved?.article.sentences?.find((sentence) => String(sentence.sentenceNo) === sentenceChoice);
  const selectedVocabulary = vocabularyChoice === "" ? undefined : saved?.article.vocabulary?.[Number(vocabularyChoice)];
  const detailsDisabled = busy || pdfBusy || saved?.text !== text;

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
      setPdfQuiz(result.article.quiz ?? null); setPdfMessage("");
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
    setPdfBusy(true); setPdfError(false); setPdfMessage("正在读取 PDF……");
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
      setPdfQuiz(quiz);
      setPdfMessage(`已识别 ${quiz.summary?.length ?? 0} 道总结句选择题、${quiz.matching?.length ?? 0} 道段落主旨配对题、${quiz.quiz.length} 道阅读题、${quiz.exercise.length} 道填空题。`);
    } catch (cause) { setPdfError(true); setPdfMessage(`${cause instanceof Error ? cause.message : "PDF 无法识别，请核对文件。"}当前练习未被替换。`); }
    finally { setPdfBusy(false); }
  }

  async function saveWithoutAlignment(publish: boolean, reviewWarnings: string[] = []) {
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
    let durationMs: number | undefined;
    const warnings = [...reviewWarnings];
    let audioSaved = false;
    try {
      if (audioFile) {
        setAudioProgress(0);
        setAudioStatus("uploading");
        try {
          if (!/\.mp3$/i.test(audioFile.name) || !audioFile.size || audioFile.size > 200 * 1024 * 1024) {
            throw new Error("请选择不超过 200 MB 的 MP3 文件。");
          }
          setMessage("正在上传完整原声……");
          const job = audioJob.current;
          const uploadedPath = job?.file === audioFile ? job.objectPath : undefined;
          if (uploadedPath?.startsWith(`bbc/${date.year}/${date.id}/`)) {
            objectPath = uploadedPath;
          } else {
            const ticket = await adminRequest("/api/admin/bbc-articles", {
              body: JSON.stringify({ action: "presign", filename: audioFile.name, size: audioFile.size, title: parsed.dateTitle }),
              method: "POST",
              signal: AbortSignal.timeout(15_000),
            }) as UploadTicket;
            await uploadToR2(ticket, audioFile, setAudioProgress, 180_000);
            objectPath = ticket.objectPath;
            if (job?.file === audioFile) job.objectPath = objectPath;
          }
          audioSaved = true;
          durationMs = job?.file === audioFile ? job.preparation?.durationMs : undefined;
          durationMs ??= await readMp3DurationMs(audioFile).catch(() => undefined);
          setAudioProgress(100);
          setAudioStatus("uploaded");
        } catch (cause) {
          setAudioStatus("failed");
          warnings.push(cause instanceof Error ? cause.message : "MP3 上传未完成。");
        }
      }
      setMessage(publish ? "正在发布文章……" : "正在保存正文和已上传的原声……");
      const payload = await adminRequest("/api/admin/bbc-articles", {
        body: JSON.stringify({ text, objectPath, quiz: pdfQuiz, durationMs, publish, allowIncomplete: true, reviewWarnings: warnings }),
        method: "PUT",
      });
      setEditingId(payload.articleId);
      setSaved({ article: payload.article, text });
      setPdfQuiz(payload.article.quiz ?? null);
      setExistingAudio(payload.objectPath ? { objectPath: payload.objectPath } : null);
      if (publish) {
        if (audioSaved && payload.objectPath === objectPath) setAudioFile(null);
        setSubtitleFile(null);
        audioJob.current = null;
      }
      setPublishedHref(`${payload.href}${payload.published ? "" : "?preview=draft"}`);
      const details = payload.audioIncluded
        ? payload.timingsComplete ? "原声与逐句时间轴已保留。" : "完整原声可播放，逐句时间点可在前端精读页校对。"
        : "可回到后台补传 MP3。";
      warnings.push(...(payload.reviewWarnings ?? []));
      if (payload.phraseVocabularyWarning) warnings.push(payload.phraseVocabularyWarning);
      setMessage(`${payload.published ? "文章已发布。" : "草稿已保存，可直接发布。"}${details}${warnings.length ? "\n" + [...new Set(warnings)].join("\n") : ""}`);
      void loadArticles().catch(() => undefined);
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : "文章保存失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || pdfBusy) return;
    setMessage("");
    setPublishedHref("");
    setError(false);
    const submitter = (event.nativeEvent as SubmitEvent | undefined)?.submitter;
    if (submitter?.getAttribute("value") === "publish") {
      await saveWithoutAlignment(true);
      return;
    }
    const inputWarnings = pdfQuiz ? getBbcPdfQuizIssues(pdfQuiz, paragraphCount) : [];
    if (subtitleFile && (!/\.(?:srt|vtt|lrc)$/i.test(subtitleFile.name) || subtitleFile.size > 5 * 1024 * 1024)) {
      inputWarnings.push("字幕需为不超过 5 MB 的 SRT、VTT 或 LRC，可稍后重新上传。");
    }
    if (subtitleFile && !audioFile) inputWarnings.push("重新对齐字幕时请同时选择对应的 MP3。");
    if (inputWarnings.length || audioFile && (!/\.mp3$/i.test(audioFile.name) || !audioFile.size || audioFile.size > 200 * 1024 * 1024) || !audioFile && !existingAudio) {
      await saveWithoutAlignment(false, inputWarnings);
      return;
    }

    setBusy(true);
    setAudioProgress(0);
    setAudioStatus(audioFile ? "analyzing" : "waiting");
    try {
      setMessage(audioFile ? "正在解析文章并生成词性、句子成分标注……" : "正在保存文章修改并保留原有音频时间轴……");
      const prepared = await adminRequest("/api/admin/bbc-articles", { method: "POST", body: JSON.stringify({ action: "prepare", text, quiz: pdfQuiz }) }) as {
        article: BbcArticle;
        pastedSyntaxCount?: number;
        pastedSyntaxTotalCount?: number;
        unmatchedSyntaxSentenceNos?: number[];
        syntaxRequested?: boolean;
        syntaxWarning?: string;
      };
      if (editingId && editingId !== prepared.article.id) throw new Error("编辑文章时请保留原日期编号。");
      let objectPath: string | undefined = existingAudio?.objectPath;
      let alignment: AudioPreparation | undefined;
      let sentenceAudioFiles: { sentenceNo: number; objectPath: string }[] | undefined;
      if (audioFile) {
        const sentenceKey = JSON.stringify((prepared.article.sentences ?? []).map((sentence) => sentence.english));
        if (audioJob.current?.file !== audioFile || audioJob.current.subtitleFile !== subtitleFile || audioJob.current.sentenceKey !== sentenceKey) {
          audioJob.current = { file: audioFile, subtitleFile, sentenceKey, uploaded: new Map() };
        }
        const job = audioJob.current;
        alignment = job.preparation ?? await analyzeBbcAudio(audioFile, prepared.article.sentences ?? [], setMessage, subtitleFile ?? undefined);
        job.preparation = alignment;
        const title = text.replace(/^\uFEFF/, "").split(/\r?\n/).find((line) => line.trim())?.replace(/^\s*#{1,6}\s*/, "").trim() ?? "";
        const totalBytes = audioFile.size + alignment.clips.reduce((total, clip) => total + clip.file.size, 0);
        setAudioStatus("uploading");
        if (!job.objectPath) {
          const ticket = await adminRequest("/api/admin/bbc-articles", {
            body: JSON.stringify({ action: "presign", filename: audioFile.name, size: audioFile.size, title }), method: "POST", signal: AbortSignal.timeout(15_000),
          }) as UploadTicket;
          setMessage("正在上传完整原声……");
          await uploadToR2(ticket, audioFile, (progress) => setAudioProgress(Math.round(progress * audioFile.size / totalBytes)), 180_000);
          job.objectPath = ticket.objectPath;
        }
        objectPath = job.objectPath;
        const { tickets } = await adminRequest("/api/admin/bbc-articles", {
          body: JSON.stringify({ action: "presign-sentences", title, objectPath, files: alignment.clips.map((clip) => ({ sentenceNo: clip.sentenceNo, size: clip.file.size })) }),
          method: "POST",
        }) as { tickets: SentenceUploadTicket[] };
        if (tickets.length !== alignment.clips.length) throw new Error("独立小音频上传清单不完整，请重试。");
        let completedBytes = audioFile.size + alignment.clips.filter((clip) => job.uploaded.has(clip.sentenceNo)).reduce((total, clip) => total + clip.file.size, 0);
        for (let index = 0; index < alignment.clips.length; index++) {
          const clip = alignment.clips[index];
          const ticket = tickets[index];
          if (ticket.sentenceNo !== clip.sentenceNo) throw new Error("小音频顺序与正文不一致，请重试。");
          if (job.uploaded.get(clip.sentenceNo) === ticket.objectPath) continue;
          setMessage(`正在上传小音频 ${index + 1}/${alignment.clips.length}……`);
          await uploadToR2(ticket, clip.file, (progress) => setAudioProgress(Math.round((completedBytes + clip.file.size * progress / 100) / totalBytes * 100)), 60_000);
          completedBytes += clip.file.size;
          job.uploaded.set(clip.sentenceNo, ticket.objectPath);
        }
        sentenceAudioFiles = alignment.clips.map((clip) => ({ sentenceNo: clip.sentenceNo, objectPath: job.uploaded.get(clip.sentenceNo)! }));
        setAudioProgress(100);
        setAudioStatus("uploaded");
      }
      setMessage("正在核对小音频并保存文章与语法标注……");
      const unmatchedSyntaxSentenceNos = prepared.unmatchedSyntaxSentenceNos ?? [];
      const reviewWarnings = [...new Set([
        ...(prepared.article.reviewWarnings ?? []),
        ...(prepared.syntaxWarning ? [prepared.syntaxWarning] : []),
        ...unmatchedSyntaxSentenceNos.map((sentenceNo) => `第 ${sentenceNo} 句语法标注与正文未完全匹配`),
        ...(alignment?.reviewSentenceNos ?? []).map((sentenceNo) => `第 ${sentenceNo} 句音频边界建议试听复核`),
      ])];
      const payload = await adminRequest("/api/admin/bbc-articles", {
        body: JSON.stringify({ text, objectPath, quiz: pdfQuiz, reviewWarnings, ...(alignment ? { durationMs: alignment.durationMs, timings: alignment.timings, sentenceAudioFiles } : {}) }),
        method: "PUT",
      });

      const articleId = typeof payload.articleId === "string" ? payload.articleId : prepared.article.id;
      setSaved({ article: payload.article, text });
      setPdfQuiz(payload.article.quiz ?? null);
      const isPublished = payload.published === true;
      setEditingId(articleId);
      if (objectPath) setExistingAudio({ objectPath });
      setAudioFile(null);
      setSubtitleFile(null);
      audioJob.current = null;
      setPublishedHref(`/articles/${articleId}${isPublished ? "" : "?preview=draft"}`);
      const reviewSentenceNos = alignment?.reviewSentenceNos ?? [];
      const autoAdjustedSentenceNos = alignment?.autoAdjustedSentenceNos ?? [];
      const alignmentMessage = alignment?.alignmentSource === "subtitle"
        ? "已优先采用上传字幕的时间戳切分。"
        : alignment?.alignmentSource === "recognition" && subtitleFile
          ? "字幕未能逐句匹配，已改用本地语音识别。"
          : alignment ? "已使用本地语音识别切分。" : "";
      const pastedSyntaxTotalCount = prepared.pastedSyntaxTotalCount ?? 0;
      const syntaxMessage = pastedSyntaxTotalCount
        ? `已对齐输入中的 ${prepared.pastedSyntaxCount ?? 0}/${pastedSyntaxTotalCount} 句词性与成分标注。${unmatchedSyntaxSentenceNos.length ? "未匹配句不会套用自动标签，文章仍可正常保存。" : ""}`
        : prepared.syntaxWarning ?? (/全文逐句词性\s*[+＋]\s*句子成分标注/i.test(text)
          ? "检测到语法标注标题，但没有解析到句子标注；请检查是否按“## 句1”单独分行。"
          : "");
      const syntaxFallbackMessage = prepared.syntaxRequested
        ? pastedSyntaxTotalCount === 0
          ? "本次未成功应用的人工标注不会用自动结果替代。"
          : pastedSyntaxTotalCount < (prepared.article.sentences?.length ?? 0)
            ? "只有未提供人工标注的句子才使用自动分析。"
            : ""
        : "未提供人工标注，当前显示自动分析草稿。";
      setMessage(
        `${isPublished ? `已更新 ${payload.year} 年 ${payload.month} 月的已发布文章` : `已保存为 ${payload.year} 年 ${payload.month} 月的草稿，用户暂时看不到`}；${payload.paragraphCount} 段正文、${payload.sentenceCount} 句、${payload.vocabularyCount} 条词汇、${payload.sentenceAudioCount ?? 0} 个独立小音频。${alignmentMessage}${syntaxMessage}${syntaxFallbackMessage}${reviewWarnings.length ? `待复核：${reviewWarnings.join("；")}` : ""}可打开前端预览检查。${autoAdjustedSentenceNos.length ? `系统已自动调整第 ${autoAdjustedSentenceNos.join("、")} 句的音频边界。` : ""}${reviewSentenceNos.length ? `第 ${reviewSentenceNos.join("、")} 句建议试听复核。` : ""}`,
      );
      void loadArticles().catch(() => undefined);
    } catch (uploadError) {
      setAudioStatus("analysis-failed");
      await saveWithoutAlignment(false, [`自动对齐未完成：${uploadError instanceof Error ? uploadError.message : "请在精读页校对逐句时间。"}`]);
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
          <span>文章练习 PDF（含题目与答案）</span>
          <input accept=".pdf,application/pdf" disabled={busy || pdfBusy} onChange={(event) => { void importPdf(event.target.files?.[0]); event.target.value = ""; }} type="file" />
          <small>支持 BBC 原版可选中文字的 PDF，最大 30 MB。自动整理段落主旨配对、阅读理解和选词填空，并保留原题答案。</small>
        </label>
        {pdfMessage ? <p aria-live="polite" className={`${styles.message} ${pdfError ? styles.error : ""} ${styles.full}`}>{pdfMessage}</p> : null}
        {pdfQuiz ? <AdminBbcPdfQuizEditor quiz={pdfQuiz} onChange={setPdfQuiz} disabled={busy || pdfBusy} paragraphCount={paragraphCount} /> : null}
        <label className={styles.full}>
          <span>MP3 音频{existingAudio ? "（已有关联音频，可替换）" : ""}</span>
          <input accept=".mp3,audio/mpeg" disabled={busy} onChange={(event) => { setAudioFile(event.target.files?.[0] ?? null); audioJob.current = null; setAudioProgress(0); setAudioStatus("waiting"); }} type="file" />
          <small>{audioFile ? `${audioFile.name} · ${(audioFile.size / 1024 / 1024).toFixed(1)} MB` : existingAudio ? "已关联原音频。英文句子没有改动时会保留原有时间轴。" : "最大 200 MB。直接发布时上传完整原声，音频暂缺也可发布正文。"}</small>
        </label>
        <label className={styles.full}>
          <span>时间戳字幕（可选）</span>
          <input accept=".srt,.vtt,.lrc,application/x-subrip,text/vtt,text/plain" disabled={busy} onChange={(event) => { setSubtitleFile(event.target.files?.[0] ?? null); audioJob.current = null; }} type="file" />
          <small>{subtitleFile ? `${subtitleFile.name} · 优先使用字幕时间戳切分` : "用于自动对齐。支持与 MP3 对应的 SRT、VTT 或 LRC，最大 5 MB。"}</small>
        </label>
        {audioFile ? (
          <div aria-label="MP3 音频上传进度" aria-valuemax={100} aria-valuemin={0} aria-valuenow={audioProgress} className={styles.progress} role="progressbar">
            <span>{audioStatus === "uploaded" ? "音频已上传" : audioStatus === "analyzing" ? subtitleFile ? "正在按字幕时间戳切分小音频" : "正在识别原声并切分小音频" : audioStatus === "analysis-failed" ? "自动对齐未完成，请查看下方原因" : audioStatus === "uploading" ? `音频上传中 ${audioProgress}%` : audioStatus === "failed" ? "音频上传失败，请重试" : "等待上传"}</span>
            <div className={styles.progressTrack}><i style={{ width: `${audioProgress}%` }} /></div>
          </div>
        ) : null}
        {message ? <p aria-live="polite" className={`${styles.message} ${error ? styles.error : ""} ${styles.full}`}>{message}</p> : null}
        {publishedHref ? <Link className={`${styles.publishedLink} ${styles.full}`} href={publishedHref} target="_blank">{publishedHref.includes("preview=draft") ? "打开草稿前端校改 ↗" : "打开文章前端 ↗"}</Link> : null}
        <div className={`${styles.actions} ${styles.full}`}>
          {editingId ? <button className="button secondary" disabled={busy || pdfBusy} onClick={() => { setEditingId(null); setSaved(null); resetDetails(); setExistingAudio(null); setText(""); setAudioFile(null); setSubtitleFile(null); audioJob.current = null; setPdfQuiz(null); setPdfMessage(""); setMessage(""); setPublishedHref(""); }} type="button">新建文章</button> : null}
          <button className="button primary" disabled={busy || pdfBusy || !text.trim()} type="submit" value="publish">直接发布</button>
          <button className="button secondary" disabled={busy || pdfBusy || !text.trim()} type="submit" value="align">
            {editingId ? "自动对齐并保存修改" : "自动对齐并保存草稿"}
          </button>
        </div>
      </form>
      {articles.length ? <section className={styles.articleList}><h3>已上传文章</h3>{articles.map((article) => <div key={article.id}><span>{article.id} · {article.title} · {article.published ? "已发布" : "草稿"}</span><button className="button secondary" disabled={busy || pdfBusy} onClick={() => void editArticle(article.id)} type="button">编辑文章</button><Link className="button secondary" href={`/articles/${article.id}${article.published ? "" : "?preview=draft"}`} target="_blank">{article.published ? "打开前端 ↗" : "前端校改 ↗"}</Link></div>)}</section> : null}
    </section>
  );
}
