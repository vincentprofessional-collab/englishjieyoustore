import sharp from "sharp";
import { join } from "node:path";

export async function encodeVocabularyImage(bytes: Buffer, word?: string) {
  const image = sharp(bytes, { limitInputPixels: 40_000_000, animated: false });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? "")) throw new Error("请选用 JPG、PNG 或 WebP 图片。");
  let encoded: Buffer;
  if (word !== undefined) {
    if (!/^[a-z]+(?:-[a-z]+)*$/.test(word)) throw new Error("词汇图片的标签无效。");
    const picture = await image.rotate().resize(488, 432, { fit: "inside", withoutEnlargement: true }).toBuffer({ resolveWithObject: true });
    const fontSize = Math.min(36, Math.floor(450 / (word.length * 0.65)));
    const label = Buffer.from(`<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="452" width="488" height="48" rx="14" fill="#ffe88a" stroke="#efd265" stroke-width="2"/></svg>`);
    // Use a shipped font so the label also renders on hosts without system fonts.
    const text = await sharp({ text: {
      text: `<span foreground="#253b50">${word}</span>`, font: `Liberation Sans Bold ${fontSize}`,
      fontfile: join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf"), rgba: true,
    } }).png().toBuffer({ resolveWithObject: true });
    encoded = await sharp({ create: { width: 512, height: 512, channels: 3, background: "#fffef7" } })
      .composite([
        { input: picture.data, left: Math.round((512 - picture.info.width) / 2), top: 8 + Math.round((432 - picture.info.height) / 2) },
        { input: label },
        { input: text.data, left: Math.round((512 - text.info.width) / 2), top: 452 + Math.round((48 - text.info.height) / 2) },
      ]).webp({ quality: 78 }).toBuffer();
  } else {
    encoded = await image.rotate().resize(512, 512, { fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  }
  if (encoded.length > 350 * 1024) throw new Error("图片处理后仍超过 350 KB，请先缩小图片再上传。");
  return encoded;
}
