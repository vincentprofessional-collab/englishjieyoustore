import { createHash } from 'node:crypto';
import { readFile, writeFile, rename, access } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const cache = process.env.CET6_REVIEW_CACHE || '/tmp/cet6-intake-20261021';
const kind = process.argv.find(arg => arg.startsWith('--kind='))?.slice(7) || 'all';
const upload = process.argv.includes('--upload');
const apply = process.argv.includes('--apply');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const progressPath = path.join(cache,'media-uploads.json');
let progress = {};
try {progress = await json(progressPath);} catch (error) {if(error.code !== 'ENOENT')throw error;}
const libraryPath = path.resolve('src/data/cet6/library.json');
const library = await json(libraryPath);
const prepared = await json(path.join(cache, 'audio-clean/manifest.json'));
const audioChecks = await json('data/cet6-review/audio-association.json');
const items = new Map();
const imageAssets = new Map();
if (kind !== 'image') for (const audio of prepared) {
  const check = audioChecks.find(row => row.paperId === audio.paperId && row.passed && row.endingChecked && !row.endingPromotionFlag && row.audioSha256 === audio.sha256 && row.sourceSha256 === audio.sourceSha256);
  if (!check) throw Error(`Audio association not verified: ${audio.paperId}`);
  if (!progress[audio.sha256]?.verified) {
    const probe = JSON.parse(execFileSync('/opt/homebrew/bin/ffprobe', ['-v','error','-show_format','-show_streams','-of','json',audio.localPath], {encoding:'utf8'}));
    if (probe.streams.length !== 1 || probe.streams[0].codec_name !== 'mp3' || Object.keys(probe.format.tags || {}).length) throw Error(`Audio is not a clean MP3: ${audio.paperId}`);
  }
  items.set(audio.sha256, { kind:'audio', bucket:'audio', storagePath:audio.storagePath, localPath:audio.localPath, sha256:audio.sha256, bytes:audio.bytes, mimeType:'audio/mpeg', paperId:audio.paperId });
}
if (kind !== 'audio') for (const entry of library.entries) for (const asset of [...(entry.sourceReview?.questionAssets || []), ...(entry.sourceReview?.assets || [])]) {
  if (asset.kind !== 'image') continue;
  imageAssets.set(asset.assetId,asset.sha256);
  if (!asset.assetId.startsWith('page-clean-v5-')) throw Error(`Unverified image recipe: ${asset.assetId}`);
  const known = progress[asset.sha256];
  if (known?.verified) {
    if (known.kind !== 'image' || known.bucket !== 'images' || known.storagePath !== `cet6/source-pages/${asset.sha256}.webp` || !known.bytes) throw Error(`Invalid completed image record: ${asset.assetId}`);
    items.set(asset.sha256,{kind:'image',bucket:known.bucket,storagePath:known.storagePath,sha256:asset.sha256,bytes:known.bytes,mimeType:'image/webp'});
    continue;
  }
  let localPath = path.resolve('public/cet6/solutions', asset.assetId + '.webp');
  try {await access(localPath);} catch (error) {
    if (error.code !== 'ENOENT' || !process.env.CET6_REVIEWED_IMAGE_DIR) throw error;
    localPath = path.join(process.env.CET6_REVIEWED_IMAGE_DIR,asset.assetId + '.webp');
  }
  const bytes = await readFile(localPath);
  if (hash(bytes) !== asset.sha256 || bytes.toString('ascii',8,12) !== 'WEBP') throw Error(`Image checksum mismatch: ${asset.assetId}`);
  items.set(asset.sha256, {kind:'image', bucket:'images', storagePath:`cet6/source-pages/${asset.sha256}.webp`, localPath, sha256:asset.sha256, bytes:bytes.length, mimeType:'image/webp'});
}
if (kind !== 'audio') {
  const certificate = await json('data/cet6-review/cleaning-validation.json');
  const digest = hash(Buffer.from([...imageAssets].sort(([a],[b])=>a < b ? -1 : a > b ? 1 : 0).map(([identity,sha])=>`${identity}:${sha}`).join('\n')));
  if (!certificate.passed || certificate.recipe !== 'v5' || certificate.imageManifestSha256 !== digest) throw Error('Exact image list has not passed cleaning validation');
  if (library.entries.some(entry=>entry.sourceReview?.issues?.length)) throw Error('Unresolved source pairs cannot be uploaded');
}
console.log(JSON.stringify({kind,files:items.size,MiB:Math.round([...items.values()].reduce((sum,item)=>sum+item.bytes,0)/1048576)}));
if (!upload && !apply) process.exit(0);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) throw Error('Server-side media upload credentials unavailable');
const client = createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
let saveQueue = Promise.resolve();
const save = () => {const snapshot=JSON.stringify(progress,null,2)+'\n';saveQueue=saveQueue.then(async()=>{await writeFile(progressPath+'.tmp',snapshot);await rename(progressPath+'.tmp',progressPath);});return saveQueue;};
if (upload) {
  let completedSinceSave=0,cursor=0;
  const failures=[],pending=[...items.values()];
  const uploadItem = async item => {
  if (progress[item.sha256]?.verified) return;
  const bytes = await readFile(item.localPath);
  if (hash(bytes) !== item.sha256 || bytes.length !== item.bytes) throw Error(`Local media changed: ${item.storagePath}`);
  const bucket = client.storage.from(item.bucket);
  let {data:info,error:infoError} = await bucket.info(item.storagePath);
  if (!info) {
    if (infoError && !['400','404'].includes(String(infoError.statusCode)) && !/not found/i.test(infoError.message)) throw Error(`Storage info failed: ${infoError.message}`);
    const {error} = await bucket.upload(item.storagePath,bytes,{contentType:item.mimeType,cacheControl:'31536000',upsert:false,metadata:{sha256:item.sha256,review:'cet6-source-review-20261021-v5'}});
    if (error) throw Error(`Upload failed for ${item.storagePath}: ${error.message}`);
    ({data:info,error:infoError} = await bucket.info(item.storagePath));
  }
  if (infoError || info?.size !== item.bytes) throw Error(`Remote size mismatch: ${item.storagePath}`);
  const publicUrl = bucket.getPublicUrl(item.storagePath).data.publicUrl;
  const response = await fetch(publicUrl,{headers:{Range:'bytes=0-63'},signal:AbortSignal.timeout(30000)});
  if (response.status !== 206 || Number(response.headers.get('content-range')?.split('/').at(-1)) !== item.bytes) {await response.body?.cancel();throw Error(`Remote range verification failed: ${item.storagePath}`);}
  const prefix = Buffer.from(await response.arrayBuffer());
  if (!prefix.equals(bytes.subarray(0,64))) throw Error(`Remote byte mismatch: ${item.storagePath}`);
  progress[item.sha256] = {kind:item.kind,bucket:item.bucket,storagePath:item.storagePath,sha256:item.sha256,bytes:item.bytes,publicUrl,verified:true,verifiedAt:new Date().toISOString()};
  if (++completedSinceSave >= 10) {completedSinceSave=0;await save();}
  if (Object.keys(progress).length % 25 === 0) console.log(`Verified files: ${Object.keys(progress).length}`);
  };
  await Promise.all(Array.from({length:3},async()=>{
    while(cursor<pending.length && !failures.length){const item=pending[cursor++];try{await uploadItem(item);}catch(error){failures.push(error);}}
  }));
  await save();
  if(failures.length)throw failures[0];
  console.log(`Verified ${kind} batch: ${pending.length} files`);
}

if (apply) {
  for (const item of items.values()) if (!progress[item.sha256]?.verified) throw Error(`Media not uploaded and verified: ${item.storagePath}`);
  for (const entry of library.entries) {
    const review = entry.sourceReview;
    if (!review) continue;
    for (const asset of [...(review.questionAssets || []),...(review.assets || [])]) if (asset.kind === 'image') asset.url = progress[asset.sha256].publicUrl;
    const audio = prepared.find(item => item.paperId === entry.id);
    if (audio && progress[audio.sha256]) {
      const assetId = `cet6-audio-${audio.sha256.slice(0,16)}`;
      review.audio = assetId;
      review.assets = [...(review.assets || []).filter(asset => asset.kind !== 'audio'),{assetId,kind:'audio',url:progress[audio.sha256].publicUrl,mimeType:'audio/mpeg',sha256:audio.sha256,sourceRefs:[{sourceDocumentId:audio.sourceSha256,relativePath:audio.sourceFile,sha256:audio.sourceSha256,locator:{},extractionMethod:'manual-review',confidence:1}]}];
    }
  }
  library.entries = library.entries.filter(entry => entry.section === '试卷');
  for (const entry of library.entries) if (entry.sourceReview?.imagePaper) {entry.body='题目见已净化并核对的原题页面。';entry.answers='';}
  library.generatedAt = new Date().toISOString();
  await writeFile(libraryPath,JSON.stringify(library,null,2)+'\n');
  const manifest = [...items.values()].map(item=>progress[item.sha256]);
  await writeFile('data/cet6-review/media-manifest.json',JSON.stringify(manifest,null,2)+'\n');
  console.log('Applied verified media URLs.');
}
