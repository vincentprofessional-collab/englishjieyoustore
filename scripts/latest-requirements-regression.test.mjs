import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [siteNav, articlesPage, articlesHome, newConceptLesson, vocabularyLearning, vocabularyLearningLib, globalCss, adminAnalytics, membershipSalesRoute, adminMembership, analyticsSql, popularPagesSql, progressProvider, favoritesPage, writingTerm, annotationTools, bbcDetail, listeningPractice] = await Promise.all([
  readFile(new URL("../src/components/site-nav.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/articles/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/articles-home.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/new-concept-lesson-page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/vocabulary-learning.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/vocabulary/learning.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../src/components/admin-analytics-panel.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/api/admin/membership-sales/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/components/admin-membership-overview.tsx", import.meta.url), "utf8"),
  readFile(new URL("../supabase/030_admin_analytics_dashboard.sql", import.meta.url), "utf8"),
  readFile(new URL("../supabase/032_admin_popular_pages.sql", import.meta.url), "utf8"),
  readFile(new URL("../src/components/account-progress-provider.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/me/favorites/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/writing-vocabulary-term.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/study-annotation-tools.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/bbc-article-detail-page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/listening-practice.tsx", import.meta.url), "utf8"),
]);

test("top navigation opens section pages instead of hover dropdowns", () => {
  assert.match(siteNav, /href=\{firstEnabledHref\(item\)\}/);
  assert.match(siteNav, /pathname === "\/" \|\| pathname === "\/me"/);
  assert.match(siteNav, /site-header-mobile-visible/);
  assert.match(globalCss, /\.site-header\.site-header-mobile-visible\s*\{\s*display:\s*block !important;/);
  assert.match(globalCss, /\.site-header\.site-header-mobile-visible \.brand-copy strong\s*\{\s*font-size:\s*clamp\(26px, 8vw, 30px\) !important;/);
  assert.doesNotMatch(siteNav, /onMouseEnter|onMouseLeave|nav-dropdown/);
});

test("BBC archive defaults to 2026 and renders the selected year article list", () => {
  assert.match(articlesPage, /BBC_DEFAULT_YEAR/);
  assert.match(articlesPage, /right\.id\.localeCompare\(left\.id\)/);
  assert.match(articlesHome, /className="bbc-selected-year"/);
  assert.match(articlesHome, /yearGroups\.find\(\(group\) => group\.year === selectedYear\)/);
  assert.match(articlesHome, /for \(const article of activeGroup\?\.articles \?\? \[\]\)/);
  assert.match(articlesHome, /\[\.\.\.monthGroups\]\.map\(\(\[month, articles\]\) =>/);
  assert.match(articlesHome, /article\.guestFree/);
  assert.match(articlesHome, /choice-dot read/);
  assert.match(articlesHome, /choice-dot selected/);
  assert.match(articlesHome, /articles\.map\(\(article\) => renderArticleCard\(article\)\)/);
  assert.match(articlesPage, /guestFree: isFreeBbc2015ArticleUnlocked\(article\.id\)/);
  assert.match(globalCss, /\.bbc-article-select \.choice-dot\.read\s*\{\s*background:\s*#d1483f;\s*border-color:\s*#d1483f;/);
  assert.match(globalCss, /\.home-style-lab \.home-announcement-panel \.home-hero-copy h1\s*\{[^}]*font-size:\s*clamp\(18px, 2vw, 24px\) !important;/);
});

test("New Concept original copy remains plain and the mobile navigation stays on one row", () => {
  assert.match(newConceptLesson, /function renderNewConceptArticleEnglish\(\s*text: string,/);
  assert.match(newConceptLesson, /renderNewConceptArticleEnglish\(text, \[\], pronunciations\)/);
  assert.match(newConceptLesson, /className="bbc-settings-rate"[\s\S]*?variant="rate-only"/);
  assert.match(bbcDetail, /\{!isMobileAudioViewport \? <>[\s\S]*?variant="subtitle-only"[\s\S]*?<\/> : null\}\s*<AudioSettingsMenus[\s\S]*?className="bbc-settings-rate"[\s\S]*?variant="rate-only"/);
  assert.match(globalCss, /\.nav-main\s*\{[\s\S]*?flex-wrap:\s*nowrap;[\s\S]*?overflow-x:\s*auto;/);
  assert.match(globalCss, /\.nav-actions\s*\{[\s\S]*?flex-wrap:\s*nowrap;/);
});

test("vocabulary books accumulate lower levels without auto-classifying scored rounds", () => {
  assert.match(vocabularyLearningLib, /entryRank > 0 && entryRank <= selectedRank/);
  assert.match(vocabularyLearning, /commitOutcome\(requestedOutcome, \{/);
  assert.doesNotMatch(vocabularyLearning, /if \(!currentWord \|\| modeIndex !== 3[\s\S]*?commitOutcome\("familiar"/);
  assert.match(vocabularyLearning, /setOralScoreFeedback\(score\);[\s\S]*?setPhase\("awaiting"\);/);
});

test("admin analytics loads only the top 20 pages on manual refresh", () => {
  assert.match(adminAnalytics, /supabase\.rpc\("get_admin_popular_pages"/);
  assert.match(adminAnalytics, /p_limit:\s*20/);
  assert.match(adminAnalytics, /loadInFlight\.current/);
  assert.match(adminAnalytics, /onClick=\{\(\) => void refresh\(\)\}/);
  assert.match(adminAnalytics, /document\.visibilityState === "hidden"/);
  assert.doesNotMatch(adminAnalytics, /setInterval|Promise\.all\(offsets\.map/);
  assert.match(popularPagesSql, /if not public\.is_admin\(\) then/);
  assert.match(popularPagesSql, /event\.event_type = 'page_view'/);
  assert.match(popularPagesSql, /limit least\(greatest\(coalesce\(p_limit, 20\), 1\), 20\)/);
});

test("membership sales uses a short shared cache and capped detail pages without a schema migration", () => {
  assert.match(membershipSalesRoute, /unstable_cache/);
  assert.match(membershipSalesRoute, /buildMembershipSalesReport/);
  assert.match(membershipSalesRoute, /readAll/);
  assert.match(membershipSalesRoute, /report\.members\.slice\(offset, offset \+ limit\)/);
  assert.match(membershipSalesRoute, /role\.data\?\.role !== "admin"/);
  assert.doesNotMatch(membershipSalesRoute, /\.rpc\(/);
  assert.match(adminMembership, /offset=\$\{offset\}&limit=20/);
});

test("every existing vocabulary-favorite writer notifies account sync", () => {
  assert.match(progressProvider, /addEventListener\(FAVORITE_WORDS_CHANGED_EVENT, favoriteChanged\)/);
  assert.match(favoritesPage, /key === FAVORITE_WORDS_STORAGE_KEY[\s\S]*?dispatchEvent\(new Event\(FAVORITE_WORDS_CHANGED_EVENT\)\)/);
  for (const writer of [writingTerm, annotationTools, bbcDetail]) {
    assert.match(writer, /key === FAVORITE_WORDS_STORAGE_KEY[\s\S]*?dispatchEvent\(new Event\(FAVORITE_WORDS_CHANGED_EVENT\)\)/);
  }
  assert.match(listeningPractice, /dispatchEvent\(new Event\(FAVORITE_WORDS_CHANGED_EVENT\)\)/);
});
