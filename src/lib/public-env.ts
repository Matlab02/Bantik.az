const normalizePublicUrl = (value: string | undefined) => {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const vercelUrl =
  process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;

export const publicSiteUrl =
  normalizePublicUrl(process.env.PUBLIC_SITE_URL) ||
  normalizePublicUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
  normalizePublicUrl(vercelUrl) ||
  "http://localhost:3000";

export const isHttpsDeployment = publicSiteUrl.startsWith("https://");
