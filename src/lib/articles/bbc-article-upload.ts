export type BbcArticleDateFromTitle = {
  date: string;
  id: string;
  month: number;
  year: number;
};

export function parseBbcArticleDateFromTitle(title: string): BbcArticleDateFromTitle | null {
  const match = title.match(/(?:^|\D)(\d{8}|\d{6})(?=$|\D)/);
  if (!match) return null;

  const digits = match[1];
  const year = digits.length === 8 ? Number(digits.slice(0, 4)) : 2000 + Number(digits.slice(0, 2));
  const month = Number(digits.length === 8 ? digits.slice(4, 6) : digits.slice(2, 4));
  const day = Number(digits.length === 8 ? digits.slice(6, 8) : digits.slice(4, 6));
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    year < 2015 ||
    year > 2099 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  const id = `${String(year).slice(-2)}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  return { date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, id, month, year };
}

export function splitBbcArticleParagraphs(value: string, language: "en" | "zh") {
  return value
    .trim()
    .split(/\r?\n\s*\r?\n+/)
    .map((paragraph) => {
      const normalized = language === "zh"
        ? paragraph.replace(/[ \t]*\r?\n[ \t]*/g, "")
        : paragraph.replace(/[ \t]*\r?\n[ \t]*/g, " ");
      return normalized.replace(/\s+/g, " ").trim();
    })
    .filter(Boolean);
}
