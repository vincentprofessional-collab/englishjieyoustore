import "server-only";

import COS from "cos-nodejs-sdk-v5";
import type { ManagedMediaBucket } from "@/lib/media/url";

let client: COS | null = null;

function getClient() {
  const secretId = process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_SECRET_KEY;

  if (!secretId || !secretKey) {
    throw new Error("Tencent COS credentials are not configured.");
  }

  client ??= new COS({ SecretId: secretId, SecretKey: secretKey, Protocol: "https:" });
  return client;
}

function getBucketSettings() {
  const bucket = process.env.TENCENT_COS_BUCKET;
  const region = process.env.TENCENT_COS_REGION;
  if (!bucket || !region) throw new Error("Tencent COS destination is not configured.");
  return { bucket, region };
}

function toObjectKey(bucket: ManagedMediaBucket, path: string) {
  const cleanPath = path.trim().replace(/^\/+|\/+$/g, "");
  const segments = cleanPath.split("/");
  if (
    !cleanPath ||
    segments.some((segment) => !segment || segment === "." || segment === ".." || /[\\\u0000-\u001f]/.test(segment))
  ) {
    throw new Error("Invalid COS object path.");
  }
  return `${bucket}/${cleanPath}`;
}

export function getSignedCosMediaUrl(bucket: ManagedMediaBucket, path: string) {
  const settings = getBucketSettings();
  return getClient().getObjectUrl({
    Bucket: settings.bucket,
    Region: settings.region,
    Key: toObjectKey(bucket, path),
    Sign: true,
    Method: "GET",
    Expires: 300,
    Protocol: "https:",
  });
}

export async function uploadPrivateCosMedia(
  bucket: ManagedMediaBucket,
  path: string,
  body: Buffer,
  contentType: string,
) {
  const settings = getBucketSettings();
  const key = toObjectKey(bucket, path);
  return new Promise((resolve, reject) => {
    getClient().putObject(
      {
        Bucket: settings.bucket,
        Region: settings.region,
        Key: key,
        Body: body,
        ContentLength: body.byteLength,
        ContentType: contentType,
        ContentDisposition: "inline",
        CacheControl: "private, max-age=300",
        ACL: "private",
      },
      (error, data) => (error ? reject(error) : resolve(data)),
    );
  });
}
