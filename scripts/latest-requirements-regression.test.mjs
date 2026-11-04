import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [siteNav, articlesPage, articlesHome, newConceptLesson, vocabularyLearning, vocabularyLearningLib, globalCss, adminAnalytics, membershipSalesRoute, adminMembership, analyticsSql, popularPagesSql, dashboardSnapshotSql, progressProvider, favoritesPage, writingTerm, annotationTools, bbcDetail, listeningPractice, accessAdmin, accessPaywall, typographySql, satNavigation, satHome, satKnowledge, satPastPapers] = await Promise.all([
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
  readFile(new URL("../supabase/033_admin_daily_visitors.sql", import.meta.url), "utf8"),
  readFile(new URL("../src/components/account-progress-provider.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/me/favorites/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/writing-vocabulary-term.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/study-annotation-tools.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/bbc-article-detail-page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/listening-practice.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/admin-entitlement-manager.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/project-access-paywall.tsx", import.meta.url), "utf8"),
  readFile(new URL("../supabase/039_access_project_typography.sql", import.meta.url), "utf8"),
  readFile(new URL("../src/components/sat/sat-section-navigation.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/sat/sat-home.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/sat/sat-knowledge.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/sat/sat-past-paper-library.tsx", import.meta.url), "utf8"),
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
  assert.match(articlesPage, /guestFree: isFreeBbc2015ArticleUnlocked\(\)/);
  assert.match(globalCss, /\.bbc-article-select \.choice-dot\.read\s*\{[^}]*background:\s*transparent;[^}]*border-color:\s*#8a58c7;/);
  assert.match(globalCss, /\.bbc-article-select \.choice-dot\.read::after\s*\{[^}]*content:\s*"♥";[^}]*left:\s*50%;[^}]*top:\s*50%;[^}]*transform:\s*translate\(-50%, -50%\);/);
  assert.match(globalCss, /\.home-style-lab \.home-announcement-panel \.home-hero-copy h1\s*\{[^}]*font-size:\s*clamp\(18px, 2vw, 24px\) !important;/);
});

test("BBC article title keeps its original neutral styling and IPA cards get more reading space", () => {
  assert.match(globalCss, /\.bbc-article-hero h1\s*\{[^}]*font-family:\s*Georgia,[^}]*font-size:\s*clamp\(28px, 3\.5vw, 38px\)/);
  assert.match(globalCss, /body \.bbc-article-hero \.bbc-article-title-card\s*\{\s*background:\s*transparent;\s*color:\s*#1d1d1b;\s*display:\s*contents;/);
  assert.doesNotMatch(globalCss, /body \.bbc-article-hero \.bbc-article-title-card\s*\{[^}]*background:\s*#172b4d/);
  assert.match(bbcDetail, /const hasPronunciation = Boolean\(parsedVocabulary\.ukPhonetic \|\| parsedVocabulary\.usPhonetic\)/);
  assert.match(bbcDetail, /bbc-vocabulary-item\$\{hasPronunciation \? " has-phonetics" : ""\}/);
  assert.match(globalCss, /\.bbc-vocabulary-item\.has-phonetics \.bbc-vocabulary-phonetics\s*\{[^}]*font-size:\s*16px;[^}]*line-height:\s*1\.8;/);
  assert.match(bbcDetail, /bbc-original-copy\$\{audioSettings\.pronunciationMode === "uk" \|\| audioSettings\.pronunciationMode === "us" \? " with-phonetics"/);
  assert.match(globalCss, /\.bbc-original-copy\.with-phonetics p\[lang="en"\]\s*\{[^}]*line-height:\s*1\.9;/);
  assert.match(globalCss, /\.article-word-pronunciation\s*\{[^}]*font-size:\s*0\.62em;[^}]*line-height:\s*1\.1;[^}]*left:\s*50%;[^}]*position:\s*absolute;[^}]*top:\s*-0\.38em;/);
  assert.match(globalCss, /\.bbc-original-copy\.with-phonetics p\[lang="en"\]\s*\{\s*line-height:\s*2\.2 !important;/);
});

test("paid project admin saves names and typography and paywall uses the saved settings", () => {
  assert.match(accessAdmin, /_title_font_family:\s*draft\.titleFontFamily/);
  assert.match(accessAdmin, /_title_font_size:\s*draft\.titleFontSize/);
  assert.match(accessAdmin, /_description_font_family:\s*draft\.descriptionFontFamily/);
  assert.match(accessAdmin, /_description_font_size:\s*draft\.descriptionFontSize/);
  assert.match(accessAdmin, /admin_upsert_access_project_with_typography/);
  assert.match(accessPaywall, /titleFontFamily: row\.title_font_family/);
  assert.match(accessPaywall, /fontSize: `\$\{project\.titleFontSize \?\? 36\}px`/);
  assert.match(accessPaywall, /descriptionFontFamily: row\.description_font_family/);
  assert.match(typographySql, /public\.is_admin\(\)/);
  assert.match(typographySql, /title_font_size between 18 and 72/);
  assert.match(typographySql, /description_font_size between 12 and 40/);
  assert.match(typographySql, /grant execute on function public\.admin_upsert_access_project_with_typography/);
});

test("study book and group selectors share equal one-line cards and keep both adjustable timers", () => {
  assert.match(vocabularyLearning, /<span>选择词汇<\/span>[\s\S]*?选择词汇表/);
  assert.match(vocabularyLearning, /<span>选择组别<\/span>[\s\S]*?选择词汇组/);
  assert.match(vocabularyLearning, /data-timing-setting="reactionSeconds"/);
  assert.match(vocabularyLearning, /data-timing-setting="detailSeconds"/);
  assert.match(globalCss, /\.vocabulary-learning-settings-selectors > :is\(\.vocabulary-learning-settings-book-select, \.vocabulary-learning-settings-group-select\)\s*\{[^}]*background: linear-gradient\(115deg, #f2f7ff 0%, #e1edff 100%\)[^}]*min-height: 72px !important/);
  assert.match(globalCss, /\.vocabulary-learning-settings-selectors > :is\(\.vocabulary-learning-settings-book-select, \.vocabulary-learning-settings-group-select\) \{ gap: 5px; min-height: 62px !important; padding: 7px !important; \}/);
});

test("SAT pages keep the route definitions without repeating the top section tabs", () => {
  for (const [href, label] of [["/sat", "题型训练"], ["/sat/knowledge", "知识点"], ["/sat/past-papers", "历年真题"]]) {
    assert.ok(satNavigation.includes(`href: "${href}"`));
    assert.ok(satNavigation.includes(`label: "${label}"`));
  }
  assert.doesNotMatch(satHome, /SatSectionNavigation/);
  assert.doesNotMatch(satKnowledge, /SatSectionNavigation|topicSource/);
  assert.doesNotMatch(satPastPapers, /SatSectionNavigation/);
  assert.match(satHome, /className=\{styles\.practiceSetAction\}/);
  assert.match(satKnowledge, /className=\{styles\.topicAction\}/);
  assert.match(satNavigation, /aria-current=\{section\.id === current \? "page" : undefined\}/);
});

test("New Concept original copy remains plain and the mobile navigation stays on one row", () => {
  assert.match(newConceptLesson, /function renderNewConceptArticleEnglish\(\s*text: string,/);
  assert.match(newConceptLesson, /renderNewConceptArticleEnglish\(text, \[\], pronunciations\)/);
  assert.match(newConceptLesson, /className="bbc-settings-rate"[\s\S]*?variant="rate-only"/);
  assert.match(bbcDetail, /\{!isMobileAudioViewport \? <>[\s\S]*?variant="subtitle-only"[\s\S]*?<\/> : null\}\s*<AudioSettingsMenus[\s\S]*?className="bbc-settings-rate"[\s\S]*?variant="rate-only"/);
  assert.match(globalCss, /\.nav-main\s*\{[\s\S]*?flex-wrap:\s*nowrap;[\s\S]*?overflow-x:\s*auto;/);
  assert.match(globalCss, /\.nav-actions\s*\{[\s\S]*?flex-wrap:\s*nowrap;/);
});

test("vocabulary books follow explicit workbook memberships without auto-classifying scored rounds", () => {
  assert.match(vocabularyLearningLib, /entry\.studyBookMemberships\s*\? entry\.studyBookMemberships\.includes\(book\)/);
  assert.match(vocabularyLearning, /commitOutcome\(requestedOutcome, \{/);
  assert.doesNotMatch(vocabularyLearning, /if \(!currentWord \|\| modeIndex !== 3[\s\S]*?commitOutcome\("familiar"/);
  assert.match(vocabularyLearning, /setOralScoreFeedback\(score\);[\s\S]*?setPhase\("awaiting"\);/);
});

test("admin analytics loads today's visitor counts and top 20 pages in one manual refresh", () => {
  assert.match(adminAnalytics, /supabase\.rpc\("get_admin_dashboard_with_lifetime"/);
  assert.match(adminAnalytics, /p_days:\s*1/);
  assert.match(adminAnalytics, /近 7 天热门页面 Top 20/);
  assert.match(adminAnalytics, /loadInFlight\.current/);
  assert.match(adminAnalytics, /onClick=\{\(\) => void refresh\(\)\}/);
  assert.match(adminAnalytics, /document\.visibilityState === "hidden"/);
  assert.doesNotMatch(adminAnalytics, /setInterval|Promise\.all\(offsets\.map/);
  assert.match(popularPagesSql, /if not public\.is_admin\(\) then/);
  assert.match(popularPagesSql, /event\.event_type = 'page_view'/);
  assert.match(popularPagesSql, /limit least\(greatest\(coalesce\(p_limit, 20\), 1\), 20\)/);
  assert.match(dashboardSnapshotSql, /'registered_visitors'/);
  assert.match(dashboardSnapshotSql, /'returning_anonymous_visitors'/);
  assert.match(dashboardSnapshotSql, /'registrations'/);
  assert.match(dashboardSnapshotSql, /now\(\) - interval '7 days'/);
  assert.match(dashboardSnapshotSql, /limit 20/);
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
