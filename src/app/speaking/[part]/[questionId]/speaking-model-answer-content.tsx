"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  AudioPlayer,
  DEFAULT_AUDIO_PLAYER_SETTINGS,
  type AudioPlayerSettings,
  type AudioSpeakingMode,
} from "@/components/audio-player";
import { BbcSentencePractice } from "@/components/bbc-sentence-practice";
import type {
  SpeakingScoreNote,
  SpeakingVocabulary,
} from "@/data/ielts/speaking-model-answers";
import { uploadAdminAudio } from "@/lib/admin/upload-audio";
import {
  applySpeakingManagedContent,
  type SpeakingEditableContent,
  type SpeakingManagedContentResponse,
  type SpeakingAudioSegment,
} from "@/lib/ielts/speaking-managed-content";
import {
  getActiveWordIndex,
  getNextSentenceNo,
  getSpeakingPracticeDelayMs,
} from "@/lib/articles/bbc-speaking-training.mjs";
import {
  buildEstimatedSpeakingAudioSegments,
  readAudioDuration,
} from "@/lib/ielts/speaking-audio";
import { supabase } from "@/lib/supabase/client";
import styles from "./speaking-model-answer.module.css";

type SpeakingModelAnswerContentProps = {
  initialContent: SpeakingEditableContent;
  scoreNotes: SpeakingScoreNote[];
};

type SpeakingEditorDraft = Omit<
  SpeakingEditableContent,
  "answer" | "answerTranslation" | "frames"
> & {
  answerText: string;
  answerTranslationText: string;
  framesText: string;
};

type AdminStatus = {
  tone: "info" | "error" | "success";
  text: string;
};

type ActiveSpeakingMode = Exclude<AudioSpeakingMode, "none">;

type SpeakingTrainingState = {
  mode: ActiveSpeakingMode;
  remainingSeconds: number;
  sentenceNo: number;
};

const SPEAKING_PHASE_LABELS: Record<ActiveSpeakingMode, string> = {
  imitation: "轮到你模仿朗读",
  shadowing: "影子练习缓冲",
  "sight-translation": "请看中文视译成英文",
};

const SPEAKING_MODE_LABELS: Record<ActiveSpeakingMode, string> = {
  imitation: "模仿朗读",
  shadowing: "影子练习",
  "sight-translation": "视译训练",
};

const SPEAKING_PLAYING_HINTS: Record<ActiveSpeakingMode, string> = {
  imitation: "播放结束后自动进入练习计时",
  shadowing: "建议佩戴耳机，一边听一边模仿跟读",
  "sight-translation": "播放结束后自动进入练习计时",
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedText(
  text: string,
  terms: string[],
  language: "english" | "chinese",
  className: string,
): ReactNode {
  const cleanTerms = [...new Set(terms.map((term) => term.trim()).filter(Boolean))].sort(
    (left, right) => right.length - left.length,
  );

  if (!cleanTerms.length) {
    return text;
  }

  const pattern = new RegExp(
    `(${cleanTerms
      .map((term) => {
        const escaped = escapeRegExp(term);
        return language === "english"
          ? `(?<![A-Za-z])${escaped}(?![A-Za-z])`
          : escaped;
      })
      .join("|")})`,
    language === "english" ? "gi" : "g",
  );
  const termSet = new Set(
    cleanTerms.map((term) => (language === "english" ? term.toLowerCase() : term)),
  );

  return text.split(pattern).map((part, index) => {
    const comparable = language === "english" ? part.toLowerCase() : part;
    return termSet.has(comparable) ? (
      <span className={className} key={`${language}-highlight-${index}`}>
        {part}
      </span>
    ) : (
      <span key={`${language}-text-${index}`}>{part}</span>
    );
  });
}

function paragraphText(paragraphs: string[]) {
  return paragraphs.join("\n\n");
}

function splitParagraphs(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(text: string) {
  return text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cloneVocabulary(vocabulary: SpeakingVocabulary[]) {
  return vocabulary.map((item) => ({ ...item }));
}

function createEditorDraft(content: SpeakingEditableContent): SpeakingEditorDraft {
  const { answer, answerTranslation, frames, ...rest } = content;

  return {
    ...rest,
    answerText: paragraphText(answer),
    answerTranslationText: paragraphText(answerTranslation),
    framesText: frames.join("\n"),
    vocabulary: cloneVocabulary(content.vocabulary),
  };
}

function createContentFromDraft(draft: SpeakingEditorDraft): SpeakingEditableContent {
  const { answerText, answerTranslationText, framesText, ...rest } = draft;

  return {
    ...rest,
    answer: splitParagraphs(answerText),
    answerTranslation: splitParagraphs(answerTranslationText),
    frames: splitLines(framesText),
    vocabulary: cloneVocabulary(draft.vocabulary).filter(
      (item) => item.phrase || item.translation || item.note,
    ),
  };
}

export default function SpeakingModelAnswerContent({
  initialContent,
  scoreNotes,
}: SpeakingModelAnswerContentProps) {
  const [content, setContent] = useState(initialContent);
  const [canEdit, setCanEdit] = useState(false);
  const [editorDraft, setEditorDraft] = useState<SpeakingEditorDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [audioSettings, setAudioSettings] = useState<AudioPlayerSettings>(() => ({
    ...DEFAULT_AUDIO_PLAYER_SETTINGS,
    subtitleMode: "bilingual",
  }));
  const [sentenceAutoPlaySignals, setSentenceAutoPlaySignals] = useState<
    Record<number, number>
  >({});
  const [activeSentenceNo, setActiveSentenceNo] = useState<number | null>(null);
  const [activeSentencePosition, setActiveSentencePosition] = useState(0);
  const [isSentenceAudioPlaying, setIsSentenceAudioPlaying] = useState(false);
  const [sentenceDurations, setSentenceDurations] = useState<Record<number, number>>({});
  const [speakingTraining, setSpeakingTraining] = useState<SpeakingTrainingState | null>(null);
  const audioSettingsRef = useRef(audioSettings);
  const activeSentenceNoRef = useRef<number | null>(null);
  const speakingCountdownRef = useRef<number | null>(null);
  const speakingAdvanceRef = useRef<number | null>(null);

  useEffect(() => {
    audioSettingsRef.current = audioSettings;
  }, [audioSettings]);

  function clearSpeakingPracticeTimers(resetState = true) {
    if (speakingCountdownRef.current != null) {
      window.clearInterval(speakingCountdownRef.current);
      speakingCountdownRef.current = null;
    }
    if (speakingAdvanceRef.current != null) {
      window.clearTimeout(speakingAdvanceRef.current);
      speakingAdvanceRef.current = null;
    }
    if (resetState) {
      setSpeakingTraining(null);
    }
  }

  useEffect(
    () => () => {
      clearSpeakingPracticeTimers(false);
    },
    [],
  );

  function updateAudioSettings(nextSettings: Partial<AudioPlayerSettings>) {
    setAudioSettings((current) => ({ ...current, ...nextSettings }));
  }

  function getAudioSegments() {
    return [...(content.audioSegments ?? [])].sort(
      (left, right) => left.sentenceNo - right.sentenceNo,
    );
  }

  function getSentencePlaybackDuration(sentence: SpeakingAudioSegment) {
    if (
      sentence.startSeconds != null &&
      sentence.endSeconds != null &&
      sentence.endSeconds > sentence.startSeconds
    ) {
      return Math.max(sentence.endSeconds - sentence.startSeconds, 0.1);
    }

    return Math.max(
      sentenceDurations[sentence.sentenceNo] ?? sentence.english.split(/\s+/).length / 2.5,
      0.1,
    );
  }

  function centerSentenceCard(sentenceNo: number) {
    window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document
        .getElementById(`speaking-sentence-${content.questionId}-${sentenceNo}`)
        ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });
  }

  function playSentenceByMode(sentenceNo: number) {
    const segments = getAudioSegments();
    const nextSentenceNo = getNextSentenceNo(
      segments.map((sentence) => sentence.sentenceNo),
      sentenceNo,
      audioSettingsRef.current.playMode,
    );

    if (nextSentenceNo == null) {
      activeSentenceNoRef.current = null;
      setActiveSentenceNo(null);
      return;
    }

    activeSentenceNoRef.current = nextSentenceNo;
    setActiveSentenceNo(nextSentenceNo);
    setActiveSentencePosition(0);
    setSentenceAutoPlaySignals((current) => ({
      ...current,
      [nextSentenceNo]: (current[nextSentenceNo] ?? 0) + 1,
    }));
    centerSentenceCard(nextSentenceNo);
  }

  function startSpeakingPractice(sentence: SpeakingAudioSegment, mode: ActiveSpeakingMode) {
    const durationSeconds = getSentencePlaybackDuration(sentence);
    const delayMs = getSpeakingPracticeDelayMs(mode, durationSeconds);
    const deadline = Date.now() + delayMs;

    clearSpeakingPracticeTimers(false);
    setSpeakingTraining({
      mode,
      remainingSeconds: Math.ceil(delayMs / 1_000),
      sentenceNo: sentence.sentenceNo,
    });
    centerSentenceCard(sentence.sentenceNo);

    speakingCountdownRef.current = window.setInterval(() => {
      setSpeakingTraining((current) =>
        current?.sentenceNo === sentence.sentenceNo
          ? {
              ...current,
              remainingSeconds: Math.max(0, Math.ceil((deadline - Date.now()) / 1_000)),
            }
          : current,
      );
    }, 250);

    speakingAdvanceRef.current = window.setTimeout(() => {
      if (speakingCountdownRef.current != null) {
        window.clearInterval(speakingCountdownRef.current);
        speakingCountdownRef.current = null;
      }
      speakingAdvanceRef.current = null;
      setSpeakingTraining(null);
      playSentenceByMode(sentence.sentenceNo);
    }, delayMs);
  }

  function handleSentencePlayingChange(sentenceNo: number, isPlaying: boolean) {
    if (isPlaying) {
      clearSpeakingPracticeTimers();
      activeSentenceNoRef.current = sentenceNo;
      setActiveSentenceNo(sentenceNo);
      setIsSentenceAudioPlaying(true);
      centerSentenceCard(sentenceNo);
      return;
    }

    if (activeSentenceNoRef.current === sentenceNo) {
      setIsSentenceAudioPlaying(false);
    }
  }

  function handleSentenceEnded(sentence: SpeakingAudioSegment) {
    setIsSentenceAudioPlaying(false);
    const speakingMode = audioSettingsRef.current.speakingMode;

    if (speakingMode === "none") {
      playSentenceByMode(sentence.sentenceNo);
      return;
    }

    startSpeakingPractice(sentence, speakingMode);
  }

  function handleFullAudioPlayingChange(isPlaying: boolean) {
    if (isPlaying) {
      clearSpeakingPracticeTimers();
      activeSentenceNoRef.current = null;
      setActiveSentenceNo(null);
      setIsSentenceAudioPlaying(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadManagedContent() {
      try {
        const response = await fetch(
          `/api/speaking-managed-content?slug=${encodeURIComponent(initialContent.slug)}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as SpeakingManagedContentResponse;
        const mergedContent = applySpeakingManagedContent(initialContent, payload);

        if (isMounted) {
          setContent(mergedContent);
        }
      } catch {
        // Static content remains available if the managed-content API is unavailable.
      }
    }

    loadManagedContent();

    return () => {
      isMounted = false;
    };
  }, [initialContent]);

  useEffect(() => {
    let isMounted = true;

    async function checkAdminAccess() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (isMounted && profile?.role === "admin") {
          setCanEdit(true);
        }
      } catch {
        // Non-admin users should not see editor controls.
      }
    }

    checkAdminAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  function openEditor() {
    setEditorDraft(createEditorDraft(content));
    setStatus(null);
  }

  function closeEditor() {
    setEditorDraft(null);
    setStatus(null);
  }

  function updateDraft(values: Partial<SpeakingEditorDraft>) {
    setEditorDraft((current) => (current ? { ...current, ...values } : current));
  }

  function updateVocabularyItem(
    index: number,
    field: keyof SpeakingVocabulary,
    value: string,
  ) {
    setEditorDraft((current) => {
      if (!current) {
        return current;
      }

      const nextVocabulary = cloneVocabulary(current.vocabulary);
      nextVocabulary[index] = {
        ...nextVocabulary[index],
        [field]: value,
      };

      return {
        ...current,
        vocabulary: nextVocabulary,
      };
    });
  }

  function addVocabularyItem() {
    setEditorDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        vocabulary: [...current.vocabulary, { note: "", phrase: "", translation: "" }],
      };
    });
  }

  function removeVocabularyItem(index: number) {
    setEditorDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        vocabulary: current.vocabulary.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  }

  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editorDraft) {
      return;
    }

    const nextContent = createContentFromDraft(editorDraft);
    const audioChanged = nextContent.audioUrl !== content.audioUrl;
    const hasSegmentsForAudio = Boolean(
      nextContent.audioSegments?.length &&
        nextContent.audioSegments.every((segment) => segment.audioUrl === nextContent.audioUrl),
    );

    if (audioChanged && nextContent.audioSegments?.length && !hasSegmentsForAudio) {
      nextContent.audioSegments = [];
    }

    setIsSaving(true);
    setStatus({ tone: "info", text: "正在保存..." });

    try {
      let generatedSegmentCount = 0;
      if (
        nextContent.audioUrl &&
        (!nextContent.audioSegments?.length || (audioChanged && !hasSegmentsForAudio))
      ) {
        setStatus({ tone: "info", text: "正在读取音频时长并生成逐句训练卡片..." });
        const durationSeconds = await readAudioDuration(nextContent.audioUrl);
        if (durationSeconds) {
          const generatedSegments = buildEstimatedSpeakingAudioSegments({
            answer: nextContent.answer,
            answerTranslation: nextContent.answerTranslation,
            audioUrl: nextContent.audioUrl,
            durationSeconds,
          });
          if (generatedSegments.length) {
            nextContent.audioSegments = generatedSegments;
            generatedSegmentCount = generatedSegments.length;
          }
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("请先登录管理员账号。");
      }

      const response = await fetch("/api/speaking-managed-content", {
        body: JSON.stringify({ content: nextContent }),
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "保存失败。");
      }

      setContent(nextContent);
      setEditorDraft(createEditorDraft(nextContent));
      setStatus({
        tone: "success",
        text: generatedSegmentCount
          ? `已保存，并自动生成 ${generatedSegmentCount} 个逐句训练卡片。`
          : "已保存，前台用户刷新后会读取最新内容。",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "保存失败。",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadAudio(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file || !editorDraft) {
      return;
    }

    setIsUploading(true);
    setStatus({ tone: "info", text: "正在上传音频..." });

    try {
      const localPreviewUrl = URL.createObjectURL(file);
      const localDurationSeconds = await readAudioDuration(localPreviewUrl);
      URL.revokeObjectURL(localPreviewUrl);
      const publicUrl = await uploadAdminAudio(
        file,
        `speaking/${editorDraft.partId}/${editorDraft.questionId}/${editorDraft.band}`,
      );
      setStatus({ tone: "info", text: "音频已上传，正在自动生成逐句训练卡片..." });
      const durationSeconds = localDurationSeconds ?? (await readAudioDuration(publicUrl));
      const audioSegments = durationSeconds
        ? buildEstimatedSpeakingAudioSegments({
            answer: splitParagraphs(editorDraft.answerText),
            answerTranslation: splitParagraphs(editorDraft.answerTranslationText),
            audioUrl: publicUrl,
            durationSeconds,
          })
        : [];
      updateDraft({ audioSegments, audioUrl: publicUrl });
      setStatus({
        tone: audioSegments.length ? "success" : "info",
        text: audioSegments.length
          ? `音频已上传，已自动生成 ${audioSegments.length} 个逐句训练卡片，请保存本页。`
          : "音频已上传并填入 URL；暂时无法读取时长，请先保存整段音频，稍后可重新上传生成逐句卡片。",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "音频上传失败。",
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <>
      <header className={styles.hero}>
        <span>{content.heroLabel}</span>
        <h1>{content.question}</h1>
        <div className={styles.questionPrompt}>
          <p>
            <span>中文提示</span>
            <strong>{content.questionTranslation}</strong>
          </p>
          <p>
            <span>真实题目 / 常见追问</span>
            <strong>{content.followUp}</strong>
          </p>
        </div>
        <dl>
          <div>
            <dt>题型</dt>
            <dd>{content.partLabel}</dd>
          </div>
          <div>
            <dt>建议时长</dt>
            <dd>{content.timing}</dd>
          </div>
          <div>
            <dt>题目来源</dt>
            <dd>{content.year}</dd>
          </div>
        </dl>
      </header>

      {canEdit ? (
        <section className={styles.adminInlinePanel} aria-label="管理员前台编辑">
          <div className={styles.adminInlineHeader}>
            <div>
              <span>ADMIN EDIT</span>
              <h2>前台编辑当前口语页面</h2>
              <p>保存后会写入已发布覆盖内容，不会改动代码里的原始题库。</p>
            </div>
            {editorDraft ? (
              <button className={styles.adminSecondaryButton} type="button" onClick={closeEditor}>
                收起编辑
              </button>
            ) : (
              <button className={styles.adminPrimaryButton} type="button" onClick={openEditor}>
                编辑本页
              </button>
            )}
          </div>

          {status ? (
            <p className={`${styles.adminStatus} ${styles[status.tone]}`}>{status.text}</p>
          ) : null}

          {editorDraft ? (
            <form className={styles.adminEditor} onSubmit={saveContent}>
              <div className={styles.adminEditorGrid}>
                <label className={styles.adminField}>
                  <span>题目标题</span>
                  <input
                    value={editorDraft.question}
                    onChange={(event) => updateDraft({ question: event.target.value })}
                  />
                </label>
                <label className={styles.adminField}>
                  <span>中文提示</span>
                  <input
                    value={editorDraft.questionTranslation}
                    onChange={(event) =>
                      updateDraft({ questionTranslation: event.target.value })
                    }
                  />
                </label>
                <label className={styles.adminField}>
                  <span>题目来源</span>
                  <input
                    value={editorDraft.year}
                    onChange={(event) => updateDraft({ year: event.target.value })}
                  />
                </label>
                <label className={`${styles.adminField} ${styles.adminWideField}`}>
                  <span>真实题目 / 常见追问</span>
                  <textarea
                    rows={3}
                    value={editorDraft.followUp}
                    onChange={(event) => updateDraft({ followUp: event.target.value })}
                  />
                </label>
                <label className={`${styles.adminField} ${styles.adminWideField}`}>
                  <span>高分思路</span>
                  <textarea
                    rows={4}
                    value={editorDraft.approach}
                    onChange={(event) => updateDraft({ approach: event.target.value })}
                  />
                </label>
                <label className={`${styles.adminField} ${styles.adminWideField}`}>
                  <span>万能句型（一行一句）</span>
                  <textarea
                    rows={5}
                    value={editorDraft.framesText}
                    onChange={(event) => updateDraft({ framesText: event.target.value })}
                  />
                </label>
              </div>

              <div className={styles.adminVocabularyEditor}>
                <div className={styles.adminVocabularyHeader}>
                  <h3>重点词汇和短语</h3>
                  <button type="button" onClick={addVocabularyItem}>
                    添加词汇
                  </button>
                </div>
                {editorDraft.vocabulary.length ? (
                  editorDraft.vocabulary.map((item, index) => (
                    <div className={styles.adminVocabularyRow} key={`${item.phrase}-${index}`}>
                      <input
                        aria-label={`第 ${index + 1} 个词汇`}
                        placeholder="词汇 / 短语"
                        value={item.phrase}
                        onChange={(event) =>
                          updateVocabularyItem(index, "phrase", event.target.value)
                        }
                      />
                      <input
                        aria-label={`第 ${index + 1} 个中文释义`}
                        placeholder="中文释义"
                        value={item.translation}
                        onChange={(event) =>
                          updateVocabularyItem(index, "translation", event.target.value)
                        }
                      />
                      <input
                        aria-label={`第 ${index + 1} 个使用说明`}
                        placeholder="使用说明"
                        value={item.note}
                        onChange={(event) =>
                          updateVocabularyItem(index, "note", event.target.value)
                        }
                      />
                      <button type="button" onClick={() => removeVocabularyItem(index)}>
                        删除
                      </button>
                    </div>
                  ))
                ) : (
                  <p className={styles.adminHint}>暂无词汇，可点击“添加词汇”。</p>
                )}
              </div>

              <div className={styles.adminEditorGrid}>
                <label className={`${styles.adminField} ${styles.adminWideField}`}>
                  <span>{content.answerHeading}（空一行分段）</span>
                  <textarea
                    rows={9}
                    value={editorDraft.answerText}
                    onChange={(event) => updateDraft({ answerText: event.target.value })}
                  />
                </label>
                <label className={`${styles.adminField} ${styles.adminWideField}`}>
                  <span>中文翻译（空一行分段）</span>
                  <textarea
                    rows={9}
                    value={editorDraft.answerTranslationText}
                    onChange={(event) =>
                      updateDraft({ answerTranslationText: event.target.value })
                    }
                  />
                </label>
                <label className={`${styles.adminField} ${styles.adminWideField}`}>
                  <span>音频 URL</span>
                  <input
                    value={editorDraft.audioUrl}
                    onChange={(event) => updateDraft({ audioUrl: event.target.value })}
                    placeholder="可直接填写现有音频地址，也可上传后自动填入"
                  />
                </label>
                <label className={`${styles.adminField} ${styles.adminWideField}`}>
                  <span>上传音频</span>
                  <input
                    accept="audio/*,.aac,.flac,.m4a,.mp3,.mp4,.ogg,.wav,.webm"
                    disabled={isUploading}
                    type="file"
                    onChange={uploadAudio}
                  />
                </label>
                <p className={`${styles.adminHint} ${styles.adminWideField}`}>
                  上传整段范文后会自动按句子生成逐句训练卡片；后续新增音频也会沿用这一流程。
                </p>
              </div>

              {editorDraft.audioUrl ? (
                <div className={styles.adminAudioPreview}>
                  <span>当前音频预览</span>
                  <audio controls preload="none" src={editorDraft.audioUrl}>
                    您的浏览器暂不支持音频播放。
                  </audio>
                </div>
              ) : null}

              <div className={styles.adminActions}>
                <button
                  className={styles.adminPrimaryButton}
                  disabled={isSaving || isUploading}
                  type="submit"
                >
                  {isSaving ? "保存中..." : "保存本页"}
                </button>
                <button
                  className={styles.adminSecondaryButton}
                  disabled={isSaving || isUploading}
                  type="button"
                  onClick={closeEditor}
                >
                  取消
                </button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      <section className={styles.section}>
        <h2>高分思路</h2>
        <p>{content.approach}</p>
      </section>

      <section className={styles.section}>
        <h2>万能句型</h2>
        <ul className={styles.frames}>
          {content.frames.map((frame, index) => (
            <li key={`${frame}-${index}`}>{frame}</li>
          ))}
        </ul>
      </section>

      {content.vocabulary.length ? (
        <section className={styles.section}>
          <h2>重点词汇和短语</h2>
          <dl className={styles.vocabulary}>
            {content.vocabulary.map((item, index) => (
              <div key={`${item.phrase}-${index}`}>
                <dt>{item.phrase}</dt>
                <dd>
                  <strong>{item.translation}</strong>
                  <span>{item.note}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className={`${styles.section} ${styles.answerSection}`}>
        <h2>{content.answerHeading}</h2>
        <div className={styles.answer}>
          {content.answer.map((paragraph, index) => (
            <p key={`${paragraph}-${index}`}>
              {renderHighlightedText(
                paragraph,
                content.vocabulary.map((item) => item.phrase),
                "english",
                styles.vocabularyHighlight,
              )}
            </p>
          ))}
        </div>

        {content.answerTranslation.length ? (
          <div className={styles.translationBlock}>
            <h3>中文翻译</h3>
            <div className={styles.translation}>
              {content.answerTranslation.map((paragraph, index) => (
                <p key={`${paragraph}-${index}`}>
                  {renderHighlightedText(
                    paragraph,
                    content.vocabulary.map((item) => item.translation),
                    "chinese",
                    styles.vocabularyHighlight,
                  )}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {content.audioUrl ? (
          <div className={styles.audioBlock}>
            <h3>范文音频</h3>
            <AudioPlayer
              hasSelectedRate
              html5={false}
              onPlayingChange={handleFullAudioPlayingChange}
              onSettingsChange={updateAudioSettings}
              settings={audioSettings}
              src={content.audioUrl}
              title={`${content.question} 完整范文音频`}
            />
          </div>
        ) : null}

        {content.audioSegments?.length ? (
          <div className={styles.speakingSentencePractice}>
            <div className={styles.speakingSentenceHeading}>
              <h3>逐句训练</h3>
              <p>点击句子音频，使用播放器中的“口语模式”或“写作模式”进行练习。</p>
            </div>
            <div className="sentence-list bbc-listening-sentence-list">
              {content.audioSegments.map((sentence) => (
                <article
                  className={`sentence-card bbc-listening-sentence-card ${
                    activeSentenceNo === sentence.sentenceNo ? "active" : ""
                  }`}
                  id={`speaking-sentence-${content.questionId}-${sentence.sentenceNo}`}
                  key={`${content.questionId}-${sentence.sentenceNo}`}
                >
                  <div className="sentence-meta">
                    <div className="sentence-meta-copy">
                      <span>#{sentence.sentenceNo}</span>
                    </div>
                  </div>
                  <div className="sentence-copy bbc-listening-sentence-copy">
                    <BbcSentencePractice
                      activeWordIndex={
                        isSentenceAudioPlaying && activeSentenceNo === sentence.sentenceNo
                          ? getActiveWordIndex(
                              sentence.english,
                              activeSentencePosition,
                              getSentencePlaybackDuration(sentence),
                            )
                          : null
                      }
                      isAudioPlaying={
                        isSentenceAudioPlaying && activeSentenceNo === sentence.sentenceNo
                      }
                      sentence={{
                        chinese: sentence.chinese,
                        chineseUnderlinedTerms: content.vocabulary.map(
                          (item) => item.translation,
                        ),
                        english: sentence.english,
                        sentenceNo: sentence.sentenceNo,
                        underlinedTerms: content.vocabulary.map((item) => item.phrase),
                      }}
                      settings={audioSettings}
                    />
                  </div>
                  {speakingTraining?.sentenceNo === sentence.sentenceNo ? (
                    <div aria-live="polite" className="bbc-speaking-training-status practicing">
                      <span>{SPEAKING_PHASE_LABELS[speakingTraining.mode]}</span>
                      <strong>{speakingTraining.remainingSeconds} 秒</strong>
                      <small>
                        后
                        {audioSettings.playMode === "sentence-loop"
                          ? "重播本句"
                          : sentence.sentenceNo === content.audioSegments?.at(-1)?.sentenceNo
                            ? "结束本轮训练"
                            : "播放下一句"}
                      </small>
                    </div>
                  ) : activeSentenceNo === sentence.sentenceNo &&
                    isSentenceAudioPlaying &&
                    audioSettings.speakingMode !== "none" ? (
                    <div className="bbc-speaking-training-status playing">
                      <span>{SPEAKING_MODE_LABELS[audioSettings.speakingMode]}</span>
                      <strong>正在播放</strong>
                      <small>{SPEAKING_PLAYING_HINTS[audioSettings.speakingMode]}</small>
                    </div>
                  ) : null}
                  <AudioPlayer
                    autoPlaySignal={sentenceAutoPlaySignals[sentence.sentenceNo] ?? 0}
                    deferSentenceLoop={audioSettings.speakingMode !== "none"}
                    hasSelectedRate
                    html5={false}
                    onDurationChange={(durationSeconds) =>
                      setSentenceDurations((current) => ({
                        ...current,
                        [sentence.sentenceNo]: durationSeconds,
                      }))
                    }
                    onEnded={() => handleSentenceEnded(sentence)}
                    onPlayingChange={(isPlaying) =>
                      handleSentencePlayingChange(sentence.sentenceNo, isPlaying)
                    }
                    onStopAtEnd={() => handleSentenceEnded(sentence)}
                    onSettingsChange={updateAudioSettings}
                    onTimeChange={(positionSeconds) => {
                      if (activeSentenceNoRef.current === sentence.sentenceNo) {
                        setActiveSentencePosition(
                          Math.max(positionSeconds - (sentence.startSeconds ?? 0), 0),
                        );
                      }
                    }}
                    settings={audioSettings}
                    src={sentence.audioUrl}
                    startAtSeconds={sentence.startSeconds}
                    stopAtSeconds={sentence.endSeconds}
                    title={`第 ${sentence.sentenceNo} 句音频`}
                  />
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className={styles.section}>
        <h2>IELTS 评分对照</h2>
        <div className={styles.scoreNotes}>
          {scoreNotes.map((item) => (
            <div key={item.code}>
              <span>{item.code}</span>
              <strong>{item.label}</strong>
              <p>{item.note}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
