"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2X2, Heart, Home, Search, ShoppingBag } from "lucide-react";
import { useStore } from "@/components/commerce/store-provider";

const links = [
  { label: "Ana səhifə", Icon: Home, href: "/" },
  { label: "Kateqoriyalar", Icon: Grid2X2, href: "/products" },
  { label: "Axtarış", Icon: Search, href: "/search" },
  { label: "Seçilmişlər", Icon: Heart, href: "/wishlist" },
  { label: "Səbət", Icon: ShoppingBag, href: "/cart" },
];

function isCurrentPath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/products") {
    return ["/products", "/category/", "/brand/", "/product/"].some(
      (path) => pathname === path || pathname.startsWith(path),
    );
  }
  if (href === "/cart") return pathname === "/cart" || pathname.startsWith("/checkout");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const pathname = usePathname();
  const { cartCount } = useStore();
  const visibleCartCount = cartCount > 99 ? "99+" : cartCount;

  return (
    <nav className="mobile-nav" aria-label="Mobil naviqasiya">
      {links.map(({ label, Icon, href }) => {
        const active = isCurrentPath(pathname, href);
        const isCart = href === "/cart";

        return (
          <Link
            href={href}
            className={active ? "active" : ""}
            aria-current={active ? "page" : undefined}
            aria-label={isCart ? `${label}, ${cartCount} məhsul` : label}
            data-cart-target={isCart ? "mobile" : undefined}
            key={label}
          >
            <Icon />
            <span>{label}</span>
            {isCart && cartCount > 0 && (
              <b className="nav-count" aria-live="polite">{visibleCartCount}</b>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
