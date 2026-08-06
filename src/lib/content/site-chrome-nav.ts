export type SiteChromeNavNode = {
  children: SiteChromeNavNode[];
  id: string;
};

export function ensureJuniorHighExamLink<T extends SiteChromeNavNode>(items: T[], juniorHigh: T): T[] {
  return items.some((item) => item.id === juniorHigh.id) ? items : [...items, juniorHigh];
}
