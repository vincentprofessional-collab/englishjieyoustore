import type { GuideMenuPlacement } from "@/lib/guide/posts";
import type { SiteChromeConfig, SiteChromeNavItem } from "@/lib/content/site-chrome";

export type GuideMenuPlacementOption = {
  label: string;
  placement: GuideMenuPlacement;
};

export type GuidePagePlacementOption = {
  label: string;
  path: string;
};

export const GUIDE_POST_NAV_PREFIX = "guide-post-";

export function guidePostNavId(slug: string) {
  return `${GUIDE_POST_NAV_PREFIX}${slug}`;
}

function walkNavItems(
  items: SiteChromeNavItem[],
  visit: (item: SiteChromeNavItem, path: string[]) => void,
  path: string[] = [],
) {
  for (const item of items) {
    if (!item.enabled) continue;
    const nextPath = [...path, item.label];
    visit(item, nextPath);
    walkNavItems(item.children, visit, nextPath);
  }
}

export function guidePostMenuPlacementOptions(config: SiteChromeConfig): GuideMenuPlacementOption[] {
  const options: GuideMenuPlacementOption[] = [
    { label: "顶部导航：新增一级菜单", placement: { kind: "top", parentId: null } },
  ];

  walkNavItems(config.nav.items, (item, path) => {
    if (!item.enabled || item.id === "home" || item.id === "me") return;
    options.push({
      label: `左侧栏：${path.join(" / ")}`,
      placement: { kind: "sidebar", parentId: item.id },
    });
  });

  return options;
}

export function normalizeGuidePagePath(value: string) {
  try {
    const url = new URL(value, "https://guide-page.local");
    if (url.origin !== "https://guide-page.local") return "";
    const pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");
    const searchEntries = [...url.searchParams.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue),
    );
    const query = new URLSearchParams(searchEntries).toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  } catch {
    return "";
  }
}

export function guidePostPagePlacementOptions(config: SiteChromeConfig): GuidePagePlacementOption[] {
  const options: GuidePagePlacementOption[] = [{ label: "主页", path: "/" }];
  const seenPaths = new Set(options.map((option) => option.path));

  const addOption = (label: string, href: string) => {
    const normalizedPath = normalizeGuidePagePath(href);
    if (!normalizedPath || seenPaths.has(normalizedPath)) return;
    seenPaths.add(normalizedPath);
    options.push({ label, path: normalizedPath });
  };

  walkNavItems(config.nav.items, (item, path) => {
    if (!item.enabled || item.id.startsWith(GUIDE_POST_NAV_PREFIX) || !item.href || item.href.startsWith("#")) return;
    addOption(path.join(" / "), item.href);
  });

  for (const year of Array.from({ length: 12 }, (_, index) => 2026 - index)) {
    addOption(`左侧菜单：BBC随身英语 / ${year}`, `/articles?year=${year}`);
  }
  addOption("左侧菜单：新概念英语", "/new-concept");
  for (let unit = 1; unit <= 6; unit += 1) {
    addOption(`左侧菜单：新概念英语 / Unit ${unit}`, `/new-concept?unit=${unit}`);
  }

  const directoryPages = [
    ["左侧菜单：听力", "/listening"],
    ["左侧菜单：听力 / 剑桥雅思", "/listening/practice"],
    ["左侧菜单：听力 / 历年真题", "/listening/past-papers"],
    ["左侧菜单：口语", "/speaking"],
    ["左侧菜单：口语 / Part 1", "/speaking/part-1"],
    ["左侧菜单：口语 / Part 2", "/speaking/part-2"],
    ["左侧菜单：口语 / Part 3", "/speaking/part-3"],
    ["左侧菜单：阅读", "/reading"],
    ["左侧菜单：阅读 / 剑桥雅思", "/reading/practice"],
    ["左侧菜单：阅读 / 完整模考", "/reading/mock"],
    ["左侧菜单：写作", "/writing"],
    ["左侧菜单：写作 / 小作文", "/writing/practice?task=task1"],
    ["左侧菜单：写作 / 大作文", "/writing/task2"],
    ["左侧菜单：写作 / 专项训练", "/writing/task1-vocabulary"],
    ["左侧菜单：中考英语", "/junior-high"],
    ["左侧菜单：高考英语", "/senior-high"],
    ["左侧菜单：SAT", "/sat"],
  ] as const;
  directoryPages.forEach(([label, href]) => addOption(label, href));

  return options;
}

function findNavItem(items: SiteChromeNavItem[], id: string): SiteChromeNavItem | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const match = findNavItem(item.children, id);
    if (match) return match;
  }
  return undefined;
}

function removeNavItem(items: SiteChromeNavItem[], id: string): SiteChromeNavItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => ({ ...item, children: removeNavItem(item.children, id) }));
}

function appendToNavItem(
  items: SiteChromeNavItem[],
  parentId: string,
  child: SiteChromeNavItem,
): { items: SiteChromeNavItem[]; found: boolean } {
  let found = false;
  const nextItems = items.map((item) => {
    if (item.id === parentId) {
      found = true;
      return { ...item, children: [...item.children, child] };
    }

    const nested = appendToNavItem(item.children, parentId, child);
    if (!nested.found) return item;
    found = true;
    return { ...item, children: nested.items };
  });

  return { found, items: nextItems };
}

export function syncGuidePostNavigation(
  config: SiteChromeConfig,
  slug: string,
  title: string,
  status: "archived" | "draft" | "published",
  placement: GuideMenuPlacement | null,
): SiteChromeConfig {
  const id = guidePostNavId(slug);
  const existing = findNavItem(config.nav.items, id);
  const cleanedItems = removeNavItem(config.nav.items, id);

  if (status !== "published" || !placement) {
    return { ...config, nav: { ...config.nav, items: cleanedItems } };
  }

  const menuItem: SiteChromeNavItem = {
    children: [],
    dropdownAlign: existing?.dropdownAlign ?? "right",
    enabled: existing?.enabled ?? true,
    href: `/contact/${slug}`,
    id,
    label: title,
    note: existing?.note ?? "",
  };

  if (placement.kind === "top") {
    return {
      ...config,
      nav: { ...config.nav, items: [...cleanedItems, menuItem] },
    };
  }

  const appended = appendToNavItem(cleanedItems, placement.parentId, menuItem);
  return {
    ...config,
    nav: {
      ...config.nav,
      items: appended.found ? appended.items : cleanedItems,
    },
  };
}
