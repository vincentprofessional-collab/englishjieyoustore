// Share the source-reviewed question groups instead of maintaining a second answer bank.
export function buildCet6PracticeSets(papers) {
  const labels = { writing: "写作", listening: "听力", cloze: "选词填空", matching: "长篇阅读", reading: "仔细阅读", translation: "翻译" };
  const collections = new Map();
  for (const paper of papers) for (const section of paper.sections) for (const original of section.groups) {
    if (!original.questions.length) continue;
    const question = original.questions[0];
    const family = question.type === "essay" ? "writing" : question.type === "translation" ? "translation" : question.displayNumber <= 25 ? "listening" : question.displayNumber <= 35 ? "cloze" : question.displayNumber <= 45 ? "matching" : "reading";
    const collection = collections.get(family) || { family, sections: [], assetRefs: [], sourceRefs: [], questionCount: 0 };
    const group = structuredClone(original);
    for (const item of group.questions) item.displayNumber = ++collection.questionCount;
    const nextSection = { ...section, id: `${section.id}-${group.id}`, title: paper.title, groups: [group] };
    collection.sections.push(nextSection);
    const referenced = new Set([...JSON.stringify(nextSection).matchAll(/"assetId":"([^"]+)"/g)].map(match => match[1]));
    collection.assetRefs.push(...paper.assetRefs.filter(asset => referenced.has(asset.assetId)));
    collection.sourceRefs.push(...paper.sourceRefs);
    collections.set(family, collection);
  }
  return [...collections.values()].map(collection => {
    const questions = collection.sections.flatMap(section => section.groups.flatMap(group => group.questions));
    const unreviewed = questions.filter(question => question.reviewStatus !== "approved").length;
    return {
      schemaVersion: 2, id: `practice-cet6-${collection.family}`, kind: "practice", title: `大学英语六级${labels[collection.family]}专项训练`, year: "历年", region: "全国", variant: "专项训练",
      instructions: [{ type: "notice", tone: "info", text: "本页题组来自已收录的六级真题。按题组提交后可查看对应答案与解析。" }],
      sections: collection.sections,
      assetRefs: [...new Map(collection.assetRefs.map(asset => [asset.assetId, asset])).values()],
      sourceRefs: [...new Map(collection.sourceRefs.map(source => [source.sha256, source])).values()],
      quality: { structureStatus: unreviewed ? "review_required" : "approved", structureConfidence: unreviewed ? 0 : 1, issueCount: unreviewed, issues: unreviewed ? [`${unreviewed}题尚未通过源文件核对`] : [] },
    };
  });
}
