export type ManagedMediaBucket = "audio" | "images" | "video" | "videos" | "documents";

export type StaticMediaAddress = {
  bucket: ManagedMediaBucket;
  path: string;
};

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
