# Production release scope

- Use one designated worktree for the whole release cycle. Continue all in-scope development and local verification in that worktree until the version is deployed; do not create or merge per-task worktrees during the cycle unless the user explicitly asks.
- After a version is successfully deployed, create one fresh worktree from the exact deployed release commit for the next cycle. Keep all subsequent changes in that new worktree until its version is deployed.
- Keep each request's edits scoped to the files it requires and preserve existing uncommitted changes. At release, combine all explicitly in-scope work from the cycle, but do not automatically stage unrelated edits.
- Before every production release, fetch `origin/main`, confirm the release commit contains it, and run `npm run build`. Never bypass a failing prebuild or regression gate.
- Publish the exact reviewed commit through `main`. Do not run `vercel --prod` from an old temporary directory, detached snapshot, stale branch, or a worktree containing unrelated changes.

## Protected BBC article product

- Only a BBC-scoped task may modify `src/app/articles`, `src/components/bbc-*`, `src/data/bbc`, `src/lib/articles/bbc*`, `src/lib/bbc-*`, or `scripts/bbc-*`.
- Every production release, including IELTS, SAT, senior-high, and vocabulary releases, must retain and pass the BBC prebuild baseline in `package.json`.
- The baseline must retain all 29 BBC 2026 articles, bilingual text, vocabulary, article audio wiring, sentence practice, source quizzes, and stable-ID access control. A failure blocks deployment until the BBC baseline is restored from current `main`.

## BBC intensive-reading syntax markup

- Use solid lines for level 1 components, dashed lines for level 2, and wavy lines only for level 3 or deeper syntax nesting. Do not use wavy underlines to mark vocabulary or phrases in intensive reading.
- A nested component belongs in the next level under its actual parent. Render deeper levels above their parent line; for example, a level 2 postmodifier inside an appositive uses a dashed line above the appositive.
- Keep each nested span fully inside its parent span. Do not duplicate a nested component as a separate level 1 component.
