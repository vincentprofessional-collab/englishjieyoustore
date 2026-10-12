import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";
import referenceData from "../../data/bbc/2026-syntax.json" with { type: "json" };
import type { BbcSyntaxLayerKey, BbcSyntaxSentenceData, BbcSyntaxSpan } from "@/components/bbc-syntax-sentence";

export const BBC_SYNTAX_REFERENCE_IDS = ["260713", "260720", "260727"] as const;
const references = referenceData as Record<string, BbcSyntaxSentenceData[]>;
const referenceSentences = BBC_SYNTAX_REFERENCE_IDS.flatMap((id) => references[id]);
const nlp = winkNLP(model, ["sbd", "pos"]);
const key = (text: string) => text.replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
const exactReferences = new Map(referenceSentences.map((sentence) => [key(sentence.text), sentence]));
const generatedCache = new Map<string, BbcSyntaxSentenceData>();
const BE_FORMS = new Set(["be", "am", "is", "are", "was", "were", "been", "being"]);
const LINKING_VERBS = new Set([
  ...BE_FORMS, "seem", "seems", "seemed", "become", "becomes", "became", "feel", "feels", "felt",
  "look", "looks", "looked", "get", "gets", "got", "remain", "remains", "stay", "stays", "stayed",
]);
const CLAUSE_TAKING_VERBS = new Set([
  "ask", "asked", "believe", "believed", "find", "found", "guess", "guessed", "hear", "heard", "hope",
  "hoped", "imagine", "know", "knew", "learn", "learned", "mean", "meant", "notice", "noticed", "realise",
  "realized", "remember", "remembered", "say", "said", "see", "saw", "think", "thought", "understand",
  "understood", "wonder", "wondered",
]);
const CLAUSE_MARKERS: Record<string, string> = {
  although: "让步状语从句", because: "原因状语从句", before: "时间状语从句", if: "条件状语从句",
  once: "时间状语从句", since: "时间/原因状语从句", though: "让步状语从句", unless: "条件状语从句",
  until: "时间状语从句", when: "时间状语从句", whenever: "时间状语从句", whereas: "让步状语从句",
  wherever: "地点状语从句", whether: "宾语从句", while: "时间状语从句", who: "定语从句",
  whom: "定语从句", whose: "定语从句", which: "定语从句", that: "宾语从句", what: "宾语从句",
  where: "地点状语从句", why: "宾语从句", how: "宾语从句",
};
const POS_VERB_CUES = new Set([
  "ask", "buy", "call", "change", "check", "choose", "come", "do", "drive", "eat", "enjoy", "expect",
  "fancy", "feel", "find", "get", "give", "go", "happen", "have", "help", "hope", "keep", "learn",
  "leave", "like", "live", "look", "love", "make", "mean", "need", "notice", "offer", "pay", "plan",
  "play", "put", "recommend", "remember", "say", "see", "send", "show", "start", "stay", "take", "tell",
  "think", "try", "use", "visit", "want", "work", "write",
]);
const POSSESSIVE_OR_DETERMINER = new Set(["a", "an", "the", "this", "that", "these", "those", "my", "your", "his", "her", "its", "our", "their", "some", "any", "each", "every", "many", "much", "few", "several", "what", "which"]);
const PHRASAL_PARTICLES = new Set(["about", "ahead", "away", "back", "down", "in", "off", "on", "out", "over", "through", "up"]);
const TIME_UNITS = new Set(["day", "days", "week", "weeks", "month", "months", "year", "years", "hour", "hours", "minute", "minutes", "second", "seconds", "morning", "afternoon", "evening", "night", "weekend", "summer", "winter", "spring", "autumn", "decade", "century"]);
const cacheLimit = 2_000;

type Token = BbcSyntaxSentenceData["tokens"][number];

function normalizeTags(tokens: Token[]) {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const word = token.text.toLowerCase().replace(/[’‘]/g, "'");
    const previous = tokens[index - 1]?.text.toLowerCase().replace(/[’‘]/g, "'") ?? "";
    const previousTwo = tokens[index - 2]?.text.toLowerCase().replace(/[’‘]/g, "'") ?? "";

    // The lightweight tagger often calls a base verb an adjective after do-support or an infinitive marker.
    if ((["to", "do", "does", "did"].includes(previous) || ["do", "does", "did"].includes(previousTwo)) && POS_VERB_CUES.has(word)) {
      token.pos = "VERB";
    }
    if (BE_FORMS.has(previous) && token.pos === "VERB" && !/(?:ing|ed|en)$/.test(word)) {
      token.pos = "ADJ";
    }
  }
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;
  nlp.readDoc(text).tokens().each((token: { out: (helper: unknown) => string }) => {
    cursor += token.out(nlp.its.precedingSpaces).length;
    const value = token.out(nlp.its.value);
    const original = text.slice(cursor, cursor + value.length);
    if (key(original) !== key(value)) throw new Error("词性分词与原文不一致，请检查该句标点或特殊字符。");
    tokens.push({ text: original, pos: token.out(nlp.its.pos), start: cursor, end: cursor + value.length });
    cursor += value.length;
  });
  normalizeTags(tokens);
  return tokens;
}

function cloneSentence(sentence: BbcSyntaxSentenceData, text = sentence.text): BbcSyntaxSentenceData {
  return {
    ...structuredClone(sentence),
    text,
    tokens: sentence.tokens.map((token) => ({ ...token, text: text.slice(token.start, token.end) })),
  };
}

function cacheSentence(cacheKey: string, sentence: BbcSyntaxSentenceData) {
  if (generatedCache.size >= cacheLimit) generatedCache.delete(generatedCache.keys().next().value!);
  generatedCache.set(cacheKey, sentence);
}

export function buildAutomaticBbcSyntax(text: string): BbcSyntaxSentenceData {
  const cacheKey = text;
  const known = exactReferences.get(key(text));
  if (known && known.text === text) return cloneSentence(known, text);

  const cached = generatedCache.get(cacheKey);
  if (cached) return cloneSentence(cached, text);

  const tokens = tokenize(text);
  const data: BbcSyntaxSentenceData = {
    text,
    tokens,
    level1: [],
    level2: [],
    level3: [],
    level4: [],
    level5: [],
    status: "draft",
  };
  const word = (index: number) => tokens[index]?.text.toLowerCase().replace(/[’‘]/g, "'") ?? "";
  const spansAt = (level: number) => data[`level${level}` as BbcSyntaxLayerKey] as BbcSyntaxSpan[];

  function add(level: number, label: string, start: number, end: number) {
    while (start < end && tokens[start]?.pos === "PUNCT") start += 1;
    while (end > start && tokens[end - 1]?.pos === "PUNCT") end -= 1;
    if (level <= 5 && end > start) spansAt(level).push({ label, start, end });
  }

  function isPredicate(index: number) {
    return Boolean(tokens[index] && ["AUX", "VERB"].includes(tokens[index].pos) && word(index - 1) !== "to");
  }

  function isAdverbialPhrase(start: number, end: number) {
    if (start >= end) return false;
    if (tokens[start].pos === "ADV") return true;
    if (["last", "next", "this", "every", "each"].includes(word(start)) && TIME_UNITS.has(word(start + 1))) return true;
    return tokens[start].pos === "NUM" && TIME_UNITS.has(word(start + 1));
  }

  function findPredicate(start: number, end: number) {
    for (let index = start; index < end; index += 1) if (isPredicate(index)) return index;
    return -1;
  }

  function nounPhraseEnd(start: number, end: number) {
    if (start >= end) return start;
    if (["PRON", "PROPN"].includes(tokens[start].pos) && !POSSESSIVE_OR_DETERMINER.has(word(start))) return start + 1;
    let head = -1;
    for (let index = start; index < Math.min(end, start + 9); index += 1) {
      if (["NOUN", "PROPN"].includes(tokens[index].pos)) {
        head = index;
        break;
      }
      if (["AUX", "VERB", "ADP", "SCONJ", "CCONJ"].includes(tokens[index].pos)) break;
    }
    if (head < 0) return start + 1;
    let result = head + 1;
    while (result < end && ["NOUN", "PROPN"].includes(tokens[result].pos)) result += 1;
    return result;
  }

  function predicateEnd(start: number, end: number) {
    let result = start + 1;
    while (result < end) {
      const token = tokens[result];
      if (word(result) === "to") break;
      if (["AUX", "VERB", "PART"].includes(token.pos) || (token.pos === "ADV" && PHRASAL_PARTICLES.has(word(result)))) result += 1;
      else break;
    }
    return result;
  }

  function findClauseMarker(start: number, end: number) {
    for (let index = start; index < end - 1; index += 1) {
      const marker = word(index);
      if (!CLAUSE_MARKERS[marker] || findPredicate(index + 1, end) < 0) continue;
      const previousPos = tokens[index - 1]?.pos ?? "";
      const relative = ["who", "whom", "whose", "which", "that", "where"].includes(marker)
        && ["NOUN", "PROPN"].includes(previousPos);
      if (index === start && ["who", "whom", "which", "what", "where", "when", "why", "how"].includes(marker) && tokens[index].pos !== "SCONJ") continue;
      if (marker === "that" && !relative && tokens[index].pos !== "SCONJ") continue;
      if (["what", "which"].includes(marker) && !relative && tokens[index].pos !== "SCONJ") continue;
      const label = relative ? "定语从句" : CLAUSE_MARKERS[marker];
      return { index, label, relative };
    }
    return null;
  }

  function findCoordinatedClause(start: number, end: number) {
    for (let index = start + 1; index < end - 1; index += 1) {
      if (!["and", "but", "or"].includes(word(index)) || findPredicate(start, index) < 0) continue;
      const next = index + 1;
      if (!["PRON", "DET", "NOUN", "PROPN"].includes(tokens[next].pos)) continue;
      if (findPredicate(next, end) >= 0) return index;
    }
    return -1;
  }

  function predicateGroups(start: number, end: number) {
    const groups: number[] = [];
    for (let index = start; index < end; index += 1) {
      if (!isPredicate(index)) continue;
      groups.push(index);
      let hasAuxiliary = tokens[index].pos === "AUX";
      while (index + 1 < end) {
        if (isPredicate(index + 1)) {
          index += 1;
          hasAuxiliary ||= tokens[index].pos === "AUX";
          continue;
        }
        if (hasAuxiliary && tokens[index + 1].pos === "ADV" && isPredicate(index + 2)) {
          index += 2;
          hasAuxiliary ||= tokens[index].pos === "AUX";
          continue;
        }
        break;
      }
    }
    return groups;
  }

  function relativeClause(start: number, end: number) {
    const relatives = new Set(["who", "whom", "whose", "which", "that", "where"]);

    for (let open = start + 1; open < end - 3; open += 1) {
      if (tokens[open].text !== "," || !["NOUN", "PROPN"].includes(tokens[open - 1].pos)) continue;
      const marker = open + 1;
      if (!relatives.has(word(marker))) continue;
      const close = tokens.findIndex((token, index) => index > marker && index < end && token.text === ",");
      if (close <= marker || findPredicate(marker, close) < 0 || findPredicate(close + 1, end) < 0) continue;
      return { marker, end: close, mainPredicate: findPredicate(close + 1, end) };
    }

    // A restrictive relative clause after a noun is safe to split when it has one
    // predicate group and the main clause resumes with a second group.
    for (let marker = start + 1; marker < end - 3; marker += 1) {
      if (!relatives.has(word(marker)) || !["NOUN", "PROPN"].includes(tokens[marker - 1].pos)) continue;
      if (findPredicate(start, marker) >= 0) continue;
      const groups = predicateGroups(marker + 1, end);
      if (groups.length === 2) return { marker, end: groups[1], mainPredicate: groups[1] };
    }

    return null;
  }

  function parseRelativeClause(start: number, end: number, level: number) {
    const relative = relativeClause(start, end);
    if (!relative || relative.mainPredicate < relative.end) return false;

    add(level, "主语", start, relative.end);
    add(level + 1, "定语从句", relative.marker, relative.end);
    const relativePredicate = findPredicate(relative.marker + 1, relative.end);
    const hasExplicitSubject = tokens.slice(relative.marker + 1, relativePredicate).some((token) =>
      ["PRON", "DET", "NOUN", "PROPN"].includes(token.pos),
    );
    if (relativePredicate > relative.marker && !hasExplicitSubject) add(level + 2, "主语", relative.marker, relative.marker + 1);
    parseClause(relative.marker + 1, relative.end, level + 2);

    const predicate = relative.mainPredicate;
    const predicateFinish = predicateEnd(predicate, end);
    add(level, "谓语", predicate, predicateFinish);
    if (predicateFinish < end) {
      const linking = LINKING_VERBS.has(word(predicate))
        && (BE_FORMS.has(word(predicate)) || tokens[predicateFinish].pos !== "ADP");
      const marker = findClauseMarker(predicateFinish, end);
      if (marker) {
        add(level, marker.label, marker.index, end);
        parseClause(marker.index, end, level + 1);
      } else {
        const label = linking ? "表语" : isAdverbialPhrase(predicateFinish, end) || tokens[predicateFinish].pos === "ADP" ? "状语" : "宾语";
        add(level, label, predicateFinish, end);
      }
    }
    return true;
  }

  function parseClause(start: number, end: number, level: number) {
    while (start < end && tokens[start].pos === "PUNCT") start += 1;
    while (end > start && tokens[end - 1].pos === "PUNCT") end -= 1;
    if (start >= end || level > 5) return;

    const discourse = ["well", "okay", "right", "now", "so"].includes(word(start));
    if (discourse && tokens[start + 1]?.text === ",") {
      add(level, "状语", start, start + 1);
      parseClause(start + 2, end, level);
      return;
    }

    const firstPredicate = findPredicate(start, end);
    const initialComma = tokens.findIndex((token, index) => index >= start && index < firstPredicate && token.text === ",");
    if (initialComma > start && ["ADP", "ADV"].includes(tokens[start].pos)) {
      add(level, "状语", start, initialComma);
      parseClause(initialComma + 1, end, level);
      return;
    }

    if (parseRelativeClause(start, end, level)) return;

    const coordinated = findCoordinatedClause(start, end);
    if (coordinated >= 0) {
      parseClause(start, coordinated, level);
      parseClause(coordinated + 1, end, level);
      return;
    }

    const marker = findClauseMarker(start, end);
    if (marker) {
      const comma = tokens.findIndex((token, index) => index > marker.index && index < end && token.text === ",");
      const clauseEnd = comma >= 0 ? comma : end;
      if (marker.index === start) {
        add(level, marker.label, start, clauseEnd);
        parseClause(start + 1, clauseEnd, level + 1);
      } else if (marker.relative) {
        parseClause(start, marker.index, level);
        add(level + 1, marker.label, marker.index, clauseEnd);
        const relativePredicate = findPredicate(marker.index + 1, clauseEnd);
        const hasExplicitSubject = tokens.slice(marker.index + 1, relativePredicate).some((token) =>
          ["PRON", "DET", "NOUN", "PROPN"].includes(token.pos),
        );
        if (relativePredicate > marker.index && !hasExplicitSubject) add(level + 2, "主语", marker.index, marker.index + 1);
        parseClause(marker.index + 1, clauseEnd, level + 2);
      } else {
        parseClause(start, marker.index, level);
        add(level, marker.label, marker.index, clauseEnd);
        parseClause(marker.index + 1, clauseEnd, level + 1);
      }
      if (comma >= 0) parseClause(comma + 1, end, level);
      return;
    }

    parseClauseCore(start, end, level);
  }

  function parseClauseCore(start: number, end: number, level: number) {
    let clauseStart = start;
    let predicate = findPredicate(clauseStart, end);
    if (predicate < 0) return;

    const first = word(clauseStart);
    const questionWords = new Set(["what", "who", "whom", "where", "when", "why", "how", "which"]);
    if (questionWords.has(first) && predicate > clauseStart && tokens[predicate].pos === "AUX") {
      const label = ["where", "when", "why", "how"].includes(first) ? "状语" : BE_FORMS.has(word(predicate)) ? "表语" : "宾语";
      add(level, label, clauseStart, predicate);
      clauseStart = predicate;
      predicate = findPredicate(clauseStart, end);
    }

    if (predicate < 0) return;
    const startsWithAuxiliary = predicate === clauseStart && tokens[predicate].pos === "AUX";
    let subjectStart = clauseStart;
    let subjectEnd = predicate;
    let predicateStart = predicate;
    let predicateFinish = predicateEnd(predicate, end);
    let mainVerb = predicate;

    if (startsWithAuxiliary) {
      const afterAuxiliary = predicate + 1;
      const isBe = BE_FORMS.has(word(predicate));
      const candidateSubjectEnd = nounPhraseEnd(afterAuxiliary, end);
      const followingVerb = findPredicate(candidateSubjectEnd, end);
      const progressiveOrPassive = followingVerb >= 0 && /(?:ing|ed|en)$/.test(word(followingVerb));

      if (afterAuxiliary < end && (tokens[afterAuxiliary].pos === "PRON" || ["DET", "NOUN", "PROPN"].includes(tokens[afterAuxiliary].pos))) {
        subjectStart = afterAuxiliary;
        subjectEnd = candidateSubjectEnd;
        add(level, "谓语", predicate, predicate + 1);
        add(level, "主语", subjectStart, subjectEnd);
        if (!isBe || progressiveOrPassive) {
          if (followingVerb >= 0) {
            mainVerb = followingVerb;
            predicateStart = followingVerb;
            predicateFinish = predicateEnd(followingVerb, end);
            add(level, "谓语", predicateStart, predicateFinish);
          }
        } else {
          predicateStart = predicate;
          predicateFinish = predicate + 1;
        }
      } else {
        const nextVerb = findPredicate(afterAuxiliary, end);
        mainVerb = nextVerb >= 0 ? nextVerb : predicate;
        subjectStart = predicate;
        subjectEnd = predicate;
        predicateStart = predicate;
        predicateFinish = predicateEnd(predicate, end);
        add(level, "谓语", predicateStart, predicateFinish);
      }
    } else if (predicate > clauseStart) {
      subjectStart = clauseStart;
      subjectEnd = predicate;
    }

    const imperative = !startsWithAuxiliary && (predicate === clauseStart || (word(clauseStart) === "please" && predicate === clauseStart + 1));
    if (imperative) {
      const verbStart = word(clauseStart) === "please" ? clauseStart + 1 : clauseStart;
      predicateStart = verbStart;
      mainVerb = verbStart;
      predicateFinish = predicateEnd(verbStart, end);
      add(level, "谓语", predicateStart, predicateFinish);
    } else if (!startsWithAuxiliary && subjectEnd > subjectStart) {
      if (word(subjectStart) === "there" && BE_FORMS.has(word(predicate)) && subjectEnd < end) {
        const actualSubjectStart = predicate + 1;
        const actualSubjectEnd = nounPhraseEnd(actualSubjectStart, end);
        add(level, "状语", subjectStart, subjectStart + 1);
        add(level, "谓语", predicate, predicate + 1);
        add(level, "主语", actualSubjectStart, actualSubjectEnd);
        subjectStart = actualSubjectStart;
        subjectEnd = actualSubjectEnd;
        predicateStart = predicate;
        predicateFinish = predicate + 1;
      } else {
        add(level, "主语", subjectStart, subjectEnd);
        add(level, "谓语", predicateStart, predicateFinish);
      }
    } else if (!startsWithAuxiliary && imperative) {
      add(level, "谓语", predicateStart, predicateFinish);
    }

    const complementStart = startsWithAuxiliary && !BE_FORMS.has(word(predicate)) && mainVerb !== predicate
      ? predicateFinish
      : startsWithAuxiliary && BE_FORMS.has(word(predicate))
        ? (mainVerb !== predicate ? predicateFinish : subjectEnd)
        : predicateFinish;

    if (complementStart < end) {
      const tailHasClause = findPredicate(complementStart, end) >= 0;
      const mainHead = word(mainVerb);
      if (tailHasClause && CLAUSE_TAKING_VERBS.has(mainHead) && word(complementStart) !== "to") {
        add(level, "宾语从句", complementStart, end);
        parseClause(complementStart, end, level + 1);
      } else {
        const linkingVerb = LINKING_VERBS.has(word(mainVerb))
          && (BE_FORMS.has(word(mainVerb)) || tokens[complementStart].pos !== "ADP");
        const beCopula = startsWithAuxiliary && BE_FORMS.has(word(predicate)) && mainVerb === predicate;
        const linking = linkingVerb || beCopula;
        const preposition = linking ? -1 : tokens.findIndex((token, index) => index >= complementStart && index < end && token.pos === "ADP");
        const complementEnd = preposition >= 0 ? preposition : end;
        if (complementEnd > complementStart) {
          const label = linking ? "表语" : isAdverbialPhrase(complementStart, end) ? "状语" : "宾语";
          add(level, label, complementStart, complementEnd);
        }
        if (preposition >= complementStart) add(level, "状语", preposition, end);
      }
    }

  }

  parseClause(0, tokens.length, 1);
  for (let level = 1; level <= 5; level += 1) {
    const spans = spansAt(level).sort((left, right) => left.start - right.start || left.end - right.end);
    const accepted: BbcSyntaxSpan[] = [];
    for (const span of spans) {
      if (accepted.some((previous) => span.start < previous.end && previous.start < span.end)) continue;
      if (level > 1 && !span.label.includes("从句") && !spansAt(level - 1).some((parent) => span.start >= parent.start && span.end <= parent.end)) continue;
      accepted.push(span);
    }
    data[`level${level}` as BbcSyntaxLayerKey] = accepted;
  }

  cacheSentence(cacheKey, data);
  return cloneSentence(data, text);
}
