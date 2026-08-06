export type SpeakingNavigationItem = {
  href: string;
  id: string;
  title: string;
};

export type SpeakingNavigationPart = {
  id: string;
  label: string;
};

export function findSpeakingPartForItem<T extends SpeakingNavigationPart>(
  item: SpeakingNavigationItem,
  parts: T[],
) {
  return parts.find(
    (part) =>
      item.href === `/speaking/${part.id}` ||
      item.id === `speaking-${part.id}` ||
      item.title.trim().toLowerCase() === part.label.toLowerCase(),
  );
}
