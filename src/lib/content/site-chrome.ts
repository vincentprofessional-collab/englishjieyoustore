import { supabase } from "@/lib/supabase/client";
import { dedupeLanguageExamMenu, ensureCet4ExamMenu, ensureCet6ExamMenu, ensureJuniorHighExamMenu, ensureSatExamMenu, ensureSeniorHighExamMenu, languageExamKey, orderLanguageExamMenu } from "@/lib/content/site-chrome-nav";

export const SITE_CHROME_SLUG = "site-chrome";
export const SITE_CHROME_VERSION = 3;

export type SiteChromeNavItem = {
  children: SiteChromeNavItem[];
  dropdownAlign: "left" | "right";
  enabled: boolean;
  href: string;
  id: string;
  label: string;
  note: string;
};

export type SiteChromeLink = {
  enabled: boolean;
  href: string;
  id: string;
  imageUrl: string;
  label: string;
  mark: string;
};

export type SiteChromeConfig = {
  brand: {
    href: string;
    imageUrl: string;
    mark: string;
    markFontSize: number;
    subtitle: string;
    subtitleFontSize: number;
    title: string;
    titleFontSize: number;
  };
  footer: {
    bottomLeft: string;
    bottomRight: string;
    bottomTextColor: string;
    brandHref: string;
    brandImageUrl: string;
    brandMark: string;
    brandMarkFontSize: number;
    brandSubtitle: string;
    brandSubtitleColor: string;
    brandSubtitleFontSize: number;
    brandTitle: string;
    brandTitleColor: string;
    brandTitleFontSize: number;
    links: SiteChromeLink[];
    linkTextColor: string;
    linkFontSize: number;
    promo: {
      enabled: boolean;
      imageUrl: string;
      note: string;
      text: string;
      textColor: string;
      title: string;
      titleFontSize: number;
    };
    socialFontSize: number;
    socialTextColor: string;
    socials: SiteChromeLink[];
  };
  nav: {
    adminHref: string;
    adminLabel: string;
    fontSize: number;
    items: SiteChromeNavItem[];
    loginHref: string;
    loginLabel: string;
  };
  version: number;
};

export const DEFAULT_SITE_CHROME_CONFIG: SiteChromeConfig = {
  brand: {
    href: "/",
    imageUrl: "",
    mark: "英",
    markFontSize: 24,
    subtitle: "",
    subtitleFontSize: 13,
    title: "英文解忧杂货铺",
    titleFontSize: 31,
  },
  footer: {
    bottomLeft: "© 2026 英文解忧杂货铺",
    bottomRight: "学习内容持续更新中",
    bottomTextColor: "#766f62",
    brandHref: "/",
    brandImageUrl: "",
    brandMark: "英",
    brandMarkFontSize: 30,
    brandSubtitle: "IELTS · 外刊 · 词典 · 专项训练",
    brandSubtitleColor: "#dbeee7",
    brandSubtitleFontSize: 13,
    brandTitle: "英文解忧杂货铺",
    brandTitleColor: "#ffffff",
    brandTitleFontSize: 28,
    linkFontSize: 16,
    linkTextColor: "#ffffff",
    links: [
      { enabled: true, href: "/contact", id: "contact", imageUrl: "", label: "公告栏", mark: "" },
      { enabled: true, href: "/listening", id: "listening", imageUrl: "", label: "雅思听力", mark: "" },
      { enabled: true, href: "/speaking", id: "speaking", imageUrl: "", label: "雅思口语", mark: "" },
      { enabled: true, href: "/training", id: "training", imageUrl: "", label: "英语专项训练", mark: "" },
      { enabled: true, href: "/me/favorites", id: "favorites", imageUrl: "", label: "我的收藏", mark: "" },
    ],
    promo: {
      enabled: true,
      imageUrl: "",
      note: "二维码、广告文案和跳转链接后期都可后台替换。",
      text: "发布课程通知、免费资料、活动广告和平台消息。",
      textColor: "#ffffff",
      title: "扫码关注学习更新",
      titleFontSize: 20,
    },
    socialFontSize: 14,
    socialTextColor: "#ffffff",
    socials: [
      { enabled: true, href: "/contact", id: "wechat", imageUrl: "", label: "微信", mark: "微" },
      { enabled: true, href: "/contact", id: "weibo", imageUrl: "", label: "微博", mark: "博" },
      { enabled: true, href: "/contact", id: "official-account", imageUrl: "", label: "公众号", mark: "公" },
      { enabled: true, href: "/contact", id: "xiaohongshu", imageUrl: "", label: "小红书", mark: "红" },
      { enabled: true, href: "/contact", id: "bilibili", imageUrl: "", label: "B站", mark: "B" },
    ],
  },
  nav: {
    adminHref: "/admin?view=chrome",
    adminLabel: "编辑导航",
    fontSize: 16,
    items: [
      {
        children: [],
        dropdownAlign: "right",
        enabled: true,
        href: "/",
        id: "home",
        label: "主页",
        note: "",
      },
      {
        children: [
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/vocabulary?kind=root",
            id: "dictionary-roots",
            label: "词根",
            note: "",
          },
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/vocabulary?kind=prefix",
            id: "dictionary-prefixes",
            label: "前缀",
            note: "",
          },
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/vocabulary?kind=suffix",
            id: "dictionary-suffixes",
            label: "后缀",
            note: "",
          },
        ],
        dropdownAlign: "right",
        enabled: true,
        href: "/vocabulary",
        id: "dictionary",
        label: "词根词缀词典",
        note: "",
      },
      {
        children: [
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/vocabulary/books?level=小学",
            id: "word-book-primary",
            label: "小学词汇",
            note: "",
          },
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/vocabulary/books?level=初中",
            id: "word-book-junior",
            label: "初中词汇",
            note: "",
          },
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/vocabulary/books?level=高中",
            id: "word-book-senior",
            label: "高中词汇",
            note: "",
          },
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/vocabulary/books?level=四级",
            id: "word-book-cet4",
            label: "大学四级词汇",
            note: "",
          },
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/vocabulary/books?level=六级",
            id: "word-book-cet6",
            label: "大学六级词汇",
            note: "",
          },
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/vocabulary/books?level=考研",
            id: "word-book-postgraduate",
            label: "考研词汇",
            note: "",
          },
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/vocabulary/books?level=托雅",
            id: "word-book-ielts-toefl",
            label: "托福雅思词汇",
            note: "",
          },
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/vocabulary/books?level=SAT",
            id: "word-book-sat",
            label: "SAT词汇",
            note: "",
          },
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/vocabulary/books?level=GRE",
            id: "word-book-gre",
            label: "GRE词汇",
            note: "",
          },
        ],
        dropdownAlign: "right",
        enabled: true,
        href: "",
        id: "memorize",
        label: "背单词",
        note: "",
      },
      {
        children: [
          {
            children: Array.from({ length: 12 }, (_, index) => {
              const year = 2026 - index;
              return {
                children: [],
                dropdownAlign: "right" as const,
                enabled: true,
                href: `/articles?year=${year}`,
                id: `bbc-${year}`,
                label: String(year),
                note: "",
              };
            }),
            dropdownAlign: "right",
            enabled: true,
            href: "",
            id: "bbc",
            label: "BBC随身英语",
            note: "",
          },
        ],
        dropdownAlign: "right",
        enabled: true,
        href: "",
        id: "articles",
        label: "外刊学习",
        note: "",
      },
      {
        children: [
          {
            children: [
              {
                children: [],
                dropdownAlign: "right",
                enabled: true,
                href: "/junior-high?mode=topic",
                id: "junior-high-topic",
                label: "知识点",
                note: "",
              },
              {
                children: [],
                dropdownAlign: "right",
                enabled: true,
                href: "/junior-high?mode=type",
                id: "junior-high-type",
                label: "题型训练",
                note: "",
              },
              {
                children: [],
                dropdownAlign: "right",
                enabled: true,
                href: "/junior-high?mode=mock-select",
                id: "junior-high-mock",
                label: "历年真题",
                note: "",
              },
            ],
            dropdownAlign: "right",
            enabled: true,
            href: "/junior-high",
            id: "junior-high-english",
            label: "中考英语",
            note: "",
          },
          {
            children: [
              {
                children: [],
                dropdownAlign: "right",
                enabled: true,
                href: "/senior-high?entry=knowledge",
                id: "senior-high-knowledge",
                label: "知识点",
                note: "",
              },
              {
                children: [],
                dropdownAlign: "right",
                enabled: true,
                href: "/senior-high?entry=practice",
                id: "senior-high-practice",
                label: "题型训练",
                note: "",
              },
              {
                children: [],
                dropdownAlign: "right",
                enabled: true,
                href: "/senior-high?entry=papers",
                id: "senior-high-papers",
                label: "历年真题",
                note: "",
              },
            ],
            dropdownAlign: "right",
            enabled: true,
            href: "/senior-high",
            id: "senior-high-english",
            label: "高考英语",
            note: "",
          },
          {
            children: [
              {
                children: [],
                dropdownAlign: "right",
                enabled: true,
                href: "/cet4?entry=knowledge",
                id: "cet4-knowledge",
                label: "知识点",
                note: "",
              },
              {
                children: [],
                dropdownAlign: "right",
                enabled: true,
                href: "/cet4?entry=practice",
                id: "cet4-types",
                label: "题型训练",
                note: "",
              },
              {
                children: [],
                dropdownAlign: "right",
                enabled: true,
                href: "/cet4?entry=papers",
                id: "cet4-papers",
                label: "历年真题",
                note: "",
              },
            ],
            dropdownAlign: "right",
            enabled: true,
            href: "/cet4",
            id: "cet4-english",
            label: "大学四级",
            note: "",
          },
          {
            children: [
              {
                children: [],
                dropdownAlign: "right",
                enabled: true,
                href: "/cet6?entry=knowledge",
                id: "cet6-knowledge",
                label: "知识点",
                note: "",
              },
              {
                children: [],
                dropdownAlign: "right",
                enabled: true,
                href: "/cet6?entry=practice",
                id: "cet6-types",
                label: "题型训练",
                note: "",
              },
              {
                children: [],
                dropdownAlign: "right",
                enabled: true,
                href: "/cet6?entry=papers",
                id: "cet6-papers",
                label: "历年真题",
                note: "",
              },
            ],
            dropdownAlign: "right",
            enabled: true,
            href: "/cet6",
            id: "cet6-english",
            label: "大学六级",
            note: "",
          },
          {
            children: [
              {
                children: [
                  {
                    children: [],
                    dropdownAlign: "right",
                    enabled: true,
                    href: "/listening",
                    id: "ielts-listening-cambridge",
                    label: "剑桥雅思",
                    note: "",
                  },
                  {
                    children: [],
                    dropdownAlign: "right",
                    enabled: true,
                    href: "/listening/jiufen",
                    id: "ielts-listening-jiufen",
                    label: "九分达人",
                    note: "",
                  },
                  {
                    children: [],
                    dropdownAlign: "right",
                    enabled: true,
                    href: "/listening/past-papers",
                    id: "ielts-listening-past-papers",
                    label: "历年真题",
                    note: "",
                  },
                ],
                dropdownAlign: "right",
                enabled: true,
                href: "",
                id: "ielts-listening",
                label: "听力",
                note: "",
              },
              {
                children: [
                  {
                    children: [],
                    dropdownAlign: "right",
                    enabled: true,
                    href: "/speaking/part-1",
                    id: "ielts-speaking-part-1",
                    label: "Part 1",
                    note: "",
                  },
                  {
                    children: [],
                    dropdownAlign: "right",
                    enabled: true,
                    href: "/speaking/part-2",
                    id: "ielts-speaking-part-2",
                    label: "Part 2",
                    note: "",
                  },
                  {
                    children: [],
                    dropdownAlign: "right",
                    enabled: true,
                    href: "/speaking/part-3",
                    id: "ielts-speaking-part-3",
                    label: "Part 3",
                    note: "",
                  },
                ],
                dropdownAlign: "right",
                enabled: true,
                href: "",
                id: "ielts-speaking",
                label: "口语",
                note: "",
              },
              {
                children: [
                  {
                    children: [],
                    dropdownAlign: "right",
                    enabled: true,
                    href: "/reading/practice",
                    id: "ielts-reading-cambridge",
                    label: "剑桥雅思",
                    note: "",
                  },
                  {
                    children: [],
                    dropdownAlign: "right",
                    enabled: true,
                    href: "/reading/mock",
                    id: "ielts-reading-mock",
                    label: "完整模考",
                    note: "",
                  },
                ],
                dropdownAlign: "right",
                enabled: true,
                href: "",
                id: "ielts-reading",
                label: "阅读",
                note: "",
              },
              {
                children: [
                  {
                    children: [],
                    dropdownAlign: "right",
                    enabled: true,
                    href: "/writing/task2",
                    id: "ielts-writing-task-2",
                    label: "大作文",
                    note: "",
                  },
                  {
                    children: [],
                    dropdownAlign: "right",
                    enabled: true,
                    href: "/writing/practice?task=task1",
                    id: "ielts-writing-task-1",
                    label: "小作文",
                    note: "",
                  },
                  {
                    children: [],
                    dropdownAlign: "right",
                    enabled: true,
                    href: "/writing/task1-vocabulary",
                    id: "ielts-writing-training",
                    label: "专项训练",
                    note: "",
                  },
                ],
                dropdownAlign: "right",
                enabled: true,
                href: "",
                id: "ielts-writing",
                label: "写作",
                note: "",
              },
            ],
            dropdownAlign: "right",
            enabled: true,
            href: "",
            id: "ielts",
            label: "雅思",
            note: "",
          },
          {
            children: [
              {
                children: [],
                dropdownAlign: "right",
                enabled: true,
                href: "/sat?view=knowledge",
                id: "sat-knowledge",
                label: "知识点",
                note: "",
              },
              {
                children: [],
                dropdownAlign: "right",
                enabled: true,
                href: "/sat?view=types",
                id: "sat-types",
                label: "题型训练",
                note: "",
              },
              {
                children: [],
                dropdownAlign: "right",
                enabled: true,
                href: "/sat?view=papers",
                id: "sat-papers",
                label: "历年真题",
                note: "",
              },
            ],
            dropdownAlign: "right",
            enabled: true,
            href: "/sat",
            id: "sat-reading-writing",
            label: "SAT",
            note: "",
          },
        ],
        dropdownAlign: "right",
        enabled: true,
        href: "",
        id: "exams",
        label: "语言考试",
        note: "",
      },
      {
        children: [
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/training?task=task2",
            id: "writing-task2-training",
            label: "大作文写作训练",
            note: "",
          },
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/training?task=task1",
            id: "writing-task1-training",
            label: "小作文写作训练",
            note: "",
          },
        ],
        dropdownAlign: "right",
        enabled: true,
        href: "",
        id: "skill-training",
        label: "专项训练",
        note: "",
      },
      {
        children: [],
        dropdownAlign: "right",
        enabled: true,
        href: "/contact",
        id: "guide",
        label: "使用说明",
        note: "",
      },
      {
        children: [
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/me/favorites",
            id: "my-favorites",
            label: "收藏夹",
            note: "",
          },
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/me/progress",
            id: "learning-records",
            label: "学习进度",
            note: "",
          },
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/me/settings",
            id: "settings",
            label: "个人设置",
            note: "",
          },
        ],
        dropdownAlign: "left",
        enabled: true,
        href: "",
        id: "me",
        label: "我的",
        note: "",
      },
    ],
    loginHref: "/login",
    loginLabel: "登录 / 注册",
  },
  version: SITE_CHROME_VERSION,
};

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback: number, min = 10, max = 80) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function readColor(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function readDropdownAlign(value: unknown): SiteChromeNavItem["dropdownAlign"] {
  return value === "left" ? "left" : "right";
}

function mergeNavItems(value: unknown, fallback: SiteChromeNavItem[]): SiteChromeNavItem[] {
  const sourceItems = Array.isArray(value) ? value : fallback;

  return sourceItems
    .map((item, index) => {
      const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const sourceId = typeof source.id === "string" ? source.id : "";
      const fallbackItem =
        fallback.find((candidate) => candidate.id === sourceId) ??
        fallback[index] ?? {
          children: [],
          dropdownAlign: "right" as const,
          enabled: true,
          href: "",
          id: `nav-${index + 1}`,
          label: "新导航",
          note: "",
        };

      return {
        children: mergeNavItems(source.children, fallbackItem.children),
        dropdownAlign: readDropdownAlign(source.dropdownAlign ?? fallbackItem.dropdownAlign),
        enabled: readBoolean(source.enabled, fallbackItem.enabled),
        href: readString(source.href, fallbackItem.href),
        id: readString(source.id, fallbackItem.id),
        label: readString(source.label, fallbackItem.label),
        note: readString(source.note, fallbackItem.note),
      };
    })
    .filter((item) => item.id && item.label);
}

function mergeLinks(value: unknown, fallback: SiteChromeLink[]): SiteChromeLink[] {
  const sourceLinks = Array.isArray(value) ? value : fallback;

  return sourceLinks
    .map((item, index) => {
      const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const sourceId = typeof source.id === "string" ? source.id : "";
      const fallbackItem =
        fallback.find((candidate) => candidate.id === sourceId) ??
        fallback[index] ?? {
          enabled: true,
          href: "",
          id: `link-${index + 1}`,
          imageUrl: "",
          label: "新链接",
          mark: "",
        };

      return {
        enabled: readBoolean(source.enabled, fallbackItem.enabled),
        href: readString(source.href, fallbackItem.href),
        id: readString(source.id, fallbackItem.id),
        imageUrl: readString(source.imageUrl, fallbackItem.imageUrl),
        label: readString(source.label, fallbackItem.label),
        mark: readString(source.mark, fallbackItem.mark),
      };
    })
    .filter((item) => item.id && item.label);
}

function findDefaultNavItem(id: string, items: SiteChromeNavItem[]): SiteChromeNavItem | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const child = findDefaultNavItem(id, item.children);
    if (child) return child;
  }
}

const NAV_LABEL_OVERRIDES: Record<string, string> = {
  "junior-high-type": "题型训练",
  "senior-high-practice": "题型训练",
  "cet4-types": "题型训练",
  "cet6-types": "题型训练",
  "sat-types": "题型训练",
};

function normalizeVisibleNavItems(
  items: SiteChromeNavItem[],
  migrateLegacyConfig: boolean,
): SiteChromeNavItem[] {
  return items
    .filter((item) => !migrateLegacyConfig || (
      item.id !== "other-exams" && item.label !== "其他考试正在开发中"
    ))
    .map((item) => {
      const fallbackItem = findDefaultNavItem(item.id, DEFAULT_SITE_CHROME_CONFIG.nav.items);
      const fixedChildren = migrateLegacyConfig && [
        "dictionary",
        "memorize",
        "articles",
        "exams",
        "ielts",
        "ielts-listening",
        "ielts-speaking",
        "ielts-reading",
        "ielts-writing",
        "junior-high-english",
        "senior-high-english",
        "sat-reading-writing",
        "skill-training",
      ].includes(item.id)
        ? fallbackItem?.children ?? item.children
        : item.children;

      return {
        ...item,
        children: normalizeVisibleNavItems(fixedChildren, migrateLegacyConfig),
        label: NAV_LABEL_OVERRIDES[item.id] ?? (migrateLegacyConfig && item.id === "skill-training"
          ? "专项训练"
          : migrateLegacyConfig && item.id === "sat-reading-writing"
            ? "SAT"
            : item.label),
        note: migrateLegacyConfig && item.id === "memorize" ? "" : item.note,
      };
    });
}

export function mergeSiteChromeConfig(value: unknown): SiteChromeConfig {
  const fallback = DEFAULT_SITE_CHROME_CONFIG;
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const brand = source.brand && typeof source.brand === "object"
    ? (source.brand as Record<string, unknown>)
    : {};
  const nav = source.nav && typeof source.nav === "object"
    ? (source.nav as Record<string, unknown>)
    : {};
  const footer = source.footer && typeof source.footer === "object"
    ? (source.footer as Record<string, unknown>)
    : {};
  const promo = footer.promo && typeof footer.promo === "object"
    ? (footer.promo as Record<string, unknown>)
    : {};
  const sourceVersion = typeof source.version === "number" ? source.version : 1;
  const migrateLegacyConfig = sourceVersion < SITE_CHROME_VERSION;
  const mergedNavItems = mergeNavItems(nav.items, fallback.nav.items);
  const examsFallback = fallback.nav.items.find((item) => item.id === "exams");
  const juniorHighFallback = fallback.nav.items
    .find((item) => item.id === "exams")
    ?.children.find((item) => item.id === "junior-high-english");
  const seniorHighFallback = fallback.nav.items
    .find((item) => item.id === "exams")
    ?.children.find((item) => item.id === "senior-high-english");
  const satFallback = fallback.nav.items
    .find((item) => item.id === "exams")
    ?.children.find((item) => item.id === "sat-reading-writing");
  const cet4Fallback = fallback.nav.items
    .find((item) => item.id === "exams")
    ?.children.find((item) => languageExamKey(item) === "cet4");
  const cet6Fallback = fallback.nav.items
    .find((item) => item.id === "exams")
    ?.children.find((item) => languageExamKey(item) === "cet6");
  const navWithJuniorHigh = examsFallback && juniorHighFallback
    ? ensureJuniorHighExamMenu(mergedNavItems, examsFallback, juniorHighFallback)
    : mergedNavItems;
  const navWithSeniorHigh = examsFallback && seniorHighFallback
    ? ensureSeniorHighExamMenu(navWithJuniorHigh, examsFallback, seniorHighFallback)
    : navWithJuniorHigh;
  const navWithSat = examsFallback && satFallback
    ? ensureSatExamMenu(navWithSeniorHigh, examsFallback, satFallback)
    : navWithSeniorHigh;
  const navWithCet4 = examsFallback && cet4Fallback
    ? ensureCet4ExamMenu(navWithSat, examsFallback, cet4Fallback)
    : navWithSat;
  const navItems = examsFallback && cet6Fallback
    ? ensureCet6ExamMenu(navWithCet4, examsFallback, cet6Fallback)
    : navWithCet4;
  const orderedNavItems = orderLanguageExamMenu(dedupeLanguageExamMenu(navItems));

  const normalizedNavItems = dedupeLanguageExamMenu(
    normalizeVisibleNavItems(orderedNavItems, migrateLegacyConfig),
  ).map((item) => {
    if (migrateLegacyConfig && item.id === "dictionary") {
      return {
        ...item,
        href: item.href === "/" || !item.href ? "/vocabulary" : item.href,
        label: "词根词缀词典",
      };
    }

    if (migrateLegacyConfig && item.id === "guide") {
      return {
        ...item,
        children: [],
        href: item.href || "/contact",
        label: "使用说明",
      };
    }

    if (migrateLegacyConfig && item.id === "home") {
      return {
        ...item,
        children: [],
        href: "/",
        label: "主页",
      };
    }

    return item;
  });
  const visibleNavItems = migrateLegacyConfig ? [
    {
      children: [],
      dropdownAlign: "right" as const,
      enabled: true,
      href: "/",
      id: "home",
      label: "主页",
      note: "",
    },
    ...normalizedNavItems.filter(
      (item) => item.id !== "home" && item.label !== "公告栏" && item.label !== "使用说明",
    ),
  ] : normalizedNavItems;
  const visibleFooterLinks = mergeLinks(footer.links, fallback.footer.links).filter(
    (item) => item.id !== "contact" && item.label !== "公告栏",
  );

  return {
    brand: {
      href: readString(brand.href, fallback.brand.href),
      imageUrl: readString(brand.imageUrl, fallback.brand.imageUrl),
      mark: readString(brand.mark, fallback.brand.mark),
      markFontSize: readNumber(brand.markFontSize, fallback.brand.markFontSize, 12, 56),
      subtitle: readString(brand.subtitle, fallback.brand.subtitle),
      subtitleFontSize: readNumber(
        brand.subtitleFontSize,
        fallback.brand.subtitleFontSize,
        10,
        32,
      ),
      title: readString(brand.title, fallback.brand.title),
      titleFontSize: readNumber(brand.titleFontSize, fallback.brand.titleFontSize, 16, 56),
    },
    footer: {
      bottomLeft: readString(footer.bottomLeft, fallback.footer.bottomLeft),
      bottomRight: readString(footer.bottomRight, fallback.footer.bottomRight),
      bottomTextColor: readColor(footer.bottomTextColor, fallback.footer.bottomTextColor),
      brandHref: readString(footer.brandHref, fallback.footer.brandHref),
      brandImageUrl: readString(footer.brandImageUrl, fallback.footer.brandImageUrl),
      brandMark: readString(footer.brandMark, fallback.footer.brandMark),
      brandMarkFontSize: readNumber(
        footer.brandMarkFontSize,
        fallback.footer.brandMarkFontSize,
        14,
        72,
      ),
      brandSubtitle: readString(footer.brandSubtitle, fallback.footer.brandSubtitle),
      brandSubtitleColor: readColor(
        footer.brandSubtitleColor,
        fallback.footer.brandSubtitleColor,
      ),
      brandSubtitleFontSize: readNumber(
        footer.brandSubtitleFontSize,
        fallback.footer.brandSubtitleFontSize,
        10,
        32,
      ),
      brandTitle: readString(footer.brandTitle, fallback.footer.brandTitle),
      brandTitleColor: readColor(footer.brandTitleColor, fallback.footer.brandTitleColor),
      brandTitleFontSize: readNumber(
        footer.brandTitleFontSize,
        fallback.footer.brandTitleFontSize,
        16,
        64,
      ),
      links: visibleFooterLinks,
      linkTextColor: readColor(footer.linkTextColor, fallback.footer.linkTextColor),
      linkFontSize: readNumber(footer.linkFontSize, fallback.footer.linkFontSize, 12, 32),
      promo: {
        enabled: readBoolean(promo.enabled, fallback.footer.promo.enabled),
        imageUrl: readString(promo.imageUrl, fallback.footer.promo.imageUrl),
        note: readString(promo.note, fallback.footer.promo.note),
        text: readString(promo.text, fallback.footer.promo.text),
        textColor: readColor(promo.textColor, fallback.footer.promo.textColor),
        title: readString(promo.title, fallback.footer.promo.title),
        titleFontSize: readNumber(
          promo.titleFontSize,
          fallback.footer.promo.titleFontSize,
          14,
          48,
        ),
      },
      socialFontSize: readNumber(footer.socialFontSize, fallback.footer.socialFontSize, 12, 32),
      socialTextColor: readColor(footer.socialTextColor, fallback.footer.socialTextColor),
      socials: mergeLinks(footer.socials, fallback.footer.socials),
    },
    nav: {
      adminHref: migrateLegacyConfig
        ? fallback.nav.adminHref
        : readString(nav.adminHref, fallback.nav.adminHref),
      adminLabel: migrateLegacyConfig
        ? fallback.nav.adminLabel
        : readString(nav.adminLabel, fallback.nav.adminLabel),
      fontSize: readNumber(nav.fontSize, fallback.nav.fontSize, 12, 28),
      items: visibleNavItems,
      loginHref: readString(nav.loginHref, fallback.nav.loginHref),
      loginLabel: readString(nav.loginLabel, fallback.nav.loginLabel),
    },
    version: readNumber(source.version, fallback.version, 1, 99),
  };
}

export function cloneSiteChromeConfig(config: SiteChromeConfig): SiteChromeConfig {
  return JSON.parse(JSON.stringify(config)) as SiteChromeConfig;
}

export async function getPublishedSiteChromeConfig() {
  const { data, error } = await supabase
    .from("managed_content_pages")
    .select("meta_json")
    .eq("slug", SITE_CHROME_SLUG)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_SITE_CHROME_CONFIG;
  }

  return mergeSiteChromeConfig(data.meta_json);
}
