import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ProductDetail } from "@/components/commerce/product-detail";
import { getProduct, products } from "@/lib/catalog";
import { db } from "@/lib/db";
import { publicSiteUrl } from "@/lib/env";
import { safeJsonLd } from "@/lib/json-ld";
import { resolveWhatsappNumber } from "@/lib/settings";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const p = getProduct((await params).slug);
  return p
    ? {
        title: p.name,
        description: p.shortDescription,
        alternates: { canonical: `/product/${p.slug}` },
        openGraph: {
          title: `${p.brand} ${p.name}`,
          description: p.shortDescription,
          images: [p.image],
          type: "website",
        },
      }
    : {};
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = getProduct((await params).slug);
  if (!p) notFound();
  const related = products.filter(
      (x) => x.categorySlug === p.categorySlug && x.id !== p.id,
    ),
    [rows, settings] = await Promise.all([
      db.inventory.findMany({
        where: { productId: p.id, branch: { type: "STORE", isActive: true } },
        include: { branch: true },
      }),
      db.siteSetting.findUnique({
        where: { id: "default" },
        select: { whatsapp: true },
      }),
    ]),
    availability = (rows || []).map((row) => {
      const qty = row.quantity - row.reservedQuantity;
      return {
        name: row.branch.name,
        status: qty <= 0 ? "Stokda yoxdur" : qty <= 3 ? "Az qalıb" : "Stokda",
      };
    }),
    jsonLd = [{
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      image: p.images,
      description: p.shortDescription,
      sku: p.sku,
      brand: { "@type": "Brand", name: p.brand },
      offers: {
        "@type": "Offer",
        url: `${publicSiteUrl}/product/${p.slug}`,
        priceCurrency: "AZN",
        price: p.price,
        availability:
          p.stock === "Stokda yoxdur"
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/InStock",
      },
    }, {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana səhifə", item: publicSiteUrl },
        { "@type": "ListItem", position: 2, name: p.category, item: `${publicSiteUrl}/category/${p.categorySlug}` },
        { "@type": "ListItem", position: 3, name: p.name, item: `${publicSiteUrl}/product/${p.slug}` },
      ],
    }];
  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <ProductDetail
        product={p}
        related={related}
        whatsappNumber={resolveWhatsappNumber(settings?.whatsapp)}
      />
      <section className="container public-branches">
        <span>FİLİALLARDA MÖVCUDLUQ</span>
        <h2>Harada tapa bilərəm?</h2>
        <div>
          {availability.map((x) => (
            <article key={x.name}>
              <b>{x.name}</b>
              <em
                className={
                  x.status === "Stokda yoxdur"
                    ? "out"
                    : x.status === "Az qalıb"
                      ? "low"
                      : ""
                }
              >
                {x.status}
              </em>
            </article>
          ))}
        </div>
      </section>
      <MobileNav />
    </>
  );
}
