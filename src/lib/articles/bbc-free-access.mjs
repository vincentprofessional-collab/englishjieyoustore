export const BBC_2015_FREE_ARTICLE_START_DATE = "2026-10-12";

export const BBC_2015_FREE_ARTICLE_IDS = [
  "150720", "150727", "150803", "150810", "150817", "150824", "150831", "150907",
  "150914", "150921", "150928", "151005", "151012", "151019", "151026", "151102",
  "151109", "151116", "151123", "151130", "151207", "151214", "151221", "151228",
];

function shanghaiDate(now) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).formatToParts(now);
  const part = (type) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isFreeBbc2015ArticleUnlocked(articleId, now = new Date()) {
  const index = BBC_2015_FREE_ARTICLE_IDS.indexOf(articleId);
  if (index < 0) return false;

  const releaseDate = new Date(`${BBC_2015_FREE_ARTICLE_START_DATE}T00:00:00.000Z`);
  releaseDate.setUTCDate(releaseDate.getUTCDate() + index * 7);
  return shanghaiDate(now) >= releaseDate.toISOString().slice(0, 10);
}

export function getBbcAssetArticle(pathname) {
  const match = pathname.match(/^\/(?:api\/bbc-audio\/|audio\/bbc\/|subtitles\/bbc\/)(\d{4})\/(\d{6})(?:\/|[-.])/);
  return match ? { articleId: match[2], year: Number(match[1]) } : null;
}

export function isFreeBbc2015AssetPath(pathname, now = new Date()) {
  const article = getBbcAssetArticle(pathname);
  return article?.year === 2015 && isFreeBbc2015ArticleUnlocked(article.articleId, now);
}
