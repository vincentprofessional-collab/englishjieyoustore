const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

type PublicBucket = "audio" | "images";

export function getPublicStorageUrl(bucket: PublicBucket, path?: string | null) {
  if (!path || !supabaseUrl) {
    return null;
  }

  const cleanPath = path.trim().replace(/^\/+/, "");
  const pathWithoutBucket = cleanPath.startsWith(`${bucket}/`)
    ? cleanPath.slice(bucket.length + 1)
    : cleanPath;

  const encodedPath = pathWithoutBucket
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}
