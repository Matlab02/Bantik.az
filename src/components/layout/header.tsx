import Image from "next/image";
import Link from "next/link";
import { Heart, Menu, ShoppingBag, UserRound } from "lucide-react";
import { SearchBox } from "@/components/commerce/search-box";

const menu = [
  ["Makiyaj", "makiyaj"],
  ["Ətir", "etir"],
  ["Üz baxımı", "uz-qullugu"],
  ["Saç", "sac-baximi"],
  ["Bədən", "beden-baximi"],
  ["Brendlər", "products"],
  ["Yeniliklər", "products?sort=new"],
  ["Hədiyyələr", "hediyyeler"],
];

export function Header() {
  return (
    <header className="site-header ref-header">
      <div className="benefit-bar">
        <span>◉ PULSUZ ÇATDIRILMA</span>
        <span>♢ RƏSMİ ORİJİNAL MƏHSULLAR</span>
        <span>♡ MÜŞTƏRİ DƏSTƏYİ · +994 50 123 45 67</span>
      </div>
      <div className="main-head">
        <button className="mobile-only" type="button" aria-label="Menyunu aç">
          <Menu />
        </button>
        <Link href="/" className="logo" aria-label="BANTİK ana səhifə">
          <Image
            src="/brand/bantik-wordmark.png"
            alt="BANTİK"
            fill
            priority
            sizes="120px"
          />
        </Link>
        <div className="ref-head-spacer" />
        <SearchBox />
        <div className="head-actions">
          <Link href="/admin/login" aria-label="Hesabım">
            <UserRound />
            <span>Hesab</span>
          </Link>
          <Link href="/wishlist" aria-label="Seçilmişlər">
            <Heart />
            <span>Seçilmişlər</span>
            <i />
          </Link>
          <Link href="/cart" className="cart-action" aria-label="Səbət">
            <ShoppingBag />
            <span>Səbət</span>
            <i />
          </Link>
        </div>
      </div>
      <nav className="category-nav" aria-label="Əsas kateqoriyalar">
        <div className="category-inner">
          {menu.map(([label, path], index) => (
            <Link
              href={index === 5 || index === 6 ? `/${path}` : `/category/${path}`}
              key={label}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
