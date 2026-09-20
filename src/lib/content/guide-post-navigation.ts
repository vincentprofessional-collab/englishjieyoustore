import type { GuideMenuPlacement } from "@/lib/guide/posts";
import type { SiteChromeConfig, SiteChromeNavItem } from "@/lib/content/site-chrome";

export type GuideMenuPlacementOption = {
  label: string;
  placement: GuideMenuPlacement;
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
