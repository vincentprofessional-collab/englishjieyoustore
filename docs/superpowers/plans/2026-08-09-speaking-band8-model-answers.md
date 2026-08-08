# IELTS Speaking Band 8 Model Answers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Subagent-driven execution is intentionally not used in this session because the active thread instruction forbids proactive subagents.

**Goal:** Add a Band 8 model-answer layer to IELTS Speaking detail pages, starting with Part 1 questions 001-010, while keeping the existing Band 7 answers and reserving visible space for future Band 9 answers.

**Architecture:** Extend the existing `SpeakingModelAnswer` data shape with optional Band 8 fields, then render answer variants in a responsive three-column comparison grid. The current `answer`/`answerTranslation`/`vocabulary` fields remain the Band 7 source of truth; Band 8 content is additive and page generation still depends on the existing entries.

**Tech Stack:** Next.js App Router, TypeScript data module, CSS Modules, Node test runner, static generation.

## Global Constraints

- Do not overwrite existing Band 7 answers.
- Add Band 8 answers only for Part 1 questions 001-010 in the first batch.
- Keep Band 8 English idiomatic and non-Chinglish: accurate collocations, natural spoken rhythm, and clear IELTS Speaking logic.
- Use `/Users/shidianjin/Desktop/BBC 2015-2025总.docx` as a topic-expression reference, but do not copy BBC article prose.
- Desktop layout must put Band 7 and Band 8 on the same row and reserve a third column for future Band 9 content.
- Mobile layout may stack the columns vertically.
- Keep changes limited to the speaking detail page, speaking model-answer data, targeted tests, and this plan.

---

### Task 1: Add Band 8 data contract and coverage test

**Files:**
- Modify: `src/data/ielts/speaking-model-answers.ts`
- Modify: `scripts/test-speaking-model-answers.mjs`

**Interfaces:**
- Produces optional fields on `SpeakingModelAnswer`:
  - `band8Answer?: string[]`
  - `band8AnswerTranslation?: string[]`
  - `band8Vocabulary?: SpeakingVocabulary[]`

- [ ] **Step 1: Write failing test**
  - Extend `scripts/test-speaking-model-answers.mjs` with `requiredBand8QuestionIds` for `speaking-part-1-001` through `speaking-part-1-010`.
  - Assert each has at least two substantial English paragraphs, a substantial Chinese translation, and at least five Band 8 vocabulary items.

- [ ] **Step 2: Run test to verify it fails**
  - Run: `node --test scripts/test-speaking-model-answers.mjs`
  - Expected: FAIL because `band8Answer`, `band8AnswerTranslation`, and `band8Vocabulary` are missing.

- [ ] **Step 3: Add type fields and Part 1 001-010 Band 8 content**
  - Add optional fields to the `SpeakingModelAnswer` type.
  - Add Band 8 content to Part 1 entries 001-010.

- [ ] **Step 4: Run test to verify it passes**
  - Run: `node --test scripts/test-speaking-model-answers.mjs`
  - Expected: PASS.

### Task 2: Render Band 7 / Band 8 / Band 9 comparison layout

**Files:**
- Modify: `src/app/speaking/[part]/[questionId]/page.tsx`
- Modify: `src/app/speaking/[part]/[questionId]/speaking-model-answer.module.css`
- Modify: `scripts/test-speaking-detail-page-output.mjs`

**Interfaces:**
- Consumes optional Band 8 fields from `SpeakingModelAnswer`.
- Produces visible labels:
  - `7 分范文`
  - `8 分范文`
  - `9 分范文`

- [ ] **Step 1: Write failing render test**
  - Assert rendered source contains the three comparison labels and the Band 9 placeholder text.

- [ ] **Step 2: Run test to verify it fails**
  - Run: `node --test scripts/test-speaking-detail-page-output.mjs`
  - Expected: FAIL because the comparison grid does not exist yet.

- [ ] **Step 3: Implement comparison grid**
  - Replace the single answer display with a three-column answer grid.
  - Put Band 7 answer/translation/audio in the first column.
  - Put Band 8 answer/translation/vocabulary in the second column when present.
  - Put a subdued Band 9 placeholder in the third column.

- [ ] **Step 4: Run test to verify it passes**
  - Run: `node --test scripts/test-speaking-detail-page-output.mjs`
  - Expected: PASS.

### Task 3: Final verification and deployment

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run full targeted tests**
  - Run: `node --test scripts/test-speaking-model-answers.mjs scripts/test-speaking-detail-page-output.mjs`
  - Expected: PASS.

- [ ] **Step 2: Run whitespace check**
  - Run: `git diff --check -- src/data/ielts/speaking-model-answers.ts src/app/speaking/[part]/[questionId]/page.tsx src/app/speaking/[part]/[questionId]/speaking-model-answer.module.css scripts/test-speaking-model-answers.mjs scripts/test-speaking-detail-page-output.mjs docs/superpowers/plans/2026-08-09-speaking-band8-model-answers.md`
  - Expected: no output.

- [ ] **Step 3: Run production build**
  - Run: `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy npm run build`
  - Expected: build succeeds.

- [ ] **Step 4: Commit and push**
  - Commit message: `Add Band 8 speaking answers for part 1 first batch`
  - Push branch to `origin main`.

- [ ] **Step 5: Verify deployment**
  - Wait for Vercel status on the pushed commit to become `success`.
  - Verify the first 10 Part 1 pages return 200 and contain a Band 8 keyword from the new answer.
