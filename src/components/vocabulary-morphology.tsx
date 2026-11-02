import type { CSSProperties } from "react";
import type { VocabularyFormationPart } from "@/lib/vocabulary/local-vocabulary";

const COMPONENT_COLORS = ["#25804c", "#2865ba", "#b43b42", "#bb650f", "#7548a7", "#007f86", "#a6387a", "#667a1a"];

export function getVocabularyComponentStyle(index: number): CSSProperties {
  const color = COMPONENT_COLORS[index]
    ?? `hsl(${Math.round(((index - COMPONENT_COLORS.length) * 137.508 + 29) % 360)} 62% 37%)`;
  return { "--vocabulary-component-color": color, color } as CSSProperties;
}

export function splitVocabularyFormation(formation: string): VocabularyFormationPart[] {
  return formation.split(/\s+\+\s+/).map((label) => label.trim()).filter(Boolean).map((label) => ({ label }));
}

function normalizeSurface(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z]/g, "");
}

function getSurfaceCandidates(label: string) {
  const text = label.split("；中文释义：", 1)[0].trim();
  const suffix = text.match(/^[-–/]\s*([a-z]+)\b/i);
  if (suffix) return { kind: "suffix", candidates: [normalizeSurface(suffix[1])] };
  const prefix = text.match(/^([a-z]{1,8})-(?=\s*(?:[（(]|中文释义|$))/i);
  if (prefix) return { kind: "prefix", candidates: [normalizeSurface(prefix[1])] };

  const source = text.includes("：") ? text.slice(text.lastIndexOf("：") + 1).trim() : text;
  const strippedSource = source.replace(
    /^(?:(?:PIE\s+root|PIE|Proto-[A-Za-z-]+|Old English|Middle English|Old French|Middle French|Old Norse|Latin|Greek|Sanskrit|Hebrew|Arabic|Germanic|English|French|Dutch|Italian|Spanish|Russian|Turkish)\s+)/i,
    "",
  );
  const root = strippedSource.match(/\*([A-Za-zÀ-ÖØ-öø-ÿ]+(?:-[A-Za-z]+)*)/)
    ?? strippedSource.match(/[A-Za-zÀ-ÖØ-öø-ÿ]+(?:-[A-Za-z]+)*/);
  if (!root) return { kind: "root", candidates: [] as string[] };

  const token = normalizeSurface(root[1] ?? root[0]);
  const candidates = [token];
  if (token.endsWith("s")) candidates.push(token.slice(0, -1));
  if (token.endsWith("e")) candidates.push(token.slice(0, -1));
  for (let length = token.length - 1; length >= 3; length -= 1) candidates.push(token.slice(0, length));
  return { kind: "root", candidates: [...new Set(candidates)].sort((a, b) => b.length - a.length) };
}

function findAvailableRange(word: string, assignments: number[], cursor: number, partIndex: number, label: string) {
  const { kind, candidates } = getSurfaceCandidates(label);
  for (const token of candidates) {
    if (!token) continue;
    const positions = kind === "prefix"
      ? [word.startsWith(token) ? 0 : -1]
      : kind === "suffix"
        ? [word.lastIndexOf(token)]
        : [...word.matchAll(new RegExp(token, "g"))].map((match) => match.index ?? -1);
    const ordered = kind === "suffix" ? positions : positions.sort((a, b) => a - b);
    for (const start of ordered) {
      if (start < 0 || (kind !== "prefix" && start < cursor)) continue;
      const end = start + token.length;
      if (end > assignments.length || assignments.slice(start, end).some((owner) => owner !== -1)) continue;
      assignments.fill(partIndex, start, end);
      return { end, start };
    }
  }
  return null;
}

export function getVocabularyWordSegments(word: string, parts: VocabularyFormationPart[]) {
  if (parts.length === 0) return [{ componentIndex: -1, text: word }];
  const displayCharacters = Array.from(word);
  const normalizedCharacters: string[] = [];
  const normalizedToDisplay: number[] = [];
  displayCharacters.forEach((character, displayIndex) => {
    for (const normalizedCharacter of normalizeSurface(character)) {
      normalizedCharacters.push(normalizedCharacter);
      normalizedToDisplay.push(displayIndex);
    }
  });
  const assignments = Array.from({ length: normalizedCharacters.length }, () => -1);
  const normalizedWord = normalizedCharacters.join("");
  let cursor = 0;
  parts.forEach((part, index) => {
    const match = findAvailableRange(normalizedWord, assignments, cursor, index, part.label);
    if (match) cursor = match.end;
  });

  const unmatched = parts.map((_, index) => index).filter((index) => !assignments.includes(index));
  const available = assignments.map((value, index) => value === -1 ? index : -1).filter((index) => index >= 0);
  if (unmatched.length > 0) {
    let offset = 0;
    unmatched.forEach((componentIndex, index) => {
      const remainingComponents = unmatched.length - index;
      const count = Math.ceil((available.length - offset) / remainingComponents);
      for (const position of available.slice(offset, offset + count)) assignments[position] = componentIndex;
      offset += count;
    });
  } else if (available.length > 0) {
    const ranges = parts.map((_, componentIndex) => {
      const positions = assignments.map((owner, index) => owner === componentIndex ? index : -1).filter((index) => index >= 0);
      return positions.length ? { componentIndex, end: Math.max(...positions), start: Math.min(...positions) } : null;
    }).filter((range): range is { componentIndex: number; end: number; start: number } => Boolean(range));
    for (const position of available) {
      const nearest = ranges.reduce((best, range) => {
        const distance = position < range.start ? range.start - position : position > range.end ? position - range.end : 0;
        return distance < best.distance ? { componentIndex: range.componentIndex, distance } : best;
      }, { componentIndex: 0, distance: Number.MAX_SAFE_INTEGER });
      assignments[position] = nearest.componentIndex;
    }
  }

  const displayAssignments = Array.from({ length: displayCharacters.length }, () => -1);
  normalizedToDisplay.forEach((displayIndex, normalizedIndex) => {
    displayAssignments[displayIndex] = assignments[normalizedIndex];
  });
  for (let index = 0; index < displayAssignments.length; index += 1) {
    if (displayAssignments[index] >= 0) continue;
    const previous = displayAssignments.slice(0, index).reverse().find((owner) => owner >= 0);
    const next = displayAssignments.slice(index + 1).find((owner) => owner >= 0);
    displayAssignments[index] = previous ?? next ?? 0;
  }

  const segments: Array<{ componentIndex: number; text: string }> = [];
  for (let index = 0; index < displayCharacters.length;) {
    const componentIndex = displayAssignments[index] < 0 ? 0 : displayAssignments[index];
    let end = index + 1;
    while (end < displayCharacters.length && (displayAssignments[end] < 0 ? 0 : displayAssignments[end]) === componentIndex) end += 1;
    segments.push({ componentIndex, text: displayCharacters.slice(index, end).join("") });
    index = end;
  }
  return segments;
}

export function VocabularyMorphologyWord({ word, parts }: { word: string; parts: VocabularyFormationPart[] }) {
  if (parts.length === 0) return <>{word}</>;
  return <>{getVocabularyWordSegments(word, parts).map((segment, index) => (
    <span key={`${segment.componentIndex}-${index}`} style={getVocabularyComponentStyle(segment.componentIndex)}>{segment.text}</span>
  ))}</>;
}
