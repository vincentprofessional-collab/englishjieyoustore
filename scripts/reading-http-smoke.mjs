import fs from 'node:fs';

const base=process.argv[2]??'http://127.0.0.1:3107';
const mode=process.argv[3]??'all';
const tests=JSON.parse(fs.readFileSync(new URL('../src/lib/ielts/source-reading-tests.json',import.meta.url),'utf8'));
const modes=mode==='all'?['practice','mock']:[mode];
const jobs=tests.flatMap(test=>modes.map(mode=>({test,mode})));
const failures=[];let checked=0;
async function worker(){
  while(jobs.length){
    const {test,mode}=jobs.shift();
    try{
      const response=await fetch(`${base}/reading/${mode}/${test.id}`,{signal:AbortSignal.timeout(30000)});
      const html=await response.text();
      // React streaming also carries hidden replacement frames. Inspect unique question
      // identities rather than mistaking those transport copies for additional questions.
      const ids=[...new Set([...html.matchAll(/<input\b[^>]*id="reading-source-answer-(\d+)"/g)].map(match=>Number(match[1])))].sort((a,b)=>a-b);
      const expected=test.parts[0].questionBlocks[0].questions.map(q=>q.number);
      if(response.status!==200||JSON.stringify(ids)!==JSON.stringify(expected)||!html.includes('junior-high-exam-toolbar')||!html.includes(test.title)||!html.includes(mode==='mock'?'60:00':'20:00')||!html.includes(test.parts[0].source.passagePages[0].src)){
        failures.push({id:test.id,mode,status:response.status,questions:ids,expected});
      }
    }catch(error){failures.push({id:test.id,mode,error:error.message});}
    checked++;
  }
}
await Promise.all(Array.from({length:3},worker));
fs.mkdirSync('tmp/reading-review',{recursive:true});
fs.writeFileSync('tmp/reading-review/local-http-check.json',JSON.stringify({base,checked,failures},null,2));
console.log(JSON.stringify({checked,failures:failures.length,examples:failures.slice(0,3)}));
if(failures.length)process.exitCode=1;
