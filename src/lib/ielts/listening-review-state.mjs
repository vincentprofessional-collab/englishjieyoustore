export function clampListeningReviewSplit({
  clientX,
  handleWidth,
  minLeftWidth,
  minRightWidth,
  workspaceLeft,
  workspaceWidth,
}) {
  const usableWidth = Math.max(0, workspaceWidth - handleWidth);
  if (usableWidth <= 0) {
    return 50;
  }

  const desiredLeftWidth = clientX - workspaceLeft - handleWidth / 2;
  const maximumLeftWidth = Math.max(minLeftWidth, usableWidth - minRightWidth);
  const leftWidth = Math.min(Math.max(desiredLeftWidth, minLeftWidth), maximumLeftWidth);
  return (leftWidth / usableWidth) * 100;
}

export function getListeningAttemptScore(partResults, mode, currentSectionId) {
  const results =
    mode === "mock"
      ? Object.values(partResults)
      : [partResults[currentSectionId]].filter(Boolean);

  return results.reduce(
    (total, result) => ({
      correctCount: total.correctCount + result.correctCount,
      total: total.total + result.total,
    }),
    { correctCount: 0, total: 0 },
  );
}

export function shouldShowListeningMockStartOverlay({ mode, mockStarted, submitted }) {
  return mode === "mock" && !submitted && !mockStarted;
}
