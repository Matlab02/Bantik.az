"use client";

import { EyeOff, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { money } from "@/lib/catalog";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  active: boolean;
  brand: string;
};

type PageData = {
  items: ProductRow[];
  pagination: { page: number; pageSize: number; total: number; pages: number };
};

export function AdminProducts() {
  const [data, setData] = useState<PageData>();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setError("");
      const response = await fetch(
        `/api/admin/management/products?page=${page}&q=${encodeURIComponent(query)}`,
      );
      if (response.status === 401) {
        window.location.replace("/admin/login?expired=1");
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Məhsullar yüklənmədi");
    }
  }, [page, query]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  async function deactivate(id: string) {
    if (!window.confirm("Məhsul vitrindən deaktiv edilsin?")) return;
    const response = await fetch("/api/admin/management/products", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "DEACTIVATE", id }),
    });
    if (!response.ok) {
      setError((await response.json()).error || "Əməliyyat alınmadı");
      return;
    }
    await load();
  }

  return (
    <>
      <div className="admin-head">
        <div>
          <span>KATALOQ</span>
          <h1>Məhsullar</h1>
        </div>
        <Link href="/admin/products/new">
          <Plus /> Yeni məhsul
        </Link>
      </div>
      <label className="admin-list-search">
        <span className="sr-only">Məhsul axtar</span>
        <input
          value={query}
          onChange={(event) => {
            setPage(1);
            setQuery(event.target.value.slice(0, 64));
          }}
          placeholder="Məhsul, SKU və ya barcode axtar…"
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      {!data ? (
        <p>Məhsullar yüklənir…</p>
      ) : (
        <>
          <div className="admin-table">
            <div className="admin-tr admin-th">
              <span>Məhsul</span>
              <span>SKU</span>
              <span>Qiymət</span>
              <span>Status</span>
              <span />
            </div>
            {data.items.map((product) => (
              <div className="admin-tr" key={product.id}>
                <span>
                  <b>{product.brand}</b>
                  {product.name}
                </span>
                <span>{product.sku}</span>
                <span>{money(product.price)}</span>
                <span className={product.active ? "active-status" : ""}>
                  {product.active ? "Aktiv" : "Deaktiv"}
                </span>
                <span>
                  <Link href={`/admin/products/${product.slug}`} aria-label="Redaktə et">
                    <Pencil />
                  </Link>
                  {product.active && (
                    <button
                      type="button"
                      aria-label="Deaktiv et"
                      onClick={() => void deactivate(product.id)}
                    >
                      <EyeOff />
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
          <nav className="admin-pagination" aria-label="Məhsul səhifələri">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Əvvəlki
            </button>
            <span>
              {data.pagination.page} / {Math.max(1, data.pagination.pages)} · {data.pagination.total}
            </span>
            <button
              type="button"
              disabled={page >= data.pagination.pages}
              onClick={() => setPage((value) => value + 1)}
            >
              Növbəti
            </button>
          </nav>
        </>
      )}
    </>
  );
}
