type ListeningPartResult = {
  correctCount: number;
  total: number;
};

export function clampListeningReviewSplit(options: {
  clientX: number;
  handleWidth: number;
  minLeftWidth: number;
  minRightWidth: number;
  workspaceLeft: number;
  workspaceWidth: number;
}): number;

export function getListeningAttemptScore(
  partResults: Record<string, ListeningPartResult>,
  mode: "mock" | "practice",
  currentSectionId: string,
): ListeningPartResult;

export function shouldShowListeningMockStartOverlay(options: {
  mode: "mock" | "practice";
  mockStarted: boolean;
  submitted: boolean;
}): boolean;
