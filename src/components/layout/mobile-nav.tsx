import Link from "next/link";
import { Grid2X2, Heart, Home, Search, ShoppingBag } from "lucide-react";

const links = [
  { label: "Ana səhifə", Icon: Home, href: "/" },
  { label: "Kateqoriyalar", Icon: Grid2X2, href: "/products" },
  { label: "Axtarış", Icon: Search, href: "/products" },
  { label: "Seçilmişlər", Icon: Heart, href: "/wishlist" },
  { label: "Səbət", Icon: ShoppingBag, href: "/cart" },
];

export function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Mobil naviqasiya">
      {links.map(({ label, Icon, href }, index) => (
        <Link href={href} className={index === 0 ? "active" : ""} key={label}>
          <Icon />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
