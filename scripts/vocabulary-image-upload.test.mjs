import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { encodeVocabularyImage } from '../src/lib/admin/vocabulary-image.ts';

test('browser PNG fallback is encoded as genuine small WebP, even when its PNG exceeds 350 KB', async () => {
  const pixels=Buffer.alloc(625*500*3);let seed=42;
  for(let i=0;i<pixels.length;i++){seed=(seed*16807)%2147483647;pixels[i]=seed%256;}
  const png=await sharp(pixels,{raw:{width:625,height:500,channels:3}}).png().toBuffer();
  assert.ok(png.length>350*1024);
  const result=await encodeVocabularyImage(png);
  const metadata=await sharp(result).metadata();
  assert.equal(metadata.format,'webp');
  assert.equal(metadata.width,512);
  assert.ok(result.length<350*1024);
  await assert.rejects(encodeVocabularyImage(Buffer.from('not an image')));
});
