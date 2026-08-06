import { supabase } from "@/lib/supabase/client";

type UploadResponse = {
  error?: string;
  publicUrl?: string;
};

const MAX_IMAGE_EDGE = 1800;
const COMPRESSED_IMAGE_QUALITY = 0.84;

function shouldSkipClientCompression(file: File) {
  return (
    file.type === "image/gif" ||
    file.type === "image/svg+xml" ||
    typeof window === "undefined" ||
    typeof document === "undefined"
  );
}

function getCompressedFilename(filename: string) {
  return filename.replace(/\.[^.]+$/, "") || "admin-image";
}

async function loadImageElement(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("图片读取失败。"));
      image.src = objectUrl;
    });
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function compressImageForUpload(file: File) {
  if (shouldSkipClientCompression(file)) {
    return file;
  }

  try {
    const image = await loadImageElement(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", COMPRESSED_IMAGE_QUALITY);
    });

    if (!blob || blob.size >= file.size) {
      return file;
    }

    return new File([blob], `${getCompressedFilename(file.name)}.webp`, {
      lastModified: file.lastModified,
      type: "image/webp",
    });
  } catch {
    return file;
  }
}

export async function uploadAdminImage(file: File, folder: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("管理员登录已失效，请重新登录。");
  }

  const preparedFile = await compressImageForUpload(file);
  const formData = new FormData();
  formData.append("file", preparedFile);
  formData.append("folder", folder);

  const response = await fetch("/api/admin-image-upload", {
    body: formData,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    method: "POST",
  });
  const result = (await response.json().catch(() => ({}))) as UploadResponse;

  if (!response.ok || !result.publicUrl) {
    throw new Error(result.error ?? "图片上传失败。");
  }

  return result.publicUrl;
}
