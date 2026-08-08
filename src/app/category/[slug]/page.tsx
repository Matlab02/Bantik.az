import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogSkeleton } from "@/components/commerce/catalog-skeleton";
import { CatalogView } from "@/components/commerce/catalog-view";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { categories, products } from "@/lib/catalog";

export function generateStaticParams() {
  return categories.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  return category
    ? {
        title: category.name,
        description: `BANTİK ${category.name} məhsulları`,
        alternates: { canonical: `/category/${slug}` },
      }
    : {};
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  return (
    <>
      <Header />
      <Suspense fallback={<CatalogSkeleton title={category.name} />}>
        <CatalogView
          items={products.filter((product) => product.categorySlug === slug)}
          title={category.name}
          description={`${category.name} kateqoriyasında seçilmiş premium məhsullar.`}
        />
      </Suspense>
      <MobileNav />
    </>
  );
}
