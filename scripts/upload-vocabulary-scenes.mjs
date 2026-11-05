import { readFile, appendFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const args=process.argv.slice(2),arg=(name)=>args[args.indexOf(name)+1];
const plan=JSON.parse(await readFile(arg('--plan'),'utf8'));
const checkpoint=arg('--checkpoint');
const env={};
for(const file of ['.env.local',arg('--secrets-env')]){
  for(const line of (await readFile(file,'utf8')).split(/\r?\n/)){
    const m=line.match(/^([A-Z_0-9]+)\s*=\s*(.*)$/);
    if(m)env[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2');
  }
}
const url=env.NEXT_PUBLIC_SUPABASE_URL;
if(new URL(url).hostname!=='ahecwiqjfrrxxjxazmre.supabase.co')throw Error('Unexpected destination project');
const secret=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY;
if(!secret)throw Error('Missing existing server credential');
const client=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const bucket='vocabulary-scene-images';
const {data:existing,error:bucketError}=await client.storage.getBucket(bucket);
if(bucketError){
 const {error}=await client.storage.createBucket(bucket,{public:false,fileSizeLimit:15*1024*1024,allowedMimeTypes:['image/png','image/svg+xml']});
 if(error)throw Error('Private bucket creation failed: '+error.message);
}else if(existing.public)throw Error('Scene bucket must be private');
await mkdir(dirname(checkpoint),{recursive:true});
const done=new Map();
try{for(const line of (await readFile(checkpoint,'utf8')).split('\n').filter(Boolean)){const d=JSON.parse(line);done.set(d.path,d)}}catch(e){if(e.code!=='ENOENT')throw e}
let next=0,completed=0,uploaded=0;
console.log(JSON.stringify({privateBucket:bucket,total:plan.length,resuming:done.size}));
async function worker(){
 while(next<plan.length){
  const item=plan[next++],previous=done.get(item.path);
  if(previous?.sha256===item.sha256&&previous.bytes===item.bytes){completed++;continue}
  const body=await readFile(item.source);
  if(createHash('sha256').update(body).digest('hex')!==item.sha256)throw Error('Source changed: '+item.path);
  let error;
  for(let attempt=0;attempt<3;attempt++){
   ({error}=await client.storage.from(bucket).upload(item.path,body,{contentType:item.contentType,cacheControl:'300',upsert:false}));
   if(!error)break;
   if(error.statusCode==='409'||error.statusCode===409){
    const {data:remote,error:readError}=await client.storage.from(bucket).download(item.path);
    if(!readError&&remote&&createHash('sha256').update(Buffer.from(await remote.arrayBuffer())).digest('hex')===item.sha256){error=null;break}
   }
   if(attempt<2)await new Promise(r=>setTimeout(r,1500*(attempt+1)));
  }
  if(error)throw Error('Upload failed '+item.path+': '+error.message);
  await appendFile(checkpoint,JSON.stringify({path:item.path,bytes:item.bytes,sha256:item.sha256,md5:item.md5})+'\n');
  uploaded++;completed++;
  if(completed%20===0||completed===plan.length)console.log(JSON.stringify({completed,total:plan.length,uploaded}));
 }
}
await Promise.all(Array.from({length:4},worker));
console.log(JSON.stringify({complete:true,objects:completed,uploaded}));
