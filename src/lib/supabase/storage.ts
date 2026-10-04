import { getManagedMediaUrl, getSupabaseStorageUrl, isLegacyCosOnlyMediaPath } from "@/lib/media/url";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

type PublicBucket = "audio" | "images";

function isBbcAudioPath(path: string) {
  return /^bbc(?:\/|$)/i.test(path.replace(/^\/+/, ""));
}

function getManagedOrSupabaseUrl(bucket: PublicBucket, path: string, cosEnabled: boolean) {
  if (bucket === "audio" && /^listening\//i.test(path.replace(/^\/+/, ""))) {
    return getManagedMediaUrl(bucket, path);
  }
  if (cosEnabled && (bucket !== "audio" || isBbcAudioPath(path) || isLegacyCosOnlyMediaPath(bucket, path))) {
    return getManagedMediaUrl(bucket, path);
  }
  return getSupabaseStorageUrl(bucket, path);
}

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
      // COS keys that Supabase rejects are stored under a deterministic flat alias.
      if (/^u-[A-Za-z0-9_-]+$/.test(decoded)) return input;
      return getManagedOrSupabaseUrl(bucket, decoded, cosEnabled) ?? input;
    } catch {
      return input;
    }
  }

  const cleanPath = input.replace(/^\/+/, "");
  const pathWithoutBucket = cleanPath.startsWith(`${bucket}/`)
    ? cleanPath.slice(bucket.length + 1)
    : cleanPath;

  return getManagedOrSupabaseUrl(bucket, pathWithoutBucket, cosEnabled);
}
