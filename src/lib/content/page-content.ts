import { supabase } from "@/lib/supabase/client";

export type ManagedPageSlug =
  | "home"
  | "listening"
  | "speaking"
  | "reading"
  | "writing"
  | "articles"
  | "training"
  | "news"
  | "contact";

export type ManagedPageTheme = "doodle" | "sunrise" | "retro" | "editorial";

export type ManagedPageItem = {
  actionLabel: string;
  description: string;
  enabled: boolean;
  eyebrow: string;
  href: string;
  id: string;
  kind: "primary" | "secondary";
  title: string;
};

export type ManagedPageContent = {
  eyebrow: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  summary: string;
  theme: ManagedPageTheme;
  title: string;
  items: ManagedPageItem[];
};

export type ManagedPageDefinition = {
  content: ManagedPageContent;
  label: string;
  module:
    | "listening"
    | "reading"
    | "speaking"
    | "writing"
    | "training"
    | "articles"
    | "site";
  path: string;
  slug: ManagedPageSlug;
};

const homeItems: ManagedPageItem[] = [
  {
    actionLabel: "进入词汇学习",
    description: "中文释义、发音、词根词源和自己的词汇书。",
    enabled: true,
    eyebrow: "Vocabulary",
    href: "/vocabulary/books",
    id: "vocabulary",
    kind: "primary",
    title: "查词与词汇",
  },
  {
    actionLabel: "进入外刊精读",
    description: "从 BBC 随身英语开始，积累真实语境里的表达。",
    enabled: true,
    eyebrow: "Daily English",
    href: "/articles",
    id: "articles",
    kind: "primary",
    title: "外刊精读",
  },
  {
    actionLabel: "进入雅思听力",
    description: "练习、精听与模考，逐步适应真实考试节奏。",
    enabled: true,
    eyebrow: "IELTS Listening",
    href: "/listening",
    id: "listening",
    kind: "primary",
    title: "雅思听力",
  },
  {
    actionLabel: "进入雅思阅读",
    description: "按题型练习，建立定位、理解与时间管理能力。",
    enabled: true,
    eyebrow: "IELTS Reading",
    href: "/reading",
    id: "reading",
    kind: "primary",
    title: "雅思阅读",
  },
  {
    actionLabel: "进入雅思写作",
    description: "题型拆解、限时练习、词汇与范文放在一起学。",
    enabled: true,
    eyebrow: "IELTS Writing",
    href: "/writing",
    id: "writing",
    kind: "primary",
    title: "雅思写作",
  },
  {
    actionLabel: "进入专项训练",
    description: "针对写作、翻译与薄弱技能进行短时高频训练。",
    enabled: true,
    eyebrow: "Skill Training",
    href: "/training",
    id: "training",
    kind: "primary",
    title: "专项训练",
  },
];

export const MANAGED_PAGE_DEFINITIONS: ManagedPageDefinition[] = [
  {
    content: {
      eyebrow: "英文解忧杂货铺 · YOUR ENGLISH CORNER",
      items: homeItems,
      primaryHref: "/vocabulary/books",
      primaryLabel: "开始今天的学习",
      secondaryHref: "/listening",
      secondaryLabel: "进入雅思训练",
      summary:
        "查一个词、听懂一段话、读完一篇外刊，或者认真准备一次雅思考试。这里把分散的学习工具，整理成一条可以安心走下去的路。",
      theme: "doodle",
      title: "把英语学习，\n变成每天都想打开的事。",
    },
    label: "首页",
    module: "site",
    path: "/",
    slug: "home",
  },
  {
    content: {
      eyebrow: "IELTS",
      items: [
        {
          actionLabel: "进入练习列表 →",
          description: "按 CI 题册自上而下选择 Part，进入后直接显示该 Part 的题目与音频。",
          enabled: true,
          eyebrow: "Practice",
          href: "/listening/practice",
          id: "practice",
          kind: "primary",
          title: "练习",
        },
        {
          actionLabel: "进入模考列表 →",
          description: "按 CI 题册选择完整模考入口，进入正式听力考试界面。",
          enabled: true,
          eyebrow: "Mock Test",
          href: "/listening/mock",
          id: "mock",
          kind: "primary",
          title: "模考",
        },
      ],
      primaryHref: "/listening/practice",
      primaryLabel: "开始练习",
      secondaryHref: "/listening/mock",
      secondaryLabel: "进入模考",
      summary: "通过分段练习和完整模考，建立稳定的听力节奏。",
      theme: "editorial",
      title: "IELTS LISTENING",
    },
    label: "雅思听力",
    module: "listening",
    path: "/listening",
    slug: "listening",
  },
  {
    content: {
      eyebrow: "IELTS",
      items: ["题目图片", "高分思路", "万能句型", "口语范文"].map((title, index) => ({
        actionLabel: "",
        description: "后台框架已预留，后续接入真实内容和权限开关。",
        enabled: true,
        eyebrow: `Section ${index + 1}`,
        href: "",
        id: `speaking-${index + 1}`,
        kind: "primary" as const,
        title,
      })),
      primaryHref: "",
      primaryLabel: "",
      secondaryHref: "",
      secondaryLabel: "",
      summary: "整理题目、高分思路、万能句型与口语范文。",
      theme: "editorial",
      title: "IELTS SPEAKING",
    },
    label: "雅思口语",
    module: "speaking",
    path: "/speaking",
    slug: "speaking",
  },
  {
    content: {
      eyebrow: "IELTS",
      items: [
        {
          actionLabel: "进入练习 →",
          description: "按文章进入阅读工作台，保留原文、题目和底部题号导航。",
          enabled: true,
          eyebrow: "Practice",
          href: "/reading/practice",
          id: "practice",
          kind: "primary",
          title: "练习",
        },
        {
          actionLabel: "开始完整模考 →",
          description: "3 篇文章，40 道题，进入即开始 60 分钟倒计时。",
          enabled: true,
          eyebrow: "Mock Test",
          href: "/reading/mock",
          id: "mock",
          kind: "primary",
          title: "模考",
        },
      ],
      primaryHref: "/reading/practice",
      primaryLabel: "开始练习",
      secondaryHref: "/reading/mock",
      secondaryLabel: "进入模考",
      summary: "练习定位、理解和时间管理，逐步适应完整阅读考试。",
      theme: "editorial",
      title: "IELTS READING",
    },
    label: "雅思阅读",
    module: "reading",
    path: "/reading",
    slug: "reading",
  },
  {
    content: {
      eyebrow: "IELTS",
      items: [
        {
          actionLabel: "进入题库 →",
          description: "按 Task 和题型选题，自由计时。",
          enabled: true,
          eyebrow: "Practice",
          href: "/writing/practice",
          id: "practice",
          kind: "primary",
          title: "练习",
        },
        {
          actionLabel: "开始完整模考 →",
          description: "Task 1 + Task 2，进入即开始 60 分钟倒计时。",
          enabled: true,
          eyebrow: "Mock Test",
          href: "/writing/mock",
          id: "mock",
          kind: "primary",
          title: "模考",
        },
        {
          actionLabel: "",
          description: "",
          enabled: true,
          eyebrow: "TASK 1",
          href: "/writing/task1-vocabulary",
          id: "task1-vocabulary",
          kind: "secondary",
          title: "必备词汇及翻译训练",
        },
        {
          actionLabel: "",
          description: "",
          enabled: true,
          eyebrow: "TASK 2",
          href: "",
          id: "task2-vocabulary",
          kind: "secondary",
          title: "场景词汇及翻译训练",
        },
        {
          actionLabel: "",
          description: "",
          enabled: true,
          eyebrow: "Writing",
          href: "",
          id: "linking-words",
          kind: "secondary",
          title: "写作常用逻辑转换词汇",
        },
        {
          actionLabel: "",
          description: "按照审题、规划段落、逻辑梳理和完整范文逐步拆解大作文。",
          enabled: true,
          eyebrow: "TASK 2",
          href: "/writing/task2",
          id: "task2-step-practice",
          kind: "secondary",
          title: "Task2逐步练习",
        },
      ],
      primaryHref: "/writing/practice",
      primaryLabel: "开始练习",
      secondaryHref: "/writing/mock",
      secondaryLabel: "进入模考",
      summary: "从题型练习到完整模考，并配合专项词汇训练。",
      theme: "editorial",
      title: "IELTS WRITING",
    },
    label: "雅思写作",
    module: "writing",
    path: "/writing",
    slug: "writing",
  },
  {
    content: {
      eyebrow: "Daily English",
      items: [],
      primaryHref: "",
      primaryLabel: "",
      secondaryHref: "",
      secondaryLabel: "",
      summary: "按年份浏览 BBC 随身英语，学习真实语境里的表达。",
      theme: "editorial",
      title: "BBC TAKE AWAY ENGLISH",
    },
    label: "外刊学习",
    module: "articles",
    path: "/articles",
    slug: "articles",
  },
  {
    content: {
      eyebrow: "Paid Module",
      items: ["中文写英文", "两句英文合并", "语法改写", "后续训练入口"].map(
        (title, index) => ({
          actionLabel: "",
          description: "专项训练内容将逐步接入。",
          enabled: true,
          eyebrow: `Training ${index + 1}`,
          href: "",
          id: `training-${index + 1}`,
          kind: "primary" as const,
          title,
        }),
      ),
      primaryHref: "/",
      primaryLabel: "回到首页",
      secondaryHref: "",
      secondaryLabel: "",
      summary: "写作翻译训练一直收费，后期可以继续添加句子合并、语法改写等训练。",
      theme: "editorial",
      title: "英语专项训练",
    },
    label: "专项训练",
    module: "training",
    path: "/training",
    slug: "training",
  },
  {
    content: {
      eyebrow: "Site",
      items: ["课程更新", "题库更新", "活动通知", "产品公告"].map((title, index) => ({
        actionLabel: "",
        description: "后台可以更新此区块的标题和说明。",
        enabled: true,
        eyebrow: `News ${index + 1}`,
        href: "",
        id: `news-${index + 1}`,
        kind: "primary" as const,
        title,
      })),
      primaryHref: "/",
      primaryLabel: "回到首页",
      secondaryHref: "",
      secondaryLabel: "",
      summary: "用于发布课程更新、题库更新、活动通知和产品公告。",
      theme: "editorial",
      title: "最新消息",
    },
    label: "最新消息",
    module: "site",
    path: "/news",
    slug: "news",
  },
  {
    content: {
      eyebrow: "Site",
      items: ["联系方式", "微信二维码", "常见问题", "留言表单"].map((title, index) => ({
        actionLabel: "",
        description: "后台可以更新此区块的标题和说明。",
        enabled: true,
        eyebrow: `Contact ${index + 1}`,
        href: "",
        id: `contact-${index + 1}`,
        kind: "primary" as const,
        title,
      })),
      primaryHref: "/",
      primaryLabel: "回到首页",
      secondaryHref: "",
      secondaryLabel: "",
      summary: "展示联系方式、常见问题与后续留言入口。",
      theme: "editorial",
      title: "联系我们",
    },
    label: "联系我们",
    module: "site",
    path: "/contact",
    slug: "contact",
  },
];

export function getManagedPageDefinition(slug: ManagedPageSlug) {
  return MANAGED_PAGE_DEFINITIONS.find((page) => page.slug === slug)!;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function readTheme(value: unknown, fallback: ManagedPageTheme): ManagedPageTheme {
  return value === "doodle" ||
    value === "sunrise" ||
    value === "retro" ||
    value === "editorial"
    ? value
    : fallback;
}

export function mergeManagedPageContent(
  slug: ManagedPageSlug,
  value: unknown,
): ManagedPageContent {
  const fallback = getManagedPageDefinition(slug).content;
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const sourceItems = Array.isArray(source.items) ? source.items : fallback.items;

  const items = sourceItems
    .map((item, index) => {
      const fallbackItem = fallback.items[index] ?? {
        actionLabel: "",
        description: "",
        enabled: true,
        eyebrow: "",
        href: "",
        id: `item-${index + 1}`,
        kind: "primary" as const,
        title: "",
      };
      const candidate =
        item && typeof item === "object" ? (item as Record<string, unknown>) : {};

      return {
        actionLabel: readString(candidate.actionLabel, fallbackItem.actionLabel),
        description: readString(candidate.description, fallbackItem.description),
        enabled:
          typeof candidate.enabled === "boolean" ? candidate.enabled : fallbackItem.enabled,
        eyebrow: readString(candidate.eyebrow, fallbackItem.eyebrow),
        href: readString(candidate.href, fallbackItem.href),
        id: readString(candidate.id, fallbackItem.id),
        kind:
          candidate.kind === "secondary" || candidate.kind === "primary"
            ? candidate.kind
            : fallbackItem.kind,
        title: readString(candidate.title, fallbackItem.title),
      };
    })
    .filter((item) => item.id && item.title);

  return {
    eyebrow: readString(source.eyebrow, fallback.eyebrow),
    items,
    primaryHref: readString(source.primaryHref, fallback.primaryHref),
    primaryLabel: readString(source.primaryLabel, fallback.primaryLabel),
    secondaryHref: readString(source.secondaryHref, fallback.secondaryHref),
    secondaryLabel: readString(source.secondaryLabel, fallback.secondaryLabel),
    summary: readString(source.summary, fallback.summary),
    theme: readTheme(source.theme, fallback.theme),
    title: readString(source.title, fallback.title),
  };
}

export async function getPublishedPageContent(
  slug: ManagedPageSlug,
): Promise<ManagedPageContent> {
  const fallback = getManagedPageDefinition(slug).content;
  const { data, error } = await supabase
    .from("managed_content_pages")
    .select("title,summary,meta_json")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) {
    return fallback;
  }

  return mergeManagedPageContent(slug, {
    ...(data.meta_json && typeof data.meta_json === "object" ? data.meta_json : {}),
    summary: data.summary,
    title: data.title,
  });
}
