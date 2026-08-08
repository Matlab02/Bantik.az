import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/public-env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/account/", "/checkout", "/order/"],
    },
    sitemap: `${publicSiteUrl}/sitemap.xml`,
  };
}
