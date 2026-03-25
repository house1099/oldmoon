/** 由 IG handle 產出官方網址（strip `@`、trim）；無效則 null */
export function instagramProfileUrlFromHandle(
  handle: string | null | undefined,
): string | null {
  if (handle == null || typeof handle !== "string") {
    return null;
  }
  const h = handle.trim().replace(/^@+/, "").trim();
  if (!h) {
    return null;
  }
  return `https://www.instagram.com/${encodeURIComponent(h)}/`;
}
