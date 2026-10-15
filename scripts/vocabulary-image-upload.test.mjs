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

test('replacement pictures keep their full image and receive a readable yellow vocabulary label', async () => {
  const png = await sharp({create:{width:150,height:300,channels:3,background:'#ee2222'}}).png().toBuffer();
  const result = await encodeVocabularyImage(png, 'air-conditioner');
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.width, 512); assert.equal(metadata.height, 512); assert.equal(metadata.format, 'webp');
  assert.ok(result.length < 350 * 1024);
  const {data,info} = await sharp(result).raw().toBuffer({resolveWithObject:true});
  const pixel = (x,y) => [...data.subarray((y*info.width+x)*info.channels,(y*info.width+x)*info.channels+3)];
  assert.ok(pixel(256,220)[0] > 200 && pixel(256,220)[1] < 70, 'the original portrait remains visible');
  const background = pixel(40,477);
  assert.ok(background[0] > 225 && background[1] > 190 && background[2] < 170, 'yellow label below the image');
  let darkTextPixels = 0;
  for(let y=460;y<494;y++) for(let x=70;x<442;x++) if(pixel(x,y).every(channel=>channel<150)) darkTextPixels++;
  assert.ok(darkTextPixels > 100, 'the vocabulary is rendered inside the label');
  await assert.rejects(encodeVocabularyImage(png, '<script>'));
});
