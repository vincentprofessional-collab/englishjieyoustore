import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { SCENE_MODES, sceneFieldVisible, isSceneSpellingCorrect, normalizeSceneSettings, shuffleSceneWordIds, sceneLearningUrl } from '../src/lib/vocabulary/scene-learning.ts';

test('本轮仅管理员可读取场景，普通及付费账户和鉴权异常均拒绝',async()=>{
  const source=readFileSync(new URL('../src/lib/vocabulary/vocabulary-scene-image-access.ts',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const scenario of [
    {role:'admin',allowed:true}, {role:'student',allowed:false},
    {role:'student',membership_status:'lifetime',allowed:false},
    {role:'admin',authError:true,allowed:false}, {role:'admin',profileError:true,allowed:false},
    {role:null,allowed:false}, {role:'admin',throws:true,allowed:false},
  ]){
    const module={exports:{}};
    const client={auth:{getUser:async()=>({data:{user:{id:'qa-user'}},error:scenario.authError?Error('invalid session'):null})},
      from:table=>{assert.equal(table,'profiles');return {select:()=>({eq:()=>({maybeSingle:async()=>({data:scenario,error:scenario.profileError?Error('unavailable'):null})})})};}};
    vm.runInNewContext(compiled,{exports:module.exports,module,require:name=>{
      if(name==='server-only')return {};
      assert.equal(name,'@/lib/supabase/server');
      return {createServerSupabaseClient:async()=>{if(scenario.throws)throw Error('offline');return client;}};
    }});
    assert.equal(await module.exports.hasVocabularySceneImageAccess(),scenario.allowed,JSON.stringify(scenario));
  }
});

test('听力答题时，图片和下方词条不泄露英文、音标或中文',()=>{
  for(const scope of ['scene','list'])for(const target of [true,false])for(const field of ['en','ipa','zh'])assert.equal(sceneFieldVisible('listening',false,scope,target,field),false);
});
test('阅读保留下方英文和音标提示，隐藏所有图片文字及下方中文',()=>{
  for(const field of ['en','ipa','zh'])assert.equal(sceneFieldVisible('reading',false,'scene',true,field),false);
  assert.deepEqual(['en','ipa','zh'].map(field=>sceneFieldVisible('reading',false,'list',true,field)),[true,true,false]);
});
test('口语只显示当前图片词框的中文，并使用独立的口语时间',()=>{
  assert.deepEqual(['en','ipa','zh'].map(field=>sceneFieldVisible('speaking',false,'scene',true,field)),[false,false,true]);
  for(const field of ['en','ipa','zh'])assert.equal(sceneFieldVisible('speaking',false,'list',true,field),false);
  assert.equal(sceneFieldVisible('speaking',false,'scene',false,'zh'),false);
  const settings=normalizeSceneSettings({reactionSeconds:{listening:19,speaking:2}});
  assert.equal(settings.reactionSeconds.speaking,2);assert.equal(settings.reactionSeconds.listening,19);
});
test('写作看中文拼写，图片和下方英文、音标均不可见',()=>{
  for(const field of ['en','ipa','zh'])assert.equal(sceneFieldVisible('writing',false,'scene',true,field),false);
  assert.deepEqual(['en','ipa','zh'].map(field=>sceneFieldVisible('writing',false,'list',true,field)),[false,false,true]);
});
test('答题后只揭示正确目标词框；拼写接受完整词和已确认变体',()=>{
  for(const mode of SCENE_MODES)for(const field of ['en','ipa','zh'])assert.equal(sceneFieldVisible(mode,true,'scene',true,field),true);
  assert.equal(sceneFieldVisible('listening',true,'scene',false,'en'),false);
  const pair={english:'actor/actress',aliases:[]};assert.ok(isSceneSpellingCorrect(' Actress ',pair));assert.ok(!isSceneSpellingCorrect('actorx',pair));
  assert.ok(isSceneSpellingCorrect('percent',{english:'per cent',aliases:[]}));
  assert.ok(isSceneSpellingCorrect('o’clock',{english:"o'clock",aliases:[]}));
});
test('随机一轮不重不漏，非法时间参数不会进入计时器',()=>{
  const words=Array.from({length:26},(_,id)=>({id:String(id)}));
  assert.deepEqual([...shuffleSceneWordIds(words,()=>.37)].sort(),words.map(word=>word.id).sort());
  const settings=normalizeSceneSettings({modes:{},reactionSeconds:{reading:NaN,listening:500,speaking:-4}});
  assert.deepEqual(settings.modes,[...SCENE_MODES]);assert.equal(settings.reactionSeconds.reading,5);assert.equal(settings.reactionSeconds.listening,120);assert.equal(settings.reactionSeconds.speaking,1);
});
test('背单词场景入口保留英美音、四模式独立计时与场景组号',()=>{
  const url=sceneLearningUrl('高中大纲词汇',{vocabularySort:'scene',voice:'uk',modes:['speaking'],reactionSeconds:{speaking:3},wordGroups:{all:154}});
  const query=new URL(url,'https://example.test').searchParams;
  assert.equal(query.get('group'),'154');const settings=JSON.parse(query.get('settings'));assert.equal(settings.voice,'uk');assert.equal(settings.reactionSeconds.speaking,3);
  assert.equal(sceneLearningUrl('初中',{vocabularySort:'frequency'}),null);
});
test('235个场景覆盖原始4700条记录，源词不重复，点击区域均有效',()=>{
  const catalog=JSON.parse(readFileSync(new URL('../src/data/vocabulary-scenes/index.json',import.meta.url),'utf8'));
  assert.equal(catalog.filter(item=>item.level==='middle').length,80);assert.equal(catalog.filter(item=>item.level==='senior').length,155);
  const ids={middle:[],senior:[]};let cards=0;
  for(const summary of catalog){
    const scene=JSON.parse(readFileSync(new URL('../src/data/vocabulary-scenes/'+summary.id+'.json',import.meta.url),'utf8'));
    assert.equal(scene.words.length,summary.wordCount);cards+=scene.words.length;
    assert.match(scene.imagePath,/^v1\/(middle|senior)\/[A-Za-z0-9-]+\.png$/);
    for(const word of scene.words){ids[scene.level].push(...word.sourceIds);assert.ok(word.english&&word.ipa&&word.definition);
      for(const rect of [word.cardRect,word.illustrationRect,word.glossaryRect]){assert.equal(rect.length,4);assert.ok(rect.every(Number.isFinite));assert.ok(rect[0]>=0&&rect[1]>=0&&rect[2]>0&&rect[3]>0&&rect[0]+rect[2]<=1.001&&rect[1]+rect[3]<=1.001);}
    }
  }
  assert.equal(cards,4699);assert.equal(ids.middle.length,1600);assert.equal(new Set(ids.middle).size,1600);assert.equal(ids.senior.length,3100);assert.equal(new Set(ids.senior).size,3100);
});
