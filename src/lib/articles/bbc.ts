import bbc2015Articles from "@/data/bbc/2015/index.json";
import bbc2016Articles from "@/data/bbc/2016/index.json";
import bbc2017Articles from "@/data/bbc/2017/index.json";
import bbc2018Articles from "@/data/bbc/2018/index.json";
import bbc2019Articles from "@/data/bbc/2019/index.json";
import bbc2020Articles from "@/data/bbc/2020/index.json";
import bbc2021Articles from "@/data/bbc/2021/index.json";
import bbc2022Articles from "@/data/bbc/2022/index.json";
import bbc2023Articles from "@/data/bbc/2023/index.json";
import bbc2024Articles from "@/data/bbc/2024/index.json";
import bbc2025Articles from "@/data/bbc/2025/index.json";
import bbc2026Articles from "@/data/bbc/2026/index.json";
export {
  mergeBbcVocabularyItems,
  normalizeBbcVocabularyTerm,
} from "@/lib/articles/bbc-vocabulary-merge";

export type BbcVocabularyItem = {
  definition?: string;
  entry: string;
  example: string;
  highlightTerm?: string;
  lemma?: string;
  number: number;
  partOfSpeech?: string;
  phonetic?: string;
  sourceLevel?: string;
  ukPhonetic?: string;
  usPhonetic?: string;
  highlight?: boolean;
  term: string;
  translation: string;
};

export type BbcArticleSentence = {
  audioUrl: string;
  chinese: string;
  chineseUnderlinedTerms?: string[];
  endMs: number;
  english: string;
  sentenceNo: number;
  startMs: number;
  underlinedTerms?: string[];
};

export type BbcArticle = {
  audioUrl?: string;
  body: string[];
  chineseParagraphs?: string[];
  date: string;
  fullAudioUrl?: string;
  id: string;
  lead: string;
  sentences?: BbcArticleSentence[];
  subtitleUrl?: string;
  title: string;
  titleChinese?: string;
  vocabulary?: BbcVocabularyItem[];
  year: number;
};

const allGeneratedBbcArticles = [
  ...bbc2015Articles,
  ...bbc2016Articles,
  ...bbc2017Articles,
  ...bbc2018Articles,
  ...bbc2019Articles,
  ...bbc2020Articles,
  ...bbc2021Articles,
  ...bbc2022Articles,
  ...bbc2023Articles,
  ...bbc2024Articles,
  ...bbc2025Articles,
  ...bbc2026Articles,
];

const bbcAudioBaseUrl = process.env.NEXT_PUBLIC_BBC_AUDIO_BASE_URL?.replace(/\/+$/, "");

const generatedBbcArticles = allGeneratedBbcArticles;

function getBbcAudioUrl(year: number, articleId: string, audioFile: string) {
  const path = `${year}/${articleId}/${audioFile}`;

  if (bbcAudioBaseUrl) {
    return `${bbcAudioBaseUrl}/${path}`;
  }

  return `/audio/bbc/${path}`;
}

function mapGeneratedArticle(article: (typeof generatedBbcArticles)[number]): BbcArticle {
  const fullAudioUrl = getBbcAudioUrl(article.year, article.id, article.fullAudioFile);

  return {
    audioUrl: fullAudioUrl,
    body: article.paragraphs,
    date: article.date,
    fullAudioUrl,
    id: article.id,
    lead: article.titleChinese ?? "",
    chineseParagraphs: "chineseParagraphs" in article ? article.chineseParagraphs : undefined,
    sentences: article.sentences.map((sentence) => ({
      audioUrl: getBbcAudioUrl(article.year, article.id, sentence.audioFile),
      chinese: sentence.chinese,
      chineseUnderlinedTerms: sentence.chineseUnderlinedTerms,
      endMs: sentence.endMs,
      english: sentence.english,
      sentenceNo: sentence.sentenceNo,
      startMs: sentence.startMs,
      underlinedTerms: sentence.underlinedTerms,
    })),
    subtitleUrl: `/subtitles/bbc/${article.year}/${article.id}-bilingual.srt`,
    title: article.title,
    titleChinese: article.titleChinese,
    vocabulary: article.vocabulary,
    year: article.year,
  };
}

export const BBC_ARTICLES: BbcArticle[] = [
  ...generatedBbcArticles.map(mapGeneratedArticle),
];

export const BBC_YEARS = Array.from({ length: 12 }, (_, index) => 2026 - index);
export const BBC_DEFAULT_YEAR = 2026;

export function getBbcArticlesByYear(year: number) {
  return BBC_ARTICLES.filter((article) => article.year === year);
}

export function getBbcArticleById(id: string) {
  return BBC_ARTICLES.find((article) => article.id === id);
}
