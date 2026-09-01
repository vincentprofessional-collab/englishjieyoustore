import { supabase } from "@/lib/supabase/client";
import { ensureJuniorHighExamMenu, ensureSeniorHighExamMenu } from "@/lib/content/site-chrome-nav";

export const SITE_CHROME_SLUG = "site-chrome";
export const SITE_CHROME_VERSION = 1;

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
    adminHref: "/admin",
    adminLabel: "内容后台",
    fontSize: 16,
    items: [
      {
        children: [],
        dropdownAlign: "right",
        enabled: true,
        href: "/",
        id: "dictionary",
        label: "查单词",
        note: "",
      },
      {
        children: [
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/vocabulary/books",
            id: "word-books",
            label: "词汇书",
            note: "",
          },
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/vocabulary/books",
            id: "srs",
            label: "SRS 复习",
            note: "",
          },
        ],
        dropdownAlign: "right",
        enabled: true,
        href: "",
        id: "memorize",
        label: "背单词",
        note: "暂时未开发",
      },
      {
        children: [
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/articles",
            id: "bbc",
            label: "BBC随身英语",
            note: "",
          },
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/articles",
            id: "american",
            label: "美音专辑待定",
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
                href: "/listening",
                id: "ielts-listening",
                label: "听力",
                note: "",
              },
              {
                children: [],
                dropdownAlign: "right",
                enabled: true,
                href: "/speaking",
                id: "ielts-speaking",
                label: "口语",
                note: "",
              },
              {
                children: [],
                dropdownAlign: "right",
                enabled: true,
                href: "/reading",
                id: "ielts-reading",
                label: "阅读",
                note: "",
              },
              {
                children: [],
                dropdownAlign: "right",
                enabled: true,
                href: "/writing",
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
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/junior-high",
            id: "junior-high-english",
            label: "中考英语",
            note: "",
          },
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/senior-high",
            id: "senior-high-english",
            label: "高考英语",
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
            href: "/training",
            id: "translation-training",
            label: "写作翻译训练",
            note: "",
          },
          {
            children: [],
            dropdownAlign: "right",
            enabled: true,
            href: "/training",
            id: "training-library",
            label: "专项训练库",
            note: "",
          },
        ],
        dropdownAlign: "right",
        enabled: true,
        href: "",
        id: "skill-training",
        label: "英语专项技能训练",
        note: "",
      },
      {
        children: [],
        dropdownAlign: "right",
        enabled: true,
        href: "/contact",
        id: "guide",
        label: "公告栏",
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
  const mergedNavItems = mergeNavItems(nav.items, fallback.nav.items);
  const examsFallback = fallback.nav.items.find((item) => item.id === "exams");
  const juniorHighFallback = fallback.nav.items
    .find((item) => item.id === "exams")
    ?.children.find((item) => item.id === "junior-high-english");
  const seniorHighFallback = fallback.nav.items
    .find((item) => item.id === "exams")
    ?.children.find((item) => item.id === "senior-high-english");
  const navWithJuniorHigh = examsFallback && juniorHighFallback
    ? ensureJuniorHighExamMenu(mergedNavItems, examsFallback, juniorHighFallback)
    : mergedNavItems;
  const navItems = examsFallback && seniorHighFallback
    ? ensureSeniorHighExamMenu(navWithJuniorHigh, examsFallback, seniorHighFallback)
    : navWithJuniorHigh;

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
      links: mergeLinks(footer.links, fallback.footer.links),
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
      adminHref: readString(nav.adminHref, fallback.nav.adminHref),
      adminLabel: readString(nav.adminLabel, fallback.nav.adminLabel),
      fontSize: readNumber(nav.fontSize, fallback.nav.fontSize, 12, 28),
      items: navItems,
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
