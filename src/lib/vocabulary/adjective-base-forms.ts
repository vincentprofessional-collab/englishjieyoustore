export function getAdjectiveBaseFormCandidates(normalizedWord: string) {
  if (normalizedWord.endsWith("ally") && normalizedWord.length > 6) {
    return [`${normalizedWord.slice(0, -2)}`, `${normalizedWord.slice(0, -4)}`];
  }
  if (normalizedWord.endsWith("ily") && normalizedWord.length > 5) {
    const stem = normalizedWord.slice(0, -3);
    return [`${stem}y`, stem, `${stem}e`];
  }
  if (normalizedWord.endsWith("ly") && normalizedWord.length > 4) {
    const stem = normalizedWord.slice(0, -2);
    return [stem, `${stem}e`];
  }
  if (normalizedWord.endsWith("iest") && normalizedWord.length > 7) {
    return [`${normalizedWord.slice(0, -4)}y`];
  }
  if (normalizedWord.endsWith("ier") && normalizedWord.length > 6) {
    return [`${normalizedWord.slice(0, -3)}y`];
  }
  return [];
}
