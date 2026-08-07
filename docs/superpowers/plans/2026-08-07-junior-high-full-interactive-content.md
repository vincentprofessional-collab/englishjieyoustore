# 中考英语全内容交互化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 30 套区域中考英语试卷中可识别的选择、填空、对话、信息卡、配对阅读和写作内容全部转换为可交互题卡，移除重复 Word 原文渲染，同时保留必要文章、图片、表格和音频。

**Architecture:** 扩展现有 Python DOCX 提取器，在同一数据流中识别显式题号、下划线/空格占位符和表格占位符，建立每套试卷的 `displayBlocks` 和完整 `questions`；React 页面只渲染 `displayBlocks` 与题卡，旧 JSON 使用运行时兼容过滤。通过数据级测试、页面源测试和全量 JSON 检查保证批量导入不会回归。

**Tech Stack:** Python 3、DOCX XML、Next.js/React/TypeScript、Node `node:test`、TypeScript compiler、Next production build。

## Global Constraints

- 不修改 IELTS 页面、导航栏、后台或听力资源。
- 不修改北京 2023/2024 专用页面的既有版式和交互逻辑。
- 不删除原卷图片、表格、音频资源或文件名/解析文件名元数据。
- 所有数据生成必须从 `/Users/shidianjin/Downloads/考试-中考` 的原卷/解析版重新生成，不手工编辑 30 个 JSON 的题目内容。
- 保留现有计时、提交、逐题解析、全屏、批注、高亮和写作字数统计功能。

---

### Task 1: 先建立题型解析和展示层的失败测试

**Files:**
- Modify: `scripts/extract-junior-high-paper.test.mjs`
- Modify: `scripts/junior-high-paper-structure.test.mjs`
- Create: `scripts/junior-high-display-blocks.test.mjs`

**Interfaces:**
- Tests will exercise exported or subprocess-visible extractor behavior through the existing Python script and generated JSON shape.
- Expected JSON fields: `questions[].inputKind`, `questions[].sourceBlockIds`, `sections[].displayBlocks`.

- [ ] **Step 1: Add parser regression fixtures**

Add assertions for these real source forms: `___36___` table placeholders, dialogue trailing `61`, spaced initial blank `w   76`, and inline cloze blank `____21____`. Assert each produces a numbered question with `inputKind: "blank"` or `inputKind: "choice"` and a stable source block id.

- [ ] **Step 2: Add display-block assertions**

Assert generated sections expose `displayBlocks`, hide paragraph blocks that belong to a question source span, retain image/table blocks, and omit cover/instruction-only sections’ ordinary paragraphs.

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
node --test scripts/extract-junior-high-paper.test.mjs scripts/junior-high-paper-structure.test.mjs scripts/junior-high-display-blocks.test.mjs
```

Expected: the new assertions fail because the extractor does not yet recognize these placeholder forms or emit `displayBlocks`.

---

### Task 2: Extend DOCX question parsing for every supported interactive form

**Files:**
- Modify: `scripts/extract-junior-high-paper.py`
- Modify: `scripts/extract-junior-high-paper.test.mjs`

**Interfaces:**
- `parse_questions(blocks, sections, slug)` continues to return question dictionaries consumed by answer/analysis mapping.
- New helper functions may be private, but each question must retain `number`, `prompt`, `options`, `inputKind`, `sectionId`, `groupId`, and `sourceBlockIds`.

- [ ] **Step 1: Add placeholder marker parsing**

Recognize numbered blanks in these forms without treating ordinary years or dates as questions:

```text
___36___
____21____
w   76
...        61
```

Use the section’s declared question range/count and local blank context to constrain matches. Preserve explicit numbered-line parsing for normal multiple-choice questions.

- [ ] **Step 2: Parse table rows as independent interactive questions**

Extract every numbered placeholder from table cells, create one question per number, and keep the table block available as supporting content. For matching tables, use `inputKind: "choice"` when answer options are present; otherwise use `blank` or `text`.

- [ ] **Step 3: Parse embedded dialogue and cloze questions**

When a paragraph contains several numbered blanks, split it into question prompts while retaining the surrounding dialogue/passage text as a passage block. Do not create duplicate questions for a marker already emitted from an explicit numbered line.

- [ ] **Step 4: Add writing-task question metadata**

Keep writing prompts in `writingTasks`, but assign a stable task id and preserve any detected prompt image/table. Writing remains an interactive textarea and is included in completion counts.

- [ ] **Step 5: Run focused parser tests and verify GREEN**

Run the focused test command from Task 1. Expected: PASS.

---

### Task 3: Generate sanitized display blocks and update the React renderer

**Files:**
- Modify: `scripts/extract-junior-high-paper.py`
- Modify: `src/lib/junior-high/paper-types.ts`
- Modify: `src/components/junior-high/beijing-paper-workbench.tsx`
- Modify: `scripts/junior-high-render-model.test.mjs`
- Create or modify: `src/lib/junior-high/display-blocks.ts` only if the runtime compatibility filter needs a focused module.

**Interfaces:**
- `JuniorHighSection` gains optional `displayBlocks?: JuniorHighBlock[]`.
- `StructuredPaperContent` consumes `section.displayBlocks ?? getCompatibleDisplayBlocks(section, paper.questions)`.
- Existing `renderStructuredBlock` remains responsible for paragraph/image/audio/table presentation.

- [ ] **Step 1: Implement display-block classification**

After question parsing, mark the span from each question’s source block through the block before the next question source as question-source content. Hide those paragraphs, hide section headings/instructions/cover text, retain passage paragraphs outside question spans, and always retain images/tables/audio. Omit ordinary paragraphs in sections with no interactive questions unless they belong to a writing task.

- [ ] **Step 2: Add old-JSON runtime fallback**

Implement the same deterministic filter for existing JSON files without `displayBlocks`, so the page does not regress while the batch data is regenerated.

- [ ] **Step 3: Render only sanitized blocks**

Replace direct `section.blocks.map(...)` rendering with `displayBlocks` selection. Keep question cards, audio list, writing inputs, navigation, submission, timer, analysis, fullscreen, annotation, and highlight wiring unchanged.

- [ ] **Step 4: Update render-model tests**

Assert that structured rendering references `displayBlocks`/compatibility filtering, still supports tables and images, and does not render `paper.sourceText` or the raw full block list.

- [ ] **Step 5: Run render/model tests and TypeScript check**

Run:

```bash
node --test scripts/junior-high-render-model.test.mjs
npx tsc --noEmit --ignoreDeprecations 6.0
```

Expected: PASS.

---

### Task 4: Rebuild all regional papers and verify complete interaction coverage

**Files:**
- Regenerate: `src/lib/junior-high/*.json` for the 30 inventory entries
- Regenerate/update: `public/junior-high/<slug>/` only through the existing extractor output
- Modify: `scripts/junior-high-paper-inventory.test.mjs` if coverage assertions need strengthening
- Create or modify: `scripts/junior-high-interactive-coverage.test.mjs`

**Interfaces:**
- Inventory remains the source of truth for year/region/path mapping.
- Every generated paper must have `layout: "structured"`, at least one interactive question or writing task, and no question-source paragraph in `displayBlocks`.

- [ ] **Step 1: Run the batch extractor**

Run:

```bash
python3 scripts/build-junior-high-batch.py
```

Expected: 30 papers regenerated with stable slugs and existing assets preserved.

- [ ] **Step 2: Add and run coverage checks**

For each inventory paper, assert: all parsed question numbers are unique, each question has an input kind, every question has an answer slot even when the answer is open text, display blocks contain no question-source paragraphs, and images/tables/audio counts are not reduced.

- [ ] **Step 3: Review unparsed source markers**

Run a report that lists source sections with no question ids and marker-like numbers/placeholders. Resolve every reported interactive marker by improving the parser or explicitly representing it as a writing task; do not leave interactive source material as raw Word text.

- [ ] **Step 4: Run the full targeted test suite**

Run:

```bash
node --test scripts/junior-high-*.test.mjs scripts/test-speaking-model-answers.mjs
npx tsc --noEmit --ignoreDeprecations 6.0
npm run build
```

Expected: all targeted tests, TypeScript, and production build pass; `/junior-high` remains in the build output.

- [ ] **Step 5: Commit only scoped changes**

Stage extractor, renderer, tests, generated junior-high JSON/assets, and plan/spec documentation. Do not stage pre-existing unrelated changes in `package.json`, `scripts/listening-align/`, `tmp/`, or other listening files.
