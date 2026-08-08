import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import {
  brands as catalogBrands,
  categories as catalogCategories,
  products as catalogProducts,
} from "@/lib/catalog";
import { publicSiteUrl } from "@/lib/public-env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  let categories: { slug: string }[] = catalogCategories;
  let brands: { slug: string }[] = catalogBrands;
  let products: { slug: string; updatedAt: Date }[] = catalogProducts.map(
    (product) => ({ slug: product.slug, updatedAt: now }),
  );

  if (
    process.env.NEXT_PHASE !== "phase-production-build" &&
    process.env.DATABASE_URL
  ) {
    try {
      [categories, brands, products] = await Promise.all([
        db.category.findMany({ where: { isActive: true }, select: { slug: true } }),
        db.brand.findMany({ where: { isActive: true }, select: { slug: true } }),
        db.product.findMany({
          where: { active: true },
          select: { slug: true, updatedAt: true },
        }),
      ]);
    } catch {
      // Keep the generated catalog fallback when the database is unavailable.
    }
  }

  return [
    { url: publicSiteUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${publicSiteUrl}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((item) => ({
      url: `${publicSiteUrl}/category/${item.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...brands.map((item) => ({
      url: `${publicSiteUrl}/brand/${item.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((item) => ({
      url: `${publicSiteUrl}/product/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
