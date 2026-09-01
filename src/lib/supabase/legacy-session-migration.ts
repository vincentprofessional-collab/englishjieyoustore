export function getLegacySessionMigrationScript(supabaseUrl: string | undefined) {
  if (!supabaseUrl) return "";

  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const storageKey = `sb-${projectRef}-auth-token`;

  return `(() => {
    try {
      const key = ${JSON.stringify(storageKey)};
      const hasCookie = document.cookie.split("; ").some((part) => {
        const name = part.slice(0, part.indexOf("="));
        return name === key || name.startsWith(key + ".");
      });
      if (hasCookie) return;
      const legacySession = window.localStorage.getItem(key);
      if (!legacySession) return;
      const encoded = "base64-" + btoa(unescape(encodeURIComponent(legacySession)))
        .replace(/\\+/g, "-")
        .replace(/\\//g, "_")
        .replace(/=+$/g, "");
      const chunks = [];
      for (let offset = 0; offset < encoded.length; offset += 3180) {
        chunks.push(encoded.slice(offset, offset + 3180));
      }
      const suffix = "; Path=/; Max-Age=34560000; SameSite=Lax" +
        (window.location.protocol === "https:" ? "; Secure" : "");
      if (chunks.length === 1) {
        document.cookie = key + "=" + chunks[0] + suffix;
      } else {
        chunks.forEach((chunk, index) => {
          document.cookie = key + "." + index + "=" + chunk + suffix;
        });
      }
      window.localStorage.removeItem(key);
      window.location.reload();
    } catch {}
  })();`;
}
