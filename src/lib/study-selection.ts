export type StudySelectionActionPosition = {
  left: number;
  placement: "above" | "below";
  top: number;
};

export const STUDY_SELECTION_ACTION_TIMEOUT_MS = 2000;

export function hasStudySelectionText(value: string) {
  return /[\p{L}\p{N}]/u.test(value);
}

export function getStudySelectionActionPosition(rect: DOMRect): StudySelectionActionPosition {
  const viewportPadding = 16;
  const popoverWidth = Math.min(300, window.innerWidth - viewportPadding * 2);
  const popoverHeight = 88;
  const preferredLeft = rect.left + rect.width / 2 - popoverWidth / 2;
  const left = Math.min(
    window.innerWidth - popoverWidth - viewportPadding,
    Math.max(viewportPadding, preferredLeft),
  );
  const hasRoomAbove = rect.top > popoverHeight + viewportPadding;

  return {
    left,
    placement: hasRoomAbove ? "above" : "below",
    top: hasRoomAbove
      ? Math.max(viewportPadding, rect.top - popoverHeight - 14)
      : Math.min(window.innerHeight - popoverHeight - viewportPadding, rect.bottom + 14),
  };
}
