# 中考英语模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在英语考试导航下上线中考英语首页、真题模考和专项训练的最小可用闭环，并为后续批量导入原卷／解析版资料建立稳定索引。

**Architecture:** 先把 Downloads 资料转成只读的结构化索引，不把原始文件直接放进前端。页面通过索引完成入口选择，再复用现有 IELTS 工作台风格实现真题模考与专项训练；首批用少量代表性试卷验证题型、计时和解析配对，之后再扩充数据。

**Tech Stack:** Next.js 16、React、TypeScript、现有 CSS、Node 脚本、现有导航配置。

## Global Constraints

- 中考首页只显示“中考英语”，不显示英文副标题。
- 真题模考确认后立即按原卷时长自动倒计时；到零后显示负数超时。
- 专项训练默认不计时，计时器由用户手动开始、暂停、继续。
- 提交后所有题目都显示答案和“解析”按钮；解析来自配对解析版。
- 只修改与中考功能直接相关的文件；保留工作区已有未提交改动。
- 原始资料不复制到 Git；索引脚本使用绝对输入路径并输出项目内生成数据。

---

### Task 1: 建立真题资料索引脚本

**Files:**
- Create: `scripts/index-junior-high-exams.mjs`
- Create: `src/data/junior-high/exam-index.json`
- Test: `scripts/index-junior-high-exams.test.mjs`

**Interfaces:**
- Produces `exam-index.json` records with `id`, `year`, `region`, `paperLabel`, `questionFile`, `analysisFile`, `audioFiles`, `durationMinutes`, and `sourceType`.
- The script reads `/Users/shidianjin/Downloads/考试-中考` without modifying it.

- [ ] **Step 1: Write the failing test** for pairing an 原卷版 file with its same-directory 解析版, extracting year and region, and retaining A/B卷 as distinct `paperLabel` values.
- [ ] **Step 2: Run the test** with `node --test scripts/index-junior-high-exams.test.mjs`; verify it fails because the indexer is absent.
- [ ] **Step 3: Implement the indexer** using recursive `fs` traversal, filename classification, normalized year/region extraction, same-directory pairing, and JSON output sorted by year descending then configured region priority.
- [ ] **Step 4: Add duration extraction** for explicit phrases such as `考试时间100分钟`; leave `durationMinutes: null` when no duration is found.
- [ ] **Step 5: Run the test and generate the real index**; verify counts and that no original files are copied into the repository.
- [ ] **Step 6: Commit** the indexer, fixture test, and generated index.

### Task 2: Add 中考英语 navigation and landing page

**Files:**
- Modify: `src/lib/content/site-chrome.ts`
- Create: `src/app/junior-high/page.tsx`
- Modify: `src/app/globals.css`
- Test: `src/app/junior-high/page.test.tsx`

**Interfaces:**
- Navigation child `junior-high-english` links to `/junior-high`.
- Landing page links to `/junior-high/mock` and `/junior-high/practice`.

- [ ] **Step 1: Write the failing render test** asserting the page contains “中考英语”, “真题模考”, and “专项训练”, with no `JUNIOR HIGH SCHOOL ENGLISH` text.
- [ ] **Step 2: Run the test** and confirm the route/config are missing.
- [ ] **Step 3: Add the navigation item** under “英语考试” beside 雅思, preserving the existing admin-editable config merge behavior.
- [ ] **Step 4: Implement the landing page** with two primary entries and the existing cream/green/gold shell.
- [ ] **Step 5: Add focused CSS** for the two-entry layout without changing unrelated page styles.
- [ ] **Step 6: Run the page test and TypeScript check**, then commit.

### Task 3: Implement 真题模考 selection and workbench shell

**Files:**
- Create: `src/app/junior-high/mock/page.tsx`
- Create: `src/app/junior-high/mock/[examId]/page.tsx`
- Create: `src/components/junior-high/mock-selector.tsx`
- Create: `src/components/junior-high/exam-workbench.tsx`
- Modify: `src/app/globals.css`
- Test: `src/components/junior-high/mock-selector.test.tsx`

**Interfaces:**
- Selector emits `{ examId: string }` only when `year` and `region` are selected.
- Workbench consumes one `ExamRecord` and exposes `mode: "mock" | "practice"` for the shared shell.

- [ ] **Step 1: Write failing selector tests** for year-first vertical selection, common-region ordering, disabled confirmation, and navigation to `/junior-high/mock/[examId]`.
- [ ] **Step 2: Run tests** and verify missing components fail.
- [ ] **Step 3: Implement selector** from `exam-index.json`, showing common regions first and a separate other-regions section.
- [ ] **Step 4: Implement the workbench shell** with header metadata, question area placeholder, bottom question navigator, submit action, and a mock timer that starts immediately.
- [ ] **Step 5: Implement negative overtime display** after zero and use `durationMinutes` from the selected record, with a clearly labeled fallback when null.
- [ ] **Step 6: Run tests, `npx tsc --noEmit --ignoreDeprecations 6.0`, and a local route smoke check; commit.

### Task 4: Implement 专项训练 selection and manual timer

**Files:**
- Create: `src/app/junior-high/practice/page.tsx`
- Create: `src/app/junior-high/practice/[examId]/[questionType]/page.tsx`
- Create: `src/components/junior-high/practice-selector.tsx`
- Modify: `src/components/junior-high/exam-workbench.tsx`
- Modify: `src/app/globals.css`
- Test: `src/components/junior-high/practice-selector.test.tsx`

**Interfaces:**
- Selector emits `{ examId: string; questionType: string }` after all three selections.
- Workbench practice mode starts with `isTimerRunning: false` and provides start/pause/resume controls.

- [ ] **Step 1: Write failing tests** for question-type → year → region selection and the default-paused timer state.
- [ ] **Step 2: Run tests** and verify failure.
- [ ] **Step 3: Implement the selector** with only question types present in the selected dataset, including reading/reading-expression aliases where appropriate.
- [ ] **Step 4: Implement manual timer controls** without a submission deadline or automatic negative overtime.
- [ ] **Step 5: Reuse the shared workbench header, question navigator, and styling** while keeping practice content initially limited to parsed question records.
- [ ] **Step 6: Run tests and TypeScript check; commit.**

### Task 5: Parse representative question data and answer/analysis feedback

**Files:**
- Create: `scripts/parse-junior-high-paper.mjs`
- Create: `src/lib/junior-high/questions.ts`
- Create: `src/components/junior-high/question-feedback.tsx`
- Modify: `src/components/junior-high/exam-workbench.tsx`
- Test: `src/lib/junior-high/questions.test.ts`

**Interfaces:**
- `getQuestions(examId, questionType?)` returns normalized question records with `questionNumber`, `prompt`, `options`, `answer`, and `analysis`.
- `QuestionFeedback` renders user answer, correct answer, result, and an independently openable analysis box for every question.

- [ ] **Step 1: Write failing parser tests** using one representative original/analysis pair for multiple-choice, reading, and writing sections.
- [ ] **Step 2: Run tests** and verify failure.
- [ ] **Step 3: Implement parser extraction** for headings, question numbers, options, answer keys, and analysis paragraphs; preserve unparsed source references for manual review.
- [ ] **Step 4: Implement feedback** with a closed-by-default analysis box and a right-side close button; show the analysis button for correct and incorrect answers.
- [ ] **Step 5: Connect normalized questions to the workbench** and keep unsupported open-ended scoring clearly marked as manual/self-review rather than inventing an automatic score.
- [ ] **Step 6: Run parser tests, route smoke checks, and TypeScript check; commit.**

### Task 6: Verification and limited rollout

**Files:**
- Modify: `docs/superpowers/specs/2026-08-06-junior-high-english-design.md` only if implementation decisions materially change the approved design.
- Test: `scripts/index-junior-high-exams.test.mjs`, `src/lib/junior-high/questions.test.ts`, route smoke checks.

- [ ] **Step 1: Run `npm run build`** and record any unrelated pre-existing failures separately.
- [ ] **Step 2: Start the stable HTTP dev server** with `npm run dev:http` if available and verify `/junior-high`, selector navigation, mock overtime, practice timer controls, and feedback expansion.
- [ ] **Step 3: Verify representative records** from at least one 2019, 2022, and 2023 paper, including original/analysis pairing and any audio references.
- [ ] **Step 4: Review the generated index for accidental secrets or copied source documents.**
- [ ] **Step 5: Commit only directly related implementation files and report the first supported data slice before expanding coverage.**
