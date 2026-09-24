import { getManagedMediaUrl } from "@/lib/media/url";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

type PublicBucket = "audio" | "images";

export function getPublicStorageUrl(bucket: PublicBucket, path?: string | null) {
  if (!path) return null;

  const input = path.trim();
  const cosEnabled = process.env.COS_MEDIA_ENABLED === "true";
  try {
    if (new URL(input, "https://media.invalid").pathname === "/api/media") return input;
  } catch {
    return null;
  }
  if (/^https?:\/\//i.test(input)) {
    try {
      const parsed = new URL(input);
      if (!supabaseUrl || parsed.origin !== new URL(supabaseUrl).origin) return input;

      const markers = [
        `/storage/v1/object/public/${bucket}/`,
        `/storage/v1/object/authenticated/${bucket}/`,
        `/storage/v1/object/sign/${bucket}/`,
      ];
      const marker = markers.find((candidate) => parsed.pathname.includes(candidate));
      if (!marker) return input;
      const markerIndex = parsed.pathname.indexOf(marker);
      const decoded = parsed.pathname
        .slice(markerIndex + marker.length)
        .split("/")
        .map((part) => decodeURIComponent(part))
        .join("/");
      return cosEnabled ? getManagedMediaUrl(bucket, decoded) : input;
    } catch {
      return input;
    }
  }

  if (!supabaseUrl && !cosEnabled) return null;
  const cleanPath = input.replace(/^\/+/, "");
  const pathWithoutBucket = cleanPath.startsWith(`${bucket}/`)
    ? cleanPath.slice(bucket.length + 1)
    : cleanPath;

  if (cosEnabled) return getManagedMediaUrl(bucket, pathWithoutBucket);
  if (!supabaseUrl) return null;

  const encodedPath = pathWithoutBucket
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}
