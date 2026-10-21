const FIRST_OPENED_AT_KEY = "ielts-platform.analytics.firstOpenedAt";
const VISITOR_KEY_STORAGE_KEY = "ielts-platform.analytics.visitorKey";

export function getOrCreateVisitorKey() {
  if (typeof window === "undefined") return "";

  try {
    const existing = window.localStorage.getItem(VISITOR_KEY_STORAGE_KEY);
    if (existing) return existing;
  } catch {
    // Keep page analytics available when browser storage is disabled.
  }

  const bytes = new Uint8Array(16);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index++) bytes[index] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const visitorKey = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;

  try {
    window.localStorage.setItem(VISITOR_KEY_STORAGE_KEY, visitorKey);
  } catch {
    // The generated key still identifies this page view when storage is disabled.
  }

  return visitorKey;
}

export function hasVisitedBeforeToday() {
  const firstOpenedAt = new Date(getFirstOpenedAt()).getTime();
  if (!Number.isFinite(firstOpenedAt)) return false;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  const shanghaiMidnight = Date.parse(`${part("year")}-${part("month")}-${part("day")}T00:00:00+08:00`);
  return Number.isFinite(shanghaiMidnight) && firstOpenedAt < shanghaiMidnight;
}

export function getFirstOpenedAt() {
  if (typeof window === "undefined") {
    return new Date().toISOString();
  }

  try {
    const existing = window.localStorage.getItem(FIRST_OPENED_AT_KEY);

    if (existing) {
      return existing;
    }

    const next = new Date().toISOString();
    window.localStorage.setItem(FIRST_OPENED_AT_KEY, next);
    return next;
  } catch {
    return new Date().toISOString();
  }
}

export function getVisitorNumber() {
  const firstOpenedAt = new Date(getFirstOpenedAt());

  if (Number.isNaN(firstOpenedAt.getTime())) {
    return "访客";
  }

  const year = firstOpenedAt.getFullYear();
  const month = String(firstOpenedAt.getMonth() + 1).padStart(2, "0");
  const day = String(firstOpenedAt.getDate()).padStart(2, "0");
  return `访客${year}${month}${day}`;
}
