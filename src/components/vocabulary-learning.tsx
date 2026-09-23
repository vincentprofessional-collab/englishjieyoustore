"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from "react";

import { VocabularyDetailShell } from "@/components/vocabulary-detail-shell";
import { VocabularyDetailContent } from "@/components/vocabulary-detail-content";
import { VocabularyFavoriteButton } from "@/components/vocabulary-favorite-button";
import { VocabularyShareButton } from "@/components/vocabulary-share-button";
import type { VocabularyUsageExample } from "@/lib/vocabulary/examples";
import type { LearningBookKey, LearningWord } from "@/lib/vocabulary/learning";
import type { LocalVocabularyEntry, VocabularyFormationPart } from "@/lib/vocabulary/local-vocabulary";
import type { VocabularyPhraseMatch } from "@/lib/vocabulary/phrases";

type CollectionKey = "familiar" | "vague" | "unfamiliar";
type SelectionKey = LearningBookKey | CollectionKey;
type Voice = "us" | "uk";
type SortOrder = "sequential" | "random";
type Familiarity = "familiar" | "vague" | "unfamiliar";
type Outcome = Familiarity | "unscored";
type Plan = "short-term" | "long-term" | "done";
type RoundPhase = "idle" | "playing" | "recording" | "scoring" | "awaiting";

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  0?: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = Event & {
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onerror: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type ProgressEntry = {
  completed?: boolean;
  familiarity: Familiarity | null;
  lastOutcome: Outcome | null;
  lastReviewedAt: number | null;
  modeIndex: number;
  nextReviewAt: number | null;
  plan: Plan;
  spellingCorrectStreak: number;
  spellingErrorCount: number;
  spellingHadError: boolean;
  spellingUnansweredCount: number;
};

type ProgressStore = Record<string, ProgressEntry>;

type VocabularyLearningProps = {
  bookCounts: Record<LearningBookKey, { added: number; total: number }>;
  books: Array<{ description: string; key: LearningBookKey; label: string }>;
  sourceCount: number;
};

type VocabularyDetailPayload = {
  entry: LocalVocabularyEntry;
  formationParts: VocabularyFormationPart[];
  phrases: VocabularyPhraseMatch[];
  usageExamples: VocabularyUsageExample[];
};

const STORAGE_KEY = "ielts-vocabulary-learning-v1";
const COLLECTIONS: Array<{ key: CollectionKey; label: string }> = [
  { key: "familiar", label: "熟悉" },
  { key: "vague", label: "模糊" },
  { key: "unfamiliar", label: "生僻" },
];
const THREE_MINUTES = 3 * 60 * 1000;
const ORAL_FAMILIAR_SCORE = 80;
const ORAL_VAGUE_SCORE = 50;

function emptyProgress(): ProgressEntry {
  return {
    completed: false,
    familiarity: null,
    lastOutcome: null,
    lastReviewedAt: null,
    modeIndex: 0,
    nextReviewAt: null,
    plan: "short-term",
    spellingCorrectStreak: 0,
    spellingErrorCount: 0,
    spellingHadError: false,
    spellingUnansweredCount: 0,
  };
}

function progressFor(store: ProgressStore, id: string) {
  return store[id] ?? emptyProgress();
}

function isCollection(selection: SelectionKey): selection is CollectionKey {
  return COLLECTIONS.some((collection) => collection.key === selection);
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  const browserWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

function normalizeSpokenWord(value: string) {
  return value.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

function levenshteinDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const current = [leftIndex + 1];
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex] === right[rightIndex] ? 0 : 1;
      current.push(Math.min(
        current[rightIndex] + 1,
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + substitutionCost,
      ));
    }
    for (let index = 0; index < current.length; index += 1) previous[index] = current[index];
  }
  return previous[right.length];
}

function scoreSpokenWord(transcript: string, target: string) {
  const targetWord = normalizeSpokenWord(target);
  const spokenWords = normalizeSpokenWord(transcript).split(" ").filter(Boolean);
  if (!targetWord || spokenWords.length === 0) return 0;

  return spokenWords.reduce((best, spokenWord) => {
    if (spokenWord === targetWord) return 100;
    const distance = levenshteinDistance(spokenWord, targetWord);
    const similarity = Math.max(0, 1 - distance / Math.max(spokenWord.length, targetWord.length));
    return Math.max(best, Math.round(similarity * 100));
  }, 0);
}

function familiarityFromScore(score: number): Familiarity {
  if (score >= ORAL_FAMILIAR_SCORE) return "familiar";
  if (score >= ORAL_VAGUE_SCORE) return "vague";
  return "unfamiliar";
}

function splitDefinitionLines(value: string) {
  const lines = value
    .split(/\s*\/\s*(?=[a-z]+(?:\.[a-z]+)*\.\s*)/i)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines : [value];
}

function DefinitionDisplay({ value, prominent = false }: { value: string; prominent?: boolean }) {
  const lines = splitDefinitionLines(value);

  return (
    <div className={`vocabulary-card-definition${prominent ? " prominent" : ""}`}>
      {lines.map((line, index) => (
        <div className="vocabulary-card-definition-line" key={`${line}-${index}`}>
          {line}
        </div>
      ))}
    </div>
  );
}

function toLookupEntry(word: LearningWord): LocalVocabularyEntry {
  return {
    antonyms: word.antonyms,
    definitionCn: word.definitionCn,
    definitionGroups: word.definitionGroups,
    definitionLines: word.definitionLines,
    englishDefinitions: word.englishDefinitions,
    englishExamples: word.englishExamples,
    etymologyReferences: [],
    etymologySource: word.etymologySource,
    etymologyStory: word.etymologyStory,
    formation: word.formation,
    inflections: word.inflections,
    level: word.level,
    normalizedWord: word.id,
    partOfSpeech: word.partOfSpeech,
    phonetic: word.phonetic,
    reviewNotes: word.reviewNotes,
    root: word.root,
    rootReferences: [],
    sourceRowNumber: 0,
    synonyms: word.synonyms,
    ukAudioUrl: word.ukAudioUrl,
    ukPhonetic: word.ukPhonetic,
    usAudioUrl: word.usAudioUrl,
    usPhonetic: word.usPhonetic,
    word: word.word,
  };
}

function LookupDetails({ word }: { word: LearningWord }) {
  const definitionGroups = word.definitionGroups.length > 0
    ? word.definitionGroups
    : [{
        definitions: word.definitionLines.length > 0 ? word.definitionLines : splitDefinitionLines(word.definitionCn),
        partOfSpeech: word.partOfSpeech,
        text: word.definitionCn,
      }];

  return (
    <div className="vocabulary-learning-lookup-details vocabulary-detail-content">
      <section className="word-detail-section vocabulary-lookup-section">
        <h2>中文释义</h2>
        <div className="definition-rows large vocabulary-lookup-definition-list">
          {definitionGroups.map((group, index) => (
            <p className={group.partOfSpeech ? undefined : "no-part-of-speech"} key={`${group.partOfSpeech}-${index}`}>
              {group.partOfSpeech ? <strong>{group.partOfSpeech}</strong> : null}
              <span>{group.definitions.join("；") || group.text}</span>
            </p>
          ))}
        </div>
      </section>

      {word.englishDefinitions.length > 0 ? (
        <section className="word-detail-section vocabulary-lookup-section">
          <h2>英文释义</h2>
          <div className="english-definition-list vocabulary-lookup-lines">
            {word.englishDefinitions.map((definition, index) => <p key={`${definition}-${index}`}>{definition}</p>)}
          </div>
        </section>
      ) : null}

      {word.inflections.length > 0 ? (
        <section className="word-detail-section vocabulary-lookup-section">
          <h2>词形变化</h2>
          <div className="word-inflection-grid vocabulary-lookup-inflections">
            {word.inflections.map((inflection) => (
              <span key={`${inflection.label}-${inflection.value}`}><b>{inflection.label}</b><strong>{inflection.value}</strong></span>
            ))}
          </div>
        </section>
      ) : null}

      {word.synonyms.length > 0 || word.antonyms.length > 0 ? (
        <section className="word-detail-section vocabulary-lookup-section">
          <h2>近义词与反义词</h2>
          <div className="vocabulary-lookup-lines">
            {word.synonyms.length > 0 ? <p><b>近义词</b>{word.synonyms.join("、")}</p> : null}
            {word.antonyms.length > 0 ? <p><b>反义词</b>{word.antonyms.join("、")}</p> : null}
          </div>
        </section>
      ) : null}

      {word.etymologyStory ? (
        <section className="word-detail-section vocabulary-lookup-section">
          <h2>词源故事</h2>
          <div className="vocabulary-lookup-lines">
            <p>{word.etymologyStory}</p>
          </div>
        </section>
      ) : null}

      {word.formation || word.root ? (
        <section className="word-detail-section vocabulary-lookup-section">
          <h2>词根词缀</h2>
          <div className="vocabulary-lookup-lines">
            {word.formation ? <p><b>构词</b>{word.formation}</p> : null}
            {word.root ? <p><b>词根</b>{word.root}</p> : null}
          </div>
        </section>
      ) : null}

      {word.etymologySource ? (
        <section className="word-detail-section vocabulary-lookup-section">
          <h2>词源来源</h2>
          <div className="vocabulary-lookup-lines">
            <p className="vocabulary-lookup-muted">{word.etymologySource}</p>
          </div>
        </section>
      ) : null}

      {word.englishExamples.length > 0 ? (
        <section className="word-detail-section vocabulary-lookup-section">
          <h2>例句</h2>
          <div className="english-example-list vocabulary-lookup-lines">
            {word.englishExamples.map((example, index) => <blockquote className="vocabulary-lookup-example" key={`${example}-${index}`}>{example}</blockquote>)}
          </div>
        </section>
      ) : null}

      {word.reviewNotes.length > 0 ? (
        <section className="word-detail-section vocabulary-lookup-section">
          <h2>温故知新</h2>
          <div className="vocabulary-lookup-lines">
            {word.reviewNotes.map((note, index) => <p key={`${note}-${index}`}>{note}</p>)}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SpellingLetterPreview({ answer, target }: { answer: string; target: string }) {
  const letters = Array.from(answer);
  if (letters.length === 0) return null;
  const expected = Array.from(target.toLowerCase());

  return (
    <div aria-label="拼写逐字反馈" className="vocabulary-spelling-letter-preview">
      {letters.map((letter, index) => {
        const isCorrect = letter.toLowerCase() === expected[index];
        return <span className={`vocabulary-spelling-letter ${isCorrect ? "is-correct" : "is-wrong"}`} key={`${index}-${letter}`}>{letter}</span>;
      })}
    </div>
  );
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

async function playSiteAudio(audioUrl: string) {
  return await new Promise<boolean>((resolve) => {
    const audio = new Audio(audioUrl);
    let settled = false;
    let timeout = 0;
    const finish = (played: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      if (!played) audio.pause();
      resolve(played);
    };
    audio.addEventListener("ended", () => finish(true), { once: true });
    audio.addEventListener("error", () => finish(false), { once: true });
    timeout = window.setTimeout(() => finish(false), 8000);
    const playback = audio.play();
    if (playback) {
      void playback.catch(() => finish(false));
    }
  });
}

async function playAudioOnce(word: LearningWord, voice: Voice) {
  const preferredAudioUrl = voice === "us" ? word.usAudioUrl : word.ukAudioUrl;
  const alternateAudioUrl = voice === "us" ? word.ukAudioUrl : word.usAudioUrl;
  const siteAudioUrls = Array.from(new Set([preferredAudioUrl, alternateAudioUrl].filter(Boolean)));

  for (const audioUrl of siteAudioUrls) {
    if (await playSiteAudio(audioUrl)) return false;
  }

  if (typeof window.speechSynthesis === "undefined") {
    return true;
  }

  await new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = voice === "us" ? "en-US" : "en-GB";
    utterance.rate = 0.88;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    utterance.addEventListener("end", finish, { once: true });
    utterance.addEventListener("error", finish, { once: true });
    window.setTimeout(finish, 6000);
    window.speechSynthesis.speak(utterance);
  });

  return true;
}

async function playWordAudio(word: LearningWord, voice: Voice, repeats: number) {
  let usedBrowserVoice = false;
  for (let index = 0; index < repeats; index += 1) {
    usedBrowserVoice = (await playAudioOnce(word, voice)) || usedBrowserVoice;
  }
  return usedBrowserVoice;
}

function chooseNextWord(
  words: LearningWord[],
  store: ProgressStore,
  now: number,
  order: SortOrder,
  excludeId: string | null,
  allowCompleted: boolean,
) {
  const available = words.filter((word) => {
    if (word.id === excludeId) return false;
    const progress = progressFor(store, word.id);
    if (!allowCompleted && progress.completed) return false;
    return progress.nextReviewAt === null || progress.nextReviewAt <= now || allowCompleted;
  });

  const due = available.filter((word) => {
    const nextReviewAt = progressFor(store, word.id).nextReviewAt;
    return nextReviewAt === null || nextReviewAt <= now;
  });
  const pool = due.length > 0 ? due : available;
  if (pool.length === 0) return null;
  if (order === "random") return shuffle(pool)[0];

  return pool[0];
}

export function VocabularyLearning({ bookCounts, books }: VocabularyLearningProps) {
  const [selected, setSelected] = useState<SelectionKey>("初中");
  const [voice, setVoice] = useState<Voice>("us");
  const [order, setOrder] = useState<SortOrder>("sequential");
  const [progress, setProgress] = useState<ProgressStore>({});
  const [hydrated, setHydrated] = useState(false);
  const [words, setWords] = useState<LearningWord[]>([]);
  const [detailPayload, setDetailPayload] = useState<VocabularyDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadNonce, setLoadNonce] = useState(0);
  const [currentWordId, setCurrentWordId] = useState<string | null>(null);
  const [roundNonce, setRoundNonce] = useState(0);
  const [phase, setPhase] = useState<RoundPhase>("idle");
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [roundHadSpellingError, setRoundHadSpellingError] = useState(false);
  const [spellingAnswerShown, setSpellingAnswerShown] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [oralScoreFeedback, setOralScoreFeedback] = useState<number | null>(null);
  const [advancePending, setAdvancePending] = useState(false);
  const [openPreferenceMenu, setOpenPreferenceMenu] = useState<"accent" | "order" | null>(null);

  const roundTokenRef = useRef(0);
  const recordingRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const holdingMicRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const recordingFinishedRef = useRef(false);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const oralTranscriptRef = useRef("");
  const oralRecognitionErrorRef = useRef(false);
  const oralOutcomeLockedRef = useRef(false);
  const advanceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          order?: SortOrder;
          progress?: ProgressStore;
          voice?: Voice;
        };
        if (saved.voice === "us" || saved.voice === "uk") setVoice(saved.voice);
        if (saved.order === "sequential" || saved.order === "random") setOrder(saved.order);
        if (saved.progress && typeof saved.progress === "object") setProgress(saved.progress);
      }
    } catch {
      // A corrupt anonymous cache should not prevent the vocabulary page from opening.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ order, progress, voice }));
    } catch {
      // Private or embedded browsers may expose localStorage but reject writes.
    }
  }, [hydrated, order, progress, voice]);

  useEffect(() => {
    const controller = new AbortController();
    const requestedBook = isCollection(selected) ? "全部" : selected;
    setLoading(true);
    setLoadError("");
    setWords([]);
    setCurrentWordId(null);
    void fetch(`/api/vocabulary-learning?book=${encodeURIComponent(requestedBook)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("词库加载失败");
        return (await response.json()) as { words: LearningWord[] };
      })
      .then((payload) => setWords(Array.isArray(payload.words) ? payload.words : []))
      .catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
        setLoadError(error instanceof Error ? error.message : "词库加载失败");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [loadNonce, selected]);

  const visibleWords = useMemo(() => {
    if (!isCollection(selected)) return words;
    return words.filter((word) => progressFor(progress, word.id).familiarity === selected);
  }, [progress, selected, words]);

  const currentWord = useMemo(
    () => visibleWords.find((word) => word.id === currentWordId) ?? null,
    [currentWordId, visibleWords],
  );
  const currentProgress = currentWord ? progressFor(progress, currentWord.id) : emptyProgress();
  const modeIndex = Math.min(3, Math.max(0, currentProgress.modeIndex));

  useEffect(() => {
    setDetailPayload(null);
    if (!currentWord) return;

    const controller = new AbortController();
    void fetch(`/api/vocabulary-hint?word=${encodeURIComponent(currentWord.word)}&detail=1`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("详情加载失败");
        return (await response.json()) as VocabularyDetailPayload;
      })
      .then((payload) => {
        if (payload?.entry && Array.isArray(payload.formationParts) && Array.isArray(payload.phrases) && Array.isArray(payload.usageExamples)) {
          setDetailPayload(payload);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setDetailPayload(null);
      });

    return () => controller.abort();
  }, [currentWord?.id]);

  useEffect(() => {
    if (!hydrated || loading || currentWordId !== null || visibleWords.length === 0) return;
    const next = chooseNextWord(
      visibleWords,
      progress,
      Date.now(),
      order,
      null,
      isCollection(selected),
    );
    setCurrentWordId(next?.id ?? null);
  }, [currentWordId, hydrated, loading, order, progress, selected, visibleWords]);

  useEffect(() => {
    if (!hydrated || loading || currentWordId !== null || visibleWords.length > 0) return;
    setCurrentWordId(null);
  }, [currentWordId, hydrated, loading, visibleWords.length]);

  useEffect(() => {
    if (currentWordId && !visibleWords.some((word) => word.id === currentWordId)) {
      setCurrentWordId(null);
    }
  }, [currentWordId, visibleWords]);

  useEffect(() => {
    const token = ++roundTokenRef.current;
    setPhase("idle");
    setRevealed(false);
    setAnswer("");
    setRoundHadSpellingError(false);
    setSpellingAnswerShown(false);
    setRecordingError("");
    setOralScoreFeedback(null);
    setAdvancePending(false);
    oralTranscriptRef.current = "";
    oralRecognitionErrorRef.current = false;
    oralOutcomeLockedRef.current = false;

    if (!hydrated || !currentWord || currentProgress.completed) return;

    const startRound = async () => {
      if (modeIndex === 0 || modeIndex === 1) {
        setPhase("playing");
        await playWordAudio(currentWord, voice, 1);
        if (roundTokenRef.current !== token) return;
        await new Promise<void>((resolve) => window.setTimeout(resolve, 2000));
        if (roundTokenRef.current !== token) return;
        setRevealed(true);
        setPhase("awaiting");
        return;
      }

      if (modeIndex === 2) {
        setPhase("awaiting");
        return;
      }

      if (roundTokenRef.current !== token) return;
      setPhase("awaiting");
    };

    void startRound();
  }, [currentProgress.completed, currentWord, hydrated, modeIndex, roundNonce, voice]);

  const selectWord = useCallback((nextSelection: SelectionKey) => {
    if (advancePending) return;
    setOralScoreFeedback(null);
    setSelected(nextSelection);
  }, [advancePending]);

  const moveToNextWord = useCallback(
    (updatedProgress: ProgressStore) => {
      if (!currentWord) return;
      const next = chooseNextWord(
        visibleWords,
        updatedProgress,
        Date.now(),
        order,
        currentWord.id,
        isCollection(selected),
      );
      setCurrentWordId(next?.id ?? null);
      setRoundNonce((value) => value + 1);
    },
    [currentWord, order, selected, visibleWords],
  );

  const commitOutcome = useCallback(
    (
      outcome: Outcome,
      spellingDetails?: { correct: boolean; hadError: boolean; unanswered: boolean },
      oralScore?: number,
      advanceDelayMs = 1000,
    ) => {
      if (!currentWord || outcome === "unscored" || advancePending) return;
      const timestamp = Date.now();
      const previous = progressFor(progress, currentWord.id);
      const isPass = outcome === "familiar";
      const next: ProgressEntry = {
        ...previous,
        familiarity: outcome,
        lastOutcome: outcome,
        lastReviewedAt: timestamp,
        nextReviewAt: timestamp + THREE_MINUTES,
      };

      if (spellingDetails) {
        const wrong = !spellingDetails.correct || spellingDetails.hadError;
        next.spellingHadError = previous.spellingHadError || wrong;
        next.spellingErrorCount = previous.spellingErrorCount + (wrong ? 1 : 0);
        next.spellingUnansweredCount = previous.spellingUnansweredCount + (spellingDetails.unanswered ? 1 : 0);
        next.spellingCorrectStreak = spellingDetails.correct && !spellingDetails.hadError
          ? previous.spellingCorrectStreak + 1
          : 0;
      }

      setOralScoreFeedback(typeof oralScore === "number" ? oralScore : null);
      if (isPass && modeIndex < 3) {
        next.modeIndex = modeIndex + 1;
      } else if (isPass && previous.plan === "short-term") {
        next.plan = "long-term";
        next.modeIndex = 0;
        next.nextReviewAt = timestamp + 20 * 60 * 1000;
      } else if (isPass && previous.plan === "long-term" && modeIndex === 0) {
        next.modeIndex = 1;
        next.nextReviewAt = timestamp + 24 * 60 * 60 * 1000;
      } else if (isPass && previous.plan === "long-term" && modeIndex === 1) {
        next.modeIndex = 2;
        next.nextReviewAt = timestamp + 3 * 24 * 60 * 60 * 1000;
      } else if (isPass && previous.plan === "long-term" && modeIndex === 2) {
        next.modeIndex = 3;
        next.nextReviewAt = timestamp + 7 * 24 * 60 * 60 * 1000;
      } else if (isPass && previous.plan === "long-term" && modeIndex === 3) {
        next.plan = "done";
        next.completed = true;
        next.nextReviewAt = null;
      } else {
        next.modeIndex = modeIndex;
      }

      const updatedProgress = { ...progress, [currentWord.id]: next };
      setAdvancePending(true);
      if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = window.setTimeout(() => {
        advanceTimerRef.current = null;
        setAdvancePending(false);
        setProgress(updatedProgress);
        moveToNextWord(updatedProgress);
      }, advanceDelayMs);
    },
    [advancePending, currentWord, modeIndex, moveToNextWord, progress],
  );

  const handleRecognitionOutcome = useCallback(
    (outcome: Familiarity) => {
      if (modeIndex === 2) {
        if (oralScoreFeedback === null) return;
        const scoredOutcome = familiarityFromScore(oralScoreFeedback);
        if (outcome !== scoredOutcome) return;
        commitOutcome(scoredOutcome, undefined, oralScoreFeedback);
        return;
      }

      if (modeIndex > 1) return;
      commitOutcome(outcome);
    },
    [commitOutcome, modeIndex, oralScoreFeedback],
  );

  const spellingCorrect = currentWord ? answer.trim().toLowerCase() === currentWord.word.trim().toLowerCase() : false;

  const submitSpelling = useCallback(
    (requestedOutcome: Familiarity) => {
      if (!currentWord || modeIndex !== 3 || phase === "recording") return;
      const correct = answer.trim().toLowerCase() === currentWord.word.trim().toLowerCase();
      if (correct && !roundHadSpellingError) {
        commitOutcome(requestedOutcome, {
          correct: true,
          hadError: false,
          unanswered: false,
        });
        return;
      }

      if (requestedOutcome === "familiar") return;
      if (!spellingAnswerShown) {
        setRevealed(true);
        setSpellingAnswerShown(true);
      }

      commitOutcome(requestedOutcome, {
        correct,
        hadError: roundHadSpellingError,
        unanswered: answer.trim().length === 0,
      }, undefined, 2000);
    },
    [answer, commitOutcome, currentWord, modeIndex, phase, roundHadSpellingError, spellingAnswerShown],
  );

  const finishRecording = useCallback(() => {
    if (recordingFinishedRef.current || oralOutcomeLockedRef.current) return;
    recordingFinishedRef.current = true;
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    recordingRef.current = null;
    const recognition = speechRecognitionRef.current;
    speechRecognitionRef.current = null;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Recognition may already have ended when the microphone is released.
      }
    }

    setPhase("scoring");
    const token = roundTokenRef.current;
    window.setTimeout(() => {
      if (roundTokenRef.current !== token || !currentWord || oralOutcomeLockedRef.current) return;
      if (oralRecognitionErrorRef.current) {
        setRevealed(true);
        setRecordingError("语音识别没有完成，本轮未产生分数，请重新按住录音。");
        setPhase("awaiting");
        return;
      }

      const score = scoreSpokenWord(oralTranscriptRef.current, currentWord.word);
      oralOutcomeLockedRef.current = true;
      setRevealed(true);
      setOralScoreFeedback(score);
      setPhase("awaiting");
    }, 500);
  }, [currentWord]);

  const startRecording = useCallback(async () => {
    if (!currentWord || modeIndex !== 2 || phase === "recording" || phase === "scoring" || advancePending || oralOutcomeLockedRef.current) return;
    setRevealed(false);
    setRecordingError("");
    stopRequestedRef.current = false;
    recordingFinishedRef.current = false;
    oralTranscriptRef.current = "";
    oralRecognitionErrorRef.current = false;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingError("当前浏览器不支持录音；本轮未产生评分。");
      setPhase("awaiting");
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setRecordingError("当前浏览器不支持口述自动评分，请使用 Chrome 或 Edge 重试。");
      setPhase("awaiting");
      return;
    }

    let stream: MediaStream | null = null;
    let recognition: SpeechRecognitionLike | null = null;
    let recorder: MediaRecorder | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!holdingMicRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        setPhase("awaiting");
        return;
      }

      recognition = new SpeechRecognition();
      recognition.lang = voice === "us" ? "en-US" : "en-GB";
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const transcripts: string[] = [];
        for (let index = 0; index < event.results.length; index += 1) {
          const transcript = event.results[index]?.[0]?.transcript;
          if (transcript) transcripts.push(transcript);
        }
        oralTranscriptRef.current = transcripts.join(" ");
      };
      recognition.onerror = (event) => {
        const error = (event as Event & { error?: string }).error;
        if (error !== "aborted") oralRecognitionErrorRef.current = true;
      };
      speechRecognitionRef.current = recognition;
      recognition.start();

      recorder = new MediaRecorder(stream);
      recordingStreamRef.current = stream;
      recordingRef.current = recorder;
      recordingChunksRef.current = [];
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", finishRecording, { once: true });
      setPhase("recording");
      recorder.start();
      if (stopRequestedRef.current) recorder.stop();
    } catch {
      if (recognition) {
        try {
          recognition.stop();
        } catch {
          // The recognition instance may not have started.
        }
      }
      speechRecognitionRef.current = null;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      stream?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      recordingRef.current = null;
      setRecordingError("麦克风未授权或暂时不可用；本轮未产生评分。");
      setPhase("awaiting");
    }
  }, [advancePending, currentWord, finishRecording, modeIndex, phase, voice]);

  const stopRecording = useCallback(() => {
    holdingMicRef.current = false;
    stopRequestedRef.current = true;
    const recorder = recordingRef.current;
    if (!recorder) return;
    if (recorder.state !== "inactive") recorder.stop();
  }, []);

  const restartOralRound = useCallback(() => {
    if (advancePending || oralOutcomeLockedRef.current || phase === "scoring") return;
    setOralScoreFeedback(null);
    setRoundNonce((value) => value + 1);
  }, [advancePending, phase]);

  const updateSpelling = (event: ChangeEvent<HTMLInputElement>) => {
    const nextAnswer = event.target.value;
    setAnswer(nextAnswer);
    if (!currentWord) return;
    const normalized = nextAnswer.trim().toLowerCase();
    const target = currentWord.word.trim().toLowerCase();
    if (normalized && !target.startsWith(normalized)) setRoundHadSpellingError(true);
  };

  const detailEntry = currentWord ? toLookupEntry(currentWord) : null;
  const learningPreferenceControls = (
    <div className="vocabulary-learning-sidebar-preferences">
      <div className="vocabulary-learning-preference-menu">
        <button
          aria-expanded={openPreferenceMenu === "accent"}
          aria-haspopup="menu"
          className="vocabulary-learning-preference-trigger"
          disabled={advancePending}
          onClick={() => setOpenPreferenceMenu(openPreferenceMenu === "accent" ? null : "accent")}
          type="button"
        >
          {voice === "us" ? "美音" : "英音"} <span aria-hidden="true">⌄</span>
        </button>
        {openPreferenceMenu === "accent" ? (
          <div className="vocabulary-learning-preference-menu-panel" role="menu">
            <button className={voice === "us" ? "active" : ""} disabled={advancePending} onClick={() => { setVoice("us"); setOpenPreferenceMenu(null); }} type="button">美音</button>
            <button className={voice === "uk" ? "active" : ""} disabled={advancePending} onClick={() => { setVoice("uk"); setOpenPreferenceMenu(null); }} type="button">英音</button>
          </div>
        ) : null}
      </div>
      <div className="vocabulary-learning-preference-menu">
        <button
          aria-expanded={openPreferenceMenu === "order"}
          aria-haspopup="menu"
          className="vocabulary-learning-preference-trigger"
          disabled={advancePending}
          onClick={() => setOpenPreferenceMenu(openPreferenceMenu === "order" ? null : "order")}
          type="button"
        >
          {order === "sequential" ? "顺序" : "乱序"} <span aria-hidden="true">⌄</span>
        </button>
        {openPreferenceMenu === "order" ? (
          <div className="vocabulary-learning-preference-menu-panel" role="menu">
            <button className={order === "sequential" ? "active" : ""} disabled={advancePending} onClick={() => { setOrder("sequential"); setOpenPreferenceMenu(null); }} type="button">顺序</button>
            <button className={order === "random" ? "active" : ""} disabled={advancePending} onClick={() => { setOrder("random"); setOpenPreferenceMenu(null); }} type="button">乱序</button>
          </div>
        ) : null}
      </div>
    </div>
  );
  const learningHeaderActions = detailEntry ? (
    <>
      <VocabularyFavoriteButton entry={detailEntry} />
      <VocabularyShareButton entry={detailEntry} />
    </>
  ) : null;

  return (
    <section className="stack vocabulary-learning-page">
      <div className="vocabulary-learning-layout">
        <aside className="vocabulary-learning-sidebar">
          {learningPreferenceControls}
          <div className="vocabulary-learning-collection-list">
            {COLLECTIONS.map((collection) => (
              <button
                className={`vocabulary-learning-nav-button ${selected === collection.key ? "active" : ""}`}
                key={collection.key}
                onClick={() => selectWord(collection.key)}
                type="button"
              >
                <span aria-hidden="true" className="vocabulary-learning-nav-dot" />
                <span className="vocabulary-learning-nav-label">{collection.label}</span>
                <strong>{words.filter((word) => progressFor(progress, word.id).familiarity === collection.key).length || "—"}</strong>
                <span aria-hidden="true" className="vocabulary-learning-nav-arrow">›</span>
              </button>
            ))}
          </div>
          <div className="vocabulary-learning-book-heading">词汇书</div>
          <div className="vocabulary-learning-book-list">
            {books.map((book) => (
              <button
                className={`vocabulary-learning-nav-button ${selected === book.key ? "active" : ""}`}
                key={book.key}
                onClick={() => selectWord(book.key)}
                title={book.description}
                type="button"
              >
                <span aria-hidden="true" className="vocabulary-learning-nav-dot" />
                <span className="vocabulary-learning-nav-label">{book.label}</span>
                <strong>
                  {bookCounts[book.key].added === bookCounts[book.key].total
                    ? bookCounts[book.key].total.toLocaleString()
                    : `${bookCounts[book.key].added.toLocaleString()}/${bookCounts[book.key].total.toLocaleString()}`}
                </strong>
                <span aria-hidden="true" className="vocabulary-learning-nav-arrow">›</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="vocabulary-learning-workspace">
          {loading ? <div className="vocabulary-learning-empty">正在加载完整词库……</div> : null}
          {!loading && loadError ? (
            <div className="vocabulary-learning-empty vocabulary-learning-error">
              <strong>{loadError}</strong>
              <button className="button" onClick={() => setLoadNonce((value) => value + 1)} type="button">重试</button>
            </div>
          ) : null}
          {!loading && !loadError && visibleWords.length === 0 ? (
            <div className="vocabulary-learning-empty">
              <strong>{isCollection(selected) ? "这个分类暂时没有词。" : "这本词汇书没有可处理的新词。"}</strong>
              <p>可以切换其他词汇书，或等待已安排的复习时间到达。</p>
            </div>
          ) : null}

          {!loading && !loadError && currentWord ? (
            <article className={`vocabulary-learning-detail-page vocabulary-learning-lookup vocabulary-learning-stage-${modeIndex}`}>
              {modeIndex < 2 ? (
                <VocabularyDetailShell
                  className="vocabulary-learning-detail-shell"
                  entry={detailEntry ?? toLookupEntry(currentWord)}
                  headerActions={learningHeaderActions}
                  showBack={false}
                  showWord={modeIndex === 0 || revealed}
                >
                  {revealed ? (
                    detailPayload ? (
                      <VocabularyDetailContent
                        entry={detailPayload.entry}
                        formationParts={detailPayload.formationParts}
                        phrases={detailPayload.phrases}
                        usageExamples={detailPayload.usageExamples}
                      />
                    ) : <p className="muted">正在加载完整单词详情……</p>
                  ) : null}
                </VocabularyDetailShell>
              ) : null}

              {modeIndex === 2 ? (
                <VocabularyDetailShell
                  className="vocabulary-learning-detail-shell"
                  contentClassName="vocabulary-learning-speaking-detail-main"
                  entry={detailEntry ?? toLookupEntry(currentWord)}
                  showHeader={false}
                >
                    <div className="vocabulary-learning-speaking-row">
                      <DefinitionDisplay prominent value={currentWord.definitionCn} />
                      <button
                        aria-label={phase === "recording" ? "松开结束录音" : "按住录音"}
                        className={`vocabulary-mic-button ${phase === "recording" ? "recording" : ""}`}
                        disabled={advancePending || oralScoreFeedback !== null}
                        onKeyDown={(event) => {
                          if (event.code === "Space" && !event.repeat) {
                            event.preventDefault();
                            holdingMicRef.current = true;
                            void startRecording();
                          }
                        }}
                        onKeyUp={(event) => {
                          if (event.code === "Space") {
                            event.preventDefault();
                            stopRecording();
                          }
                        }}
                        onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
                          event.currentTarget.setPointerCapture(event.pointerId);
                          holdingMicRef.current = true;
                          void startRecording();
                        }}
                        onPointerUp={stopRecording}
                        onPointerCancel={stopRecording}
                        type="button"
                      >
                        <span aria-hidden="true" className="vocabulary-mic-button-icon">
                          <svg viewBox="0 0 24 24">
                            <path d="M12 4a2.5 2.5 0 0 0-2.5 2.5v5a2.5 2.5 0 0 0 5 0v-5A2.5 2.5 0 0 0 12 4Z" />
                            <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3M9 20h6" />
                          </svg>
                        </span>
                        <span className="vocabulary-mic-button-label">{phase === "recording" ? "松开结束录音" : "按住录音"}</span>
                      </button>
                      <div aria-live="polite" className="vocabulary-learning-score-slot">
                        {oralScoreFeedback !== null ? (
                          <div
                            className={`vocabulary-learning-score-feedback vocabulary-learning-score-feedback-${familiarityFromScore(oralScoreFeedback)}`}
                            role="status"
                          >
                            <span>口述得分</span>
                            <strong>{oralScoreFeedback}</strong>
                            <small>分</small>
                          </div>
                        ) : <span className="vocabulary-learning-score-placeholder">等待评分</span>}
                      </div>
                    </div>
                    {recordingError ? <p className="vocabulary-learning-inline-error">{recordingError}</p> : null}
                    <button className="button vocabulary-learning-restart-button" disabled={advancePending || oralScoreFeedback !== null} onClick={restartOralRound} type="button">重新录音</button>
                </VocabularyDetailShell>
              ) : null}

              {modeIndex === 3 ? (
                <VocabularyDetailShell
                  className="vocabulary-learning-detail-shell"
                  contentClassName="vocabulary-learning-spelling-detail-main"
                  entry={detailEntry ?? toLookupEntry(currentWord)}
                  showHeader={false}
                >
                    <DefinitionDisplay prominent value={currentWord.definitionCn} />
                    <label className={`vocabulary-spelling-input ${spellingCorrect ? "correct" : roundHadSpellingError ? "wrong" : ""}`}>
                      <span>拼写英文</span>
                      <SpellingLetterPreview answer={answer} target={currentWord.word} />
                      <input autoComplete="off" disabled={phase === "recording" || revealed || advancePending} onChange={updateSpelling} spellCheck={false} value={answer} />
                    </label>
                    {spellingAnswerShown ? <div className="vocabulary-spelling-answer">正确拼写：<strong>{currentWord.word}</strong></div> : null}
                    <div className="vocabulary-spelling-history">曾经错过 {currentProgress.spellingErrorCount} 次 · 连续正确 {currentProgress.spellingCorrectStreak}/3</div>
                </VocabularyDetailShell>
              ) : null}

              <div className="vocabulary-learning-bottom-bar">
                <div className="vocabulary-learning-bottom-actions">
                  <button
                    className="vocabulary-learning-category-button familiar"
                    disabled={advancePending || (modeIndex === 2 && (oralScoreFeedback === null || familiarityFromScore(oralScoreFeedback) !== "familiar")) || (modeIndex === 3 && (!spellingCorrect || roundHadSpellingError))}
                    onClick={() => modeIndex === 3 ? submitSpelling("familiar") : handleRecognitionOutcome("familiar")}
                    type="button"
                  >熟悉</button>
                  <button
                    className="vocabulary-learning-category-button vague"
                    disabled={advancePending || (modeIndex === 2 && (oralScoreFeedback === null || familiarityFromScore(oralScoreFeedback) !== "vague"))}
                    onClick={() => modeIndex === 3 ? submitSpelling("vague") : handleRecognitionOutcome("vague")}
                    type="button"
                  >模糊</button>
                  <button
                    className="vocabulary-learning-category-button unfamiliar"
                    disabled={advancePending || (modeIndex === 2 && (oralScoreFeedback === null || familiarityFromScore(oralScoreFeedback) !== "unfamiliar"))}
                    onClick={() => modeIndex === 3 ? submitSpelling("unfamiliar") : handleRecognitionOutcome("unfamiliar")}
                    type="button"
                  >生僻</button>
                </div>
              </div>
            </article>
          ) : null}

        </main>
      </div>
    </section>
  );
}
