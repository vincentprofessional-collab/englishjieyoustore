export const FREE_PREVIEW_VISITOR_COOKIE = "ejy_free_preview_visitor";
export const FREE_PREVIEW_VISITOR_MAX_AGE = 400 * 24 * 60 * 60;

export function isFreePreviewVisitorId(value: string | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  );
}
