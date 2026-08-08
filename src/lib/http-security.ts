import { publicSiteUrl } from "./public-env";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const expected = new URL(publicSiteUrl).origin;
  const requestOrigin = new URL(request.url).origin;
  if (origin !== expected && origin !== requestOrigin) throw new Error("INVALID_ORIGIN");
}

export function safeInternalPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function safeAssetUrl(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Yalnız təhlükəsiz HTTPS şəkil URL-i qəbul edilir");
  return url.toString();
}
