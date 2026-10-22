export type ReadingSourcePage = { page: number; src: string; width: number; height: number };
export type ReadingSourceAnswer = { values: string[]; mode: "any" | "all" | "unordered"; explanation?: string };
export type ReadingSource = {
  verified: boolean;
  sanitized: boolean;
  pdfName: string;
  sha256: string;
  answers: Record<number, ReadingSourceAnswer>;
  groups: { numbers: number[]; values: string[]; mode: string }[];
};
export type ReadingPartSource = {
  passagePages: ReadingSourcePage[];
  questionPages: ReadingSourcePage[];
  answerPages: ReadingSourcePage[];
  explanationPages?: ReadingSourcePage[];
  explanationAttribution?: string;
  analysisVerified?: boolean;
};

export function normalizeReadingAnswer(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'")
    .replace(/\bnot\s*given\b/g, "not given").replace(/[.,;:!?]+$/g, "")
    .replace(/\s+/g, " ").trim();
}

function alternatives(value: string): string[] {
  function expand(part: string): string[] {
    const match = /\(([^)]+)\)/.exec(part);
    return match ? [part.replace(match[0], ""), part.replace(match[0], match[1])].flatMap(expand) : [part];
  }
  const values = value.split(/\s*\/\s*|\s+OR\s+/i).flatMap(expand);
  return [...new Set(values.map(normalizeReadingAnswer))];
}

export function matchesReadingAnswer(value: string, answer: ReadingSourceAnswer): boolean {
  let user = normalizeReadingAnswer(value);
  if (!user) return false;
  const judgment = answer.values.some((v) => /^(?:true|false|yes|no|not given)$/i.test(v));
  if (judgment) user = ({ t: "true", f: "false", y: "yes", n: "no", ng: "not given" } as Record<string, string>)[user] ?? user;
  if (answer.mode === "all") {
    const choices = answer.values.map(alternatives);
    const parts = user.split(/\s*(?:,|&|\band\b|\/)\s*/).filter(Boolean);
    if (parts.length === choices.length) {
      const used = new Set<number>();
      return parts.every((part) => {
        const index = choices.findIndex((allowed, i) => !used.has(i) && allowed.includes(part));
        if (index < 0) return false;
        used.add(index);
        return true;
      });
    }
    function matchPhrase(rest: string, unused: number[]): boolean {
      if (!unused.length) return rest === "";
      return unused.some((index) => choices[index].some((choice) => {
        if (rest !== choice && !rest.startsWith(`${choice} `)) return false;
        return matchPhrase(rest.slice(choice.length).trim(), unused.filter((i) => i !== index));
      }));
    }
    return choices.length <= 5 && matchPhrase(user, choices.map((_, i) => i));
  }
  return answer.values.some((value) => alternatives(value).includes(user));
}

export function gradeSourceReading(numbers: number[], answers: ReadingSource["answers"], groups: ReadingSource["groups"], user: Record<number, string>) {
  const result = numbers.map((number) => ({
    number,
    user: user[number] ?? "",
    expected: answers[number]?.values.join(answers[number]?.mode === "all" ? " + " : " / ") ?? "",
    correct: answers[number]?.values.length ? matchesReadingAnswer(user[number] ?? "", answers[number]) : null as boolean | null,
  }));
  for (const group of groups) {
    if (group.mode !== "unordered") continue;
    const remaining = [...group.values];
    for (const row of result.filter((row) => group.numbers.includes(row.number))) {
      const index = remaining.findIndex((value) => alternatives(value).includes(normalizeReadingAnswer(row.user)));
      row.correct = index >= 0;
      if (index >= 0) remaining.splice(index, 1);
    }
  }
  return result;
}
