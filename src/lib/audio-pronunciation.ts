export type AudioPronunciationScope = "all" | "high-school-plus";

const simplePronunciationExclusions = new Set([
  "a", "an", "the", "and", "or", "but", "if", "as", "at", "by", "for", "from", "in", "into", "of", "off", "on", "onto", "to", "up", "upon", "with",
  "i'm", "i've", "i'll", "i'd", "you're", "you've", "you'll", "you'd", "we're", "we've", "we'll", "we'd", "they're", "they've", "they'll", "they'd",
  "he's", "he'll", "he'd", "she's", "she'll", "she'd", "it's", "it'll", "that's", "there's", "here's", "what's", "who's", "where's", "when's", "how's",
  "don't", "doesn't", "didn't", "isn't", "aren't", "wasn't", "weren't", "can't", "couldn't", "won't", "wouldn't", "shouldn't", "mustn't", "haven't", "hasn't", "hadn't",
]);

const commonSentenceInitialWords = new Set([
  "a", "an", "the", "this", "that", "these", "those", "i", "we", "you", "he", "she", "it", "they", "there", "here",
  "and", "but", "or", "so", "if", "as", "when", "while", "because", "although", "though", "however", "therefore", "also",
  "after", "before", "during", "since", "until", "once", "many", "most", "some", "each", "every", "all", "one", "people",
  "what", "why", "who", "where", "how", "which", "now", "today", "recently", "in", "on", "at", "for", "from", "to", "by",
  "can", "could", "would", "should", "will", "do", "does", "did", "is", "are", "was", "were", "has", "have", "had",
]);

/**
 * Heuristically finds capitalized names and place names so they do not receive
 * article IPA. Sentence-initial ordinary words are kept unless repeated as an
 * internal capitalized token or part of a multi-word name.
 */
export function getLikelyProperNounWords(text: string) {
  const result = new Set<string>();
  const matches = [...text.matchAll(/\b[A-Z][a-z]+(?:['’][A-Z]?[a-z]+)?\b/g)];
  const counts = new Map<string, number>();
  for (const match of matches) {
    const word = match[0].toLowerCase().replace(/[’]/g, "'");
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  const isSentenceInitial = (index: number) => {
    const prefix = text.slice(0, index);
    const boundary = Math.max(prefix.lastIndexOf("."), prefix.lastIndexOf("!"), prefix.lastIndexOf("?"), prefix.lastIndexOf("\n"));
    return !prefix.slice(boundary + 1).replace(/^[\s\"“”'‘’([{]+/, "").trim();
  };

  matches.forEach((match, index) => {
    const word = match[0];
    const normalized = word.toLowerCase().replace(/[’]/g, "'");
    const start = match.index ?? 0;
    const end = start + word.length;
    const sentenceInitial = isSentenceInitial(start);
    const isSpeakerLabel = /^\s*:/.test(text.slice(end));
    const next = matches[index + 1];
    const nextIsAdjacentCapitalizedWord = Boolean(
      next &&
      !/[.!?\n]/.test(text.slice(end, next.index ?? end)) &&
      /^\s+/.test(text.slice(end, next.index ?? end)),
    );
    const previous = matches[index - 1];
    const previousIsAdjacentCapitalizedWord = Boolean(
      previous &&
      !/[.!?\n]/.test(text.slice((previous.index ?? 0) + previous[0].length, start)) &&
      /^\s+$/.test(text.slice((previous.index ?? 0) + previous[0].length, start)),
    );
    const sentenceStarter = commonSentenceInitialWords.has(normalized);

    if (!sentenceInitial || isSpeakerLabel || (!sentenceStarter && (counts.get(normalized) ?? 0) > 1)) {
      result.add(normalized);
    }
    if ((nextIsAdjacentCapitalizedWord && !sentenceStarter) || (previousIsAdjacentCapitalizedWord && !sentenceStarter)) {
      result.add(normalized);
      if (nextIsAdjacentCapitalizedWord) result.add(next![0].toLowerCase().replace(/[’]/g, "'"));
      if (previousIsAdjacentCapitalizedWord) result.add(previous![0].toLowerCase().replace(/[’]/g, "'"));
    }
  });

  // All-caps names and speaker labels are common in dialogue transcripts.
  for (const match of text.matchAll(/\b[A-Z]{2,}\b/g)) {
    result.add(match[0].toLowerCase());
  }

  return result;
}

export function shouldShowAudioPronunciation(
  level: string | null | undefined,
  word?: string,
) {
  const normalizedWord = (word ?? "").trim().toLowerCase().replace(/[’]/g, "'");
  if (simplePronunciationExclusions.has(normalizedWord)) return false;
  const normalizedLevel = (level ?? "").trim().toLowerCase();
  // Unknown or ungraded entries remain eligible; inflections are checked
  // against their base vocabulary level before reaching this function.
  return !/(小学|初中|primary|elementary|junior\s*high|middle\s*school)/i.test(normalizedLevel);
}
