/** Split a paragraph translation into ordered fragments without changing its text. */
function translationFragments(translation: string) {
  const fragments: string[] = [];
  let start = 0;

  for (let index = 0; index < translation.length; index += 1) {
    if (!/[，。！？；：]/.test(translation[index]!)) continue;
    while (index + 1 < translation.length && /[”’"'」』）)]/.test(translation[index + 1]!)) index += 1;
    fragments.push(translation.slice(start, index + 1));
    start = index + 1;
  }
  if (start < translation.length) fragments.push(translation.slice(start));

  return fragments;
}

// The opening lessons merge several source sentences in their published Chinese
// paragraph. These boundaries were checked against the English sentence order.
const VERIFIED_SENTENCE_BOUNDARIES: Record<number, string[]> = {
  1: [
    "上星期我去看戏。", "我的座位很好，", "戏很有意思，", "但我却无法欣赏。",
    "一青年男子与一青年女子坐在我的身后，", "大声地说着话。", "我非常生气，",
    "因为我听不见演员在说什么。", "我回过头去", "怒视着那一男一女，",
    "他们却毫不理会。", "最后，我忍不住了，", "又一次回过头去，",
    "生气地说：“我一个字也听不见了！”", "“不关你的事，”那男的毫不客气地说，",
    "“这是私人间的谈话！”",
  ],
  2: [
    "那是个星期天，", "而在星期天我是从来不早起的，", "有时我要一直躺到吃午饭的时候。",
    "上个星期天，我起得很晚。", "我望望窗外，", "外面一片昏暗。",
    "“鬼天气！”我想，", "“又下雨了。”", "正在这时，电话铃响了。",
    "是我姑母露西打来的。", "“我刚下火车，”她说，", "“我这就来看你。”",
    "“但我还在吃早饭，”我说。", "“你在干什么？”她问道。",
    "“我正在吃早饭，”我又说了一遍。", "“天啊，”她说，",
    "“你总是起得这么晚吗？", "现在已经1点钟了！”",
  ],
};

function textLength(text: string) {
  return Array.from(text).filter((character) => /[\p{L}\p{N}]/u.test(character)).length;
}

/** Keep the original Chinese translation intact while pairing it with English lines. */
export function alignNewConceptParagraph(englishLines: string[], sourceTranslation: string, lessonNo?: number) {
  const translation = sourceTranslation.trim();
  if (!englishLines.length) return [];
  if (!translation) return englishLines.map(() => "");
  const verified = lessonNo ? VERIFIED_SENTENCE_BOUNDARIES[lessonNo] : undefined;
  if (verified?.length === englishLines.length && verified.join("") === translation) return verified;

  const fragments = translationFragments(translation);
  while (fragments.length < englishLines.length) {
    let longestIndex = -1;
    let longestLength = 0;
    fragments.forEach((fragment, index) => {
      if (fragment.length > longestLength) {
        longestLength = fragment.length;
        longestIndex = index;
      }
    });
    if (longestIndex < 0 || longestLength < 2) break;
    const fragment = fragments[longestIndex]!;
    const midpoint = Math.floor(fragment.length / 2);
    fragments.splice(longestIndex, 1, fragment.slice(0, midpoint), fragment.slice(midpoint));
  }

  if (fragments.length < englishLines.length) {
    return englishLines.map((_, index) => index === 0 ? translation : "");
  }

  const englishWeights = englishLines.map((line) => Math.max(1, (line.match(/[A-Za-z]+(?:'[A-Za-z]+)?|\d+/g) ?? []).length));
  const totalEnglishWeight = englishWeights.reduce((sum, weight) => sum + weight, 0);
  const totalChineseLength = textLength(translation);
  const fragmentLengths = fragments.map(textLength);
  const prefixLengths = [0];
  fragmentLengths.forEach((length) => prefixLengths.push(prefixLengths.at(-1)! + length));

  const rowCount = englishLines.length;
  const columnCount = fragments.length;
  const costs = Array.from({ length: rowCount + 1 }, () => Array<number>(columnCount + 1).fill(Infinity));
  const previous = Array.from({ length: rowCount + 1 }, () => Array<number>(columnCount + 1).fill(-1));
  costs[0]![0] = 0;

  for (let row = 1; row <= rowCount; row += 1) {
    const expectedLength = totalChineseLength * englishWeights[row - 1]! / totalEnglishWeight;
    for (let end = row; end <= columnCount - (rowCount - row); end += 1) {
      for (let start = row - 1; start < end; start += 1) {
        if (!Number.isFinite(costs[row - 1]![start])) continue;
        const actualLength = prefixLengths[end]! - prefixLengths[start]!;
        const lengthPenalty = Math.pow((actualLength - expectedLength) / Math.max(5, expectedLength), 2);
        const boundary = fragments[end - 1]!;
        const punctuationPenalty = end === columnCount || /[，。！？；：][”’"'」』）)]*$/.test(boundary) ? 0 : 0.2;
        const score = costs[row - 1]![start]! + lengthPenalty + punctuationPenalty;
        if (score < costs[row]![end]!) {
          costs[row]![end] = score;
          previous[row]![end] = start;
        }
      }
    }
  }

  const aligned = Array<string>(rowCount);
  let end = columnCount;
  for (let row = rowCount; row > 0; row -= 1) {
    const start = previous[row]![end]!;
    aligned[row - 1] = fragments.slice(start, end).join("");
    end = start;
  }
  return aligned;
}
