import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { gradeSourceReading, matchesReadingAnswer, normalizeReadingAnswer } from "../src/lib/ielts/reading-source-model.ts";

test("reading: accepts official alternatives and optional plural endings without accepting misspellings", () => {
  const answer = { values: ["freshwater dolphin(s) / the freshwater dolphin(s)"], mode: "any" };
  assert.equal(matchesReadingAnswer("Freshwater dolphins", answer), true);
  assert.equal(matchesReadingAnswer("freshwater dolpins", answer), false);
  assert.equal(normalizeReadingAnswer("NOTGIVEN"), "not given");
});
test("reading: a two-answer group never gives full credit for a duplicate selection", () => {
  const answers = { 1: { values: ["B", "E"], mode: "unordered" }, 2: { values: ["B", "E"], mode: "unordered" } };
  const groups = [{ numbers: [1, 2], values: ["B", "E"], mode: "unordered" }];
  assert.equal(gradeSourceReading([1, 2], answers, groups, { 1: "B", 2: "B" }).filter((r) => r.correct).length, 1);
  assert.equal(gradeSourceReading([1, 2], answers, groups, { 1: "E", 2: "B" }).filter((r) => r.correct).length, 2);
});
test("reading: both-required answers earn one mark only when both elements are present", () => {
  const answer = { values: ["forward", "downward"], mode: "all" };
  assert.equal(matchesReadingAnswer("forward", answer), false);
  assert.equal(matchesReadingAnswer("downward and forward", answer), true);
  assert.equal(matchesReadingAnswer("forward downward extra", answer), false);
  assert.equal(matchesReadingAnswer("social economic environmental", { values: ["social", "economic", "environmental"], mode: "all" }), true);
  assert.equal(matchesReadingAnswer("social economic economic", { values: ["social", "economic", "environmental"], mode: "all" }), false);
});
test("reading: judgments allow their printed abbreviations without changing letter-selection questions", () => {
  assert.equal(matchesReadingAnswer("NG", { values: ["NOT GIVEN"], mode: "any" }), true);
  assert.equal(matchesReadingAnswer("F", { values: ["FALSE"], mode: "any" }), true);
  assert.equal(matchesReadingAnswer("FALSE", { values: ["F"], mode: "any" }), false);
});
test("reading: missing keys remain ungraded rather than being marked wrong", () => {
  assert.equal(gradeSourceReading([41], {}, [], { 41: "a" })[0].correct, null);
});

test("reading: all 84 source papers cover exactly 3358 questions and their reviewed keys give full marks", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  assert.equal(papers.length,84);
  assert.equal(new Set(papers.map(p=>p.id)).size,84);
  let total=0;
  const example=value=>value.split(/\s*\/\s*/)[0].replace(/\(([^)]+)\)/g,'').replace(/\s+/g,' ').trim();
  for(const paper of papers){
    assert.equal(paper.source.verified,true,paper.id);
    assert.equal(paper.source.sanitized,true,paper.id);
    const numbers=paper.parts.flatMap(p=>p.questionBlocks.flatMap(b=>b.questions.map(q=>q.number)));
    const count=paper.bookCode==='cambridge-1'?[40,41,38,39][paper.testNo-1]:40;
    assert.deepEqual(numbers,Array.from({length:count},(_,i)=>i+1),paper.id);
    assert.equal(Object.keys(paper.source.answers).length,count,paper.id);
    const user=Object.fromEntries(numbers.map(n=>{const a=paper.source.answers[n];return [n,a.mode==='all'?a.values.map(example).join(' and '):example(a.values[0])]}));
    for(const g of paper.source.groups)if(g.mode==='unordered')g.numbers.forEach((n,i)=>{user[n]=example(g.values[i]);});
    const graded=gradeSourceReading(numbers,paper.source.answers,paper.source.groups,user);
    assert.equal(graded.filter(r=>r.correct).length,count,paper.id);
    for(const part of paper.parts)for(const image of [...part.source.passagePages,...part.source.questionPages,...part.source.answerPages]){
      assert.match(image.src,/^\/reading\/source-pages\/ci\d+-p\d{3}\.webp$/);
      assert.equal(existsSync(new URL(`../public${image.src}`,import.meta.url)),true,image.src);
    }
    total+=count;
  }
  assert.equal(total,3358);
});

test("reading: completed analysis is retained and only approved guide images are public", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const review=JSON.parse(readFileSync(new URL('../docs/ielts-reading-analysis-review-20261021.json',import.meta.url),'utf8'));
  let authoredQuestions=0,guideParts=0,withoutAnalysis=0;
  for(const paper of papers)for(const part of paper.parts){
    const numbers=part.questionBlocks.flatMap(b=>b.questions.map(q=>q.number));
    if(!part.source.analysisVerified){
      assert.ok(review.notRequiredByLatestScope.includes(part.id),part.id);
      assert.equal(part.source.explanationPages.length,0,part.id);
      assert.ok(numbers.every(n=>!paper.source.answers[n].explanation),part.id);
      withoutAnalysis++;continue;
    }
    const authored=part.source.explanationAttribution.includes('自编解析');
    if(authored){
      assert.match(part.source.explanationAttribution,/自编解析/);
      for(const number of numbers){
        assert.ok(paper.source.answers[number].explanation?.length>15,`${part.id} Q${number}`);
        assert.doesNotMatch(paper.source.answers[number].explanation,/公众号|淘宝|微信|二维码|TopSage|Foxit|练习方式/i);
      }
      assert.equal(part.source.explanationPages.length,0,part.id);
      authoredQuestions+=numbers.length;
    }else{
      assert.match(part.source.explanationAttribution,/精讲解析/);
      assert.ok(part.source.explanationPages.length>0,part.id);
      guideParts++;
    }
  }
  assert.equal(authoredQuestions,1398);assert.equal(guideParts,114);assert.equal(withoutAnalysis,33);
  const directory=new URL('../public/reading/explanations/',import.meta.url);
  assert.deepEqual(readdirSync(directory).sort(),Object.keys(review.assets).sort());
  for(const [name,evidence] of Object.entries(review.assets)){
    const hash=createHash('sha256').update(readFileSync(new URL(name,directory))).digest('hex');
    assert.equal(hash,evidence.sha256,name);
    assert.doesNotMatch(name,/^cambridge-[3-8]-/);
    assert.doesNotMatch(name,/-exp10-p113\./);
    assert.doesNotMatch(name,/-exp11-p(?:030|100|110|155|165)\./);
    assert.doesNotMatch(name,/^cambridge-11-test-1-part1-/);
  }
});

test("reading: academic keys and the preceding matching-headings page remain attached to the right paper", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  assert.deepEqual(papers.find(p=>p.id==='cambridge-2-test-1').source.answers['18'].values,['vii']);
  const fourth=papers.find(p=>p.id==='cambridge-2-test-4');
  assert.deepEqual(fourth.source.answers['1'].values,['YES']);
  assert.deepEqual(fourth.source.answers['27'].values,['Apollo (space) programme']);
  assert.deepEqual(fourth.source.answers['40'].values,['A']);
  assert.equal(fourth.source.groups.length,0);
  assert.ok(fourth.parts.every(p=>p.source.answerPages.every(page=>page.page===152)));
  assert.equal(existsSync(new URL('../public/reading/source-pages/ci2-p153.webp',import.meta.url)),false);
  const third=papers.find(p=>p.id==='cambridge-2-test-3').parts[2];
  assert.equal(third.source.questionPages[0].page,66);
  assert.equal(third.source.questionPages.at(-1).page,69);
});

test("reading: all downloadable source documents contain the checked images and analysis", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  for(const paper of papers){
    const text=readFileSync(new URL(`../public/reading/sources/${paper.id}.md`,import.meta.url),'utf8');
    assert.ok(text.includes(paper.source.sha256),paper.id);
    assert.equal((text.match(/<summary>本篇解析<\/summary>/g)||[]).length,paper.parts.filter(p=>p.source.analysisVerified).length,paper.id);
    assert.doesNotMatch(text,/\/Volumes\/|\/Users\/|公众号|淘宝|微信|练习方式/);
    for(const match of text.matchAll(/https:\/\/www\.englishjieyou\.cn(\/reading\/[\w/.-]+\.webp)/g)){
      assert.equal(existsSync(new URL(`../public${match[1]}`,import.meta.url)),true,match[1]);
    }
  }
});

test("reading: every original page survives heading placement and matches the reviewed derivative", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const review=JSON.parse(readFileSync(new URL('../docs/ielts-reading-source-review-20261022.json',import.meta.url),'utf8'));
  assert.equal(review.tests,84);assert.equal(review.parts,252);assert.equal(review.questions,3358);
  for(const paper of papers)for(const part of paper.parts){
    assert.deepEqual(part.source.passagePages.map(p=>p.page),review.papers[paper.id].parts[part.id].originalPages,part.id);
    const text=readFileSync(new URL(`../public/reading/sources/${paper.id}.md`,import.meta.url),'utf8');
    for(const page of [...part.source.passagePages,...part.source.questionPages])assert.ok(text.includes(page.src),`${part.id} page ${page.page}`);
  }
  const directory=new URL('../public/reading/source-pages/',import.meta.url);
  assert.deepEqual(readdirSync(directory).sort(),Object.keys(review.images).map(k=>`${k}.webp`).sort());
  for(const [key,evidence] of Object.entries(review.images)){
    assert.equal(createHash('sha256').update(readFileSync(new URL(`${key}.webp`,directory))).digest('hex'),evidence.sha256,key);
    assert.ok(evidence.width>0&&evidence.height>0,key);
  }
  const guideReview=JSON.parse(readFileSync(new URL('../docs/ielts-reading-analysis-review-20261021.json',import.meta.url),'utf8'));
  const uploadGate=JSON.parse(readFileSync(new URL('../docs/ielts-reading-upload-gate-20261022.json',import.meta.url),'utf8'));
  const assets=[...Object.entries(review.images).map(([key,v])=>[`reading/source-pages/${key}.webp`,v.sha256]),...Object.entries(guideReview.assets).map(([name,v])=>[`reading/explanations/${name}`,v.sha256])].sort(([a],[b])=>a<b?-1:a>b?1:0);
  assert.equal(uploadGate.ready,true);
  assert.equal(uploadGate.pngPositiveControlHits,1);assert.equal(uploadGate.webpPositiveControlHits,1);
  assert.deepEqual(uploadGate.remainingQrHitAssets,[]);
  assert.equal(uploadGate.renderedAssetsChecked,assets.length);
  assert.equal(createHash('sha256').update(assets.map(([name,sha])=>`${name} ${sha}`).join('\n')).digest('hex'),uploadGate.assetsSha256);
});
