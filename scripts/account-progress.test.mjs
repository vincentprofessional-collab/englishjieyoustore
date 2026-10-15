import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
function load(path, imports = {}) {
 const exports = {};
 const source = ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{exports,Date,JSON,Response,Blob,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture'}},require:name=>{assert.ok(name in imports,name);return imports[name];}});
 return exports;
}
const model=load('../src/lib/learning/account-progress.ts');
const {emptyAccountSnapshot:empty, mergeAccountSnapshots:merge, captureAccountChanges:capture, materializeAccountProgress:restore, VOCABULARY_PROGRESS_KEY:VOC, STUDY_HISTORY_KEY:HISTORY}=model;
const at=Date.now()-1000;
const progress=(word,time,outcome='familiar')=>({[VOC]:{progress:{[word]:{lastReviewedAt:time,completed:true,familiarity:outcome,modeOutcomes:{reading:outcome}}}}});
test('different devices merge all learned words and older local data cannot replace newer classifications',()=>{
 const a=capture(progress('first',at-100),{},empty(),at), b=capture(progress('second',at),{},empty(),at);
 const combined=restore(merge([a,b]));
 assert.deepEqual(Object.keys(combined[VOC].progress).sort(),['first','second']);
 const stale=capture(progress('second',at-100,'unfamiliar'),{},empty(),at+10);
 assert.equal(restore(merge([b,stale]))[VOC].progress.second.familiarity,'familiar');
 assert.ok(model.isProgressKey('ielts-platform.listeningAttempt.paper-1'));
 assert.ok(!model.isProgressKey('sb-secret-auth-token'));
 assert.equal(Object.keys(model.sanitizeAccountSnapshot({entries:{'k:sb-secret-auth-token':{value:'secret',updatedAt:at}}}).entries).length,0);
});
test('study time adds independent device contributions and pulling cloud totals does not count them twice',()=>{
 const day='2026-10-15';
 const aValues={[HISTORY]:{[day]:{seconds:600,activitySeconds:{articles:600},studyItems:['article:A'],lookedUpWords:['baby']}}};
 const bValues={[HISTORY]:{[day]:{seconds:300,activitySeconds:{vocabulary:300},studyItems:['word:B'],lookedUpWords:['bigger']}}};
 const a=capture(aValues,{},empty(),at), b=capture(bValues,{},empty(),at);
 const all=restore(merge([a,b]));
 assert.equal(all[HISTORY][day].seconds,900);
 assert.equal(all[HISTORY][day].activitySeconds.articles,600);
 assert.equal(all[HISTORY][day].activitySeconds.vocabulary,300);
 assert.equal(all[HISTORY][day].lookedUpWords.length,2);
 assert.equal(Object.keys(capture(all,all,a,at).times).length,0,'a cloud pull is not new study time');
 const next=structuredClone(all); next[HISTORY][day].seconds+=10;next[HISTORY][day].activitySeconds.articles+=10;
 const delta=capture(next,all,a,at);
 assert.equal(delta.times[day].seconds,610);
 assert.equal(restore(merge([merge([a,delta],true),b]))[HISTORY][day].seconds,910);
});
test('empty second devices retain cloud records and explicit local removals use dated tombstones',()=>{
 const existing=capture(progress('word',at),{},empty(),at);
 assert.equal(Object.keys(capture({}, {}, empty(), at+10).entries).length,0);
 const removed=capture({},progress('word',at),existing,at+10);
 assert.equal(restore(merge([existing,removed]))[VOC],undefined);
 const answers={'ielts-platform.listeningReviewAnswers.section-1':{1:'answer'}};
 assert.equal(restore(capture(answers,{},empty(),at))['ielts-platform.listeningReviewAnswers.section-1'][1],'answer');
});
function routeFixture(){
 const user='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222', d1='33333333-3333-4333-8333-333333333333', d2='44444444-4444-4444-8444-444444444444';
 const files=new Map(), accessed=[]; let fail=false;
 const storage={
  async list(prefix){accessed.push(prefix);return {data:[...files.keys()].filter(p=>p.startsWith(prefix+'/')).map(p=>({name:p.split('/').at(-1)})),error:null};},
  async download(path){accessed.push(path);return files.has(path)?{data:new Blob([files.get(path)]),error:null}:{error:{statusCode:'400',message:'Object not found'}};},
  async upload(path,value){accessed.push(path);if(fail)return{error:new Error('offline')};files.set(path,value);return{error:null};}
 };
 const api=load('../src/app/api/account-progress/route.ts',{'next/server':{NextResponse:{json:(value,options)=>new Response(JSON.stringify(value),options)}},'@/supabase/supabase-js':{},'@supabase/supabase-js':{createClient:()=>({auth:{getUser:async token=>({data:{user:token==='valid'?{id:user}:null},error:null})},storage:{from:bucket=>{assert.equal(bucket,'account-learning-progress');return storage;}}})},'@/lib/learning/account-progress':model});
 const req=(snapshot,deviceId=d1,token='valid',origin='https://fixture.invalid')=>({nextUrl:new URL(`https://fixture.invalid/api/account-progress?deviceId=${deviceId}&userId=${other}`),headers:new Headers({Authorization:`Bearer ${token}`,Origin:origin}),json:async()=>({snapshot,deviceId,userId:other})});
 return{api,req,files,accessed,user,other,d1,d2,fail:()=>{fail=true;}};
}
test('two independently signed-in devices resume the same private progress and cannot access another account',async()=>{
 const f=routeFixture();
 assert.equal((await f.api.GET(f.req(null,f.d1,'invalid'))).status,401);assert.equal(f.accessed.length,0);
 assert.equal((await f.api.PUT(f.req(capture(progress('one',at),{},empty(),at)))).status,200);
 assert.equal((await f.api.PUT(f.req(capture(progress('two',at),{},empty(),at),f.d2))).status,200);
 f.files.set(`${f.other}/${f.d1}.json`,JSON.stringify(capture(progress('private-other',at),{},empty(),at)));
 const result=await f.api.GET(f.req(null)), body=await result.json();
 const all=restore(merge([body.remote,body.own]));
 assert.deepEqual(Object.keys(all[VOC].progress).sort(),['one','two']);
 assert.ok(f.accessed.every(path=>!path.startsWith(f.other)));
 assert.match(result.headers.get('cache-control'),/private, no-store/);
 assert.equal((await f.api.PUT(f.req(empty(),f.d1,'valid','https://untrusted.invalid'))).status,403);
 f.fail();assert.equal((await f.api.PUT(f.req(capture(progress('three',at),{},empty(),at)))).status,503);
 assert.ok(!f.files.get(`${f.user}/${f.d1}.json`).includes('three'));
});
