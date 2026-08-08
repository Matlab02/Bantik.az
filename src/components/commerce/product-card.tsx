"use client";

import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import type { MouseEvent } from "react";
import { CatalogProduct, money } from "@/lib/catalog";
import { animateProductToCart } from "@/lib/cart-animation";
import { SafeImage } from "./safe-image";
import { useStore } from "./store-provider";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const { wishlist, toggleWishlist, addToCart } = useStore();
  const liked = wishlist.includes(product.id);
  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;
  const soldOut = product.stock === "Stokda yoxdur";

  function handleAddToCart(event: MouseEvent<HTMLButtonElement>) {
    const image = event.currentTarget
      .closest<HTMLElement>(".product-card")
      ?.querySelector<HTMLElement>(".product-image img") || null;

    addToCart(product.id);
    animateProductToCart(image);
  }

  return (
    <article className="product-card">
      <div className="product-image">
        <Link href={`/product/${product.slug}`} aria-label={`${product.brand} ${product.name}`}>
          <SafeImage
            src={product.image}
            alt={`${product.brand} ${product.name}`}
            fill
            sizes="(max-width: 640px) 48vw, (max-width: 1100px) 25vw, 190px"
          />
        </Link>
        <div className="top-badges">
          {product.isNew && <span>Yeni</span>}
          {discount > 0 && <span className="discount">-{discount}%</span>}
        </div>
        <button
          type="button"
          className={liked ? "liked" : ""}
          aria-label={liked ? "Seçilmişlərdən çıxar" : "Seçilmişlərə əlavə et"}
          onClick={() => toggleWishlist(product.id)}
        >
          <Heart fill={liked ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="product-info">
        <strong>{product.brand}</strong>
        <Link href={`/product/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        <div className="card-rating" aria-label="5 ulduz reytinq">
          <span>★★★★★</span>
          <small>({product.bestseller ? "128" : "86"})</small>
        </div>
        {product.colors.length > 0 && (
          <div className="card-swatches" aria-label="Mövcud rənglər">
            {product.colors.slice(0, 3).map((color) => (
              <i key={color.name} title={color.name} style={{ background: color.hex }} />
            ))}
            <small>+{product.colors.length}</small>
          </div>
        )}
        <span className={`stock ${soldOut ? "out" : product.stock === "Az qalıb" ? "low" : ""}`}>
          {product.stock}
        </span>
        <div className="prices">
          <b>{money(product.price)}</b>
          {product.compareAtPrice && <del>{money(product.compareAtPrice)}</del>}
        </div>
        <button
          type="button"
          className="add-cart"
          disabled={soldOut}
          onClick={handleAddToCart}
        >
          <ShoppingBag /> {soldOut ? "Stokda yoxdur" : "Səbətə əlavə et"}
        </button>
      </div>
    </article>
  );
}
