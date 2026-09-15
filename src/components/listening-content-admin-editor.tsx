"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  loadListeningContentOverrides,
  saveListeningContentOverrides,
} from "@/lib/ielts/listening-content-overrides";
import type {
  ListeningQuestion,
  ListeningSectionDetail,
  ListeningTranscriptSentence,
} from "@/lib/ielts/listening";
import { supabase } from "@/lib/supabase/client";

function nextQuestionNumber(questions: ListeningQuestion[]) {
  return Math.max(0, ...questions.map((question) => question.questionNo)) + 1;
}

function nextSentenceNumber(sentences: ListeningTranscriptSentence[]) {
  return Math.max(0, ...sentences.map((sentence) => sentence.sentenceNo)) + 1;
}

export function ListeningContentAdminEditor({
  initialSection,
}: {
  initialSection: ListeningSectionDetail;
}) {
  const router = useRouter();
  const [section, setSection] = useState(initialSection);
  const [sectionHidden, setSectionHidden] = useState(Boolean(initialSection.isHidden));
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function updateQuestion(questionId: string, patch: Partial<ListeningQuestion>) {
    setSection((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.id === questionId ? { ...question, ...patch } : question,
      ),
    }));
  }

  function updateSentence(
    sentenceId: string,
    patch: Partial<ListeningTranscriptSentence>,
  ) {
    setSection((current) => ({
      ...current,
      transcriptSentences: current.transcriptSentences.map((sentence) =>
        sentence.id === sentenceId ? { ...sentence, ...patch } : sentence,
      ),
    }));
  }

  function addQuestion() {
    setSection((current) => {
      const questionNo = nextQuestionNumber(current.questions);
      return {
        ...current,
        questions: [
          ...current.questions,
          {
            answers: [],
            explanation: "",
            id: `admin-question-${crypto.randomUUID()}`,
            points: 1,
            promptText: "",
            questionNo,
            questionType: "fill_blank",
          },
        ],
      };
    });
  }

  function addSentence() {
    setSection((current) => {
      const sentenceNo = nextSentenceNumber(current.transcriptSentences);
      return {
        ...current,
        transcriptSentences: [
          ...current.transcriptSentences,
          {
            audioUrl: null,
            chineseText: "",
            endMs: null,
            englishText: "",
            id: `admin-sentence-${crypto.randomUUID()}`,
            sentenceNo,
            speaker: "",
            startMs: null,
          },
        ],
      };
    });
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("管理员登录已失效，请重新登录。");
      setSaving(false);
      return;
    }

    const nextSection = {
      ...section,
      partLinks: section.partLinks.map((part) =>
        part.id === section.id
          ? {
              ...part,
              questionCount: section.questions.filter((question) => !question.isHidden).length,
              title: section.title,
            }
          : part,
      ),
      questionCount: section.questions.filter((question) => !question.isHidden).length,
    };
    const overrides = await loadListeningContentOverrides();
    const error = await saveListeningContentOverrides(user.id, {
      ...overrides,
      [section.id]: {
        hidden: sectionHidden,
        section: nextSection,
        updatedAt: new Date().toISOString(),
      },
    });

    if (error) {
      setMessage(`保存失败：${error.message}`);
      setSaving(false);
      return;
    }

    setSection(nextSection);
    setMessage("已保存，前台内容和判分答案已更新。");
    setSaving(false);
    router.refresh();
  }

  return (
    <section className={`listening-content-admin ${open ? "open" : ""}`}>
      <button className="listening-content-admin-toggle" type="button" onClick={() => setOpen(!open)}>
        {open ? "收起内容编辑" : "管理员：编辑本套题"}
      </button>

      {open ? (
        <div className="listening-content-admin-panel">
          <header>
            <div>
              <strong>听力内容编辑</strong>
              <span>修改题目、答案、解析和原文后统一保存。</span>
            </div>
            <button disabled={saving} type="button" onClick={() => void save()}>
              {saving ? "保存中…" : "保存全部修改"}
            </button>
          </header>

          <div className="listening-content-admin-section-fields">
            <label>
              <span>页面标题</span>
              <input
                value={section.title}
                onChange={(event) => setSection((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <label>
              <span>倒计时（秒）</span>
              <input
                min="0"
                type="number"
                value={section.timeLimitSeconds ?? 0}
                onChange={(event) =>
                  setSection((current) => ({
                    ...current,
                    timeLimitSeconds: Number(event.target.value) || null,
                  }))
                }
              />
            </label>
            <label className="admin-check-row">
              <input
                checked={section.isPublished}
                type="checkbox"
                onChange={(event) =>
                  setSection((current) => ({ ...current, isPublished: event.target.checked }))
                }
              />
              <span>允许普通用户查看</span>
            </label>
            <label className="admin-check-row">
              <input
                checked={sectionHidden}
                type="checkbox"
                onChange={(event) => setSectionHidden(event.target.checked)}
              />
              <span>隐藏整个 Section</span>
            </label>
          </div>

          <div className="listening-content-admin-group">
            <div className="listening-content-admin-group-head">
              <h3>题目与答案</h3>
              <button type="button" onClick={addQuestion}>增加题目</button>
            </div>
            {section.questions.map((question) => (
              <details key={question.id}>
                <summary>
                  Q{question.questionNo} · {question.promptText?.slice(0, 55) || "未填写题干"}
                  {question.isHidden ? " · 已隐藏" : ""}
                </summary>
                <div className="listening-content-admin-item-grid">
                  <label>
                    <span>题号</span>
                    <input
                      min="1"
                      type="number"
                      value={question.questionNo}
                      onChange={(event) =>
                        updateQuestion(question.id, { questionNo: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label>
                    <span>题型</span>
                    <input
                      value={question.questionType}
                      onChange={(event) =>
                        updateQuestion(question.id, { questionType: event.target.value })
                      }
                    />
                  </label>
                  <label className="wide">
                    <span>题目</span>
                    <textarea
                      value={question.promptText ?? ""}
                      onChange={(event) =>
                        updateQuestion(question.id, { promptText: event.target.value })
                      }
                    />
                  </label>
                  <label className="wide">
                    <span>答案（每行一个可接受答案）</span>
                    <textarea
                      value={question.answers.join("\n")}
                      onChange={(event) =>
                        updateQuestion(question.id, {
                          answers: event.target.value
                            .split("\n")
                            .map((answer) => answer.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </label>
                  <label className="wide">
                    <span>解析</span>
                    <textarea
                      value={question.explanation ?? ""}
                      onChange={(event) =>
                        updateQuestion(question.id, { explanation: event.target.value })
                      }
                    />
                  </label>
                  <label className="admin-check-row">
                    <input
                      checked={Boolean(question.isHidden)}
                      type="checkbox"
                      onChange={(event) =>
                        updateQuestion(question.id, { isHidden: event.target.checked })
                      }
                    />
                    <span>隐藏这道题</span>
                  </label>
                  <button
                    className="danger"
                    type="button"
                    onClick={() =>
                      setSection((current) => ({
                        ...current,
                        questions: current.questions.filter((item) => item.id !== question.id),
                      }))
                    }
                  >
                    删除这道题
                  </button>
                </div>
              </details>
            ))}
          </div>

          <div className="listening-content-admin-group">
            <div className="listening-content-admin-group-head">
              <h3>听力原文</h3>
              <button type="button" onClick={addSentence}>增加原文句子</button>
            </div>
            {section.transcriptSentences.map((sentence) => (
              <details key={sentence.id}>
                <summary>
                  {sentence.sentenceNo}. {sentence.speaker ? `${sentence.speaker}: ` : ""}
                  {sentence.englishText.slice(0, 55) || "未填写原文"}
                  {sentence.isHidden ? " · 已隐藏" : ""}
                </summary>
                <div className="listening-content-admin-item-grid">
                  <label>
                    <span>序号</span>
                    <input
                      min="1"
                      type="number"
                      value={sentence.sentenceNo}
                      onChange={(event) =>
                        updateSentence(sentence.id, { sentenceNo: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label>
                    <span>说话人</span>
                    <input
                      value={sentence.speaker ?? ""}
                      onChange={(event) => updateSentence(sentence.id, { speaker: event.target.value })}
                    />
                  </label>
                  <label className="wide">
                    <span>英文原文</span>
                    <textarea
                      value={sentence.englishText}
                      onChange={(event) =>
                        updateSentence(sentence.id, { englishText: event.target.value })
                      }
                    />
                  </label>
                  <label className="wide">
                    <span>中文</span>
                    <textarea
                      value={sentence.chineseText}
                      onChange={(event) =>
                        updateSentence(sentence.id, { chineseText: event.target.value })
                      }
                    />
                  </label>
                  <label className="wide">
                    <span>单句音频地址</span>
                    <input
                      value={sentence.audioUrl ?? ""}
                      onChange={(event) => updateSentence(sentence.id, { audioUrl: event.target.value || null })}
                    />
                  </label>
                  <label className="admin-check-row">
                    <input
                      checked={Boolean(sentence.isHidden)}
                      type="checkbox"
                      onChange={(event) =>
                        updateSentence(sentence.id, { isHidden: event.target.checked })
                      }
                    />
                    <span>隐藏这句原文</span>
                  </label>
                  <button
                    className="danger"
                    type="button"
                    onClick={() =>
                      setSection((current) => ({
                        ...current,
                        transcriptSentences: current.transcriptSentences.filter(
                          (item) => item.id !== sentence.id,
                        ),
                      }))
                    }
                  >
                    删除这句原文
                  </button>
                </div>
              </details>
            ))}
          </div>

          {message ? <p className="admin-form-message">{message}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
