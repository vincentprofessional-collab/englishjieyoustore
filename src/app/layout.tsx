import type { Metadata } from "next";
import { Suspense } from "react";
import { GlobalVocabularySearch } from "@/components/global-vocabulary-search";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "英文解忧杂货铺",
  description: "雅思听说读写与英语专项训练平台",
};

const themeBootScript = `
(() => {
  try {
    const storedTheme = window.localStorage.getItem("englishjieyou.theme");
    const theme = storedTheme === "day" || storedTheme === "night" ? storedTheme : "night";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "night" ? "dark" : "light";
  } catch {
    document.documentElement.dataset.theme = "night";
    document.documentElement.style.colorScheme = "dark";
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-theme="night" lang="zh-CN" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <main className="shell">
          <SiteNav />
          <Suspense fallback={null}>
            <GlobalVocabularySearch />
          </Suspense>
          {children}
          <SiteFooter />
        </main>
      </body>
    </html>
  );
}
