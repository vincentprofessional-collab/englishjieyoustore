export const BBC_2015_FREE_ARTICLE_START_DATE: string;
export const BBC_2015_FREE_ARTICLE_IDS: string[];
export function isFreeBbc2015ArticleUnlocked(articleId: string, now?: Date): boolean;
export function getBbcAssetArticle(pathname: string): { articleId: string; year: number } | null;
export function isFreeBbc2015AssetPath(pathname: string, now?: Date): boolean;
