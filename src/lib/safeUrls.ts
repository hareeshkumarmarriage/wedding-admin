export function safeGoogleMapsUrl(value: string) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:") return "";
    if (!new Set(["www.google.com","google.com","maps.google.com","www.google.co.in","google.co.in"]).has(url.hostname.toLowerCase())) return "";
    return url.toString();
  } catch { return ""; }
}
