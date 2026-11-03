export type LocalAccessCatalogPreview = {
  description: string;
  descriptionFontFamily?: "serif" | "sans";
  descriptionFontSize?: number;
  gateTitle: string;
  priceCny: number;
  shortTitle: string;
  title: string;
  titleFontFamily?: "serif" | "sans";
  titleFontSize?: number;
};

const STORAGE_KEY = "englishjieyoustore.local-access-catalog-preview.v1";

export function readLocalAccessCatalogPreview(projectKey: string): LocalAccessCatalogPreview | null {
  if (typeof window === "undefined") return null;
  try {
    const all = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, unknown>;
    const value = all[projectKey];
    if (!value || typeof value !== "object") return null;
    const row = value as Record<string, unknown>;
    return {
      description: typeof row.description === "string" ? row.description : "",
      descriptionFontFamily: row.descriptionFontFamily === "sans" ? "sans" : "serif",
      descriptionFontSize: typeof row.descriptionFontSize === "number" && Number.isFinite(row.descriptionFontSize) ? row.descriptionFontSize : 18,
      gateTitle: typeof row.gateTitle === "string" ? row.gateTitle : "",
      priceCny: typeof row.priceCny === "number" && Number.isFinite(row.priceCny) ? row.priceCny : 9.9,
      shortTitle: typeof row.shortTitle === "string" ? row.shortTitle : "",
      title: typeof row.title === "string" ? row.title : "",
      titleFontFamily: row.titleFontFamily === "sans" ? "sans" : "serif",
      titleFontSize: typeof row.titleFontSize === "number" && Number.isFinite(row.titleFontSize) ? row.titleFontSize : 36,
    };
  } catch {
    return null;
  }
}

export function saveLocalAccessCatalogPreview(projectKey: string, value: LocalAccessCatalogPreview) {
  if (typeof window === "undefined") return false;
  try {
    const all = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, unknown>;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...all, [projectKey]: value }));
    return true;
  } catch {
    return false;
  }
}
