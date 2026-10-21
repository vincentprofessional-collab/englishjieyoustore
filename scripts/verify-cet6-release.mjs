import {createHash} from 'node:crypto';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

const origin=process.argv[2]||'https://www.englishjieyou.cn';
const commit=process.argv[3]||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const output=process.argv[4]||'/tmp/cet6-intake-20261021/production-readback.json';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const index=JSON.parse(await readFile('public/cet6/index.json','utf8'));
const legacy=JSON.parse(execFileSync('git',['show','2618984:src/data/cet6/library.json'],{encoding:'utf8',maxBuffer:10*1024*1024}));
let report={origin,commit,startedAt:new Date().toISOString(),results:{}};
try {const previous=JSON.parse(await readFile(output,'utf8'));if(previous.commit===commit&&previous.origin===origin)report=previous;} catch(error){if(error.code!=='ENOENT')throw error;}
let saveQueue=Promise.resolve();
const save=()=>{const snapshot=JSON.stringify(report,null,2)+'\n';saveQueue=saveQueue.then(async()=>{await writeFile(output+'.tmp',snapshot);await rename(output+'.tmp',output);});return saveQueue;};
const check=async(task)=>{
  const local=task.file?await readFile(task.file):null;
  if(report.results[task.path]?.passed&&(!local||report.results[task.path].sha256===hash(local)))return;
  const separator=task.path.includes('?')?'&':'?';
  const response=await fetch(origin+task.path+separator+'source_review='+encodeURIComponent(commit),{signal:AbortSignal.timeout(45000)});
  if(response.status!==task.status){await response.body?.cancel();throw Error(`${task.path}: expected ${task.status}, received ${response.status}`);}
  const body=Buffer.from(await response.arrayBuffer());
  if(local&&hash(body)!==hash(local))throw Error(`${task.path}: production data differs from the reviewed commit`);
  if(!local&&task.status===200&&(!body.includes(Buffer.from('大学英语六级'))||body.includes(Buffer.from('/cet6?entry=knowledge'))))throw Error(`${task.path}: unexpected page or stale CET-6 navigation`);
  report.results[task.path]={status:response.status,sha256:hash(body),decodedBytes:body.length,encodedBytes:Number(response.headers.get('content-length'))||null,passed:true,checkedAt:new Date().toISOString()};
  await save();
};
await check({path:'/cet6/index.json',file:'public/cet6/index.json',status:200});
const tasks=[
  ...index.entries.map(entry=>{const suffix=`/cet6/${entry.kind==='paper'?'papers':'practice'}/${entry.id}.json`;return {path:suffix,file:'public'+suffix,status:200};}),
  ...['/cet6?entry=papers','/cet6?entry=practice','/cet6?entry=knowledge','/cet6/cet6-paper-2020071','/cet6/cet6-paper-2026063','/cet6/practice-cet6-reading','/cet6/practice-cet6-cloze'].map(path=>({path,status:200})),
  ...legacy.entries.filter(entry=>entry.section==='知识点').map(entry=>({path:'/cet6/'+entry.id,status:404})),
];
let cursor=0;const failures=[];
await Promise.all(Array.from({length:3},async()=>{while(cursor<tasks.length&&!failures.length){try{await check(tasks[cursor++]);}catch(error){failures.push(error);}}}));
report.finishedAt=new Date().toISOString();report.passed=failures.length===0&&Object.keys(report.results).length===tasks.length+1;
report.summary={jsonFiles:index.entries.length+1,pages:7,removedKnowledgePages:legacy.entries.filter(entry=>entry.section==='知识点').length,passedRequests:Object.keys(report.results).length};
await save();
if(failures.length)throw failures[0];
console.log(JSON.stringify({passed:report.passed,...report.summary}));
