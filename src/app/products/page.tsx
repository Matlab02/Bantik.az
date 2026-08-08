import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogSkeleton } from "@/components/commerce/catalog-skeleton";
import { CatalogView } from "@/components/commerce/catalog-view";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { products } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Bütün məhsullar",
  description: "BANTİK premium kosmetika kataloqu",
};

export default function Products() {
  return (
    <>
      <Header />
      <Suspense fallback={<CatalogSkeleton title="Bütün məhsullar" />}>
        <CatalogView
          items={products}
          title="Bütün məhsullar"
          description="Makiyaj, qulluq, ətir və daha çox — seçilmiş gözəllik dünyası."
        />
      </Suspense>
      <MobileNav />
    </>
  );
}
