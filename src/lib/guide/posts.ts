export type GuideBlockType = "heading" | "image" | "link" | "paragraph" | "video";

export type GuideTextAlign = "center" | "left" | "right";

export type GuideFontFamily = "georgia" | "kaiti" | "sans" | "serif";

export type GuideContentBlock = {
  align: GuideTextAlign;
  caption: string;
  fontFamily: GuideFontFamily;
  fontSize: number;
  id: string;
  text: string;
  type: GuideBlockType;
  url: string;
};

export type GuidePost = {
  blocks: GuideContentBlock[];
  createdAt: string;
  excerpt: string;
  id: string;
  publishedAt: string;
  slug: string;
  title: string;
};

export type GuidePostRow = {
  created_at: string | null;
  id: string;
  meta_json: unknown;
  published_at: string | null;
  slug: string;
  summary: string | null;
  title: string;
};

const DEFAULT_BLOCK: Omit<GuideContentBlock, "id"> = {
  align: "left",
  caption: "",
  fontFamily: "serif",
  fontSize: 18,
  text: "",
  type: "paragraph",
  url: "",
};

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readBlock(value: unknown, index: number): GuideContentBlock | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const block = value as Record<string, unknown>;
  const type: GuideBlockType =
    block.type === "heading" ||
    block.type === "image" ||
    block.type === "link" ||
    block.type === "video"
      ? block.type
      : "paragraph";
  const align: GuideTextAlign =
    block.align === "center" || block.align === "right" ? block.align : "left";
  const fontFamily: GuideFontFamily =
    block.fontFamily === "georgia" ||
    block.fontFamily === "kaiti" ||
    block.fontFamily === "sans"
      ? block.fontFamily
      : "serif";
  const requestedFontSize =
    typeof block.fontSize === "number" ? block.fontSize : DEFAULT_BLOCK.fontSize;

  return {
    align,
    caption: readString(block.caption),
    fontFamily,
    fontSize: Math.min(42, Math.max(14, requestedFontSize)),
    id: readString(block.id) || `block-${index + 1}`,
    text: readString(block.text),
    type,
    url: readString(block.url),
  };
}

export function createGuideBlock(type: GuideBlockType = "paragraph"): GuideContentBlock {
  return {
    ...DEFAULT_BLOCK,
    fontSize: type === "heading" ? 28 : DEFAULT_BLOCK.fontSize,
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
  };
}

export function parseGuidePostRow(row: GuidePostRow): GuidePost {
  const meta =
    row.meta_json && typeof row.meta_json === "object"
      ? (row.meta_json as Record<string, unknown>)
      : {};
  const blocks = Array.isArray(meta.blocks)
    ? meta.blocks
        .map((block, index) => readBlock(block, index))
        .filter((block): block is GuideContentBlock => Boolean(block))
    : [];

  return {
    blocks: blocks.length ? blocks : [{ ...createGuideBlock(), text: row.summary ?? "" }],
    createdAt: row.created_at ?? row.published_at ?? new Date().toISOString(),
    excerpt: readString(meta.excerpt) || row.summary || "",
    id: row.id,
    publishedAt: row.published_at ?? row.created_at ?? new Date().toISOString(),
    slug: row.slug,
    title: row.title,
  };
}

export const DEFAULT_GUIDE_POSTS: GuidePost[] = [
  {
    blocks: [
      {
        ...createGuideBlock("heading"),
        id: "welcome-heading",
        text: "第一次来到这里，可以从一个最小目标开始。",
      },
      {
        ...createGuideBlock(),
        id: "welcome-body",
        text: "先查一个今天遇到的单词，或者打开一篇 BBC 随身英语。听完一句、收藏一个表达，就已经完成了一次有效学习。网站会逐步把查词、精听、阅读和雅思练习连接起来。",
      },
    ],
    createdAt: "2026-07-29T00:00:00.000Z",
    excerpt: "从查词、BBC 精听或雅思练习开始，了解网站最顺手的使用路径。",
    id: "default-guide-welcome",
    publishedAt: "2026-07-29T00:00:00.000Z",
    slug: "guide-welcome",
    title: "如何开始使用英文解忧杂货铺",
  },
  {
    blocks: [
      {
        ...createGuideBlock(),
        id: "favorite-body",
        text: "页面中的圆形星标用于收藏，分享按钮可以生成图片或复制精确链接。收藏的单词、句子、文章和题目会集中显示在“我的—收藏夹”中。",
      },
    ],
    createdAt: "2026-07-28T00:00:00.000Z",
    excerpt: "认识全站统一的收藏、分享和精确定位功能。",
    id: "default-guide-favorite",
    publishedAt: "2026-07-28T00:00:00.000Z",
    slug: "guide-favorite-share",
    title: "收藏与分享功能说明",
  },
  {
    blocks: [
      {
        ...createGuideBlock(),
        id: "audio-body",
        text: "如果音频没有播放，请先确认浏览器没有静音，并使用 http://localhost:3000 访问本地测试站。线上页面应直接使用正式域名。BBC 文章支持整篇音频和逐句音频。",
      },
    ],
    createdAt: "2026-07-27T00:00:00.000Z",
    excerpt: "遇到音频加载问题时，可以按这里的顺序快速检查。",
    id: "default-guide-audio",
    publishedAt: "2026-07-27T00:00:00.000Z",
    slug: "guide-audio-help",
    title: "音频播放常见问题",
  },
];
