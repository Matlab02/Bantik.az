"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { products } from "@/lib/catalog";

export function SearchBox() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const id = setTimeout(() => setQuery(value), 250);
    return () => clearTimeout(id);
  }, [value]);

  const results = query.length > 1
    ? products
        .filter((product) =>
          `${product.name} ${product.brand} ${product.sku}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .slice(0, 6)
    : [];

  function submit() {
    if (!value.trim()) return;
    router.push(`/products?q=${encodeURIComponent(value.trim())}`);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="search-box"
        aria-label="Axtarış"
        onClick={() => setOpen(true)}
      >
        <Search />
        <span>Axtarış</span>
      </button>
      {open && (
        <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Məhsul axtarışı">
          <div className="search-modal">
            <div className="search-input">
              <Search />
              <input
                autoFocus
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && submit()}
                placeholder="Məhsul adı, brend və ya SKU"
              />
              <button type="button" onClick={() => setOpen(false)} aria-label="Bağla">
                <X />
              </button>
            </div>
            <div className="search-results">
              {results.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => {
                    router.push(`/product/${product.slug}`);
                    setOpen(false);
                  }}
                >
                  <Image src={product.image} alt="" width={58} height={70} />
                  <span>
                    <small>{product.brand}</small>
                    <b>{product.name}</b>
                    <em>{product.sku}</em>
                  </span>
                </button>
              ))}
              {query.length > 1 && results.length === 0 && <p>Nəticə tapılmadı.</p>}
            </div>
            {results.length > 0 && (
              <button type="button" className="all-results" onClick={submit}>
                Bütün nəticələrə bax
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
