import sharp from "sharp";

export async function encodeVocabularyImage(bytes: Buffer) {
  const image = sharp(bytes, { limitInputPixels: 40_000_000, animated: false });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? "")) throw new Error("请选用 JPG、PNG 或 WebP 图片。");
  const encoded = await image.rotate().resize(512, 512, { fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  if (encoded.length > 350 * 1024) throw new Error("图片处理后仍超过 350 KB，请先缩小图片再上传。");
  return encoded;
}
