// Publication boundary for CET-4. Source caches and unreviewed OCR stay offline.
export const CET4_PROMOTION = /配套译文|(?:联系|添加|加)\s*(?:VX|V信|微信|wx)\s*[:：]?\s*[A-Za-z0-9_-]{3,}|VX\s*[:：]\s*[A-Za-z0-9_-]{3,}|新东方|公众号|公众[号號]|淘宝|淘寶|店[铺鋪]\s*[:：]|店[铺鋪].{0,6}(?:链接|咨询|购买资料)|taobao|天猫|tianmao|水印|扫码|掃碼|二维码|二維碼|微信号|微信群|添加微信|关注.{0,12}微信|关注.{0,12}获取|QQ群|加群|进群|资料下载|下载资料|课程咨询|联系客服|练习方式|练习方法|使用说明|新东方在线|考虫|星火英语|华研外语|巨微英语|有道精品课|沪江|文都教育|bilibili|资料仅供|严禁转载|侵权必究|翻印必究|大家网|大家论坛|大家学习网|topsage|CET[46]V|鼎力帮助考生|英语四级考试网|尊重劳动尊重版权|文档发布|https?:\/\/|www\.|[a-z0-9-]+\.(?:com|cn|net)\b/iu;

export function assertCet4PublicationClean(value, label = "CET-4 payload") {
  const serialized = (typeof value === "string" ? value : JSON.stringify(value)).replace(/lunchbox\.com|通过扫描二维码|careerbuilder\.com|prevention\.com|www\.tnc\.org|provider\.com|smithsonian\.com|lynda\.com/giu, "");
  const match = serialized.match(CET4_PROMOTION);
  if (match) throw new Error(`${label}: prohibited source residue ${match[0]}`);
  if (/[\u0080-\u009f\ue000-\uf8ff\ufffd]/u.test(serialized)) throw new Error(`${label}: corrupt source text`);
}

export function cet4QuestionCount(set) {
  return set.sections.flatMap((section) => section.groups.flatMap((group) => group.questions)).length;
}

export function assertCet4PublicFile(relativePath) {
  const file = relativePath.replaceAll("\\", "/");
  if (!/^(?:index\.json|(?:papers|practice)\/[^/]+\.json|audio\/[^/]+\.mp3|evidence\/[a-f0-9]{24}\.webp)$/u.test(file)) throw new Error(`CET-4: raw or unrelated source file must remain offline: ${file}`);
}

function hasEmbeddedChoiceOptions(group, question) {
  const number = question.sourceQuestionNumber;
  if (!Number.isInteger(number)) return false;
  const text = group.stimulusBlocks.map((block) => (block.runs || []).map((run) => run.text || "").join("")).join("\n");
  const start = new RegExp(`^\\s*${number}[.．、)）]\\s*`, "mu").exec(text);
  if (!start) return false;
  const rest = text.slice(start.index + start[0].length);
  const next = /^\s*\d{1,3}[.．、)）]\s*/mu.exec(rest);
  const source = next ? rest.slice(0, next.index) : rest;
  const labels = [...source.matchAll(/(?:^|[ \t])([A-D])[)）.．][ \t]*(?=\S)/gmu)].map((match) => match[1]);
  return labels.length === 4 && new Set(labels).size === 4;
}

export function validateReviewedCet4Set(set) {
  assertCet4PublicationClean(set, set.id);
  const questions = set.sections.flatMap((section) => section.groups.flatMap((group) => group.questions));
  if (!questions.length || new Set(questions.map((q) => q.id)).size !== questions.length) throw new Error(`${set.id}: empty or duplicate questions`);
  const assets = new Map(set.assetRefs.map((asset) => [asset.assetId, asset]));
  for (const section of set.sections) for (const group of section.groups) {
    for (const question of group.questions) {
      if (question.reviewStatus !== "approved") throw new Error(`${set.id}: question ${question.id} is not reviewed`);
      if (question.answerSpec.availability !== "answered") throw new Error(`${set.id}: missing answer for ${question.id}`);
      if (!question.sourceRefs.length) throw new Error(`${set.id}: missing source for ${question.id}`);
      const options = question.options.length ? question.options : group.sharedOptions;
      if (new Set(options.map((option) => option.id)).size !== options.length) throw new Error(`${set.id}: duplicate option labels`);
      if (question.options.length && !group.stimulusBlocks.some((block) => block.type === "image") && !question.promptBlocks.some((block) => block.type === "image") && question.options.some((option) => !option.blocks.length) && !hasEmbeddedChoiceOptions(group, question)) throw new Error(`${set.id}: missing option text for ${question.id}`);
      if (question.answerSpec.kind === "choice" && (!question.answerSpec.acceptedAnswers?.length || !question.answerSpec.acceptedAnswers.every((answer) => options.some((option) => option.id === answer)))) throw new Error(`${set.id}: answer outside option range for ${question.id}`);
      if (question.answerSpec.kind === "per_blank" && (!question.blanks.length || question.blanks.some((blank) => !question.answerSpec.perBlankAnswers?.[blank.blankId]?.length || question.answerSpec.perBlankAnswers[blank.blankId].some((value) => !value.trim())))) throw new Error(`${set.id}: missing dictation answer`);
      if (question.typeLabel === "听写填空" && question.answerSpec.kind === "per_blank" && Object.values(question.answerSpec.perBlankAnswers).some((values) => values.some((value) => /^[A-O]$/u.test(value)))) throw new Error(`${set.id}: ambiguous dictation letter needs source review`);
      if (question.answerSpec.kind === "reference" && !question.answerSpec.referenceAnswer?.length) throw new Error(`${set.id}: empty reference answer`);
      if (!question.explanationBlocks.length && !group.explanationBlocks?.length && question.answerSpec.kind !== "reference") throw new Error(`${set.id}: missing explanation for ${question.id}`);
    }
  }
  function checkBlocks(value) {
    if (!value || typeof value !== "object") return;
    if (value.type === "image") {
      const asset = assets.get(value.assetId);
      if (!asset || !asset.url.startsWith("/cet4/evidence/") || !/^[a-f0-9]{64}$/.test(asset.sha256)) throw new Error(`${set.id}: unverified evidence image`);
    }
    for (const child of Object.values(value)) if (Array.isArray(child)) child.forEach(checkBlocks); else if (child && typeof child === "object") checkBlocks(child);
  }
  checkBlocks(set.sections);
  return set;
}
