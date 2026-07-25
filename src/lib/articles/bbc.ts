import bbc2015Articles from "@/data/bbc/2015/index.json";

export type BbcVocabularyItem = {
  entry: string;
  example: string;
  number: number;
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

function mapGeneratedArticle(article: (typeof bbc2015Articles)[number]): BbcArticle {
  const baseUrl = `/audio/bbc/${article.year}/${article.id}`;

  return {
    audioUrl: `${baseUrl}/${article.fullAudioFile}`,
    body: article.paragraphs,
    date: article.date,
    fullAudioUrl: `${baseUrl}/${article.fullAudioFile}`,
    id: article.id,
    lead: article.titleChinese,
    sentences: article.sentences.map((sentence) => ({
      audioUrl: `${baseUrl}/${sentence.audioFile}`,
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
  ...bbc2015Articles.map(mapGeneratedArticle),
  {
    id: "2026-urban-gardens",
    year: 2026,
    date: "2026-07-15",
    title: "Urban gardens are turning balconies into tiny ecosystems",
    lead: "How compact green spaces are reshaping daily routines in busy cities.",
    body: [
      "Across many cities, balconies and rooftops are being transformed into miniature gardens, creating pockets of shade, scent and slow living in places that once felt purely functional.",
      "For some residents, the appeal is practical. Fresh herbs are cheaper than buying them every week, while a few pots of vegetables can reduce household waste and make cooking feel more connected to the seasons.",
      "Others are drawn to the emotional value of the space. Caring for plants offers a small but meaningful break from screens, deadlines and crowded commutes.",
      "Researchers say these informal gardens can also encourage neighbours to talk, swap cuttings and share advice, turning private outdoor corners into social spaces.",
    ],
  },
  {
    id: "2025-night-trains",
    year: 2025,
    date: "2025-11-03",
    title: "Why night trains are back on the travel menu",
    lead: "Sleeper routes are attracting travellers who want slower journeys and fewer airport headaches.",
    body: [
      "Night trains are enjoying a quiet comeback as more travellers look for routes that feel less rushed than flying and less isolating than driving long distances alone.",
      "The experience is part transport, part pause button. You board in the evening, sleep while the landscape changes outside, and wake up close to your destination without checking a departure board every hour.",
      "Operators have noticed that younger passengers, in particular, are open to travel that feels more atmospheric and less transactional.",
      "For them, the journey itself can be the highlight rather than something to endure before the holiday begins.",
    ],
  },
  {
    id: "2024-small-museums",
    year: 2024,
    date: "2024-06-18",
    title: "Small museums are winning visitors with bigger stories",
    lead: "Local collections are using sharper storytelling to compete for attention.",
    body: [
      "Rather than trying to be bigger, many small museums are becoming more specific, building exhibits around local voices, overlooked objects and vivid everyday histories.",
      "Visitors often respond to the sense of intimacy. A handwritten letter, a repaired shoe or a kitchen tool can feel more memorable when the surrounding story is carefully told.",
      "Curators say this approach can help people see national history through ordinary lives, making the past feel less distant and more human.",
      "The result is a quieter kind of attraction, but one that often leaves a stronger impression.",
    ],
  },
  {
    id: "2023-office-silence",
    year: 2023,
    date: "2023-09-27",
    title: "The surprising rise of silence in open-plan offices",
    lead: "Companies are experimenting with quieter rooms and sound rules to help people focus.",
    body: [
      "After years of open-plan enthusiasm, some workplaces are rediscovering the value of silence. Teams that once prized constant collaboration are now adding quiet zones, phone booths and no-meeting windows.",
      "The idea is not to eliminate conversation, but to make it easier to choose when to talk and when to think.",
      "Employees who spend time on detailed work often describe the change as a relief rather than a restriction.",
      "Managers, meanwhile, are learning that calm can be a productivity feature, not a luxury.",
    ],
  },
  {
    id: "2022-city-rivers",
    year: 2022,
    date: "2022-04-12",
    title: "How cities are reopening their rivers to the public",
    lead: "Waterfront projects are changing how people move, exercise and gather.",
    body: [
      "In several cities, riverbanks that were once hidden behind barriers are being redesigned as public spaces for walking, cycling and sitting by the water.",
      "The projects are often about more than scenery. They can reconnect people with local geography, improve flood protection and create new routes through dense neighbourhoods.",
      "Residents tend to notice the change first at street level, where the river begins to feel less like an obstacle and more like a shared asset.",
      "That shift in perception can be as important as the engineering itself.",
    ],
  },
  {
    id: "2021-secondhand-style",
    year: 2021,
    date: "2021-12-06",
    title: "Second-hand style is becoming a first-choice fashion statement",
    lead: "Thrift shopping is moving from niche habit to mainstream preference.",
    body: [
      "What used to be a budget workaround is now part of how many people express taste, sustainability and individuality.",
      "Shoppers are increasingly interested in clothing with a past, especially when the item feels more distinctive than something pulled from a chain store rack.",
      "The trend also reflects a broader shift in attitude: buying less, but choosing more carefully.",
      "For some, the pleasure lies in finding a piece that no one else will wear in quite the same way.",
    ],
  },
];

export const BBC_YEARS = Array.from({ length: 12 }, (_, index) => 2015 + index);

export function getBbcArticlesByYear(year: number) {
  return BBC_ARTICLES.filter((article) => article.year === year);
}

export function getBbcArticleById(id: string) {
  return BBC_ARTICLES.find((article) => article.id === id);
}
