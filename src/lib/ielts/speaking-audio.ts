import type { SpeakingAudioSegment } from "@/lib/ielts/speaking-managed-content";

function splitSentences(text: string) {
  const normalized = text.replace(/\r/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  return (
    normalized.match(/[^.!?。！？]+[.!?。！？]+["'”’）)]*|[^.!?。！？]+$/g) ?? [normalized]
  )
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function sentenceWeight(sentence: string) {
  const englishWords = sentence.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)?.length ?? 0;
  return englishWords || Math.max(1, Math.ceil(sentence.length / 5));
}

function splitTranscript(paragraphs: string[]) {
  return paragraphs.flatMap((paragraph) => splitSentences(paragraph));
}

export async function readAudioDuration(audioUrl: string) {
  if (typeof window === "undefined" || typeof Audio === "undefined") {
    return null;
  }

  return new Promise<number | null>((resolve) => {
    const audio = new Audio();
    let settled = false;

    const finish = (duration: number | null) => {
      if (settled) {
        return;
      }

      settled = true;
      audio.removeAttribute("src");
      audio.load();
      resolve(duration);
    };

    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";
    audio.onloadedmetadata = () => {
      const duration = Number(audio.duration);
      finish(Number.isFinite(duration) && duration > 0 ? duration : null);
    };
    audio.onerror = () => finish(null);
    audio.src = audioUrl;
    audio.load();

    window.setTimeout(() => finish(null), 12_000);
  });
}

/**
 * Creates sentence cards for a newly uploaded full-length answer. The cards
 * keep the original URL and carry an estimated time range, so no lossy or
 * deceptive duplicate audio files are created. Existing real segment files
 * continue to be preferred when they are already present.
 */
export function buildEstimatedSpeakingAudioSegments({
  answer,
  answerTranslation,
  audioUrl,
  durationSeconds,
}: {
  answer: string[];
  answerTranslation: string[];
  audioUrl: string;
  durationSeconds: number;
}): SpeakingAudioSegment[] {
  if (!audioUrl || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return [];
  }

  const englishSentences = splitTranscript(answer);
  const chineseSentences = splitTranscript(answerTranslation);

  if (!englishSentences.length || !chineseSentences.length) {
    return [];
  }

  const weights = englishSentences.map(sentenceWeight);
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  const minimumDuration = Math.min(0.45, durationSeconds / englishSentences.length);
  let cursor = 0;

  return englishSentences.map((english, index) => {
    const isLast = index === englishSentences.length - 1;
    const estimatedEnd = cursor + (durationSeconds * weights[index]) / totalWeight;
    const end = isLast
      ? durationSeconds
      : Math.min(
          durationSeconds,
          Math.max(cursor + minimumDuration, estimatedEnd),
        );
    const segment = {
      audioUrl,
      chinese: chineseSentences[index] ?? chineseSentences[chineseSentences.length - 1],
      endSeconds: Number(end.toFixed(3)),
      english,
      sentenceNo: index + 1,
      startSeconds: Number(cursor.toFixed(3)),
    } satisfies SpeakingAudioSegment;
    cursor = end;
    return segment;
  });
}
