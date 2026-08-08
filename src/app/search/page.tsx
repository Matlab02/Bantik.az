import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogView } from "@/components/commerce/catalog-view";
import { CatalogSkeleton } from "@/components/commerce/catalog-skeleton";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { products } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Axtarış",
  description: "BANTİK məhsullarında axtarış",
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <>
      <Header />
      <Suspense fallback={<CatalogSkeleton title="Məhsul axtarışı" />}>
        <CatalogView
          items={products}
          title="Məhsul axtarışı"
          description="Məhsul, brend və kateqoriya üzrə seçiminizi tapın."
        />
      </Suspense>
      <MobileNav />
    </>
  );
}
