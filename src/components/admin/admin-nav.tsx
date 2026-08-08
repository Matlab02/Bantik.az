"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Boxes,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  Package,
  PanelsTopLeft,
  Settings,
  ShieldCheck,
  Store,
  Tags,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";

const items = [
  ["Ümumi baxış", "/admin", LayoutDashboard],
  ["Sifarişlər", "/admin/orders", ClipboardList],
  ["Məhsullar", "/admin/products", Package],
  ["Kateqoriyalar", "/admin/categories", FolderKanban],
  ["Brendlər", "/admin/brands", Tags],
  ["İnventar", "/admin/inventory", Warehouse],
  ["Mal qəbulu", "/admin/inventory/receiving", Boxes],
  ["Transferlər", "/admin/transfers", Truck],
  ["Filiallar", "/admin/branches", Store],
  ["Hesabatlar", "/admin/reports/orders", BarChart3],
  ["CMS", "/admin/cms", PanelsTopLeft],
  ["İstifadəçilər", "/admin/users", Users],
  ["Bildirişlər", "/admin/notifications", Bell],
  ["Audit", "/admin/audit", ShieldCheck],
  ["Ayarlar", "/admin/settings", Settings],
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="admin-nav">
      <Link href="/admin" className="admin-logo" aria-label="BANTİK admin panel">
        <Image src="/brand/bantik-wordmark.png" alt="BANTİK" fill sizes="130px" />
        <small>ADMIN PANEL</small>
      </Link>
      <nav aria-label="Admin naviqasiyası">
        {items.map(([label, href, Icon]) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link href={href} className={active ? "active" : ""} key={href}>
              <Icon />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <Link className="admin-store-link" href="/">
        <Store />
        <span>Mağazaya qayıt</span>
      </Link>
    </aside>
  );
}
