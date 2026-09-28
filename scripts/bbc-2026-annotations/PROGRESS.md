# BBC 2026 phrase annotation checkpoints

Rules: `/Users/shidianjin/Desktop/词性句法标注_聊天记录_2026-09-24.md` and `/Users/shidianjin/Desktop/词性句法标注工具/build.py` (R1–R21). Write contiguous source phrases, review meaning first, then run `build.py.verify`. Never reuse unreviewed processor syntax spans.

## Current checkpoint — 2026-09-25

- Completed this pass: `260119.json` — 21/21; `260126.json` — 16/16; `260202.json` — 19/19; `260209.json` — 20/20; `260216.json` — 19/19; `260223.json` — 19/19; `260302.json` — 26/26; `260309.json` — 21/21; `260316.json` — 19/19; `260323.json` — 16/16; `260330.json` — 22/22; `260406.json` — finished its 2 remaining sentences; `260413.json`; `260420.json`; `260427.json`; `260504.json`; `260511.json`; `260525.json`; `260601.json`; `260608.json` — 19/19; `260615.json` — 23/23; `260622.json` — 21/21; `260629.json` — 25/25; `260713.json` — 24/24; `260720.json` — 19/19. Every sentence was manually reviewed and passed the desktop verifier.
- Corpus totals: 600 reviewed, 0 remaining draft/POS-only sentences (out of 600).
- Existing manually reviewed samples and all unrelated dirty preview-worktree changes are preserved. No deployment was performed.
- Annotation pass complete.

Each article file is the phrase-text source checkpoint; `src/data/bbc/2026-syntax.json` is updated only after all entries in that article pass the desktop verifier.
