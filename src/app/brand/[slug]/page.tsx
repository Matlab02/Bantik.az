import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogSkeleton } from "@/components/commerce/catalog-skeleton";
import { CatalogView } from "@/components/commerce/catalog-view";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { brands, products } from "@/lib/catalog";

export function generateStaticParams() {
  return brands.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const brand = brands.find((item) => item.slug === slug);
  return brand
    ? {
        title: brand.name,
        description: `${brand.name} məhsulları BANTİK-də`,
        alternates: { canonical: `/brand/${slug}` },
      }
    : {};
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = brands.find((item) => item.slug === slug);
  if (!brand) notFound();
  return (
    <>
      <Header />
      <Suspense fallback={<CatalogSkeleton title={brand.name} />}>
        <CatalogView
          items={products.filter((product) => product.brandSlug === slug)}
          title={brand.name}
          description={`${brand.name} üçün hazırlanmış demo məhsul kataloqu.`}
        />
      </Suspense>
      <MobileNav />
    </>
  );
}
