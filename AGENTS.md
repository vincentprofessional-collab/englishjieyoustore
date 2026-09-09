# Production release scope

- Start every task in an independent worktree based on the current `origin/main`. Do not develop or release from the shared dirty checkout.
- A page-specific task may modify and stage only files required by that page. Preserve all unrelated product areas and user changes.
- Before every production release, fetch `origin/main`, confirm the release commit contains it, and run `npm run build`. Never bypass a failing prebuild or regression gate.
- Publish the exact reviewed commit through `main`. Do not run `vercel --prod` from an old temporary directory, detached snapshot, stale branch, or a worktree containing unrelated changes.

## Protected BBC article product

- Only a BBC-scoped task may modify `src/app/articles`, `src/components/bbc-*`, `src/data/bbc`, `src/lib/articles/bbc*`, `src/lib/bbc-*`, or `scripts/bbc-*`.
- Every production release, including IELTS, SAT, senior-high, and vocabulary releases, must retain and pass the BBC prebuild baseline in `package.json`.
- The baseline must retain all 29 BBC 2026 articles, bilingual text, vocabulary, article audio wiring, sentence practice, source quizzes, and stable-ID access control. A failure blocks deployment until the BBC baseline is restored from current `main`.
