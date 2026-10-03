export type ManagedMediaBucket = "audio" | "images" | "video" | "videos" | "documents";

export type StaticMediaAddress = {
  bucket: ManagedMediaBucket;
  path: string;
};

const legacyCosOnlyPaths = new Set(["static/cet4/audio/cet4-paper-2023121.mp3"]);
const supabaseSafePathSegment = /^[A-Za-z0-9_.,!&$@=;:+?() *'\-]+$/;
const encodedPathAlias = /^u-[A-Za-z0-9_-]+$/;

export function toSupabaseSafeStoragePath(path: string) {
  const normalizedPath = path.trim().replace(/^\/+|\/+$/g, "");
  const segments = normalizedPath.split("/");
  if (
    segments.every((segment) => segment && segment !== "." && segment !== ".." && supabaseSafePathSegment.test(segment))
    && !encodedPathAlias.test(normalizedPath)
  ) return normalizedPath;

  const bytes = new TextEncoder().encode(normalizedPath);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
  return `u-${encoded}`;
}

export function isLegacyCosOnlyMediaPath(bucket: ManagedMediaBucket, path: string) {
  const normalizedPath = path.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  return bucket === "audio" && legacyCosOnlyPaths.has(normalizedPath);
}

const bucketByExtension: Record<string, ManagedMediaBucket> = {
  aac: "audio",
  flac: "audio",
  m4a: "audio",
  mp3: "audio",
  oga: "audio",
  ogg: "audio",
  wav: "audio",
  weba: "audio",
  webm: "audio",
  avif: "images",
  gif: "images",
  jpeg: "images",
  jpg: "images",
  png: "images",
  svg: "images",
  webp: "images",
  avi: "video",
  m4v: "video",
  mkv: "video",
  mov: "video",
  mp4: "video",
  ogv: "video",
  pdf: "documents",
};

export function getManagedMediaUrl(bucket: ManagedMediaBucket, path: string) {
  const normalizedPath = path.trim().replace(/^\/+|\/+$/g, "");
  const params = new URLSearchParams({ bucket, path: normalizedPath });
  return `/api/media?${params.toString()}`;
}

export function getSupabaseStorageUrl(
  bucket: ManagedMediaBucket,
  path: string,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
) {
  const normalizedPath = path.trim().replace(/^\/+|\/+$/g, "");
  if (!supabaseUrl || !normalizedPath || normalizedPath.split("/").some((part) =>
    !part || part === "." || part === ".." || /[\\\u0000-\u001f]/.test(part)
  )) return null;
  const targetBucket = bucket === "video" ? "videos" : bucket;
  const storagePath = toSupabaseSafeStoragePath(normalizedPath);
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${targetBucket}/${encodedPath}`;
}

export function getVocabularyVideoMediaUrl(filename: string) {
  return `/api/vocabulary-video-media?name=${encodeURIComponent(filename)}`;
}

export function getVocabularyVideoDirectMediaUrl(filename: string) {
  return getSupabaseStorageUrl("videos", `vocabulary/${filename}`) ?? "";
}

export function getStaticMediaAddress(pathname: string): StaticMediaAddress | null {
  const encodedSegments = pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (!encodedSegments.length || encodedSegments[0] === "api" || encodedSegments[0] === "_next") {
    return null;
  }

  let segments: string[];
  try {
    segments = encodedSegments.map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }

  if (
    segments.some(
      (segment) => !segment || segment === "." || segment === ".." || /[\\/\u0000-\u001f]/.test(segment),
    )
  ) {
    return null;
  }

  const firstDirectory = segments[0]?.toLowerCase();
  if (firstDirectory === "audio" && segments[1]?.toLowerCase() === "bbc") {
    return null;
  }

  const filename = segments.at(-1) ?? "";
  const extension = filename.split(".").at(-1)?.toLowerCase() ?? "";
  const bucket = bucketByExtension[extension];
  if (!bucket) return null;

  return { bucket, path: `static/${segments.join("/")}` };
}
