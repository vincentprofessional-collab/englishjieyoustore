import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { GlobalStudyInteractions } from "@/components/global-study-interactions";
import { GlobalVocabularySearch } from "@/components/global-vocabulary-search";
import { IeltsSectionShell } from "@/components/ielts-section-shell";
import { LearningProgressConsentPrompt } from "@/components/learning-progress-consent-prompt";
import { SiteAnalyticsTracker } from "@/components/site-analytics-tracker";
import { SiteFooter } from "@/components/site-footer";
import { MobileBottomNav, SiteNav } from "@/components/site-nav";
import { CommunityInboxProvider } from "@/components/community-inbox-provider";
import { AccountProgressProvider } from "@/components/account-progress-provider";
import { getCachedPublishedSiteChromeConfig } from "@/lib/content/site-chrome-server";
import { DEFAULT_SITE_CHROME_CONFIG, mergeSiteChromeConfig, type SiteChromeConfig } from "@/lib/content/site-chrome";
import { DEFAULT_COURSE_DIRECTORY, type CourseDirectory } from "@/lib/courses/course-directory";
import { getCachedPublishedCourseDirectory } from "@/lib/courses/course-directory-server";
import { getLegacySessionMigrationScript } from "@/lib/supabase/legacy-session-migration";
import "./globals.css";
import "./ielts-section-shell.css";

export const metadata: Metadata = {
  title: "英文解忧杂货铺",
  description: "雅思听说读写与英语专项训练平台",
};

const fallbackChrome = mergeSiteChromeConfig(DEFAULT_SITE_CHROME_CONFIG);

function navigationConfig(config: SiteChromeConfig) {
  return process.env.VOCABULARY_VIDEO_PREVIEW === "true"
    ? { ...config, brand: { ...config.brand, imageUrl: "" } }
    : config;
}

async function PublishedNavigation({ config }: { config: Promise<SiteChromeConfig> }) {
  return <SiteNav config={navigationConfig(await config)} />;
}

async function PublishedPageFrame({ children, config, courseDirectory }: { children: React.ReactNode; config: Promise<SiteChromeConfig>; courseDirectory: Promise<CourseDirectory> }) {
  const siteChromeConfig = await config;
  const publishedCourseDirectory = await courseDirectory;
  return <>
    <IeltsSectionShell courseDirectory={publishedCourseDirectory} siteChromeConfig={siteChromeConfig}>{children}</IeltsSectionShell>
    <SiteFooter config={siteChromeConfig} />
  </>;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteChromeConfig = getCachedPublishedSiteChromeConfig();
  const courseDirectory = getCachedPublishedCourseDirectory();
  const legacySessionMigrationScript = getLegacySessionMigrationScript(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );

  return (
    <html lang="zh-CN">
      <head>
        {legacySessionMigrationScript ? (
          <Script id="legacy-session-migration" strategy="beforeInteractive">
            {legacySessionMigrationScript}
          </Script>
        ) : null}
      </head>
      <body>
        <CommunityInboxProvider>
        <AccountProgressProvider>
        <main className="shell">
          <Suspense fallback={<SiteNav config={navigationConfig(fallbackChrome)} />}>
            <PublishedNavigation config={siteChromeConfig} />
          </Suspense>
          <LearningProgressConsentPrompt />
          <MobileBottomNav />
          <Suspense fallback={null}>
            <GlobalVocabularySearch />
          </Suspense>
          <Suspense fallback={null}>
            <SiteAnalyticsTracker />
          </Suspense>
          <GlobalStudyInteractions />
          <Suspense fallback={<IeltsSectionShell courseDirectory={DEFAULT_COURSE_DIRECTORY} siteChromeConfig={fallbackChrome}><Suspense fallback={null}>{children}</Suspense></IeltsSectionShell>}>
            <PublishedPageFrame config={siteChromeConfig} courseDirectory={courseDirectory}>{children}</PublishedPageFrame>
          </Suspense>
        </main>
        </AccountProgressProvider>
        </CommunityInboxProvider>
      </body>
    </html>
  );
}
