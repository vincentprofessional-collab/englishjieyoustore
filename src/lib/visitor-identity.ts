const FIRST_OPENED_AT_KEY = "ielts-platform.analytics.firstOpenedAt";

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
