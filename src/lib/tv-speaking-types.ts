export type TvSpeakingClip = {
  chinese: string;
  durationSeconds: number;
  english: string;
  height: number;
  id: string;
  rank: number;
  sizeBytes: number;
  sourceFilename: string;
  storagePath: string;
  videoUrl: string | null;
  width: number;
  wordCount: number;
};

export type TvSpeakingManifest = {
  clips: TvSpeakingClip[];
  generatedAt: string;
  selection: Record<string, unknown>;
  title: string;
  version: number;
};
