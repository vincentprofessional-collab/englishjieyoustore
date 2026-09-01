import type { AudioPlayMode, AudioSpeakingMode } from "@/components/audio-player";

export function getWordCount(text: string): number;

export function getActiveWordIndex(
  text: string,
  positionSeconds: number,
  durationSeconds: number,
): number | null;

export function getSpeakingPracticeDelayMs(
  mode: AudioSpeakingMode,
  durationSeconds: number,
): number;

export function getNextSentenceNo(
  sentenceNos: number[],
  currentSentenceNo: number,
  playMode: AudioPlayMode,
): number | null;
