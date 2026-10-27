import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { gradeSourceReading, matchesReadingAnswer, normalizeReadingAnswer } from "../src/lib/ielts/reading-source-model.ts";
import { EDITABLE_READING_PARTS } from "../src/lib/ielts/reading-source-editable.ts";

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

test("reading: all 72 Cambridge 4–21 source papers cover exactly 2880 questions and their reviewed keys give full marks", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  assert.equal(papers.length,72);
  assert.equal(new Set(papers.map(p=>p.id)).size,72);
  assert.ok(papers.every(p=>Number(p.bookCode.slice('cambridge-'.length))>=4));
  let total=0;
  const example=value=>value.split(/\s*\/\s*/)[0].replace(/\(([^)]+)\)/g,'').replace(/\s+/g,' ').trim();
  for(const paper of papers){
    assert.equal(paper.source.verified,true,paper.id);
    assert.equal(paper.source.sanitized,true,paper.id);
    const numbers=paper.parts.flatMap(p=>p.questionBlocks.flatMap(b=>b.questions.map(q=>q.number)));
    const count=40;
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
  assert.equal(total,2880);
});

test("reading: source-verified editable text covers Cambridge 21 Test 1 with its exact question map and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-21-test-1');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.equal(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,true,part.id);
    assert.ok(text.passageDirections.length>20,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    assert.ok(!JSON.stringify(text).match(/Frangois|wmnn|n\.rcn|OCR PENDING/i),part.id);
    for(const block of text.questionBlocks){
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  const multipleChoice=EDITABLE_READING_PARTS['cambridge-21-test-1-part3'].questionBlocks.find(block=>block.id==='q27-30');
  assert.ok(multipleChoice);
  assert.ok(multipleChoice.items?.every(item=>item.options?.length===4));
  assert.equal(EDITABLE_READING_PARTS['cambridge-21-test-1-part3'].questionBlocks.find(block=>block.id==='q31-36')?.options?.length,9);
});

test("reading: source-verified editable text covers Cambridge 21 Test 2 with its exact question map, table, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-21-test-2');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.passageDirections.length>20,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.table){
        const tableQuestions=block.table.rows.flatMap(row=>row.flatMap(cell=>cell.flatMap(segment=>"question" in segment?[segment.question]:[])));
        assert.deepEqual(tableQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  const table=EDITABLE_READING_PARTS['cambridge-21-test-2-part1'].questionBlocks.find(block=>block.id==='q1-5')?.table;
  assert.equal(table?.rows.length,4);
  assert.equal(table?.columns.length,3);
  assert.equal(EDITABLE_READING_PARTS['cambridge-21-test-2-part3'].questionBlocks.find(block=>block.id==='q30-35')?.options?.length,9);
});

test("reading: source-verified editable text covers Cambridge 21 Test 3 with its exact question map and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-21-test-3');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  const notes=EDITABLE_READING_PARTS['cambridge-21-test-3-part2'].questionBlocks.find(block=>block.id==='q19-26');
  assert.deepEqual(notes?.questionNumbers,[19,20,21,22,23,24,25,26]);
  assert.deepEqual(notes?.lines?.filter(line=>line.kind==='question').map(line=>line.number),notes?.questionNumbers);
  assert.equal(EDITABLE_READING_PARTS['cambridge-21-test-3-part3'].questionBlocks.find(block=>block.id==='q31-34')?.options?.length,6);
});

test("reading: source-verified editable text covers Cambridge 21 Test 4 with its exact question map and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-21-test-4');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-21-test-4-part2'].footnotes?.length,1);
  assert.equal(EDITABLE_READING_PARTS['cambridge-21-test-4-part3'].questionBlocks.find(block=>block.id==='q27-32')?.options?.length,10);
});

test("reading: source-verified editable text covers Cambridge 20 Test 1 with its exact question map and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-20-test-1');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-20-test-1-part1'].passageTitle,'The kākāpō');
  assert.equal(EDITABLE_READING_PARTS['cambridge-20-test-1-part2'].questionBlocks.find(block=>block.id==='q19-23')?.options?.length,3);
  assert.equal(EDITABLE_READING_PARTS['cambridge-20-test-1-part3'].questionBlocks.find(block=>block.id==='q31-35')?.options?.length,7);
});

test("reading: source-verified editable text covers Cambridge 20 Test 2 with its exact question map, word banks, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-20-test-2');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-20-test-2-part1'].passageTitle,'Manatees');
  assert.equal(EDITABLE_READING_PARTS['cambridge-20-test-2-part2'].questionBlocks.find(block=>block.id==='q23-24')?.options?.length,5);
  assert.equal(EDITABLE_READING_PARTS['cambridge-20-test-2-part2'].questionBlocks.find(block=>block.id==='q25-26')?.options?.length,5);
  assert.equal(EDITABLE_READING_PARTS['cambridge-20-test-2-part3'].questionBlocks.find(block=>block.id==='q33-37')?.options?.length,8);
  assert.equal(EDITABLE_READING_PARTS['cambridge-20-test-2-part3'].footnotes?.length,1);
});

test("reading: source-verified editable text covers Cambridge 20 Test 3 with its exact question map, headings, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-20-test-3');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-20-test-3-part1'].passageTitle,'Frozen Food');
  assert.equal(EDITABLE_READING_PARTS['cambridge-20-test-3-part2'].sections.length,6);
  assert.equal(EDITABLE_READING_PARTS['cambridge-20-test-3-part2'].questionBlocks.find(block=>block.id==='q14-19')?.options?.length,7);
  assert.equal(EDITABLE_READING_PARTS['cambridge-20-test-3-part3'].questionBlocks.find(block=>block.id==='q27-33')?.options?.length,3);
  assert.equal(EDITABLE_READING_PARTS['cambridge-20-test-3-part3'].footnotes?.length,2);
});

test("reading: source-verified editable text covers Cambridge 20 Test 4 with its exact question map, headings, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-20-test-4');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-20-test-4-part1'].passageTitle,'Georgia O’Keeffe');
  assert.equal(EDITABLE_READING_PARTS['cambridge-20-test-4-part2'].sections.length,6);
  assert.equal(EDITABLE_READING_PARTS['cambridge-20-test-4-part2'].questionBlocks.find(block=>block.id==='q23-26')?.options?.length,5);
  assert.equal(EDITABLE_READING_PARTS['cambridge-20-test-4-part3'].sections.length,7);
  assert.equal(EDITABLE_READING_PARTS['cambridge-20-test-4-part3'].questionBlocks.find(block=>block.id==='q32-36')?.options?.length,5);
});

test("reading: source-verified editable text covers Cambridge 19 Test 1 with its exact question map, word banks, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-19-test-1');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-1-part1'].passageTitle,'How tennis rackets have changed');
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-1-part1'].questionBlocks.find(block=>block.id==='q1-7')?.options?.length,3);
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-1-part2'].sections.length,7);
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-1-part2'].footnotes?.length,1);
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-1-part2'].questionBlocks.find(block=>block.id==='q20-21')?.options?.length,5);
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-1-part3'].passageTitle,'The persistence and peril of misinformation');
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-1-part3'].questionBlocks.find(block=>block.id==='q31-36')?.options?.length,10);
});

test("reading: source-verified editable text covers Cambridge 19 Test 2 with its exact question map, headings, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-19-test-2');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-2-part1'].passageTitle,'The Industrial Revolution in Britain');
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-2-part1'].footnotes?.length,1);
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-2-part2'].sections.length,6);
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-2-part2'].questionBlocks.find(block=>block.id==='q23-24')?.options?.length,5);
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-2-part3'].passageTitle,'An inquiry into the existence of the gifted child');
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-2-part3'].questionBlocks.find(block=>block.id==='q27-32')?.options?.length,11);
});

test("reading: source-verified editable text covers Cambridge 19 Test 3 with its exact question map, footnotes, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-19-test-3');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-3-part1'].passageTitle,'Archaeologists discover evidence of prehistoric island settlers');
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-3-part2'].sections.length,8);
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-3-part2'].footnotes?.length,2);
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-3-part2'].questionBlocks.find(block=>block.id==='q23-26')?.options?.length,4);
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-3-part3'].questionBlocks.find(block=>block.id==='q31-34')?.options?.length,6);
});

test("reading: source-verified editable text covers Cambridge 19 Test 4 with its exact question map and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-19-test-4');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-4-part1'].passageTitle,'The impact of climate change on butterflies in Britain');
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-4-part1'].sections[0].paragraphs.length,9);
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-4-part1'].questionBlocks.find(block=>block.id==='q7-13')?.questionNumbers.length,7);
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-4-part2'].sections.length,6);
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-4-part2'].questionBlocks.find(block=>block.id==='q18-23')?.options?.length,5);
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-4-part3'].passageTitle,'The Unselfish Gene');
  assert.equal(EDITABLE_READING_PARTS['cambridge-19-test-4-part3'].questionBlocks.find(block=>block.id==='q31-35')?.questionNumbers.length,5);
});

test("reading: source-verified editable text covers Cambridge 18 Test 1 with its exact question map, table, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-18-test-1');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  const table=EDITABLE_READING_PARTS['cambridge-18-test-1-part1'].questionBlocks.find(block=>block.id==='q4-7')?.table;
  assert.equal(table?.columns.length,4);
  assert.equal(table?.rows.length,2);
  assert.ok(table?.rows.every(row=>row.length===4));
  assert.deepEqual(table?.rows.flat(2).flatMap(segment=>"question" in segment?[segment.question]:[]),[4,5,6,7]);
  assert.equal(table?.rows[1][3].length,0);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-1-part2'].sections.length,7);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-1-part2'].footnotes?.length,1);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-1-part3'].sections.length,6);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-1-part3'].questionBlocks.find(block=>block.id==='q36-40')?.options?.length,4);
});

test("reading: source-verified editable text covers Cambridge 18 Test 2 with its exact question map and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-18-test-2');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-2-part1'].sections[0].paragraphs.length,10);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-2-part1'].footnotes?.length,2);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-2-part2'].passageTitle,'Living with artificial intelligence');
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-2-part2'].questionBlocks.find(block=>block.id==='q24-26')?.wordBank,true);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-2-part2'].questionBlocks.find(block=>block.id==='q24-26')?.options?.length,6);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-2-part3'].passageTitle,'An ideal city');
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-2-part3'].questionBlocks.find(block=>block.id==='q34-40')?.questionNumbers.length,7);
});

test("reading: source-verified editable text covers Cambridge 18 Test 3 with its exact question map and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-18-test-3');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-3-part1'].sections.length,8);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-3-part2'].sections.length,7);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-3-part2'].questionBlocks.find(block=>block.id==='q14-20')?.options?.length,8);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-3-part3'].passageTitle,'The case for mixed-ability classes');
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-3-part3'].sections[0].paragraphs.length,12);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-3-part3'].questionBlocks.find(block=>block.id==='q31-35')?.options?.length,9);
});

test("reading: source-verified editable text covers Cambridge 18 Test 4 with its exact question map, footnote, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-18-test-4');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-4-part1'].sections.length,5);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-4-part1'].questionBlocks.find(block=>block.id==='q10-11')?.questionNumbers.length,2);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-4-part2'].sections[0].paragraphs.length,10);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-4-part2'].questionBlocks.find(block=>block.id==='q17-22')?.options?.length,5);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-4-part3'].footnotes?.length,1);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-4-part3'].sections[0].paragraphs.length,8);
  assert.equal(EDITABLE_READING_PARTS['cambridge-18-test-4-part3'].questionBlocks.find(block=>block.id==='q31-36')?.options?.length,10);
});

test("reading: source-verified editable text covers Cambridge 17 Test 1 with its exact question map, footnotes, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-17-test-1');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-1-part1'].passageTitle,'The development of the London underground railway');
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-1-part1'].questionBlocks.find(block=>block.id==='q1-6')?.lines?.filter(line=>line.kind==='question').length,6);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-17-test-1-part2'].sections.map(section=>section.label),['A','B','C','D','E','F','G']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-1-part2'].footnotes?.length,1);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-1-part2'].questionBlocks.find(block=>block.id==='q23-24')?.questionNumbers.length,2);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-1-part3'].subtitle,'Anna Keay reviews Charles Spencer’s book about the hunt for King Charles II during the English Civil War of the seventeenth century');
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-1-part3'].footnotes?.length,2);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-1-part3'].questionBlocks.find(block=>block.id==='q27-31')?.options?.length,10);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-1-part3'].questionBlocks.find(block=>block.id==='q36-40')?.items?.every(item=>item.options?.length===4),true);
});

test("reading: source-verified editable text covers Cambridge 17 Test 2 with its exact question map, footnote, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-17-test-2');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-2-part1'].sections[0].paragraphs.length,7);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-2-part1'].questionBlocks.find(block=>block.id==='q1-5')?.lines?.filter(line=>line.kind==='question').length,5);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-17-test-2-part2'].sections.map(section=>section.label),['A','B','C','D','E']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-2-part2'].footnotes?.length,1);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-2-part2'].questionBlocks.find(block=>block.id==='q19-23')?.options?.length,4);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-2-part3'].questionBlocks.find(block=>block.id==='q27-31')?.items?.every(item=>item.options?.length===4),true);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-2-part3'].questionBlocks.find(block=>block.id==='q37-40')?.options?.length,7);
});

test("reading: source-verified editable text covers Cambridge 17 Test 3 with its exact question map, footnotes, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-17-test-3');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-3-part1'].sections[0].paragraphs.length,8);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-3-part1'].footnotes?.length,2);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-17-test-3-part2'].sections.map(section=>section.label),['A','B','C','D','E','F','G','H']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-3-part2'].questionBlocks.find(block=>block.id==='q21-22')?.options?.length,5);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-3-part3'].footnotes?.length,2);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-3-part3'].questionBlocks.find(block=>block.id==='q27-31')?.items?.every(item=>item.options?.length===4),true);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-3-part3'].questionBlocks.find(block=>block.id==='q36-40')?.options?.length,10);
});

test("reading: source-verified editable text covers Cambridge 17 Test 4 with its exact question map, table, sections, footnote, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-17-test-4');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.table){
        const tableQuestions=block.table.rows.flatMap(row=>row.flatMap(cell=>cell.flatMap(segment=>"question" in segment?[segment.question]:[])));
        assert.deepEqual(tableQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-17-test-4-part1'].source.physicalPages,[81,82,83,84]);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-4-part1'].sections[0].paragraphs.length,12);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-17-test-4-part1'].questionBlocks.map(block=>block.questionNumbers),[[1,2,3,4,5,6],[7,8,9,10,11,12,13]]);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-4-part1'].questionBlocks.find(block=>block.id==='q7-13')?.table?.columns.length,2);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-17-test-4-part1'].questionBlocks.find(block=>block.id==='q7-13')?.table?.rows.flatMap(row=>row.flatMap(cell=>cell.flatMap(segment=>"question" in segment?[segment.question]:[]))),[7,8,9,10,11,12,13]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-17-test-4-part2'].sections.map(section=>section.label),['A','B','C','D','E','F']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-4-part2'].sections.find(section=>section.label==='C')?.paragraphs.length,2);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-4-part2'].sections.find(section=>section.label==='F')?.paragraphs.length,2);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-4-part2'].footnotes?.length,1);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-4-part2'].questionBlocks.find(block=>block.id==='q14-18')?.options?.length,6);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-4-part2'].questionBlocks.find(block=>block.id==='q23-24')?.options?.length,5);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-4-part2'].questionBlocks.find(block=>block.id==='q25-26')?.options?.length,5);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-17-test-4-part3'].sections.map(section=>section.label),['A','B','C','D','E','F','G','H']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-17-test-4-part3'].questionBlocks.find(block=>block.id==='q27-32')?.options?.length,8);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-17-test-4-part3'].questionBlocks.find(block=>block.id==='q37-40')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[37,38,39,40]);
});

test("reading: source-verified editable text covers Cambridge 16 Test 1 with its exact question map, headings, word bank, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-16-test-1');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-1-part1'].sections[0].paragraphs.length,8);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-1-part1'].questionBlocks.map(block=>block.questionNumbers),[[1,2,3,4,5,6,7],[8,9,10,11,12,13]]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-1-part1'].questionBlocks.find(block=>block.id==='q8-13')?.lines?.filter(line=>line.kind==='question').map(line=>line.number),[8,9,10,11,12,13]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-1-part2'].sections.map(section=>section.label),['A','B','C','D','E','F','G']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-1-part2'].questionBlocks.find(block=>block.id==='q14-20')?.options?.length,9);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-1-part2'].questionBlocks.find(block=>block.id==='q21-24')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[21,22,23,24]);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-1-part2'].questionBlocks.find(block=>block.id==='q25-26')?.options?.length,5);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-1-part3'].sections[0].paragraphs.length,14);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-1-part3'].questionBlocks.find(block=>block.id==='q27-30')?.items?.every(item=>item.options?.length===4),true);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-1-part3'].questionBlocks.find(block=>block.id==='q31-34')?.options?.length,7);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-1-part3'].questionBlocks.find(block=>block.id==='q31-34')?.wordBank,true);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-1-part3'].questionBlocks.find(block=>block.id==='q35-40')?.options?.length,3);
});

test("reading: source-verified editable text covers Cambridge 16 Test 2 with its exact question map, footnotes, headings, word banks, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-16-test-2');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-2-part1'].sections[0].paragraphs.length,9);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-2-part1'].footnotes?.length,4);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-2-part1'].questionBlocks.map(block=>block.questionNumbers),[[1,2,3,4,5,6,7,8],[9,10,11,12,13]]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-2-part1'].questionBlocks.find(block=>block.id==='q9-13')?.lines?.filter(line=>line.kind==='question').map(line=>line.number),[9,10,11,12,13]);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-2-part2'].sections[0].paragraphs.length,9);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-2-part2'].questionBlocks.find(block=>block.id==='q14-16')?.items?.every(item=>item.options?.length===4),true);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-2-part2'].questionBlocks.find(block=>block.id==='q17-20')?.options?.length,8);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-2-part2'].questionBlocks.find(block=>block.id==='q21-26')?.options?.length,3);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-2-part3'].sections[0].paragraphs.length,10);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-2-part3'].questionBlocks.find(block=>block.id==='q27-30')?.items?.every(item=>item.options?.length===4),true);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-2-part3'].questionBlocks.find(block=>block.id==='q31-35')?.options?.length,10);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-2-part3'].questionBlocks.find(block=>block.id==='q36-40')?.options?.length,3);
});

test("reading: source-verified editable text covers Cambridge 16 Test 3 with its exact question map, sections, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-16-test-3');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-3-part1'].sections[0].paragraphs.length,7);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-3-part1'].questionBlocks.map(block=>block.questionNumbers),[[1,2,3,4,5],[6,7,8,9,10,11,12,13]]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-3-part1'].questionBlocks.find(block=>block.id==='q6-13')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[6,7,8,9,10,11,12,13]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-3-part2'].sections.map(section=>section.label),['A','B','C','D','E','F','G','H']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-3-part2'].sections.map(section=>section.paragraphs.length),[1,2,3,1,1,2,1,1]);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-3-part2'].footnotes?.length,2);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-3-part2'].questionBlocks.find(block=>block.id==='q14-19')?.options?.map(option=>option.value),['A','B','C','D','E','F','G','H']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-3-part2'].questionBlocks.filter(block=>['q23-24','q25-26'].includes(block.id)).map(block=>block.options?.length),[5,5]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-3-part3'].sections.map(section=>section.label),['A','B','C','D','E','F','G','H']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-3-part3'].sections.map(section=>section.paragraphs.length),[2,1,1,1,2,1,2,1]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-3-part3'].questionBlocks.find(block=>block.id==='q33-37')?.options?.map(option=>option.value),['A','B','C','D','E','F','G','H']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-3-part3'].questionBlocks.find(block=>block.id==='q38-40')?.lines?.filter(line=>line.kind==='question').map(line=>line.number),[38,39,40]);
});

test("reading: source-verified editable text covers Cambridge 16 Test 4 with its exact question map, word bank, diagram labels, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-16-test-4');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-4-part1'].questionBlocks.map(block=>block.questionNumbers),[[1,2,3,4,5,6],[7,8,9,10],[11,12,13]]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-4-part1'].questionBlocks.find(block=>block.id==='q1-6')?.lines?.filter(line=>line.kind==='question').map(line=>line.number),[1,2,3,4,5,6]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-4-part2'].sections[0].paragraphs.length,9);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-4-part2'].questionBlocks.find(block=>block.id==='q18-22')?.options?.length,8);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-4-part2'].questionBlocks.find(block=>block.id==='q18-22')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[18,19,20,21,22]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-4-part3'].sections.map(section=>section.label),['A','B','C','D','E','F']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-4-part3'].sections.map(section=>section.paragraphs.length),[3,2,2,2,2,2]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-16-test-4-part3'].questionBlocks.find(block=>block.id==='q27-32')?.options?.map(option=>option.value),['i','ii','iii','iv','v','vi','vii','viii']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-16-test-4-part3'].questionBlocks.find(block=>block.id==='q33-35')?.items?.every(item=>item.options?.length===4),true);
});

test("reading: source-verified editable text covers Cambridge 15 Test 1 with its exact question map, table, sections, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-15-test-1');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-1-part1'].sections[0].paragraphs.length,7);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-1-part1'].questionBlocks.map(block=>block.questionNumbers),[[1,2,3,4],[5,6,7],[8,9,10,11,12,13]]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-1-part1'].questionBlocks.find(block=>block.id==='q8-13')?.table?.rows.flatMap(row=>row.flatMap(cell=>cell.flatMap(segment=>"question" in segment?[segment.question]:[]))),[8,9,10,11,12,13]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-1-part2'].sections.map(section=>section.label),['A','B','C','D','E','F','G']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-1-part2'].sections.map(section=>section.paragraphs.length),[2,2,1,3,2,1,1]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-1-part2'].questionBlocks.find(block=>block.id==='q14-18')?.options?.map(option=>option.value),['A','B','C','D','E','F','G']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-1-part2'].questionBlocks.filter(block=>['q23-24','q25-26'].includes(block.id)).map(block=>block.options?.length),[5,5]);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-1-part3'].sections[0].paragraphs.length,7);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-1-part3'].questionBlocks.find(block=>block.id==='q27-32')?.items?.every(item=>item.options?.length===4),true);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-1-part3'].questionBlocks.find(block=>block.id==='q33-37')?.options?.length,5);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-1-part3'].questionBlocks.find(block=>block.id==='q33-37')?.wordBank,true);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-1-part3'].questionBlocks.find(block=>block.id==='q38-40')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[38,39,40]);
});

test("reading: source-verified editable text covers Cambridge 15 Test 2 with its exact question map, word bank, sections, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-15-test-2');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-2-part1'].sections.map(section=>section.label),['A','B','C','D','E','F','G']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-2-part1'].questionBlocks.find(block=>block.id==='q1-6')?.options?.map(option=>option.value),['A','B','C','D','E','F','G']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-2-part1'].questionBlocks.find(block=>block.id==='q7-13')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[7,8,9,10,11,12,13]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-2-part2'].sections.map(section=>section.label),['A','B','C','D','E','F']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-2-part2'].questionBlocks.find(block=>block.id==='q18-22')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[18,19,20,21,22]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-2-part2'].questionBlocks.find(block=>block.id==='q23-26')?.options?.map(option=>option.label),['A — Ben Novak','B — Michael Archer','C — Beth Shapiro']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-2-part2'].questionBlocks.find(block=>block.id==='q23-26')?.wordBank,true);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-2-part3'].sections[0].paragraphs.length,9);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-2-part3'].questionBlocks.find(block=>block.id==='q27-31')?.items?.every(item=>item.options?.length===4),true);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-2-part3'].questionBlocks.find(block=>block.id==='q32-36')?.options?.map(option=>option.value),['A','B','C','D','E','F','G','H']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-2-part3'].questionBlocks.find(block=>block.id==='q32-36')?.wordBank,true);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-2-part3'].questionBlocks.find(block=>block.id==='q32-36')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[32,33,34,35,36]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-2-part3'].questionBlocks.find(block=>block.id==='q37-40')?.options?.map(option=>option.value),['YES','NO','NOT GIVEN']);
});

test("reading: source-verified editable text covers Cambridge 15 Test 3 with its exact question map, table, headings, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-15-test-3');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-3-part1'].sections[0].paragraphs.length,11);
  assert.ok(EDITABLE_READING_PARTS['cambridge-15-test-3-part1'].footnotes?.some(note=>note.includes('Mayan')));
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-3-part1'].questionBlocks.find(block=>block.id==='q8-13')?.table?.rows.flatMap(row=>row.flatMap(cell=>cell.flatMap(segment=>"question" in segment?[segment.question]:[]))),[8,9,10,11,12,13]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-3-part2'].sections.map(section=>section.label),['A','B','C','D','E','F','G']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-3-part2'].questionBlocks.find(block=>block.id==='q14-20')?.options?.map(option=>option.value),['i','ii','iii','iv','v','vi','vii','viii','ix','x']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-3-part2'].questionBlocks.find(block=>block.id==='q14-20')?.wordBank,true);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-3-part2'].questionBlocks.find(block=>block.id==='q21-26')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[21,22,23,24,25,26]);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-3-part3'].sections[0].paragraphs.length,10);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-3-part3'].footnotes?.length,1);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-3-part3'].questionBlocks.find(block=>block.id==='q27-31')?.options?.map(option=>option.value),['A','B','C','D','E','F']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-3-part3'].questionBlocks.find(block=>block.id==='q27-31')?.wordBank,true);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-3-part3'].questionBlocks.find(block=>block.id==='q32-36')?.options?.map(option=>option.value),['A','B','C','D','E','F','G','H','I']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-3-part3'].questionBlocks.find(block=>block.id==='q32-36')?.wordBank,true);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-3-part3'].questionBlocks.find(block=>block.id==='q37-40')?.items?.every(item=>item.options?.length===4),true);
});

test("reading: source-verified editable text covers Cambridge 15 Test 4 with its exact question map, tables, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-15-test-4');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-4-part1'].sections[0].paragraphs.length,8);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-4-part1'].questionBlocks.find(block=>block.id==='q1-5')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]).length,5);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-4-part1'].questionBlocks.find(block=>block.id==='q6-8')?.table?.rows.flatMap(row=>row.flatMap(cell=>cell.flatMap(segment=>"question" in segment?[segment.question]:[]))),[6,7,8]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-4-part1'].questionBlocks.find(block=>block.id==='q9-13')?.options?.map(option=>option.value),['TRUE','FALSE','NOT GIVEN']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-4-part2'].sections[0].paragraphs.length,9);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-4-part2'].questionBlocks.find(block=>block.id==='q20-26')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[20,21,22,23,24,25,26]);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-4-part3'].sections[0].paragraphs.length,7);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-4-part3'].questionBlocks.find(block=>block.id==='q27-31')?.options?.map(option=>option.value),['A','B','C','D','E','F','G','H','I']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-4-part3'].questionBlocks.find(block=>block.id==='q27-31')?.wordBank,true);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-4-part3'].questionBlocks.find(block=>block.id==='q32-34')?.items?.every(item=>item.options?.length===4),true);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-15-test-4-part3'].questionBlocks.find(block=>block.id==='q35-39')?.options?.map(option=>option.value),['YES','NO','NOT GIVEN']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-15-test-4-part3'].questionBlocks.find(block=>block.id==='q40')?.items?.[0]?.options?.length,4);
});

test("reading: source-verified editable text covers Cambridge 13 Test 4 with its exact question map, paragraph labels, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-13-test-4');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-13-test-4-part1'].sections[0].paragraphs.length,11);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-4-part1'].questionBlocks.find(block=>block.id==='q1-8')?.options?.map(option=>option.value),['TRUE','FALSE','NOT GIVEN']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-4-part1'].questionBlocks.find(block=>block.id==='q9-13')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[9,10,11,12,13]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-4-part2'].sections.map(section=>section.label),['A','B','C','D','E','F','G']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-4-part2'].questionBlocks.find(block=>block.id==='q14-17')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[14,15,16,17]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-4-part2'].questionBlocks.find(block=>block.id==='q18-21')?.options?.map(option=>option.value),['A','B','C','D','E','F']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-4-part2'].questionBlocks.find(block=>block.id==='q22-26')?.options?.map(option=>option.value),['A','B','C','D','E','F','G']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-13-test-4-part2'].footnotes?.[0],'* Humus: the part of the soil formed from dead plant material');
  assert.equal(EDITABLE_READING_PARTS['cambridge-13-test-4-part3'].sections[0].paragraphs.length,6);
  assert.equal(EDITABLE_READING_PARTS['cambridge-13-test-4-part3'].passageTitle,'Book Review');
  assert.match(EDITABLE_READING_PARTS['cambridge-13-test-4-part3'].subtitle ?? '',/By William Davies/);
  assert.equal(EDITABLE_READING_PARTS['cambridge-13-test-4-part3'].questionBlocks.find(block=>block.id==='q27-29')?.items?.every(item=>item.options?.length===4),true);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-4-part3'].questionBlocks.find(block=>block.id==='q30-34')?.options?.map(option=>option.value),['A','B','C','D','E','F','G']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-4-part3'].questionBlocks.find(block=>block.id==='q30-34')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[30,31,32,33,34]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-4-part3'].questionBlocks.find(block=>block.id==='q35-40')?.options?.map(option=>option.value),['YES','NO','NOT GIVEN']);
});

test("reading: source-verified editable text covers Cambridge 13 Test 3 with its exact question map, passage labels, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-13-test-3');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-13-test-3-part1'].sections[0].paragraphs.length,6);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-3-part1'].questionBlocks.find(block=>block.id==='q1-8')?.table?.columns,['Part','Description','Uses']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-3-part1'].questionBlocks.find(block=>block.id==='q1-8')?.table?.rows.flatMap(row=>row.flatMap(cell=>cell.flatMap(segment=>"question" in segment?[segment.question]:[]))),[1,2,3,4,5,6,7,8]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-3-part1'].questionBlocks.find(block=>block.id==='q9-13')?.options?.map(option=>option.value),['TRUE','FALSE','NOT GIVEN']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-3-part2'].sections.map(section=>section.label),['A','B','C','D','E','F']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-3-part2'].questionBlocks.find(block=>block.id==='q14-17')?.options?.map(option=>option.value),['A','B','C']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-3-part2'].questionBlocks.find(block=>block.id==='q18-23')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[18,19,20,21,22,23]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-3-part2'].questionBlocks.find(block=>block.id==='q24-26')?.options?.map(option=>option.value),['A','B','C','D','E','F']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-3-part3'].sections.map(section=>section.label),['A','B','C','D','E','F','G','H']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-3-part3'].questionBlocks.find(block=>block.id==='q27-31')?.options?.map(option=>option.value),['A','B','C','D','E','F','G','H']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-3-part3'].questionBlocks.find(block=>block.id==='q32-36')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[32,33,34,35,36]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-3-part3'].questionBlocks.find(block=>block.id==='q37-40')?.options?.map(option=>option.label),['A — Cameron Petrie','B — Ravindanath Singh','C — Yama Dixit','D — David Hodell']);
});

test("reading: source-verified editable text covers Cambridge 13 Test 2 with its exact question map, company bank, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-13-test-2');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-13-test-2-part1'].sections[0].paragraphs.length,6);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-2-part1'].questionBlocks.find(block=>block.id==='q1-9')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[1,2,3,4,5,6,7,8,9]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-2-part1'].questionBlocks.find(block=>block.id==='q10-13')?.options?.map(option=>option.value),['TRUE','FALSE','NOT GIVEN']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-2-part2'].sections.map(section=>section.label),['A','B','C','D','E','F']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-2-part2'].questionBlocks.find(block=>block.id==='q18-20')?.options?.map(option=>option.label),['A — Markus Heinrichs','B — Simone Shamay-Tsoory','C — Jennifer Bartz','D — Carolyn DeClerck','E — Carsten De Dreu','F — Sue Carter']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-2-part2'].questionBlocks.find(block=>block.id==='q21-26')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[21,22,23,24,25,26]);
  assert.equal(EDITABLE_READING_PARTS['cambridge-13-test-2-part3'].sections[0].paragraphs.length,8);
  assert.equal(EDITABLE_READING_PARTS['cambridge-13-test-2-part3'].questionBlocks.find(block=>block.id==='q27-31')?.items?.every(item=>item.options?.length===4),true);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-2-part3'].questionBlocks.find(block=>block.id==='q32-37')?.options?.map(option=>option.value),['A','B','C','D']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-13-test-2-part3'].questionBlocks.find(block=>block.id==='q32-37')?.wordBank,true);
  assert.equal(EDITABLE_READING_PARTS['cambridge-13-test-2-part3'].questionBlocks.find(block=>block.id==='q38-40')?.wordBank,true);
});

test("reading: source-verified editable text covers Cambridge 13 Test 1 with its exact question map, table, headings, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-13-test-1');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.table){
        const tableQuestions=block.table.rows.flatMap(row=>row.flatMap(cell=>cell.flatMap(segment=>"question" in segment?[segment.question]:[])));
        assert.deepEqual(tableQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-1-part1'].questionBlocks.find(block=>block.id==='q1-7')?.table?.columns,['Section of website','Comments']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-1-part1'].questionBlocks.find(block=>block.id==='q1-7')?.table?.rows.flatMap(row=>row.flatMap(cell=>cell.flatMap(segment=>"question" in segment?[segment.question]:[]))),[1,2,3,4,5,6,7]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-1-part1'].questionBlocks.find(block=>block.id==='q8-13')?.options?.map(option=>option.value),['TRUE','FALSE','NOT GIVEN']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-1-part2'].sections.map(section=>section.label),['A','B','C','D','E','F']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-1-part2'].questionBlocks.find(block=>block.id==='q14-19')?.options?.map(option=>option.value),['i','ii','iii','iv','v','vi','vii','viii']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-13-test-1-part2'].questionBlocks.find(block=>block.id==='q20-23')?.wordBank,true);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-1-part2'].questionBlocks.find(block=>block.id==='q24-26')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[24,25,26]);
  assert.equal(EDITABLE_READING_PARTS['cambridge-13-test-1-part3'].sections[0].paragraphs.length,7);
  assert.equal(EDITABLE_READING_PARTS['cambridge-13-test-1-part3'].questionBlocks.find(block=>block.id==='q27-31')?.items?.every(item=>item.options?.length===4),true);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-1-part3'].questionBlocks.find(block=>block.id==='q32-37')?.options?.map(option=>option.value),['A','B','C','D','E','F','G']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-13-test-1-part3'].questionBlocks.find(block=>block.id==='q38-40')?.options?.map(option=>option.value),['YES','NO','NOT GIVEN']);
});

test("reading: source-verified editable text covers Cambridge 14 Test 4 with its exact question map, option sets, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-14-test-4');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-14-test-4-part1'].sections[0].paragraphs.length,9);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-4-part1'].questionBlocks.find(block=>block.id==='q1-8')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[1,2,3,4,5,6,7,8]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-4-part1'].questionBlocks.find(block=>block.id==='q9-13')?.options?.map(option=>option.value),['TRUE','FALSE','NOT GIVEN']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-4-part2'].sections.map(section=>section.label),['A','B','C','D','E','F']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-4-part2'].questionBlocks.find(block=>block.id==='q23-24')?.options?.map(option=>option.value),['A','B','C','D','E']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-14-test-4-part2'].questionBlocks.find(block=>block.id==='q25-26')?.wordBank,true);
  assert.equal(EDITABLE_READING_PARTS['cambridge-14-test-4-part3'].sections[0].paragraphs.length,13);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-4-part3'].questionBlocks.find(block=>block.id==='q27-33')?.options?.map(option=>option.value),['TRUE','FALSE','NOT GIVEN']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-4-part3'].questionBlocks.find(block=>block.id==='q34-39')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[34,35,36,37,38,39]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-4-part3'].questionBlocks.find(block=>block.id==='q40')?.items?.[0]?.options?.map(option=>option.value),['A','B','C','D']);
});

test("reading: source-verified editable text covers Cambridge 14 Test 3 with its exact question map, researcher bank, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-14-test-3');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-3-part1'].sections.map(section=>section.label),['A','B','C','D','E','F','G','H','I','J']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-3-part1'].questionBlocks.find(block=>block.id==='q1-3')?.options?.map(option=>option.value),['A','B','C','D','E','F','G','H','I','J']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-3-part1'].questionBlocks.find(block=>block.id==='q4-6')?.options?.map(option=>option.value),['YES','NO','NOT GIVEN']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-14-test-3-part1'].questionBlocks.find(block=>block.id==='q7-13')?.wordBank,true);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-3-part2'].sections.map(section=>section.label),['A','B','C','D','E','F','G','H','I']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-14-test-3-part2'].questionBlocks.find(block=>block.id==='q21-22')?.wordBank,true);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-3-part2'].questionBlocks.find(block=>block.id==='q23-26')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[23,24,25,26]);
  assert.equal(EDITABLE_READING_PARTS['cambridge-14-test-3-part3'].sections[0].paragraphs.length,11);
  assert.equal(EDITABLE_READING_PARTS['cambridge-14-test-3-part3'].questionBlocks.find(block=>block.id==='q27-31')?.wordBank,true);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-3-part3'].questionBlocks.find(block=>block.id==='q32-36')?.options?.map(option=>option.value),['YES','NO','NOT GIVEN']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-3-part3'].questionBlocks.find(block=>block.id==='q37-40')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[37,38,39,40]);
});

test("reading: source-verified editable text covers Cambridge 14 Test 2 with its exact question map, headings, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-14-test-2');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-14-test-2-part1'].sections[0].paragraphs.length,9);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-2-part1'].questionBlocks.find(block=>block.id==='q1-8')?.options?.map(option=>option.value),['TRUE','FALSE','NOT GIVEN']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-2-part1'].questionBlocks.find(block=>block.id==='q9-13')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[9,10,11,12,13]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-2-part2'].sections.map(section=>section.label),['A','B','C','D','E','F','G','H','I']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-2-part2'].questionBlocks.find(block=>block.id==='q14-18')?.options?.map(option=>option.value),['A','B','C','D','E','F','G','H','I']);
  assert.ok(EDITABLE_READING_PARTS['cambridge-14-test-2-part2'].footnotes?.some(note=>note.includes('pathogens')));
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-2-part2'].questionBlocks.find(block=>block.id==='q19-26')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[19,20,21,22,23,24,25,26]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-2-part3'].sections.map(section=>section.label),['A','B','C','D','E','F','G','H']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-2-part3'].questionBlocks.find(block=>block.id==='q27-34')?.options?.map(option=>option.value),['i','ii','iii','iv','v','vi','vii','viii','ix']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-14-test-2-part3'].questionBlocks.find(block=>block.id==='q27-34')?.wordBank,true);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-2-part3'].questionBlocks.find(block=>block.id==='q35-37')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[35,36,37]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-2-part3'].questionBlocks.find(block=>block.id==='q38-40')?.options?.map(option=>option.value),['TRUE','FALSE','NOT GIVEN']);
});

test("reading: source-verified editable text covers Cambridge 14 Test 1 with its exact question map, paired choices, and PDF pages", () => {
  const papers=JSON.parse(readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
  const paper=papers.find(item=>item.id==='cambridge-14-test-1');
  assert.ok(paper);
  const checkedParts=paper.parts.filter(part=>EDITABLE_READING_PARTS[part.id]);
  assert.equal(checkedParts.length,3);
  let total=0;
  for(const part of checkedParts){
    const text=EDITABLE_READING_PARTS[part.id];
    assert.equal(text.status,'source-verified',part.id);
    assert.equal(text.source.pdfName,paper.source.pdfName,part.id);
    assert.equal(text.source.sha256,paper.source.sha256,part.id);
    const pages=[...new Set([...part.source.passagePages,...part.source.questionPages].map(page=>page.page))].sort((a,b)=>a-b);
    assert.deepEqual(text.source.physicalPages,pages,part.id);
    const expected=part.questionBlocks.flatMap(block=>block.questions.map(question=>question.number));
    const actual=text.questionBlocks.flatMap(block=>block.questionNumbers);
    assert.deepEqual(actual,expected,part.id);
    assert.equal(new Set(actual).size,actual.length,part.id);
    assert.ok(text.sections.reduce((count,section)=>count+section.paragraphs.length,0)>0,part.id);
    assert.ok(text.questionBlocks.every(block=>block.directions.length>0),part.id);
    for(const block of text.questionBlocks){
      if(block.flow){
        const flowQuestions=block.flow.flatMap(segment=>"question" in segment?[segment.question]:[]);
        assert.deepEqual(flowQuestions,block.questionNumbers,part.id+" "+block.id);
      }
      if(block.response==='select'){
        for(const question of block.questionNumbers){
          const item=block.items?.find(row=>row.number===question);
          assert.ok(item?.options?.length || block.options?.length,part.id+' Q'+question+' has selectable options');
        }
      }
      total+=block.questionNumbers.length;
    }
  }
  assert.equal(total,40);
  assert.equal(EDITABLE_READING_PARTS['cambridge-14-test-1-part1'].sections[0].paragraphs.length,16);
  assert.ok(EDITABLE_READING_PARTS['cambridge-14-test-1-part1'].footnotes?.some(note=>note.includes('Lego')));
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-1-part1'].questionBlocks.find(block=>block.id==='q1-8')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[1,2,3,4,5,6,7,8]);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-1-part2'].sections.map(section=>section.label),['A','B','C','D','E','F','G']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-1-part2'].questionBlocks.find(block=>block.id==='q14-18')?.options?.map(option=>option.value),['A','B','C','D','E','F','G']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-14-test-1-part2'].questionBlocks.find(block=>block.id==='q19-20')?.wordBank,true);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-1-part2'].questionBlocks.find(block=>block.id==='q19-20')?.options?.map(option=>option.value),['A','B','C','D','E']);
  assert.equal(EDITABLE_READING_PARTS['cambridge-14-test-1-part2'].questionBlocks.find(block=>block.id==='q21-22')?.items?.length,2);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-1-part2'].questionBlocks.find(block=>block.id==='q23-26')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[23,24,25,26]);
  assert.equal(EDITABLE_READING_PARTS['cambridge-14-test-1-part3'].sections[0].paragraphs.length,12);
  assert.ok(EDITABLE_READING_PARTS['cambridge-14-test-1-part3'].questionBlocks.find(block=>block.id==='q27-31')?.wordBank);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-1-part3'].questionBlocks.find(block=>block.id==='q32-35')?.options?.map(option=>option.value),['YES','NO','NOT GIVEN']);
  assert.deepEqual(EDITABLE_READING_PARTS['cambridge-14-test-1-part3'].questionBlocks.find(block=>block.id==='q36-40')?.flow?.flatMap(segment=>"question" in segment?[segment.question]:[]),[36,37,38,39,40]);
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
  assert.equal(authoredQuestions,920);assert.equal(guideParts,114);assert.equal(withoutAnalysis,33);
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
  assert.equal(review.tests,72);assert.equal(review.parts,216);assert.equal(review.questions,2880);
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
