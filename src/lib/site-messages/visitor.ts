const VISITOR_ID_KEY = "englishjieyou-site-visitor-id-v1";

export function getSiteVisitorId() {
  const existing = window.localStorage.getItem(VISITOR_ID_KEY);
  if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) return existing;
  const next = window.crypto.randomUUID();
  window.localStorage.setItem(VISITOR_ID_KEY, next);
  return next;
}
