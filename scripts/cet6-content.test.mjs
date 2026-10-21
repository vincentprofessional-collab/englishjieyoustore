import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { validateSeniorHighV2Set } from './senior_high_v2_schema.mjs';
import { cleanCet6Source } from './cet6-paper-parser.mjs';
import { gradeSeniorHighQuestion } from '../src/lib/senior-high/v2-grading.ts';

const read = async name => JSON.parse(await readFile(new URL(`../${name}`, import.meta.url),'utf8'));
const library = await read('src/data/cet6/library.json');
const index = await read('public/cet6/index.json');
const sets = await Promise.all(index.entries.map(entry => read(`public/cet6/${entry.kind === 'paper' ? 'papers' : 'practice'}/${entry.id}.json`)));
const questions = set => set.sections.flatMap(section => section.groups.flatMap(group => group.questions));
const papers = sets.filter(set => set.kind === 'paper');

test('CET-6 removes knowledge and publishes 76 source papers plus six consistent practice families', () => {
  assert.equal(library.entries.length,76);
  assert.ok(library.entries.every(entry => entry.section === '试卷'));
  assert.equal(papers.length,76);
  assert.equal(papers.reduce((sum,paper)=>sum+questions(paper).length,0),3507);
  assert.deepEqual(sets.filter(set => set.kind === 'practice').map(set => set.id).sort(), ['cloze','listening','matching','reading','translation','writing'].map(name=>`practice-cet6-${name}`));
  assert.equal(new Set(index.entries.map(entry => entry.id)).size,index.entries.length);
});

test('every published CET-6 set passes the shared schema and source review gate', () => {
  for (const set of sets) {
    const result = validateSeniorHighV2Set(set);
    assert.equal(result.ok,true,`${set.id}: ${result.errors.join('; ')}`);
    assert.equal(set.quality.structureStatus,'approved',`${set.id}: ${set.quality.issues.join('; ')}`);
    assert.equal(set.quality.issueCount,0,set.id);
    for (const question of questions(set)) {
      assert.equal(question.reviewStatus,'approved',question.id);
      assert.equal(question.answerSpec.availability,'answered',question.id);
      assert.ok(question.explanationBlocks.length || question.answerSpec.referenceAnswer,question.id);
    }
    const summary=index.entries.find(entry=>entry.id===set.id);
    assert.equal(summary.questionCount,questions(set).length,set.id);
    assert.equal(summary.answeredCount,summary.questionCount,set.id);
    assert.equal(summary.explanationCount,summary.questionCount,set.id);
  }
});

test('paper sections preserve CET-6 question numbers, matching rules and source omissions', () => {
  for (const paper of papers) {
    assert.equal(paper.submissionMode,'whole-paper');
    const all=questions(paper);
    assert.ok([2,32,57].includes(all.length),`${paper.id}: ${all.length}`);
    assert.equal(all.filter(question=>question.type==='essay').length,1,paper.id);
    assert.equal(all.filter(question=>question.type==='translation').length,1,paper.id);
    const objective=all.filter(question=>!['essay','translation'].includes(question.type));
    const first=all.length===57?1:26;
    assert.deepEqual(objective.map(question=>question.sourceQuestionNumber),Array.from({length:objective.length},(_,i)=>first+i),paper.id);
    for (const section of paper.sections) for (const group of section.groups) {
      const firstNumber=group.questions[0]?.sourceQuestionNumber;
      if (firstNumber===26) {assert.equal(group.sharedOptions.map(option=>option.label).join(''),'ABCDEFGHIJKLMNO',paper.id);assert.equal(group.sharedOptionsReusable,false,paper.id);}
      if (firstNumber===36) {assert.equal(group.sharedOptionsReusable,true,paper.id);assert.ok(group.sharedOptions.length>=5,paper.id);}
    }
    const audio=paper.sections.flatMap(section=>section.instructions).filter(block=>block.type==='audio');
    assert.equal(audio.length,all.length===57?1:0,paper.id);
    if(all.length!==57)assert.ok(paper.instructions.some(block=>block.type==='notice'&&/原资料收录/.test(block.text)),paper.id);
  }
});

test('practice questions and answers come from the same reviewed papers', () => {
  const originals=new Map(papers.flatMap(paper=>questions(paper)).map(question=>[question.id,question]));
  let count=0;
  for(const set of sets.filter(set=>set.kind==='practice'))for(const question of questions(set)) {
    const original=originals.get(question.id);assert.ok(original,question.id);
    assert.deepEqual(question.answerSpec,original.answerSpec,question.id);
    assert.deepEqual(question.promptBlocks,original.promptBlocks,question.id);
    assert.deepEqual(question.explanationBlocks,original.explanationBlocks,question.id);
    assert.equal(question.type,original.type,question.id);count++;
  }
  assert.equal(count,originals.size);
});

test('automatic choices grade correctly; manual source references never invent an automatic result', () => {
  let auto=0,manual=0;
  for(const paper of papers)for(const question of questions(paper)) {
    if(question.answerSpec.gradingMode==='auto') {
      const answer=question.answerSpec.acceptedAnswers[0];
      assert.equal(gradeSeniorHighQuestion(question,{[question.id]:answer}),'correct',question.id);
      assert.equal(gradeSeniorHighQuestion(question,{[question.id]:'INVALID'}),'incorrect',question.id);auto++;
    } else {
      assert.equal(gradeSeniorHighQuestion(question,{[question.id]:'A reference response'}),'manual',question.id);manual++;
    }
  }
  assert.ok(auto>0);assert.ok(manual>=150);
});

test('advertising cleanup preserves actual exam references to QR codes, shops and methods', () => {
  const valid=['QR（二维码）技术','滑雪杆使用方法的创新','She works in a shop.','店铺经营是这篇文章的讨论对象','https://www.bbc.com/future/article/example','许多艺术家对人工智能艺术可能涉及的版权侵权行为感到愤怒。','可能为其他侵权行为提供正当理由。'];
  for(const text of valid)assert.equal(cleanCet6Source(text),text.normalize('NFKC'));
  for(const text of ['关注公众号领取资料','认准淘宝店铺：光速考研工作室','练习方式：每天打印一套','老师说本套视频解析中，老师将在写作部分教你如何审题','快来扫描视频课二维码观看','如有侵权请联系删除'])assert.equal(cleanCet6Source(text),'');
  for(const set of sets)assert.doesNotMatch(JSON.stringify(set),/公众号|淘宝店铺|光速考研|免费领取|练习方式|HYPERLINK|INCLUDEPICTURE|\uFFFD/);
});

test('every referenced media asset was cleaned, uploaded and read back with a matching checksum', async () => {
  const manifest=await read('data/cet6-review/media-manifest.json');
  const verified=new Map(manifest.map(item=>[item.sha256,item]));
  for(const set of sets)for(const asset of set.assetRefs) {
    const item=verified.get(asset.sha256);assert.ok(item?.verified,`${set.id}: ${asset.assetId}`);
    assert.equal(asset.url,item.publicUrl,asset.assetId);
    assert.equal(asset.kind,item.kind,asset.assetId);
    assert.match(asset.url,/\/storage\/v1\/object\/public\/(?:images\/cet6\/source-pages|audio\/cet6\/listening)\//);
    if(asset.kind==='image')assert.match(asset.assetId,/^page-clean-v5-/);
    assert.doesNotMatch(asset.url,/\.pdf(?:$|\?)/i);
  }
  const certificate=await read('data/cet6-review/cleaning-validation.json');
  const images=new Map(papers.flatMap(set=>set.assetRefs).filter(asset=>asset.kind==='image').map(asset=>[asset.assetId,asset.sha256]));
  const digest=createHash('sha256').update([...images].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([id,sha])=>`${id}:${sha}`).join('\n')).digest('hex');
  assert.equal(certificate.passed,true);
  assert.equal(certificate.defaultPageBoundariesChecked,true);
  assert.equal(certificate.clippedBodyLines,0);
  assert.equal(certificate.imageManifestSha256,digest);
  for(const entry of library.entries)if(entry.sourceReview.imagePaper)assert.equal(entry.body,'题目见已净化并核对的原题页面。');
  const audio=await read('data/cet6-review/audio-association.json');
  assert.equal(audio.length,49);
  assert.ok(audio.every(row=>row.passed&&row.endingChecked&&!row.endingPromotionFlag));
});

test('shared reading is included only with an explicit statement in the original source', () => {
  const shared=papers.find(set=>set.id==='cet6-paper-2020093');
  assert.equal(questions(shared).length,32);
  assert.ok(shared.instructions.some(block=>block.type==='notice'&&/第2套/.test(block.text)));
  assert.ok(shared.sourceRefs.some(ref=>ref.sha256==='560e12e458d17d669195649516f087206c3d74b5363f0e78d611afc231c60e31'));
});

test('CET-6 runner fetches its own data and limits a practice view to one source paper', async () => {
  const source=await readFile(new URL('../src/components/senior-high/senior-high-runner.tsx',import.meta.url),'utf8');
  assert.ok(source.includes('fetch(`${basePath}/'));
  assert.ok(source.includes('visibleSections.map'));
  assert.ok(source.includes('选择题卷'));
  const nav=await readFile(new URL('../src/components/ielts-section-shell.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(nav,/\/cet6\?entry=knowledge/);
});

test('manual image references are valid choices, while an automatic reference is rejected', () => {
  const paper=structuredClone(papers.find(set=>questions(set).some(question=>question.type==='single_choice')));
  const question=questions(paper).find(question=>question.type==='single_choice');
  const asset=paper.assetRefs.find(asset=>asset.kind==='image');
  question.answerSpec={availability:'answered',gradingMode:'manual',kind:'reference',referenceAnswer:[{type:'image',assetId:asset.assetId,alt:'原答案'}]};
  assert.equal(validateSeniorHighV2Set(paper).ok,true);
  question.answerSpec.gradingMode='auto';
  assert.equal(validateSeniorHighV2Set(paper).ok,false);
  question.answerSpec.gradingMode='manual';question.answerSpec.referenceAnswer=[];
  assert.equal(validateSeniorHighV2Set(paper).ok,false);
});
