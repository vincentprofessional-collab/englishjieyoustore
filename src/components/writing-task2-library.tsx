"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import {
  TASK2_MODEL_ESSAYS,
  TASK2_TYPE_LABELS,
  TASK2_TYPE_ORDER,
  type Task2ModelEssay,
  type Task2VocabularyItem,
} from "@/data/writing/task2-model-essays";

type Task2FoldProps = {
  children: ReactNode;
  summary: ReactNode;
  variant?: "essay" | "module";
};

const ACADEMIC_EXPRESSIONS: Task2VocabularyItem[] = [
  { term: "owing to", meaningCn: "由于；因为", useCase: "正式原因表达" },
  { term: "in an effort to deal with", meaningCn: "为了处理……", useCase: "目的表达" },
  { term: "the key to solving this issue", meaningCn: "解决该问题的关键", useCase: "方案判断" },
  { term: "take into consideration", meaningCn: "纳入考虑", useCase: "补充维度" },
  { term: "in the long run", meaningCn: "从长远来看", useCase: "长期影响" },
  { term: "counteract", meaningCn: "抵消；对抗", useCase: "问题机制" },
  { term: "by incorporating", meaningCn: "通过纳入……", useCase: "措施表达" },
  { term: "extracurricular physical activities", meaningCn: "课外体育活动", useCase: "教育措施" },
  { term: "not effective enough on its own", meaningCn: "单独使用还不够有效", useCase: "限制论证" },
  { term: "constitutes", meaningCn: "构成；算作", useCase: "定义说明" },
  { term: "for a more immediate impact", meaningCn: "为了产生更直接的效果", useCase: "方案递进" },
  { term: "gravitate towards", meaningCn: "倾向于选择", useCase: "行为趋势" },
  { term: "impose a tax on", meaningCn: "对……征税", useCase: "政策措施" },
  { term: "predominate over", meaningCn: "压倒；占主导", useCase: "趋势表达" },
  { term: "eventual disappearance", meaningCn: "最终消失", useCase: "长期后果" },
  { term: "barriers", meaningCn: "障碍", useCase: "经济与交流" },
  { term: "world heritage", meaningCn: "世界遗产", useCase: "文化价值" },
  { term: "reoffend", meaningCn: "再次犯罪", useCase: "犯罪类核心词" },
  { term: "rehabilitation", meaningCn: "改造；康复", useCase: "监狱制度" },
  { term: "reintegrate back into society", meaningCn: "重新融入社会", useCase: "解决方案" },
  { term: "deter them from reoffending", meaningCn: "阻止再次犯罪", useCase: "结果表达" },
  { term: "long-term fulfilment", meaningCn: "长期满足感", useCase: "幸福与工作" },
  { term: "in isolation", meaningCn: "孤立地；独自地", useCase: "人际关系论证" },
  { term: "detrimental effect", meaningCn: "有害影响", useCase: "负面影响" },
  { term: "supportive relationships", meaningCn: "支持性关系", useCase: "社区关系" },
  { term: "transferable skills", meaningCn: "可迁移技能", useCase: "大学价值" },
  { term: "hands-on experience", meaningCn: "实践经验", useCase: "工作技能" },
  { term: "instant access", meaningCn: "即时获取", useCase: "便利性" },
  { term: "accessibility and convenience", meaningCn: "可及性和便利性", useCase: "总结优势" },
];

const SIMPLE_OR_REPEATED_TERMS = new Set([
  "however",
  "firstly",
  "secondly",
  "therefore",
  "as a result",
  "in other words",
  "for instance",
  "to illustrate",
  "in conclusion",
  "on the other hand",
  "tackle the problem",
]);

const SENTENCE_CUE_OVERRIDES: Record<string, string> = {
  "task2-overweight-physical-education-0-0":
    "背景句：肥胖人群增加给医疗系统带来压力，因此有人认为学校应增加体育和运动课来解决问题。",
  "task2-overweight-physical-education-0-1":
    "立场句：学校体育确实有帮助，但饮食因素也必须一起考虑。",
  "task2-overweight-physical-education-1-0":
    "主题句：从长远看，学校规律运动有助于缓解大众体重问题。",
  "task2-overweight-physical-education-1-1":
    "解释句：这种方法能帮助新一代养成支持健康和合理体重的重要习惯。",
  "task2-overweight-physical-education-1-2":
    "问题句：目前西方儿童运动频率不足，难以抵消每天久坐上课带来的影响。",
  "task2-overweight-physical-education-1-3":
    "结果句：如果增加校内运动时间和课外体育活动，学生会更健康，并可能毕业后继续保持活跃。",
  "task2-overweight-physical-education-2-0":
    "转折句：只针对学生体育锻炼，并不能单独解决整个社会当前的肥胖问题。",
  "task2-overweight-physical-education-2-1":
    "补充句：学生还需要学习什么是健康食品，以及为什么要健康饮食。",
  "task2-overweight-physical-education-2-2":
    "递进句：若要更快见效，还要减少市场中过度加工食品的数量。",
  "task2-overweight-physical-education-2-3":
    "例证句：政府可以提高过度加工食品价格，同时降低蔬菜等健康食品成本，从而鼓励更好的饮食。",
  "task2-overweight-physical-education-3-0":
    "结论句：解决体重问题应从学校饮食和运动教育开始，同时通过食品价格调整促进更健康的选择。",
};

function countWords(paragraphs: string[]) {
  return paragraphs.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

function formatNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

function Task2Fold({ children, summary, variant = "module" }: Task2FoldProps) {
  return (
    <details className={`task2-fold ${variant}`}>
      <summary>{summary}</summary>
      <div className="task2-fold-body">{children}</div>
    </details>
  );
}

function splitIntoSentences(paragraph: string) {
  const matches = paragraph.match(/[^.!?]+[.!?]+(?:["”’])?/g);

  if (!matches) {
    return paragraph.trim() ? [paragraph.trim()] : [];
  }

  return matches.map((sentence) => sentence.trim());
}

function getChineseCue(essay: Task2ModelEssay, paragraphIndex: number, sentenceIndex: number) {
  const override = SENTENCE_CUE_OVERRIDES[`${essay.id}-${paragraphIndex}-${sentenceIndex}`];

  if (override) {
    return override;
  }

  const paragraphPlan = essay.paragraphPlan[paragraphIndex];
  const point = paragraphPlan?.points[sentenceIndex] ?? paragraphPlan?.points.at(-1);
  const sentenceRoles = ["主题句", "解释句", "例证句", "延伸句", "收束句"];

  if (!paragraphPlan) {
    return `总结全文：${essay.positionCn}`;
  }

  if (paragraphIndex === 0 && sentenceIndex === 0) {
    return `背景句：${point ?? essay.thesisCn}。`;
  }

  if (paragraphIndex === 0) {
    return `立场句：${essay.positionCn}`;
  }

  return `${sentenceRoles[sentenceIndex] ?? "补充句"}：围绕“${paragraphPlan.role}”展开，重点写清楚“${point ?? essay.thesisCn}”。`;
}

function getSentenceVocabulary(sentence: string, essay: Task2ModelEssay, paragraphIndex: number, sentenceIndex: number) {
  const lowerSentence = sentence.toLowerCase();
  const candidateItems = [...essay.vocabulary, ...ACADEMIC_EXPRESSIONS];
  const uniqueItems = candidateItems.filter(
    (item, index, allItems) =>
      allItems.findIndex((candidate) => candidate.term.toLowerCase() === item.term.toLowerCase()) === index,
  );

  return uniqueItems
    .filter((item) => !SIMPLE_OR_REPEATED_TERMS.has(item.term.toLowerCase()))
    .filter((item) => lowerSentence.includes(item.term.toLowerCase()))
    .slice(0, 3);
}

function Task2StageTitle({ index, title }: { index: string; title: string }) {
  return (
    <span className="task2-stage-title">
      <b>{index}</b> {title}
    </span>
  );
}

export function WritingTask2Library() {
  const groupedEssays = useMemo(
    () =>
      TASK2_TYPE_ORDER.map((type) => ({
        essays: TASK2_MODEL_ESSAYS.filter((essay) => essay.taskType === type),
        type,
      })).filter((group) => group.essays.length > 0),
    [],
  );

  return (
    <section className="stack writing-home-page writing-task2-page task2-index-page">
      <div className="task2-backbar">
        <Link className="back-link" href="/writing">
          ← 返回雅思写作
        </Link>
      </div>

      {groupedEssays.map((group) => {
        const label = TASK2_TYPE_LABELS[group.type];

        return (
          <section className="task2-type-section" id={`task2-${group.type}`} key={group.type}>
            <header className="task2-type-head task2-type-head-simple">
              <div>
                <span>{label.en}</span>
                <h2>{label.cn}</h2>
              </div>
            </header>

            <div className="task2-topic-list">
              {group.essays.map((essay, index) => (
                <Link className="task2-topic-link" href={`/writing/task2/${essay.id}`} key={essay.id}>
                  <span className="task2-essay-number">{formatNumber(index)}</span>
                  <span>
                    <strong>{essay.shortTitleCn}</strong>
                    <small>
                      {label.en} · {essay.categoryCn} · {countWords(essay.essay)} words
                    </small>
                  </span>
                  <i aria-hidden="true">+</i>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}

export function WritingTask2EssayDetail({ essay }: { essay: Task2ModelEssay }) {
  const [submittedSentenceIds, setSubmittedSentenceIds] = useState<Set<string>>(() => new Set());
  const typeLabel = TASK2_TYPE_LABELS[essay.taskType];
  const sentenceGroups = useMemo(() => essay.essay.map(splitIntoSentences), [essay.essay]);

  function submitSentence(event: FormEvent<HTMLFormElement>, sentenceId: string) {
    event.preventDefault();
    setSubmittedSentenceIds((current) => {
      const next = new Set(current);
      next.add(sentenceId);
      return next;
    });
  }

  return (
    <section className="stack writing-home-page writing-task2-page task2-detail-page">
      <div className="task2-backbar">
        <Link className="back-link" href="/writing/task2">
          ← 返回大作文题目
        </Link>
      </div>

      <article className="task2-detail-shell">
        <header className="task2-detail-head">
          <span className="task2-essay-number">01</span>
          <div>
            <h1>{essay.shortTitleCn}</h1>
            <p>
              {typeLabel.en} · {essay.categoryCn} · {countWords(essay.essay)} words
            </p>
          </div>
        </header>

        <div className="task2-question-box task2-question-box-open">
          <span>QUESTION</span>
          <p>{essay.prompt}</p>
        </div>

        <div className="task2-stage-grid">
          <Task2Fold summary={<Task2StageTitle index="01" title="审题" />}>
            <div className="task2-analysis-grid task2-analysis-grid-compact">
              <article>
                <span>核心问题</span>
                <strong>{essay.categoryCn}</strong>
                <p>{essay.thesisCn}</p>
              </article>
              <article>
                <span>推荐立场</span>
                <strong>{essay.positionCn}</strong>
              </article>
            </div>
          </Task2Fold>

          <Task2Fold summary={<Task2StageTitle index="02" title="规划段落" />}>
            <div className="task2-plan-list">
              {essay.paragraphPlan.map((paragraph) => (
                <article key={`${essay.id}-${paragraph.heading}`}>
                  <div>
                    <span>{paragraph.heading}</span>
                    <strong>{paragraph.role}</strong>
                  </div>
                  <ul>
                    {paragraph.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </Task2Fold>

          <Task2Fold summary={<Task2StageTitle index="03" title="组织语言" />}>
            <div className="task2-sentence-practice-list">
              {sentenceGroups.map((sentences, paragraphIndex) => {
                const paragraphPlan = essay.paragraphPlan[paragraphIndex];

                return (
                  <section className="task2-paragraph-practice" key={`${essay.id}-paragraph-${paragraphIndex}`}>
                    <header>
                      <span>{paragraphPlan?.heading ?? "结尾"}</span>
                      <strong>{paragraphPlan?.role ?? "总结全文并重申立场"}</strong>
                    </header>

                    {sentences.map((sentence, sentenceIndex) => {
                      const sentenceId = `${essay.id}-${paragraphIndex}-${sentenceIndex}`;
                      const vocabulary = getSentenceVocabulary(sentence, essay, paragraphIndex, sentenceIndex);
                      const isSubmitted = submittedSentenceIds.has(sentenceId);

                      return (
                        <form
                          className="task2-sentence-card"
                          key={sentenceId}
                          onSubmit={(event) => submitSentence(event, sentenceId)}
                        >
                          <div className="task2-sentence-order">
                            P{paragraphIndex + 1} · Sentence {sentenceIndex + 1}
                          </div>

                          <div className="task2-sentence-cn">
                            <span>中文整理</span>
                            <p>{getChineseCue(essay, paragraphIndex, sentenceIndex)}</p>
                          </div>

                          {vocabulary.length > 0 ? (
                            <div className="task2-sentence-vocabulary">
                              <span>重点词汇与表达</span>
                              <div>
                                {vocabulary.map((item) => (
                                  <article key={`${sentenceId}-${item.term}`}>
                                    <strong>{item.term}</strong>
                                    <small>
                                      {item.meaningCn} · {item.useCase}
                                    </small>
                                  </article>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <label className="task2-sentence-practice">
                            <span>学生英文练习</span>
                            <textarea placeholder="根据上方中文和词汇提示，在这里写出英文句子。" />
                          </label>

                          <button type="submit">提交</button>

                          {isSubmitted ? (
                            <div className="task2-reference-answer">
                              <span>英文语言组织</span>
                              <p>{sentence}</p>
                            </div>
                          ) : null}
                        </form>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          </Task2Fold>

          <Task2Fold summary={<Task2StageTitle index="04" title="完整范文" />}>
            {essay.examinerNote ? <p className="task2-examiner-note">{essay.examinerNote}</p> : null}
            <div className="task2-model-answer-text">
              {essay.essay.map((paragraph, paragraphIndex) => (
                <p key={`${essay.id}-paragraph-${paragraphIndex}`}>{paragraph}</p>
              ))}
            </div>
          </Task2Fold>
        </div>
      </article>
    </section>
  );
}
