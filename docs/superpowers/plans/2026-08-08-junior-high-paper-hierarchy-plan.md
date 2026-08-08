# 中考英语试卷层级与交互版式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 30 套地区中考英语试卷统一转换为“部分 → 小节/题型组 → 题目”的可交互结构，并清除重复说明、空白图片和集中式音频。

**Architecture:** Python 提取器继续保留有序 DOCX blocks 和兼容性的 `sections`，同时生成规范化 `parts[].groups[]`；题目通过 `partId/groupId` 绑定原文、音频、图片和解析。React 工作台优先渲染规范化层级，北京专用版保持独立分支。填空题使用原文内嵌输入，选择题和开放题继续使用各自控件。

**Tech Stack:** Next.js 16, React, TypeScript, Python 3, DOCX XML, Pillow, Node test runner, `soffice` media conversion.

## Global Constraints

- 不修改 `/Users/shidianjin/Downloads/考试-中考` 中的原始 DOCX、解析 DOCX 和音频。
- 保留现有导航、后台、雅思口语 Part 1/3、北京 2023/2024 专用版布局。
- 保留每套原卷的题号、题型名称、原文、答案和解析，不以跨地区模板替换原内容。
- 小节说明只能显示在小节标题下方一次；题目卡片只显示题号。
- 所有新行为先写失败测试并确认失败，再写最小实现。

### Task 1: 扩展层级数据类型并建立 RED 测试

**Files:**
- Modify: `src/lib/junior-high/paper-types.ts`
- Create: `scripts/junior-high-paper-hierarchy.test.mjs`
- Modify: `scripts/junior-high-paper-structure.test.mjs`

**Interfaces:**

```ts
type JuniorHighQuestionGroup = {
  id: string;
  marker?: string;
  title: string;
  instructions: string[];
  blocks: JuniorHighBlock[];
  displayBlocks?: JuniorHighBlock[];
  questionIds: string[];
  audio?: string[];
  inputMode?: "choice" | "inline-blank" | "text";
};

type JuniorHighPart = {
  id: string;
  marker?: string;
  title: string;
  instructions: string[];
  groups: JuniorHighQuestionGroup[];
};
```

- [ ] **Step 1: Add failing assertions.** Assert representative generated papers expose `parts`, every part has ordered groups, each group has unique question IDs, and an instruction like `第一节……共5小题` is not a question prompt.
- [ ] **Step 2: Run RED.** Run `node --test scripts/junior-high-paper-hierarchy.test.mjs scripts/junior-high-paper-structure.test.mjs`; expect failure because existing JSON has no canonical `parts`.
- [ ] **Step 3: Add optional TypeScript fields.** Add `JuniorHighPart`, `JuniorHighQuestionGroup`, `JuniorHighPaper.parts?`, and `JuniorHighQuestion.partId?` without changing existing Beijing fields.
- [ ] **Step 4: Run typecheck.** Run `npx tsc --noEmit --ignoreDeprecations 6.0`; expect typecheck to pass while hierarchy assertions remain RED.
- [ ] **Step 5: Commit the contract.** `git add src/lib/junior-high/paper-types.ts scripts/junior-high-paper-hierarchy.test.mjs scripts/junior-high-paper-structure.test.mjs && git commit -m "test: define junior high hierarchy contract"`

### Task 2: Detect parts and groups from varied regional headings

**Files:**
- Modify: `scripts/extract-junior-high-paper.py`
- Modify: `scripts/junior-high-paper-hierarchy.test.mjs`
- Modify: `scripts/extract-junior-high-paper.test.mjs`

**Interfaces:**
- `_heading_kind(text) -> tuple[str, str] | None` returns `("part", marker)` or `("group", marker)` for Chinese, Roman, Arabic, lettered and English headings.
- `detect_hierarchy(blocks) -> list[dict]` returns parts with groups, ordered blocks, titles, instructions and temporary source block IDs.
- `build_parts(hierarchy, questions, source_blocks, audio_paths) -> list[dict]` returns JSON-ready `parts` and group `questionIds`.

- [ ] **Step 1: Add RED fixtures.** Cover Tianjin (`第一部分/第一节`), Xinjiang (`第一部分/II/III/IV`), Guangdong (`一、/A/B`), Guangxi (`一、/（一）`), and a paper with `Part I`/`第Ⅰ卷` headings. Assert part/group order and marker preservation.
- [ ] **Step 2: Run the fixtures.** Run `node --test scripts/junior-high-paper-hierarchy.test.mjs`; expect failure because the extractor currently emits only flat sections.
- [ ] **Step 3: Implement heading classification.** Recognize explicit part markers first, then group markers; when no part exists, promote the outermost题型 heading to a part. Keep original title text and collect short instruction paragraphs under the current group.
- [ ] **Step 4: Separate source blocks.** Assign each paragraph/table/image to exactly one group. Do not treat an instruction-only block as a question, and preserve blocks between groups in source order.
- [ ] **Step 5: Attach questions.** Generate `partId`, `groupId`, stable IDs and `displayNumber`; ensure group `questionIds` match the original order even when display numbers restart.
- [ ] **Step 6: Run parser tests.** Run `node --test scripts/junior-high-paper-hierarchy.test.mjs scripts/extract-junior-high-paper.test.mjs`; expect PASS for all heading variants and no duplicated instruction question.
- [ ] **Step 7: Commit the hierarchy parser.** `git add scripts/extract-junior-high-paper.py scripts/junior-high-paper-hierarchy.test.mjs scripts/extract-junior-high-paper.test.mjs && git commit -m "feat: parse junior high paper hierarchy"`

### Task 3: Preserve passages and filter unusable media

**Files:**
- Modify: `scripts/extract-junior-high-paper.py`
- Create: `scripts/junior-high-paper-resources.test.mjs`
- Modify: `scripts/junior-high-paper-content.test.mjs`

- [ ] **Step 1: Add RED resource tests.** Assert a pure-white 794×1123 PNG is not included in `displayBlocks`, meaningful images remain, and a group retains its paragraph text when an adjacent image is filtered.
- [ ] **Step 2: Run RED.** Run `node --test scripts/junior-high-paper-resources.test.mjs`; expect failure because current extraction keeps blank images and can hide neighboring passage text.
- [ ] **Step 3: Implement `_is_meaningful_image(path)`.** Use Pillow to reject fully transparent or near-white images with no meaningful pixel variance, while preserving diagrams, tables, illustrations and image text.
- [ ] **Step 4: Repair display-block filtering.** `build_display_blocks` must remove only rejected image blocks and duplicate instruction paragraphs; it must never remove a passage paragraph merely because it follows an image or question source block.
- [ ] **Step 5: Strip audio placeholder text.** Remove `【此处可播放相关音频，请去附件查看】` and equivalent attachment-only markers from displayed text while retaining the real audio asset.
- [ ] **Step 6: Run resource/content tests.** Run `node --test scripts/junior-high-paper-resources.test.mjs scripts/junior-high-paper-content.test.mjs`; expect meaningful source text and assets to pass all checks.
- [ ] **Step 7: Commit resource handling.** `git add scripts/extract-junior-high-paper.py scripts/junior-high-paper-resources.test.mjs scripts/junior-high-paper-content.test.mjs && git commit -m "fix: preserve passages and remove blank junior high images"`

### Task 4: Bind audio to listening groups

**Files:**
- Modify: `scripts/extract-junior-high-paper.py`
- Modify: `scripts/junior-high-paper-hierarchy.test.mjs`
- Modify: `src/lib/junior-high/paper-types.ts`

- [ ] **Step 1: Add RED audio assertions.** For Tianjin and Xinjiang, assert audio URLs appear on listening groups and are absent from the canonical top-level render list; papers without audio keep groups unchanged.
- [ ] **Step 2: Run RED.** Run `node --test scripts/junior-high-paper-hierarchy.test.mjs`; expect failure because audio currently exists only in `paper.assets.audio`.
- [ ] **Step 3: Implement group audio assignment.** Attach tracks to the nearest listening group; if exact per-question mapping is unavailable, attach once to that group in source order. Keep `assets.audio` only as a source manifest for compatibility.
- [ ] **Step 4: Run tests.** Re-run hierarchy/resource tests and verify no audio is duplicated at the top of the rendered structured paper.
- [ ] **Step 5: Commit audio binding.** `git add scripts/extract-junior-high-paper.py scripts/junior-high-paper-hierarchy.test.mjs src/lib/junior-high/paper-types.ts && git commit -m "feat: bind junior high audio to question groups"`

### Task 5: Regenerate the 30 imported regional papers

**Files:**
- Modify: `scripts/build-junior-high-batch.py`
- Modify: `src/lib/junior-high/*.json` for the 30 inventory entries
- Modify: `public/junior-high/**` generated regional assets only
- Modify: `scripts/junior-high-paper-content.test.mjs`

- [ ] **Step 1: Strengthen the inventory quality gate.** For every inventory item, assert `parts.length > 0`, each group has a title or marker, question IDs are unique, source blocks are non-empty where questions exist, and no generic writing placeholder remains.
- [ ] **Step 2: Run the gate before rebuild.** Run `node --test scripts/junior-high-paper-content.test.mjs`; expect failure on the current generated data.
- [ ] **Step 3: Rebuild from source DOCX.** Run `python3 scripts/build-junior-high-batch.py`; update only the 30 inventory JSONs/assets and preserve Beijing fixtures.
- [ ] **Step 4: Inspect representative JSON.** Check Tianjin, Xinjiang, Guangdong, Guangxi and Shanghai for part/group order, short passage text, audio location, and no blank display image.
- [ ] **Step 5: Run the quality gate.** Run `node --test scripts/junior-high-paper-content.test.mjs scripts/junior-high-paper-inventory.test.mjs scripts/junior-high-paper-catalog.test.mjs`; expect PASS for all 30 entries.
- [ ] **Step 6: Commit generated data.** `git add scripts/build-junior-high-batch.py src/lib/junior-high public/junior-high scripts/junior-high-paper-content.test.mjs && git commit -m "feat: regenerate junior high papers with hierarchy"`

### Task 6: Render parts, groups, audio and clean question cards

**Files:**
- Modify: `src/components/junior-high/beijing-paper-workbench.tsx`
- Modify: `src/app/globals.css`
- Modify: `scripts/junior-high-render-model.test.mjs`

- [ ] **Step 1: Add RED render assertions.** Assert the structured branch renders `parts` and `groups` in order, renders group audio beside its source, and does not include `sectionTitle` in the question heading.
- [ ] **Step 2: Run RED.** Run `node --test scripts/junior-high-render-model.test.mjs`; expect failure because the current renderer is section-based and still emits the repeated right-side label.
- [ ] **Step 3: Implement the structured renderer.** Add `StructuredPart`, `StructuredQuestionGroup` and group-local source rendering. Render paragraph/table/meaningful-image blocks followed by group questions; keep Beijing custom ranges in its existing branch.
- [ ] **Step 4: Clean `PaperQuestionCard`.** Make the heading contain only `第 {displayNumber} 题`; move group instructions to the group header and strip audio attachment placeholders from prompt text.
- [ ] **Step 5: Add typography.** Set part title 24px, group title 18px, instructions 14px, passage 16–17px, question/options 15–16px. Preserve the existing Word-like image caps.
- [ ] **Step 6: Run render tests/typecheck.** Run `node --test scripts/junior-high-render-model.test.mjs scripts/junior-high-image-sizing.test.mjs && npx tsc --noEmit --ignoreDeprecations 6.0`.
- [ ] **Step 7: Commit renderer changes.** `git add src/components/junior-high/beijing-paper-workbench.tsx src/app/globals.css scripts/junior-high-render-model.test.mjs && git commit -m "fix: render junior high hierarchy without duplicate instructions"`

### Task 7: Implement inline fill-in-the-blank interaction

**Files:**
- Modify: `src/components/junior-high/beijing-paper-workbench.tsx`
- Modify: `src/lib/junior-high/paper-types.ts`
- Modify: `src/app/globals.css`
- Create: `scripts/junior-high-inline-fill.test.mjs`

- [ ] **Step 1: Add RED interaction-model tests.** Assert a fill group produces one input per numbered blank, input values are keyed by question ID, and the old large textarea is not used for `inline-blank` questions.
- [ ] **Step 2: Run RED.** Run `node --test scripts/junior-high-inline-fill.test.mjs`; expect failure because all blank questions currently render a textarea below the prompt.
- [ ] **Step 3: Implement blank token rendering.** Parse `36`, `____36____`, `w 76`, `p_________` and equivalent full-width forms into stable blank tokens; render controlled inputs at the original blank position with `aria-label` containing the question number.
- [ ] **Step 4: Implement submit feedback.** On submit, preserve the inline input, show correct answer and the per-question analysis button adjacent to that blank, and keep open-ended reading/writing textareas unchanged.
- [ ] **Step 5: Run inline-fill tests and typecheck.** Run `node --test scripts/junior-high-inline-fill.test.mjs && npx tsc --noEmit --ignoreDeprecations 6.0`.
- [ ] **Step 6: Commit inline fill behavior.** `git add src/components/junior-high/beijing-paper-workbench.tsx src/lib/junior-high/paper-types.ts src/app/globals.css scripts/junior-high-inline-fill.test.mjs && git commit -m "feat: add inline junior high fill inputs"`

### Task 8: Full regression verification and publishing

**Files:**
- No new production files; verify all changed files and generated data.

- [ ] **Step 1: Run targeted tests.**
  ```bash
  node --test scripts/junior-high-paper-hierarchy.test.mjs scripts/junior-high-paper-resources.test.mjs scripts/junior-high-inline-fill.test.mjs scripts/junior-high-render-model.test.mjs scripts/junior-high-paper-content.test.mjs scripts/junior-high-paper-structure.test.mjs scripts/junior-high-paper-inventory.test.mjs scripts/junior-high-paper-catalog.test.mjs scripts/junior-high-selection.test.mjs scripts/junior-high-image-sizing.test.mjs
  ```
- [ ] **Step 2: Run project checks.** Run `npx tsc --noEmit --ignoreDeprecations 6.0`, `git diff --check`, and `npm run build`; expected result is a successful build with the `/junior-high` route generated.
- [ ] **Step 3: Perform visual smoke checks.** Open Tianjin 2024, Xinjiang 2022 and Guangdong 2023; verify part/group font hierarchy, no duplicate red-box text, short passage presence, group-local audio, inline blanks, bounded images and stable question navigation.
- [ ] **Step 4: Confirm unchanged surfaces.** Check Beijing 2024, navigation, admin route and speaking Part 1/3 routes remain available.
- [ ] **Step 5: Commit and push only the task files.** Preserve unrelated existing changes (`.gitignore`, `package.json`, `next-env.d.ts`, listening scripts and `tmp/`); then run `git push origin main` and confirm `HEAD == origin/main`.
