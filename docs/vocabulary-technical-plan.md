# Vocabulary Technical Plan

## Goal

Build a vocabulary product for Chinese English learners with four durable capabilities:

- fast lookup
- word saving
- vocabulary book learning
- review scheduling

The first release should feel like a real dictionary and word-book tool while staying inside the current `Next.js + React + TypeScript + Supabase` stack.

## Current Stack

The current project stack is:

- `Next.js`
- `React`
- `TypeScript`
- `Supabase`
- local browser storage for anonymous or temporary state

Phase 0 should stay inside the existing web app. Do not introduce a separate backend framework, Redis, or a second database layer.

## Product Shape

The vocabulary area has three user-facing surfaces:

1. `查单词`
2. `词汇书` (Phase 1+)
3. `我的收藏`

Phase 0 routes:

- `/vocabulary` - search and word detail hub
- `/vocabulary/[word]` - full word display page
- `/vocabulary/roots/[rootKey]` - root and etymology directory page
- `/me/favorites` - saved words and other saved content

Phase 1+ routes:

- `/vocabulary/books` - vocabulary books and new-word-book entry
- `/admin` - upload and management entry
- `/admin/vocabulary/books` - vocabulary book creation, ordering, inclusion rules, and source mapping

## Phase 0 Scope

Phase 0 is the lookup and word display release. It should include:

- a main search box
- exact and fuzzy lookup
- word detail cards
- a full word display page
- American and British phonetics
- clickable American and British pronunciation
- core definitions and part of speech
- root and formation information when available
- clickable root information
- a root directory page showing words and sibling roots under the same etymology source
- save / unsave word
- saved words immediately appear in the `/me/favorites` word column
- basic source metadata
- links into favorites

Saved words are the data foundation for the future `生词本`. A Phase 0 save action writes to the same `vocabulary_favorites` source that Phase 1's `生词本` will read from. No separate `生词本` UI in Phase 0.

Phase 0 should not include:

- full spaced repetition engine
- adaptive vocabulary test
- daily target configuration
- review queue UI
- vocabulary books page
- vocabulary book entry on the lookup page
- `生词本` as a dedicated view
- complete word book editor
- community example sentences
- social feed
- advanced analytics dashboard

## Data Model

The app already has a local vocabulary loader in `src/lib/vocabulary/local-vocabulary.ts`. That should remain the first source of truth for Phase 0 lookup hints.

### 1. Lookup Record

Use the current flattened hint shape as the lookup baseline:

- `word`
- `phonetic`
- `usPhonetic`
- `ukPhonetic`
- `usAudioUrl`
- `ukAudioUrl`
- `definitionCn`
- `partOfSpeech`
- `root`
- `rootKey`
- `formation`
- `etymologySource`
- `etymologySourceKey`
- `level`

This is enough for search cards and initial learning display.

If dedicated audio URLs are missing in Phase 0, pronunciation buttons can fall back to the browser SpeechSynthesis API. Audio file paths can later be stored in Supabase Storage without changing the UI contract.

Pronunciation buttons should render only when the matching phonetic or audio field exists. If both American and British phonetics are empty, hide the pronunciation area.

Phase 1 audio file naming should use `{word}_{locale}.mp3`, such as `abandon_us.mp3`, stored in Supabase Storage bucket `audio` at path `vocabulary/audio/{word}_{locale}.mp3`.

### 2. Review-Ready Word Record

Even if Phase 0 does not use the fields immediately, the schema should already reserve them:

- `wordLevel` - `记得 | 模糊 | 不记得`
- `memoryStage` - numeric review stage
- `lastReviewedAt`
- `nextReviewAt`
- `bookIds`

These fields are needed so Phase 1 does not require a migration-heavy redesign.

Daily learning targets are not word attributes. Store `dailyNewCount` and `dailyReviewCount` later in user or book settings, such as `user_vocabulary_settings` or `user_book_settings`.

### 3. Saved Word Record

The saved-word item should include at least:

- `id`
- `userId`
- `wordId` - nullable in Phase 0, then backfilled after `vocabulary_words` import
- `normalizedWord`
- `word`
- `phonetic`
- `usPhonetic`
- `ukPhonetic`
- `partOfSpeech`
- `definitionCn`
- `root`
- `rootKey`
- `formation`
- `etymologySource`
- `savedAt`

Saved words serve double duty: they appear in `/me/favorites` now, and Phase 1 will read the same source to populate the pinned `生词本`. Do not maintain a separate duplicate word list for `生词本`.

### 4. Root And Etymology Directory

The backend vocabulary source already contains the root relationship structure in Excel:

- column A is the etymology source
- column B is the root
- the word row belongs to that etymology source and root

This creates a three-level directory:

1. etymology source
2. root under that etymology source
3. words under that root

Rules:

- rows with the same column B root are words under the same root
- rows with different column B roots but the same column A etymology source are sibling roots under the same etymology source
- all words under those sibling roots belong to the same etymology source directory

Recommended normalized fields:

- `etymologySourceKey`
- `etymologySourceLabel`
- `rootKey`
- `rootLabel`
- `word`
- `meaningCn`
- `formation`
- `sourceNote`
- `sourceRowNumber`
- `sortOrder`

Do not manually store `relatedRootKeys` in Phase 0. Sibling roots should be derived by querying roots with the same `etymologySourceKey`.

The route can stay `/vocabulary/roots/[rootKey]` because duplicate root keys across different etymology sources are expected to be extremely rare. During Excel import, validate `rootKey` as globally unique; if a duplicate root maps to a different `etymologySourceKey`, emit an import warning and handle it manually before publishing.

Later Supabase tables can normalize this into `vocabulary_etymologies`, `vocabulary_roots`, and `vocabulary_words`, but Phase 0 can derive the same hierarchy from the current flattened vocabulary data if it preserves etymology source and root.

## Recommended Storage Plan

### Phase 0

Use three layers:

- local JSON / flattened local vocabulary data for lookup hints
- Supabase for saved words when auth exists
- localStorage only as a fallback for anonymous users or temporary state

If localStorage is used before auth is connected, mark it as a known migration debt. On first login, the app should merge anonymous saved words into Supabase.

### Phase 1+

Move durable user data into Supabase:

- user favorites
- vocabulary books
- learning progress
- review logs

If offline-first review becomes important later, add IndexedDB as a client cache. Do not make IndexedDB the primary source of truth in Phase 0.

## `ecdict.csv` Integration

`ecdict.csv` should be treated as the broader dictionary corpus.

### Ingestion Strategy

1. Phase 0 uses the current local vocabulary JSON as the primary search source.
2. Phase 0 does not load the full ECDICT dataset into the frontend.
3. Phase 1 parses `ecdict.csv` in a build-time or server-side import step.
4. Phase 1 stores normalized ECDICT rows in Supabase `vocabulary_words`.
5. Search then queries Supabase for broader fallback results.

### Why This Order

- the current project already has working local lookup code
- `ecdict.csv` is better for breadth, but too large for eager frontend loading
- the flattened JSON is better for predictable Phase 0 UI hints
- importing ECDICT later avoids blocking the first usable dictionary page

### Normalization Rules

Normalize lookup words by:

- lowercasing
- trimming punctuation at both ends
- deduplicating by normalized word

Store the following fields when available:

- word
- phonetic
- part of speech
- Chinese definition
- word frequency or level
- root or etymology source
- formation notes

## Route Design

### `/vocabulary`

This is the main dictionary hub.

Suggested layout:

- hero header with search
- quick stats row
- search results list
- selected word detail panel
- related words / roots panel
- quick action block for favorites

Do not show vocabulary book or `生词本` entry points on the lookup page in Phase 0. Those belong to the future memorization page.

### `/vocabulary/[word]`

This is the full word display page.

Phase 0 layout:

- word title and part of speech
- American phonetic and pronunciation button
- British phonetic and pronunciation button
- Chinese definitions
- root and formation block with clickable root link
- etymology source block
- related roots link
- save / unsave action

### `/vocabulary/roots/[rootKey]`

This is the root and etymology directory page. The page should find the selected root, read its `etymologySourceKey`, and then show the full directory under that etymology source.

Phase 0 layout:

- selected etymology source summary
- selected root summary
- root meaning
- words under the selected root
- sibling roots under the same `etymologySourceKey`
- word groups under sibling roots
- backlink to the originating word when navigated from a word detail page

This page should start as a structured three-level directory page:

1. etymology source
2. roots under that etymology source
3. words under each root

Phase 0 does not implement lazy loading or pagination. If one etymology source contains many roots and words, use a vertically scrollable layout as the fallback.

A visual graph can be added later when the root data is richer.

### `/vocabulary/books` (Phase 1+)

This is the learning entry page, built when the review engine exists.

Layout:

- pinned `生词本` (backed by saved words from Phase 0 favorites)
- built-in vocabulary book list
- word count for each book
- level description for each book
- entry button for each book
- admin-visible link to `/admin/vocabulary/books`

### `/me/favorites`

This is the saved-content hub for Phase 0.

Layout:

- saved words
- saved sentences (Phase 2+)
- saved articles (Phase 2+)

The saved words column is the same data source that Phase 1's pinned `生词本` will read from.

### `/admin/vocabulary/books` (Phase 1+)

This is the future vocabulary book management surface.

Suggested layout:

- create book
- edit book metadata
- edit sort order
- define level filter rules
- map imported word sources into curated books
- toggle active / inactive

## Component Tree

### Vocabulary Hub

- `VocabularyPage`
- `VocabularyHero`
- `VocabularySearchBar`
- `VocabularyStatsStrip`
- `VocabularyResultList`
- `VocabularyWordCard`
- `VocabularyWordDetail`
- `VocabularyRelatedPanel`
- `VocabularyActionBar`

### Word Display Page

- `VocabularyWordPage`
- `WordPronunciationPanel`
- `WordDefinitionList`
- `WordRootPanel`
- `WordEtymologyPanel`
- `WordSaveAction`

### Root Directory Page

- `VocabularyRootPage`
- `RootSummaryPanel`
- `RootWordList`
- `SiblingRootList`
- `EtymologyDirectoryPanel`

### Books Page (Phase 1+)

- `VocabularyBooksPage`
- `PinnedNewWordsBook`
- `VocabularyBookList`
- `VocabularyBookCard`
- `AdminBookManagementLink`

### Favorites Page

- `FavoritesPage`
- `FavoriteWordsColumn`
- `FavoriteSentencesColumn`
- `FavoriteArticlesColumn`

### Delayed Components

Delay these until the review engine and vocabulary books page exist:

- `DailyTargetsPanel`
- `ReviewQueuePanel`
- `PlacementTestEntry`
- `VocabularyBooksPage` and all its children

## Review Labels

Use these three labels consistently across the app:

- `记得`
- `模糊`
- `不记得`

These should replace the older `熟悉 / 一般 / 不熟悉` wording everywhere user-facing.

## Search Behavior

The search experience should support:

- exact word match
- prefix match
- normalized match
- fuzzy fallback

Recommended lookup order:

1. normalized exact match
2. case-insensitive exact match
3. prefix match
4. fuzzy suggestions

Fuzzy matching is based on Levenshtein distance at the frontend. Phase 0 runs matching on the local vocabulary JSON and does not depend on a backend full-text index. Use input debounce and return only the top 20 fuzzy suggestions so local matching stays responsive.

If no exact result exists, the UI should still show:

- spelling hints computed from nearby edit-distance matches
- nearby words
- a save-for-later action

## Vocabulary Book Model

The word book system supports two book families:

- built-in level books
- custom or curated books

### Built-In Level Books

Built-in level books are filters, not physical containers. Do not copy lower-level words into higher-level books.

Suggested categories:

- 小学
- 初中
- 高中
- 四级
- 六级
- 考研
- GRE

Higher-level books include lower-level words by filter rule:

- `初中` includes `小学`
- `高中` includes `小学 + 初中`
- `四级` includes `小学 + 初中 + 高中`
- higher books continue the same inclusion rule

Recommended fields:

- `bookType` - `builtin_level`
- `levelKey`
- `levelRank`
- `includesLowerLevels`

A built-in level book query should use the word level rank. For example, `四级` returns words where `word.levelRank <= book.levelRank` when `includesLowerLevels = true`.

### Custom And Curated Books

Custom and curated books are explicit word lists. Use `vocabulary_book_words` for membership.

Examples:

- user-created custom book
- teacher-created `写作高频100词`
- admin-curated `阅读同义替换词`

Recommended fields:

- `bookType` - `custom | curated`
- `isBuiltin`
- `createdBy`
- `sortOrder`
- `isPinned`
- `isActive`

### Pinned New Words Book (Phase 1+)

`生词本` is a pinned system view over saved words built in Phase 1. The data source is the same `vocabulary_favorites` table that Phase 0 writes to.

Rules:

- saving a word in Phase 0 adds it to the future `生词本` data pool
- unsaving a word removes it
- `生词本` should appear first in `/vocabulary/books`
- `生词本` should not duplicate rows in `vocabulary_book_words`

## Suggested Backend Shape

Supabase should be used for:

- user profiles
- favorite words
- vocabulary books
- import metadata
- review logs
- optional future admin uploads

Suggested tables:

- `vocabulary_etymologies`
- `vocabulary_roots`
- `vocabulary_words`
- `vocabulary_books`
- `vocabulary_book_words`
- `vocabulary_favorites`
- `vocabulary_reviews`
- `vocabulary_import_jobs`

Do not add a separate `admin_vocabulary_book_configs` table. Admin book management should operate on `vocabulary_books` and `vocabulary_book_words`.

First backend milestone:

- one etymology/root import path that preserves Excel column A and column B relationships
- one import validation step that warns if a `rootKey` maps to multiple `etymologySourceKey` values
- one `vocabulary_etymologies` table or derived equivalent
- one `vocabulary_roots` table or derived equivalent
- one `vocabulary_books` table (Phase 1+)
- one `vocabulary_book_words` table (Phase 1+)
- one `vocabulary_favorites` table
- one admin route for book management (Phase 1+)

## Phase 0 Acceptance Criteria

Phase 0 is done when:

- a user can search a word
- a word card shows phonetic, meaning, root, and source
- a user can open a full word display page
- the word page shows American and British phonetics
- pronunciation buttons render only for available pronunciation data and read the word aloud
- the word page hides the pronunciation area when both American and British phonetics are empty
- the word page shows definitions, part of speech, root, formation, and etymology source when available
- clicking a root opens a root relationship page
- the root page shows the selected etymology source, selected root, words under that root, sibling roots, and sibling-root word groups using the Excel column A / column B hierarchy
- large root directory pages remain usable through vertical scrolling
- the user can save and unsave words
- saved words appear in `/me/favorites`
- `/me/favorites` shows saved words in its words column
- the user can jump to `收藏夹`
- the app still runs on the current Next.js stack
- no extra backend framework is introduced

## Phase 0 Implementation Order

1. Replace the `/vocabulary` placeholder with a real hub page.
2. Reuse the current local vocabulary loader as the initial lookup source.
3. Add `/vocabulary/[word]` with phonetics, pronunciation, definitions, root, formation, and source.
4. Add root links from the word page.
5. Add `/vocabulary/roots/[rootKey]` with a structured etymology source -> root -> word directory view based on Excel column A and column B.
6. Add word card actions for save and unsave.
7. Store favorites in Supabase when auth exists, with localStorage only as a temporary fallback.

## What To Delay

Delay these until after Phase 0:

- full spaced repetition scheduling
- adaptive vocabulary test
- daily target controls
- review queue panels
- vocabulary books page (`/vocabulary/books`)
- `ecdict.csv` import pipeline and Supabase dictionary fallback
- `生词本` as a dedicated UI view
- `/admin/vocabulary/books` management routes
- vocabulary book builder and editor
- audio recording and pronunciation scoring
- social sharing flows
- word-image poster generation
- community example moderation
- full interactive root graph visualization
- lazy loading or pagination for root directory pages
- heavy analytics

## Notes For Future Development

- The current app already has a listening module using local vocabulary hints. That reuse path should stay intact.
- The vocabulary pages should share the same overall visual language as the rest of the app, but the interaction model should be more utility-oriented than the other learning modules.
- Keep the data model flexible enough to support dictionary lookup, saved words, built-in level filters, explicit custom books, and review scheduling from the same word identity.
- Phase 0 save/unsave actions write to the same `vocabulary_favorites` table that Phase 1 will read for the `生词本` view. No migration needed — the Phase 1 `生词本` is a new UI surface over existing data.
