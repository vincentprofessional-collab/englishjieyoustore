export function normalizeListeningChoiceSelection(value) {
  return [
    ...new Set(String(value ?? "").toUpperCase().replace(/\bAND\b/g, " ").match(/[A-Z]/g) ?? []),
  ].sort();
}
