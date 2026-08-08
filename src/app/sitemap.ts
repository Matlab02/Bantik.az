import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import { publicSiteUrl } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, brands, products] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, select: { slug: true } }),
    db.brand.findMany({ where: { isActive: true }, select: { slug: true } }),
    db.product.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);
  const now = new Date();
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
