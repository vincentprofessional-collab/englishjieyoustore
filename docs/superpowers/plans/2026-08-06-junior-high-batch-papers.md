# 中考英语 10 套试卷批量接入实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从下载目录筛选 10 套原卷/解析版齐全的中考英语试卷，转换为网站可渲染的数据，接入真题模考选择流程，并验证题目、解析、作文统计与原卷图片不会混入错误内容。

**Architecture:** 页面继续使用现有的通用 `JuniorHighPaperWorkbench`，每套试卷只新增数据 JSON 与图片资源。整理流程抽取 DOCX 段落和表格，按题号生成统一的 `JuniorHighPaper` 结构；版式特殊的表格或图片通过数据字段配置，不复制页面组件。

**Tech Stack:** Next.js 16、React、TypeScript、Python 3、DOCX XML（`zipfile` + `ElementTree`）、Node test runner。

## Global Constraints

- 试卷名称按原文件名语义显示；模拟卷不能称为真题。
- 真题模考进入后自动计时，超时显示负数；提交后提供答案、解析按钮和关闭按钮。
- 作文题必须显示字数统计；阅读/完形原卷存在的图片必须保留。
- 解析内容必须在本题边界内，不能包含下一题或下一节。
- 不修改与本任务无关的已有工作区改动。

---

### Task 1: 建立 10 套候选试卷清单

**Files:**
- Create: `scripts/junior-high-paper-inventory.py`
- Create: `src/lib/junior-high/paper-inventory.json`

**Interfaces:**
- Produces `paper-inventory.json` entries with `year`, `region`, `originalPath`, `analysisPath`, `originalName`, and `analysisName`.

- [ ] **Step 1: Write the failing test**

Add `scripts/junior-high-paper-inventory.test.mjs` that imports the generated inventory and asserts it contains exactly 10 entries, every entry has both source paths, and no two entries share the same `year + region + originalName` key.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test scripts/junior-high-paper-inventory.test.mjs`

Expected: FAIL because the inventory file does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Scan `/Users/shidianjin/Downloads/考试-中考` recursively, pair files containing `原卷版` and `解析版` within the same directory, prefer Beijing/Shanghai/Tianjin/Guangdong/Jiangsu/Zhejiang/Shandong files with year 2023 or 2024, then write the first 10 complete pairs sorted by year descending and region name.

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 scripts/junior-high-paper-inventory.py && node --experimental-strip-types --test scripts/junior-high-paper-inventory.test.mjs`

Expected: PASS with exactly 10 complete paired entries.

- [ ] **Step 5: Commit**

```bash
git add scripts/junior-high-paper-inventory.py scripts/junior-high-paper-inventory.test.mjs src/lib/junior-high/paper-inventory.json
git commit -m "Add junior high paper inventory"
```

### Task 2: Generalize DOCX-to-paper extraction

**Files:**
- Create: `scripts/extract-junior-high-paper.py`
- Modify: `src/lib/junior-high/paper-types.ts`
- Test: `scripts/extract-junior-high-paper.test.mjs`

**Interfaces:**
- `python3 scripts/extract-junior-high-paper.py --original <path> --analysis <path> --slug <slug> --year <year> --region <region> --output <json> --assets <dir>`
- Produces a valid `JuniorHighPaper` JSON with questions, grouped passages, writing tasks, and copied media assets.

- [ ] **Step 1: Write the failing test**

Use a small fixture DOCX pair under `tmp/junior-high-fixtures/` containing one grammar question, one cloze blank, one reading question, one reading-response question, one writing task, and a section heading after the last analysis. Assert extraction returns the expected question numbers and that the last analysis does not contain the next section heading.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test scripts/extract-junior-high-paper.test.mjs`

Expected: FAIL because the generalized extractor does not exist.

- [ ] **Step 3: Write minimal implementation**

Reuse the existing XML paragraph reader, add table cell extraction, pair each answer/explanation block by question number, stop analysis at the next question or Chinese section heading, and copy every PNG/JPEG media file with a stable slug-based public path. Use a small per-layout config map for question ranges rather than branching the React page.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test scripts/extract-junior-high-paper.test.mjs`

Expected: PASS, including the analysis-boundary assertion.

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-junior-high-paper.py src/lib/junior-high/paper-types.ts scripts/extract-junior-high-paper.test.mjs tmp/junior-high-fixtures
git commit -m "Generalize junior high paper extraction"
```

### Task 3: Generate and inspect the 10 paper datasets

**Files:**
- Create: `src/lib/junior-high/<slug>.json` for each inventory entry
- Create: `public/junior-high/<slug>/` for extracted media
- Create: `scripts/junior-high-paper-content.test.mjs`

**Interfaces:**
- Each JSON conforms to `JuniorHighPaper` and has a unique `year`, `region`, `label`, `displayTitle`, and source filename.

- [ ] **Step 1: Write the failing test**

Read all 10 generated JSON files and assert each has at least one question, question numbers are strictly increasing, every question has an answer and analysis, writing has two tasks with word-count-capable text areas, and all referenced image paths exist under `public/`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test scripts/junior-high-paper-content.test.mjs`

Expected: FAIL because the 10 datasets are not generated.

- [ ] **Step 3: Generate the datasets**

Run the generalized extractor once per inventory entry, then inspect each generated JSON for table text, question ranges, source label, and image references. Fix only source-specific config where XML ordering or tables require it.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test scripts/junior-high-paper-content.test.mjs`

Expected: PASS with 10 complete datasets and no missing media.

- [ ] **Step 5: Commit**

```bash
git add src/lib/junior-high public/junior-high scripts/junior-high-paper-content.test.mjs
git commit -m "Add ten junior high paper datasets"
```

### Task 4: Register all 10 papers in the website

**Files:**
- Modify: `src/components/junior-high/junior-high-demo.tsx`
- Create or modify: `src/lib/junior-high/paper-catalog.ts`
- Test: `scripts/junior-high-paper-catalog.test.mjs`

**Interfaces:**
- `getJuniorHighPaper(year, region, label?)` returns the matching `JuniorHighPaper` or `undefined`.
- The mock confirmation flow renders `JuniorHighPaperWorkbench` for every catalog entry.

- [ ] **Step 1: Write the failing test**

Assert all 10 inventory keys resolve through `getJuniorHighPaper` and that the catalog preserves each paper’s `displayTitle`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test scripts/junior-high-paper-catalog.test.mjs`

Expected: FAIL because the catalog helper does not exist.

- [ ] **Step 3: Write minimal implementation**

Create one catalog map of imported JSON datasets and replace year-specific conditionals in `JuniorHighDemo` with a catalog lookup. Preserve the existing fallback sample for years/regions not yet populated.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test scripts/junior-high-paper-catalog.test.mjs`

Expected: PASS for all 10 entries.

- [ ] **Step 5: Commit**

```bash
git add src/components/junior-high/junior-high-demo.tsx src/lib/junior-high/paper-catalog.ts scripts/junior-high-paper-catalog.test.mjs
git commit -m "Register junior high paper catalog"
```

### Task 5: Verify website behavior and publish the batch

**Files:**
- Modify only if verification finds a defect: `src/components/junior-high/`, `src/lib/junior-high/`, `public/junior-high/`

- [ ] **Step 1: Run all automated checks**

Run:

```bash
node --experimental-strip-types --test scripts/site-chrome-nav.test.mjs scripts/junior-high-paper-inventory.test.mjs scripts/extract-junior-high-paper.test.mjs scripts/junior-high-paper-content.test.mjs scripts/junior-high-paper-catalog.test.mjs
npx tsc --noEmit --ignoreDeprecations 6.0
npm run build
```

- [ ] **Step 2: Verify the first and last paper in the browser**

For each selected paper, open `/junior-high`, choose “真题模考”, select its year and region, click “确认”, and verify the title, timer, question navigation, source images, writing word counts, submit state, and analysis close button.

- [ ] **Step 3: Verify no analysis bleed**

Submit the first and last paper, open the final objective question’s analysis, and assert its text does not contain the next section heading or writing prompt.

- [ ] **Step 4: Commit any verification fixes**

```bash
git add src public scripts
git commit -m "Verify junior high paper batch"
```

- [ ] **Step 5: Report the published route and batch list**

Return the `/junior-high` route, the 10 paper titles, test results, and any source-specific limitations that were intentionally left for later review.
