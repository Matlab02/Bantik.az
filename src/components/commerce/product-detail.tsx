"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BadgeCheck,
  Check,
  Heart,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Truck,
} from "lucide-react";
import { CatalogProduct, money } from "@/lib/catalog";
import { useStore } from "./store-provider";
import { ProductCard } from "./product-card";
import { SafeImage } from "./safe-image";

export function ProductDetail({
  product,
  related,
  whatsappNumber = "",
}: {
  product: CatalogProduct;
  related: CatalogProduct[];
  whatsappNumber?: string;
}) {
  const [image, setImage] = useState(product.images[0]);
  const [color, setColor] = useState(product.colors[0]?.name || "");
  const [volume, setVolume] = useState(product.volumes[0] || "");
  const [qty, setQty] = useState(1);
  const { wishlist, toggleWishlist, addToCart } = useStore();
  const liked = wishlist.includes(product.id);
  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;
  const productNumber = Number(product.id.replace(/\D/g, "")) || 1;
  const reviewCount = 76 + (productNumber % 8) * 7;
  const favoriteCount = 1100 + productNumber * 37;

  function add() {
    for (let index = 0; index < qty; index += 1) {
      addToCart(product.id, [color, volume].filter(Boolean).join(" / "));
    }
  }

  const message = `Salam, BANTİK saytından bu məhsulu sifariş etmək istəyirəm.\n\nMəhsul: ${product.name}\nKod: ${product.sku}\nVariant: ${color || "Standart"}\nHəcm: ${volume || "Standart"}\nLink: ${typeof window !== "undefined" ? window.location.href : ""}`;
  const whatsapp = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <main className="product-page gratis-product-page container">
      <div className="breadcrumbs">
        <Link href="/">Ana səhifə</Link> / <Link href={`/category/${product.categorySlug}`}>{product.category}</Link> / {product.name}
      </div>

      <div className="product-detail-grid gratis-product-grid">
        <section className="gallery gratis-gallery">
          <div className="thumbs">
            {product.images.map((src, index) => (
              <button
                type="button"
                aria-label={`${index + 1}-ci məhsul şəklini göstər`}
                key={src}
                className={image === src ? "active" : ""}
                onClick={() => setImage(src)}
              >
                <SafeImage src={src} alt="" fill sizes="80px" />
              </button>
            ))}
          </div>
          <div className="primary-image">
            <div className="detail-image-badges">
              {product.isNew && <span>Yeni</span>}
              {discount > 0 && <span className="sale">-{discount}%</span>}
            </div>
            <SafeImage
              src={image}
              alt={product.name}
              fill
              priority
              sizes="(max-width:800px) 100vw,52vw"
            />
            <small className="image-index">{product.images.indexOf(image) + 1} / {product.images.length}</small>
          </div>
        </section>

        <section className="product-summary gratis-product-summary">
          <div className="detail-brand-row">
            <LinkBrand slug={product.brandSlug} name={product.brand} />
            <span><BadgeCheck /> Orijinal məhsul</span>
          </div>
          <h1>{product.name}</h1>

          <div className="detail-social-proof">
            <span className="detail-stars">{[0, 1, 2, 3, 4].map((item) => <Star key={item} fill="currentColor" />)}</span>
            <b>4.8</b>
            <a href="#reviews">{reviewCount} qiymətləndirmə</a>
            <i />
            <span><Heart /> {favoriteCount.toLocaleString("az-AZ")} nəfər seçdi</span>
          </div>

          <p className="short-description">{product.shortDescription}</p>
          <small className="detail-sku">Məhsul kodu: {product.sku}</small>

          <div className="gratis-price-box">
            <div>
              <small>BANTİK QİYMƏTİ</small>
              <b>{money(product.price)}</b>
            </div>
            {product.compareAtPrice && (
              <div className="old-price"><small>Əvvəl</small><del>{money(product.compareAtPrice)}</del></div>
            )}
            {discount > 0 && <span>{discount}% endirim</span>}
          </div>

          <div className={`detail-stock ${product.stock === "Stokda yoxdur" ? "out" : ""}`}>
            <Check /> {product.stock}
            <small>Sifariş təsdiqi üçün əməkdaşımız sizinlə əlaqə saxlayacaq.</small>
          </div>

          {product.colors.length > 0 && (
            <fieldset className="detail-options">
              <legend>RƏNG / NÖV <b>{color}</b></legend>
              <div className="color-list">
                {product.colors.map((item) => (
                  <button
                    type="button"
                    aria-label={item.name}
                    title={item.name}
                    className={color === item.name ? "active" : ""}
                    style={{ background: item.hex }}
                    key={item.name}
                    onClick={() => setColor(item.name)}
                  />
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className="detail-options">
            <legend>HƏCM / ÖLÇÜ</legend>
            <div className="variant-list">
              {product.volumes.map((item) => (
                <button
                  type="button"
                  className={volume === item ? "active" : ""}
                  key={item}
                  onClick={() => setVolume(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="buy-row">
            <div className="quantity">
              <button type="button" aria-label="Miqdarı azalt" onClick={() => setQty(Math.max(1, qty - 1))}><Minus /></button>
              <span>{qty}</span>
              <button type="button" aria-label="Miqdarı artır" onClick={() => setQty(qty + 1)}><Plus /></button>
            </div>
            <button
              type="button"
              className="detail-add"
              disabled={product.stock === "Stokda yoxdur"}
              onClick={add}
            >
              <ShoppingBag /> Səbətə əlavə et
            </button>
            <button
              type="button"
              aria-label="Seçilmişlərə əlavə et"
              className={`detail-wish ${liked ? "active" : ""}`}
              onClick={() => toggleWishlist(product.id)}
            >
              <Heart fill={liked ? "currentColor" : "none"} />
            </button>
          </div>

          <a className="whatsapp" href={whatsapp} target="_blank" rel="noreferrer">
            <MessageCircle /> WhatsApp ilə sifariş et
          </a>

          <div className="detail-services">
            <div><Truck /><span><b>Rahat sifariş</b><small>Əlaqə ilə təsdiq</small></span></div>
            <div><Store /><span><b>Filialdan təhvil</b><small>Stoka uyğun seçim</small></span></div>
            <div><ShieldCheck /><span><b>Orijinallıq</b><small>100% zəmanət</small></span></div>
          </div>
        </section>
      </div>

      <section className="gratis-product-content">
        <nav aria-label="Məhsul məlumatı bölmələri">
          <a className="active" href="#description">Məhsul xüsusiyyətləri</a>
          <a href="#reviews">Rəylər</a>
          <a href="#delivery">Sifariş və təhvil</a>
          <a href="#returns">Qaytarma şərtləri</a>
        </nav>

        <article id="description" className="product-description-panel">
          <div>
            <small>BANTİK MƏHSUL BƏLƏDÇİSİ</small>
            <h2>{product.name}</h2>
            <p>{product.description}</p>
            <h3>İstifadə qaydası</h3>
            <p>{product.usageInstructions}</p>
          </div>
          <dl>
            <div><dt>Məhsul tipi</dt><dd>{product.productType}</dd></div>
            <div><dt>Dəri / saç tipi</dt><dd>{product.skinType}</dd></div>
            <div><dt>Həcm</dt><dd>{product.volumes.join(" / ")}</dd></div>
            <div><dt>Brend</dt><dd>{product.brand}</dd></div>
            <div><dt>Məhsul kodu</dt><dd>{product.sku}</dd></div>
            <div><dt>Barkod</dt><dd>{product.barcode}</dd></div>
          </dl>
        </article>

        <article id="reviews" className="product-review-panel">
          <div className="review-score">
            <small>MÜŞTƏRİ QİYMƏTLƏNDİRMƏSİ</small>
            <b>4.8</b>
            <span>{[0, 1, 2, 3, 4].map((item) => <Star key={item} fill="currentColor" />)}</span>
            <p>{reviewCount} nümunə qiymətləndirmə</p>
          </div>
          <div className="review-bars">
            {[92, 6, 2, 0, 0].map((value, index) => (
              <div key={value + index}><span>{5 - index}</span><i><b style={{ width: `${value}%` }} /></i><em>{value}%</em></div>
            ))}
          </div>
          <div className="review-note">
            <PackageCheck />
            <p><b>Rəy bölməsi üçün hazır struktur</b><span>Real layihədə yalnız təsdiqlənmiş sifariş sahiblərinin rəyləri burada göstəriləcək.</span></p>
          </div>
        </article>

        <div className="product-policy-grid">
          <article id="delivery"><Truck /><h3>Sifariş və təhvil</h3><p>Sifarişdən sonra BANTİK əməkdaşı stok və təhvil detalını dəqiqləşdirmək üçün sizinlə əlaqə saxlayır.</p></article>
          <article id="returns"><ShieldCheck /><h3>Qaytarma şərtləri</h3><p>Açılmamış və istifadə edilməmiş məhsullar üçün qaytarma şərtləri əməkdaş tərəfindən sifariş zamanı izah edilir.</p></article>
        </div>
      </section>

      <section className="related">
        <div className="section-head">
          <div><span>SƏNİN ÜÇÜN</span><h2>Oxşar məhsullar</h2></div>
          <Link href={`/category/${product.categorySlug}`}>Hamısına bax</Link>
        </div>
        <div className="product-grid">
          {related.slice(0, 4).map((item) => <ProductCard product={item} key={item.id} />)}
        </div>
      </section>

      <div className="mobile-buy">
        <span><b>{money(product.price)}</b><small>{product.stock}</small></span>
        <button type="button" disabled={product.stock === "Stokda yoxdur"} onClick={add}>Səbətə əlavə et</button>
      </div>
    </main>
  );
}

function LinkBrand({ slug, name }: { slug: string; name: string }) {
  return <Link className="detail-brand" href={`/brand/${slug}`}>{name}</Link>;
}
