export function getAdjectiveBaseFormCandidates(normalizedWord: string) {
  if (normalizedWord.endsWith("iest") && normalizedWord.length > 7) {
    return [`${normalizedWord.slice(0, -4)}y`];
  }
  if (normalizedWord.endsWith("ier") && normalizedWord.length > 6) {
    return [`${normalizedWord.slice(0, -3)}y`];
  }
  return [];
}
