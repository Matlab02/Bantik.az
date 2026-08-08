"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  Grid2X2,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import {
  brands,
  categories,
  CatalogProduct,
} from "@/lib/catalog";
import { ProductCard } from "./product-card";

type FilterProps = {
  category: string;
  brand: string;
  stock: string;
  max: number;
  availableCategories: typeof categories;
  availableBrands: typeof brands;
  setParam: (key: string, value: string) => void;
  clear: () => void;
  close: () => void;
};

function Filters({
  category,
  brand,
  stock,
  max,
  availableCategories,
  availableBrands,
  setParam,
  clear,
  close,
}: FilterProps) {
  return (
    <div className="filters gratis-filters">
      <div className="filter-title">
        <div>
          <small>MƏHSULLARI DARALT</small>
          <b>Filtrləmə seçimləri</b>
        </div>
        <button type="button" onClick={close} aria-label="Filtrləri bağla"><X /></button>
      </div>

      <button
        type="button"
        className={`stock-toggle ${stock === "Stokda" ? "active" : ""}`}
        onClick={() => setParam("stock", stock === "Stokda" ? "" : "Stokda")}
      >
        <i>{stock === "Stokda" && <Check />}</i>
        Yalnız stokda olanlar
      </button>

      <section className="filter-group">
        <h3>Kateqoriyalar <ChevronDown /></h3>
        <div className="filter-options">
          <button type="button" className={!category ? "active" : ""} onClick={() => setParam("category", "")}>Hamısı</button>
          {availableCategories.map((item) => (
            <button
              type="button"
              className={category === item.slug ? "active" : ""}
              onClick={() => setParam("category", category === item.slug ? "" : item.slug)}
              key={item.slug}
            >
              {item.name}
            </button>
          ))}
        </div>
      </section>

      <section className="filter-group">
        <h3>Brendlər <ChevronDown /></h3>
        <div className="filter-options brand-options">
          {availableBrands.map((item) => (
            <button
              type="button"
              className={brand === item.slug ? "active" : ""}
              onClick={() => setParam("brand", brand === item.slug ? "" : item.slug)}
              key={item.slug}
            >
              {item.name}
            </button>
          ))}
        </div>
      </section>

      <section className="filter-group price-filter">
        <h3>Qiymət <ChevronDown /></h3>
        <div className="price-values"><span>25 AZN</span><b>{max} AZN</b></div>
        <input
          aria-label="Maksimum qiymət"
          type="range"
          min="25"
          max="300"
          value={max}
          onChange={(event) => setParam("max", event.target.value)}
        />
      </section>

      <button type="button" className="clear-filter" onClick={clear}>Filtrləri təmizlə</button>
    </div>
  );
}

export function CatalogView({
  items,
  title,
  description,
}: {
  items: CatalogProduct[];
  title: string;
  description?: string;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const q = params.get("q") || "";
  const brand = params.get("brand") || "";
  const category = params.get("category") || "";
  const stock = params.get("stock") || "";
  const sort = params.get("sort") || "recommended";
  const max = Number(params.get("max") || 300);

  const availableCategories = categories.filter((item) =>
    items.some((product) => product.categorySlug === item.slug),
  );
  const availableBrands = brands.filter((item) =>
    items.some((product) => product.brandSlug === item.slug),
  );

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`?${next.toString()}`);
  }

  const filtered = useMemo(() => {
    const data = items.filter(
      (product) =>
        (!q || `${product.name} ${product.brand} ${product.sku}`.toLowerCase().includes(q.toLowerCase())) &&
        (!brand || product.brandSlug === brand) &&
        (!category || product.categorySlug === category) &&
        (!stock || product.stock === stock) &&
        product.price <= max,
    );
    return [...data].sort((a, b) =>
      sort === "new"
        ? Number(b.isNew) - Number(a.isNew)
        : sort === "price-asc"
          ? a.price - b.price
          : sort === "price-desc"
            ? b.price - a.price
            : sort === "bestseller"
              ? Number(b.bestseller) - Number(a.bestseller)
              : Number(b.featured) - Number(a.featured),
    );
  }, [items, q, brand, category, stock, max, sort]);

  const filterProps = {
    category,
    brand,
    stock,
    max,
    availableCategories,
    availableBrands,
    setParam,
    clear: () => router.push("?"),
    close: () => setDrawer(false),
  };

  return (
    <main className="catalog-page gratis-catalog container">
      <div className="breadcrumbs">Ana səhifə / {title}</div>

      <section className="catalog-hero gratis-catalog-hero">
        <div>
          <span><Sparkles /> BANTİK KATALOQU</span>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        <div className="catalog-hero-count"><b>{items.length}</b><span>seçilmiş məhsul</span></div>
      </section>

      <section className="catalog-quick-categories" aria-label="Məhsul kateqoriyaları">
        {categories.slice(0, 7).map((item) => (
          <Link href={`/category/${item.slug}`} key={item.slug}>
            <span><Image src={item.image} alt="" fill sizes="120px" /></span>
            <b>{item.name}</b>
          </Link>
        ))}
      </section>

      <div className="catalog-toolbar gratis-toolbar">
        <button type="button" className="filter-trigger" onClick={() => setDrawer(true)}>
          <SlidersHorizontal /> Filtrlə
        </button>
        <span><Grid2X2 /><b>{filtered.length}</b> məhsul göstərilir</span>
        <label>
          <span>Sırala</span>
          <select value={sort} onChange={(event) => setParam("sort", event.target.value)}>
            <option value="recommended">Tövsiyə olunan</option>
            <option value="new">Ən yenilər</option>
            <option value="price-asc">Qiymət: aşağıdan yuxarı</option>
            <option value="price-desc">Qiymət: yuxarıdan aşağı</option>
            <option value="bestseller">Ən çox satılan</option>
          </select>
          <ChevronDown />
        </label>
      </div>

      {(brand || category || stock || max < 300) && (
        <div className="active-filter-row">
          <small>Aktiv filtrlər:</small>
          {category && <button type="button" onClick={() => setParam("category", "")}>{categories.find((item) => item.slug === category)?.name} <X /></button>}
          {brand && <button type="button" onClick={() => setParam("brand", "")}>{brands.find((item) => item.slug === brand)?.name} <X /></button>}
          {stock && <button type="button" onClick={() => setParam("stock", "")}>{stock} <X /></button>}
          {max < 300 && <button type="button" onClick={() => setParam("max", "")}>≤ {max} AZN <X /></button>}
        </div>
      )}

      <div className="catalog-layout gratis-catalog-layout">
        <aside><Filters {...filterProps} /></aside>
        <section>
          {filtered.length ? (
            <div className="catalog-grid gratis-catalog-grid">
              {filtered.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : (
            <div className="empty-state">
              <h2>Məhsul tapılmadı</h2>
              <p>Filtrləri dəyişərək yenidən yoxlayın.</p>
              <button type="button" onClick={filterProps.clear}>Filtrləri təmizlə</button>
            </div>
          )}
        </section>
      </div>

      {drawer && (
        <div className="filter-overlay" onClick={() => setDrawer(false)}>
          <div onClick={(event) => event.stopPropagation()}><Filters {...filterProps} /></div>
        </div>
      )}
    </main>
  );
}
