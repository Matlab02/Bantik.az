import "dotenv/config";
import { z } from "zod";

const optionalUrl = z.union([z.url(), z.literal("")]).optional();

const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";
const vercelBuildHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const buildSiteUrl = vercelBuildHost
  ? `https://${vercelBuildHost.replace(/^https?:\/\//, "")}`
  : "http://localhost:3000";
const deploymentSiteUrl =
  process.env.PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  (vercelBuildHost ? buildSiteUrl : undefined);

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL tələb olunur"),
    AUTH_SECRET: z.string().min(16, "AUTH_SECRET ən azı 16 simvol olmalıdır"),
    AUTH_URL: optionalUrl,
    NEXTAUTH_URL: optionalUrl,
    PUBLIC_SITE_URL: optionalUrl,
    NEXT_PUBLIC_SITE_URL: optionalUrl,
    NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z.string().optional(),
    APP_TIMEZONE: z.string().default("Asia/Baku"),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== "production") return;
    if (!value.PUBLIC_SITE_URL && !value.NEXT_PUBLIC_SITE_URL) {
      context.addIssue({
        code: "custom",
        path: ["PUBLIC_SITE_URL"],
        message: "Production üçün PUBLIC_SITE_URL tələb olunur",
      });
    }
    if (
      !value.AUTH_URL &&
      !value.NEXTAUTH_URL &&
      !value.PUBLIC_SITE_URL &&
      !value.NEXT_PUBLIC_SITE_URL
    ) {
      context.addIssue({
        code: "custom",
        path: ["AUTH_URL"],
        message: "Production üçün AUTH_URL və ya NEXTAUTH_URL tələb olunur",
      });
    }
    const smtp = [value.SMTP_HOST, value.SMTP_USER, value.SMTP_PASSWORD, value.SMTP_FROM];
    if (smtp.some(Boolean) && smtp.some((item) => !item)) {
      context.addIssue({
        code: "custom",
        path: ["SMTP_HOST"],
        message: "SMTP istifadə edilirsə bütün SMTP dəyişənləri verilməlidir",
      });
    }
  });

const runtimeEnvironment = {
  ...process.env,
  ...(deploymentSiteUrl
    ? {
        PUBLIC_SITE_URL: deploymentSiteUrl,
        AUTH_URL:
          process.env.AUTH_URL || process.env.NEXTAUTH_URL || deploymentSiteUrl,
      }
    : {}),
};

const environmentInput = isProductionBuild
  ? {
      ...runtimeEnvironment,
      DATABASE_URL:
        process.env.DATABASE_URL ||
        "postgresql://next-build:next-build@127.0.0.1:5432/next_build_only",
      AUTH_SECRET:
        process.env.AUTH_SECRET || "next-build-only-secret-not-used-at-runtime",
      PUBLIC_SITE_URL: deploymentSiteUrl || buildSiteUrl,
      AUTH_URL: process.env.AUTH_URL || process.env.NEXTAUTH_URL || buildSiteUrl,
    }
  : runtimeEnvironment;

const parsed = schema.safeParse(environmentInput);

if (!parsed.success) {
  const message = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Environment validation failed: ${message}`);
}

export const env = parsed.data;
