"use client";
import Link from "next/link";
import { Bell, Menu, Search, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
const links = [
  ["Dashboard", "/admin"],
  ["Sifarişlər", "/admin/orders"],
  ["Inventory", "/admin/inventory"],
  ["Transferlər", "/admin/transfers"],
  ["Reportlar", "/admin/reports/orders"],
  ["CMS", "/admin/cms"],
  ["İstifadəçilər", "/admin/users"],
  ["Müştərilər", "/admin/customers"],
  ["Audit", "/admin/audit"],
  ["Ayarlar", "/admin/settings"],
];
type SearchResult = { id: string; label: string; detail: string; href: string };
type Notification = {
  id: string;
  title: string;
  message: string;
  link?: string;
  readAt?: string;
};
function handleAdminResponse(response: Response) {
  if (response.status === 401) {
    window.location.replace("/admin/login?expired=1");
    throw new Error("SESSION_EXPIRED");
  }
  return response;
}
export function AdminHeader() {
  const pathname = usePathname(),
    [query, setQuery] = useState(""),
    [results, setResults] = useState<Record<string, SearchResult[]>>(),
    [notifications, setNotifications] = useState<Notification[]>([]),
    [unread, setUnread] = useState(0),
    [bell, setBell] = useState(false),
    [menu, setMenu] = useState(false),
    drawerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (pathname === "/admin/login") return;
    void fetch("/api/admin/management/notifications")
      .then(handleAdminResponse)
      .then((r) => (r.ok ? r.json() : { items: [], unread: 0 }))
      .then((d) => {
        setNotifications(d.items);
        setUnread(d.unread);
      });
  }, [pathname]);
  useEffect(() => {
    if (query.length < 2) {
      return;
    }
    const timer = setTimeout(
      () =>
        void fetch(
          `/api/admin/management/search?q=${encodeURIComponent(query)}`,
        )
          .then(handleAdminResponse)
          .then((r) => r.json())
          .then(setResults),
      250,
    );
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (!menu) return;
    const drawer = drawerRef.current;
    const previous = document.activeElement as HTMLElement | null;
    drawer?.querySelector<HTMLElement>("button, a")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
      if (event.key !== "Tab" || !drawer) return;
      const focusable = [...drawer.querySelectorAll<HTMLElement>("button, a")];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [menu]);
  if (pathname === "/admin/login") return null;
  async function read(id?: string) {
    await fetch("/api/admin/management/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(id ? { id } : { all: true }),
    });
    setNotifications((x) =>
      x.map((n) =>
        id && n.id !== id ? n : { ...n, readAt: new Date().toISOString() },
      ),
    );
    setUnread(id ? Math.max(0, unread - 1) : 0);
  }
  return (
    <header className="admin-topbar">
      <button
        className="admin-menu-button"
        onClick={() => setMenu(true)}
        aria-label="Menyu"
      >
        <Menu />
      </button>
      <div className="admin-global-search">
        <Search />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length < 2) setResults(undefined);
          }}
          placeholder="Sifariş, telefon, məhsul, SKU, filial…"
        />
        {results && (
          <div className="admin-search-results">
            {Object.entries(results).map(
              ([group, items]) =>
                items.length > 0 && (
                  <section key={group}>
                    <b>{group}</b>
                    {items.map((item) => (
                      <Link
                        href={item.href}
                        key={item.id}
                        onClick={() => {
                          setQuery("");
                          setResults(undefined);
                        }}
                      >
                        <span>{item.label}</span>
                        <small>{item.detail}</small>
                      </Link>
                    ))}
                  </section>
                ),
            )}
            {Object.values(results).every((x) => !x.length) && (
              <p>Nəticə tapılmadı.</p>
            )}
          </div>
        )}
      </div>
      <div className="admin-bell">
        <button onClick={() => setBell(!bell)} aria-label="Bildirişlər">
          <Bell />
          {unread > 0 && <b>{unread}</b>}
        </button>
        {bell && (
          <div className="notification-popover">
            <header>
              <b>Bildirişlər</b>
              <button onClick={() => void read()}>Hamısını oxu</button>
            </header>
            {notifications.slice(0, 6).map((n) => (
              <Link
                className={n.readAt ? "" : "unread"}
                href={n.link || "/admin/notifications"}
                key={n.id}
                onClick={() => void read(n.id)}
              >
                <b>{n.title}</b>
                <small>{n.message}</small>
              </Link>
            ))}
            <Link href="/admin/notifications">Hamısına bax</Link>
          </div>
        )}
      </div>
      <Link className="admin-profile-link" href="/admin/profile">
        Profil
      </Link>
      {menu && (
        <div
          className="admin-mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Admin menyusu"
          ref={drawerRef}
        >
          <button onClick={() => setMenu(false)} aria-label="Menyunu bağla">
            <X />
          </button>
          {links.map(([label, href]) => (
            <Link href={href} key={href} onClick={() => setMenu(false)}>
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
