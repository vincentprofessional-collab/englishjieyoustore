# 中考英语试卷版式修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 30 套批量中考英语试卷从扁平通用文本重建为保留原卷顺序的结构化试卷，同时复用北京卷的完整交互能力。

**Architecture:** 用 Python 提取器把 DOCX 的段落、表格、图片和音频转换为有序文档块，并按 section/question group 生成稳定题目数据；React 工作台根据结构化 section/block/question 渲染，不再使用固定北京题号范围或完整原文 `<pre>` 复制。北京卷保留现有字段和布局，批量试卷新增结构化字段并逐步兼容旧字段。

**Tech Stack:** Next.js 16, React, TypeScript, Python 3, DOCX XML, Node test runner, `soffice` WMF 转 PNG。

## Global Constraints

- 保留 `/Users/shidianjin/Downloads/考试-中考` 下的原始 DOCX、解析 DOCX 和音频，不覆盖源文件。
- 不改变已确认的导航、后台、雅思口语 Part 1/3 和北京卷最终布局。
- 地区原卷的部分顺序、题号显示和题型保持原样；交互能力统一但评分规则不强行统一。
- 任何试卷不得继续使用通用写作占位文案或跨题解析兜底文本。
- 每个任务必须先写失败测试、确认失败，再实现最小代码并运行对应验证。

---

### Task 1: 扩展结构化试卷类型并建立失败契约测试

**Files:**
- Modify: `src/lib/junior-high/paper-types.ts`
- Create: `scripts/junior-high-paper-structure.test.mjs`
- Modify: `scripts/junior-high-paper-content.test.mjs`

**Interfaces:**
- `JuniorHighPaper.sections: JuniorHighSection[]`
- `JuniorHighSection = { id: string; title: string; instructions: string[]; blocks: JuniorHighBlock[]; questionIds: string[] }`
- `JuniorHighBlock = { id: string; kind: "paragraph" | "table" | "image" | "audio"; text?: string; rows?: string[][]; src?: string; alt?: string }`
- `JuniorHighQuestion` adds `sectionId`, `groupId`, `displayNumber`, `inputKind` (`choice | blank | text | writing`), while `number` remains the numeric display number for compatibility.
- `JuniorHighWritingTask = { id: string; label: string; prompt: string; requirements: string; opening?: string; closing?: string; table?: string[][]; image?: string; wordMin?: number; wordMax?: number }`
- `JuniorHighPaper.writingTasks: JuniorHighWritingTask[]` and `JuniorHighPaper.sourceBlocks?: JuniorHighBlock[]`.

- [ ] **Step 1: Write failing tests for structured output**

Add tests that load one 2024 paper and assert `sections.length > 1`, each section has ordered blocks, each question has a unique ID plus `sectionId/groupId/inputKind`, and writing tasks contain real prompt text rather than the generic placeholder.

- [ ] **Step 2: Run the tests to verify the contract fails**

Run: `node --test scripts/junior-high-paper-structure.test.mjs scripts/junior-high-paper-content.test.mjs`

Expected: FAIL because existing generated JSON has no `sections`, all questions use `type: "generic"`, and `writing.promptB` is the placeholder.

- [ ] **Step 3: Add the TypeScript interfaces without changing rendering**

Extend `paper-types.ts` with the exact interfaces above and make the new fields optional so existing Beijing JSON remains type-safe during the migration.

- [ ] **Step 4: Run typecheck and confirm only data assertions remain failing**

Run: `npx tsc --noEmit --ignoreDeprecations 6.0`

Expected: PASS for TypeScript; the structure test remains RED until the extractor is rebuilt.

- [ ] **Step 5: Commit the type contract**

```bash
git add src/lib/junior-high/paper-types.ts scripts/junior-high-paper-structure.test.mjs scripts/junior-high-paper-content.test.mjs
git commit -m "test: define structured junior high paper contract"
```

### Task 2: Preserve DOCX block order and convert source media

**Files:**
- Modify: `scripts/extract-junior-high-paper.py`
- Create: `scripts/junior-high-docx-blocks.test.mjs`
- Modify: `scripts/build-junior-high-batch.py`

**Interfaces:**
- Python `read_docx_blocks(path: Path) -> list[dict]` returns ordered dictionaries with `kind`, `text`/`rows`, and source media relationship IDs.
- Python `extract_media(original: Path, assets_dir: Path, slug: str) -> dict[str, str]` returns source relationship ID to public URL mappings.
- The generated paper stores the ordered blocks in `sections[].blocks` and keeps `sourceText` only as a backward-compatible plain-text summary.

- [ ] **Step 1: Add failing order/media tests**

Invoke the extractor for Tianjin 2024 and Jiangsu 2023. Assert that a table block appears between paragraph blocks instead of only at the end, that image blocks have `src`, and that every WMF source has a converted PNG URL.

- [ ] **Step 2: Run the tests and verify current extractor fails**

Run: `node --test scripts/junior-high-docx-blocks.test.mjs`

Expected: FAIL because current output has no ordered blocks and ignores WMF files.

- [ ] **Step 3: Implement ordered XML block reading**

Read `word/document.xml` body children in order. For each paragraph collect text and drawing relationship IDs; for each table collect rows/cells as a two-dimensional array. Do not read all tables in a second pass.

- [ ] **Step 4: Implement relationship-aware media extraction**

Use `word/_rels/document.xml.rels` and `word/media/*` to map drawing relationship IDs. Copy PNG/JPEG/WebP assets directly. For WMF, create a temporary file and call the configured `soffice --headless --convert-to png` command, then copy the PNG beside the other paper assets. Keep the original source filename in block metadata.

- [ ] **Step 5: Run the order/media tests to verify GREEN**

Run: `node --test scripts/junior-high-docx-blocks.test.mjs`

Expected: PASS with at least one ordered table/image block and no unsupported WMF source left for the tested papers.

- [ ] **Step 6: Commit the ordered block extractor**

```bash
git add scripts/extract-junior-high-paper.py scripts/build-junior-high-batch.py scripts/junior-high-docx-blocks.test.mjs
git commit -m "feat: preserve junior high docx block order"
```

### Task 3: Parse sections, question groups, answers and analyses with context

**Files:**
- Modify: `scripts/extract-junior-high-paper.py`
- Create: `scripts/junior-high-question-parser.test.mjs`
- Modify: `scripts/extract-junior-high-paper.test.mjs`

**Interfaces:**
- Python `detect_sections(blocks) -> list[dict]` creates stable section IDs and titles from Chinese, Roman-numeral and letter headings.
- Python `parse_questions(blocks, sections) -> list[dict]` assigns `sectionId`, `groupId`, unique `id`, `displayNumber`, `inputKind`, prompt, options and source block IDs.
- Python `answer_map(lines, questions) -> dict[str, str]` supports A-D, multi-letter, T/F, words, phrases and numbered blank answers without assuming every answer is one letter.
- Python `analysis_map(lines, questions) -> dict[str, str]` stops at the next question/answer marker and never includes the next question or next section.

- [ ] **Step 1: Write failing parser tests for known broken sets**

Cover these real cases: Tianjin 2024 instruction line `2. 本卷共五大题` must not become a question; Guangdong 2023 restarted/section numbering must create unique IDs; Anhui 2024 word-fill answers must be retained; Shanghai 2022 true/false and multi-blank answers must be retained; a question analysis must not contain the next question prompt.

- [ ] **Step 2: Run parser tests and verify RED**

Run: `node --test scripts/junior-high-question-parser.test.mjs`

Expected: FAIL on the current global number regex, A-D-only answer parser, and exact-marker analysis parser.

- [ ] **Step 3: Implement section-aware question parsing**

Track the active section while walking ordered blocks, ignore instruction paragraphs containing `本卷共`, `本试卷共`, `注意事项`, `答题卡`, `考试时间` and similar markers, and use section/group context to decide whether a number starts a question. Generate IDs from slug + section + sequence, while keeping the original display number.

- [ ] **Step 4: Implement flexible answer and analysis mapping**

Normalize full-width punctuation, parse numbered answer sequences and answer groups, map sequential answers when the source omits numbers, and slice analysis content between the current question marker and the next question/section marker. Mark genuinely open questions as `manual` instead of using a generic fallback paragraph.

- [ ] **Step 5: Run parser tests and the existing extractor test**

Run: `node --test scripts/junior-high-question-parser.test.mjs scripts/extract-junior-high-paper.test.mjs`

Expected: PASS with unique IDs, no instruction pseudo-question, non-letter answers preserved and analysis boundaries isolated.

- [ ] **Step 6: Commit the contextual parser**

```bash
git add scripts/extract-junior-high-paper.py scripts/junior-high-question-parser.test.mjs scripts/extract-junior-high-paper.test.mjs
git commit -m "feat: parse junior high questions by section"
```

### Task 4: Rebuild 30 generated papers and add data quality gates

**Files:**
- Modify: `scripts/build-junior-high-batch.py`
- Modify: `src/lib/junior-high/paper-inventory.json`
- Modify: `src/lib/junior-high/*.json` for the 30 inventory papers
- Add/modify: `public/junior-high/**` converted and ordered assets
- Modify: `scripts/junior-high-paper-content.test.mjs`

- [ ] **Step 1: Add failing inventory quality assertions**

Assert for every inventory paper: section count is at least two, question IDs are unique, no question has `type: "generic"`, all writing tasks have non-placeholder prompts, no analysis uses the generic fallback, and every referenced block asset exists.

- [ ] **Step 2: Run the quality test and verify the current batch fails**

Run: `node --test scripts/junior-high-paper-content.test.mjs`

Expected: FAIL for every current generic paper.

- [ ] **Step 3: Rebuild all 30 inventory papers with the new extractor**

Run: `python3 scripts/build-junior-high-batch.py`. The script must preserve the inventory source paths and regenerate only the generated JSON/assets for the inventory entries; Beijing JSON files remain untouched.

- [ ] **Step 4: Add explicit template metadata to each generated paper**

Set `layout: "structured"`, persist detected section titles, source block order, writing tasks and question groups, and keep `displayTitle`, original/analysis filenames and audio metadata unchanged.

- [ ] **Step 5: Run the quality gate and inspect representative papers**

Run: `node --test scripts/junior-high-paper-content.test.mjs scripts/junior-high-paper-inventory.test.mjs scripts/junior-high-paper-catalog.test.mjs`

Inspect generated JSON for Tianjin, Shanghai, Guangdong, Sichuan Chengdu and Jiangsu; expected: no placeholder writing task, no unsupported media URL, and sections/blocks in source order.

- [ ] **Step 6: Commit regenerated data and assets**

```bash
git add scripts src/lib/junior-high/paper-inventory.json src/lib/junior-high public/junior-high
git commit -m "feat: rebuild junior high papers as structured documents"
```

### Task 5: Render structured sections without Beijing-only assumptions

**Files:**
- Modify: `src/components/junior-high/beijing-paper-workbench.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/lib/junior-high/paper-types.ts`
- Create: `scripts/junior-high-render-model.test.mjs`

**Interfaces:**
- `QuestionNavigation` renders unique question IDs and shows `displayNumber` plus section label where display numbers restart.
- `StructuredPaperContent` renders `paper.sections` in order, preserving paragraph/table/image/audio blocks and placing the question group beside/below its source block.
- `PaperQuestionCard` selects input control from `question.inputKind`, not option count alone; its analysis panel reads only that question's `analysis`.
- Beijing papers continue through their existing custom branch; structured papers use the new branch.

- [ ] **Step 1: Add failing render-model tests**

Assert that the structured branch renders section titles in source order, renders tables and images inside their section, does not render a duplicate full-source `<pre>`, and navigation keys use question IDs rather than numeric question numbers.

- [ ] **Step 2: Run the render tests and verify RED**

Run: `node --test scripts/junior-high-render-model.test.mjs`

Expected: FAIL because `GenericPaperContent` currently renders a full-source `<pre>` and uses fixed Beijing ranges.

- [ ] **Step 3: Implement structured section/block rendering**

Render paragraph blocks, table blocks, image blocks and audio blocks in order. Render each group’s questions adjacent to its source material, using existing two-column passage styles where appropriate and a single-column stack for listening/fill/translation sections.

- [ ] **Step 4: Remove fixed section classification from generic questions**

Replace `questionSection(question)` and the `13–20/21–33/34–37` assumptions with section metadata. Keep the existing Beijing branch unchanged except for shared toolbar/navigation APIs.

- [ ] **Step 5: Add structured block/table/media styles and verify render model**

Add only the styles needed for ordered blocks, tables, inline images, section headers and responsive layouts. Run the render-model test and `npx tsc --noEmit --ignoreDeprecations 6.0`.

- [ ] **Step 6: Commit the structured renderer**

```bash
git add src/components/junior-high/beijing-paper-workbench.tsx src/app/globals.css src/lib/junior-high/paper-types.ts scripts/junior-high-render-model.test.mjs
git commit -m "feat: render regional junior high paper sections"
```

### Task 6: Correct selection fallbacks and writing interaction

**Files:**
- Modify: `src/components/junior-high/junior-high-demo.tsx`
- Modify: `src/lib/junior-high/sample-data.ts`
- Create: `scripts/junior-high-selection.test.mjs`

- [ ] **Step 1: Write failing selection tests**

Assert that unavailable year/region combinations are disabled or show an explicit “暂无该套试卷” state rather than opening a sample paper, and that practice mode does not silently present a generic one-question sample when a real structured paper is selected.

- [ ] **Step 2: Run selection tests and verify RED**

Run: `node --test scripts/junior-high-selection.test.mjs`

Expected: FAIL because the current selector offers 2019–2021 with no catalog data and falls back to `JUNIOR_HIGH_SAMPLES`.

- [ ] **Step 3: Implement data-backed availability**

Derive selectable years/regions from the catalog plus the two Beijing papers. Disable unavailable combinations and render a clear no-paper state; retain the existing practice samples only when the user explicitly chooses a practice type without a paper.

- [ ] **Step 4: Verify writing word count and submit behavior**

Ensure every structured writing task uses the real prompt, shows live English word count, preserves opening/closing text, and is marked manual-review after submission.

- [ ] **Step 5: Run selection tests and typecheck**

Run: `node --test scripts/junior-high-selection.test.mjs && npx tsc --noEmit --ignoreDeprecations 6.0`

- [ ] **Step 6: Commit selection and writing behavior**

```bash
git add src/components/junior-high/junior-high-demo.tsx src/lib/junior-high/sample-data.ts scripts/junior-high-selection.test.mjs
git commit -m "fix: gate junior high selection by available papers"
```

### Task 7: Full verification, visual checks and publishing

**Files:**
- No new production files; verify all changed files and generated data.

- [ ] **Step 1: Run the complete targeted test suite**

Run:

```bash
node --experimental-strip-types --test scripts/site-chrome-nav.test.mjs scripts/speaking-navigation.test.mjs scripts/junior-high-paper-inventory.test.mjs scripts/junior-high-paper-catalog.test.mjs scripts/junior-high-paper-content.test.mjs scripts/extract-junior-high-paper.test.mjs scripts/junior-high-docx-blocks.test.mjs scripts/junior-high-question-parser.test.mjs scripts/junior-high-render-model.test.mjs scripts/junior-high-selection.test.mjs scripts/test-speaking-model-answers.mjs
```

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run typecheck, build and route smoke checks**

Run `npx tsc --noEmit --ignoreDeprecations 6.0`, `npm run build`, and curl checks for `/`, `/speaking`, `/speaking/part-1`, `/speaking/part-3`, `/junior-high`, and `/admin`.

- [ ] **Step 3: Visually inspect one paper per structural family**

Inspect Beijing 2024, Tianjin 2024, Shanghai 2022, Guangdong 2023, Sichuan Chengdu 2024 and Jiangsu 2024. Confirm section order, image/table placement, question navigation, answer/analysis isolation, timer, full-screen, annotation controls and writing word count.

- [ ] **Step 4: Run final diff checks and publish**

Run `git diff --check`, verify no generated source DOCX or secrets are staged, check `git status`, then push the final commits to `origin/main` so the connected deployment can build the same version.

