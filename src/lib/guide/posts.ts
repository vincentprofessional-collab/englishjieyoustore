export type GuideBlockType = "heading" | "image" | "link" | "paragraph" | "video" | "audio";

export type GuideTextAlign = "center" | "left" | "right";

export type GuideFontFamily = "georgia" | "kaiti" | "sans" | "serif";

export type GuideContentBlock = {
  align: GuideTextAlign;
  backgroundColor?: string;
  bold?: boolean;
  caption: string;
  color?: string;
  fontFamily: GuideFontFamily;
  fontSize: number;
  id: string;
  italic?: boolean;
  html?: string;
  height?: number;
  width?: number;
  text: string;
  type: GuideBlockType;
  underline?: boolean;
  strike?: boolean;
  url: string;
};

export type GuidePost = {
  author?: string;
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
    block.type === "video" ||
    block.type === "audio"
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
  const requestedWidth = typeof block.width === "number" ? block.width : undefined;
  const requestedHeight = typeof block.height === "number" ? block.height : undefined;

  return {
    align,
    backgroundColor: readString(block.backgroundColor) || undefined,
    bold: block.bold === true,
    caption: readString(block.caption),
    color: readString(block.color) || undefined,
    fontFamily,
    fontSize: Math.min(42, Math.max(14, requestedFontSize)),
    html: readString(block.html) || undefined,
    height:
      requestedHeight && requestedHeight > 0
        ? Math.min(1000, Math.max(80, requestedHeight))
        : undefined,
    id: readString(block.id) || `block-${index + 1}`,
    italic: block.italic === true,
    text: readString(block.text),
    type,
    underline: block.underline === true,
    strike: block.strike === true,
    url: readString(block.url),
    width:
      requestedWidth && requestedWidth > 0
        ? Math.min(1400, Math.max(120, requestedWidth))
        : undefined,
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
    author: readString(meta.author),
    blocks: blocks.length ? blocks : [{ ...createGuideBlock(), text: row.summary ?? "" }],
    createdAt: row.created_at ?? row.published_at ?? new Date().toISOString(),
    excerpt: readString(meta.excerpt) || row.summary || "",
    id: row.id,
    publishedAt: row.published_at ?? row.created_at ?? new Date().toISOString(),
    slug: row.slug,
    title: row.title,
  };
}

export const DEFAULT_GUIDE_POSTS: GuidePost[] = [];
