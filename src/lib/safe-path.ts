/** Keeps post-login redirects on this site: "/bookings" passes, "//evil.com" or "https://…" falls back to "/". */
export function safePath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
