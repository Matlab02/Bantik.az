"use client";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
const api = (resource: string, options?: RequestInit) =>
  fetch(`/api/admin/management/${resource}`, options).then(async (r) => {
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Əməliyyat alınmadı");
    return d;
  });
function Head({ title, kicker }: { title: string; kicker: string }) {
  return (
    <div className="admin-head">
      <div>
        <span>{kicker}</span>
        <h1>{title}</h1>
      </div>
    </div>
  );
}
function Loading({ error, retry }: { error?: string; retry?: () => void }) {
  return (
    <div className="admin-state">
      <p>{error || "Məlumat yüklənir…"}</p>
      {retry && <button onClick={retry}>Yenidən yoxla</button>}
    </div>
  );
}
const request = (method: string, body: unknown) => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
type PageMeta = { page: number; pageSize: number; total: number; pages: number };
type PageResult<T> = { items: T[]; pagination: PageMeta };
function Pager({ meta, setPage }: { meta: PageMeta; setPage: (page: number) => void }) {
  return (
    <nav className="admin-pagination" aria-label="Səhifələr">
      <button type="button" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}>
        Əvvəlki
      </button>
      <span>{meta.page} / {Math.max(1, meta.pages)} · {meta.total}</span>
      <button type="button" disabled={meta.page >= meta.pages} onClick={() => setPage(meta.page + 1)}>
        Növbəti
      </button>
    </nav>
  );
}
export function SettingsView() {
  const [data, setData] = useState<Record<string, string | number>>(),
    [message, setMessage] = useState("");
  useEffect(() => {
    void api("settings")
      .then(setData)
      .catch((e) => setMessage(e.message));
  }, []);
  if (!data) return <Loading error={message} />;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    try {
      const raw = Object.fromEntries(new FormData(e.currentTarget));
      await api("settings", request("PATCH", raw));
      setMessage("Ayarlar yadda saxlanıldı.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Xəta");
    }
  }
  const groups = {
    General: [
      ["siteName", "Sayt adı"],
      ["slogan", "Sloqan"],
      ["logoUrl", "Logo"],
      ["faviconUrl", "Favicon"],
    ],
    Contact: [
      ["phone", "Telefon"],
      ["whatsapp", "WhatsApp"],
      ["email", "E-poçt"],
      ["address", "Ünvan"],
    ],
    Social: [
      ["instagram", "Instagram"],
      ["tiktok", "TikTok"],
      ["facebook", "Facebook"],
    ],
    Orders: [
      ["orderPrefix", "Sifariş prefiksi"],
      ["defaultCity", "Default şəhər"],
      ["checkoutMessage", "Checkout mesajı"],
    ],
    Inventory: [
      ["defaultMinimumStock", "Default minimum stok"],
      ["lowStockBehavior", "Low stock davranışı"],
    ],
    SEO: [
      ["seoTitle", "Default title"],
      ["seoDescription", "Description"],
      ["ogImageUrl", "OG image"],
    ],
  };
  return (
    <>
      <Head title="Sayt ayarları" kicker="CONFIGURATION" />
      <form className="settings-form" onSubmit={save}>
        {Object.entries(groups).map(([group, fields]) => (
          <section key={group}>
            <h2>{group}</h2>
            {fields.map(([name, label]) => (
              <label key={name}>
                {label}
                <input
                  name={name}
                  type={name === "defaultMinimumStock" ? "number" : "text"}
                  defaultValue={data[name] ?? ""}
                />
              </label>
            ))}
          </section>
        ))}
        <button>Yadda saxla</button>
        {message && <p>{message}</p>}
      </form>
    </>
  );
}
type CmsData = {
  sections: { id: string; name: string; enabled: boolean; sortOrder: number }[];
  heroes: {
    id: string;
    title: string;
    desktopImage: string;
    mobileImage: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    alignment: string;
    active: boolean;
    startAt?: string;
    endAt?: string;
    sortOrder: number;
  }[];
  banners: {
    id: string;
    name: string;
    title: string;
    desktopImage: string;
    mobileImage: string;
    subtitle?: string;
    ctaText?: string;
    link?: string;
    active: boolean;
    startAt?: string;
    endAt?: string;
    position: string;
    sortOrder: number;
  }[];
};
export function CmsView() {
  const [data, setData] = useState<CmsData>(),
    [error, setError] = useState("");
  const load = useCallback(
    () =>
      api("cms")
        .then(setData)
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  async function section(id: string, values: object) {
    await api("cms", request("POST", { action: "SECTION", id, ...values }));
    void load();
  }
  async function moveSection(index: number, direction: -1 | 1) {
    if (!data) return;
    const current = data.sections[index];
    const other = data.sections[index + direction];
    if (!current || !other) return;
    await api(
      "cms",
      request("POST", {
        action: "SECTION",
        id: current.id,
        sortOrder: other.sortOrder,
      }),
    );
    await api(
      "cms",
      request("POST", {
        action: "SECTION",
        id: other.id,
        sortOrder: current.sortOrder,
      }),
    );
    void load();
  }
  async function toggleAsset(
    action: "HERO" | "BANNER",
    item: CmsData["heroes"][number] | CmsData["banners"][number],
  ) {
    await api(
      "cms",
      request("POST", { ...item, action, active: !item.active }),
    );
    void load();
  }
  async function asset(
    e: FormEvent<HTMLFormElement>,
    action: "HERO" | "BANNER",
  ) {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.currentTarget));
    await api(
      "cms",
      request("POST", {
        ...raw,
        action,
        active: true,
        sortOrder: Number(raw.sortOrder || 0),
      }),
    );
    e.currentTarget.reset();
    void load();
  }
  if (!data) return <Loading error={error} retry={load} />;
  return (
    <>
      <Head title="Ana səhifə CMS" kicker="CONTENT MANAGEMENT" />
      <section className="cms-block">
        <h2>Homepage bölmələri</h2>
        {data.sections.map((item, i) => (
          <article key={item.id}>
            <b>{item.name}</b>
            <span>Sıra: {item.sortOrder}</span>
            <button
              onClick={() => void section(item.id, { enabled: !item.enabled })}
            >
              {item.enabled ? "Söndür" : "Aktiv et"}
            </button>
            <button
              disabled={i === 0}
              onClick={() => void moveSection(i, -1)}
            >
              Yuxarı
            </button>
            <button
              disabled={i === data.sections.length - 1}
              onClick={() => void moveSection(i, 1)}
            >
              Aşağı
            </button>
          </article>
        ))}
      </section>
      <div className="cms-columns">
        <section className="cms-block">
          <h2>Hero slide</h2>
          {data.heroes.map((h) => (
            <article key={h.id}>
              <b>{h.title}</b>
              <small>
                {h.active ? "Aktiv" : "Deaktiv"} · {h.sortOrder}
              </small>
              <button onClick={() => void toggleAsset("HERO", h)}>
                {h.active ? "Deaktiv et" : "Aktiv et"}
              </button>
            </article>
          ))}
          <CmsForm action="HERO" submit={asset} />
        </section>
        <section className="cms-block">
          <h2>Campaign banner</h2>
          {data.banners.map((b) => (
            <article key={b.id}>
              <b>{b.name}</b>
              <small>
                {b.position} · {b.sortOrder}
              </small>
              <button onClick={() => void toggleAsset("BANNER", b)}>
                {b.active ? "Deaktiv et" : "Aktiv et"}
              </button>
            </article>
          ))}
          <CmsForm action="BANNER" submit={asset} />
        </section>
      </div>
    </>
  );
}
function CmsForm({
  action,
  submit,
}: {
  action: "HERO" | "BANNER";
  submit: (
    e: FormEvent<HTMLFormElement>,
    action: "HERO" | "BANNER",
  ) => Promise<void>;
}) {
  return (
    <form className="compact-form" onSubmit={(e) => void submit(e, action)}>
      {action === "BANNER" && (
        <input name="name" required placeholder="Banner adı" />
      )}
      <input name="title" required placeholder="Başlıq" />
      <input name="subtitle" placeholder="Alt başlıq" />
      <input name="desktopImage" required placeholder="Desktop image URL" />
      <input name="mobileImage" required placeholder="Mobile image URL" />
      <input name="ctaText" placeholder="CTA mətni" />
      <input
        name={action === "HERO" ? "ctaLink" : "link"}
        placeholder="CTA link"
      />
      {action === "HERO" ? (
        <select name="alignment">
          <option>LEFT</option>
          <option>CENTER</option>
          <option>RIGHT</option>
        </select>
      ) : (
        <input name="position" required defaultValue="HOME_CAMPAIGN" />
      )}
      <input name="startAt" type="datetime-local" />
      <input name="endAt" type="datetime-local" />
      <input name="sortOrder" type="number" defaultValue="1" />
      <button>Əlavə et</button>
    </form>
  );
}
type AdminUser = {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  role: string;
  branchId?: string;
  isActive: boolean;
};
type Branch = { id: string; name: string };
export function UsersView() {
  const [data, setData] = useState<{
      users: AdminUser[];
      branches: Branch[];
      roles: string[];
    }>(),
    [error, setError] = useState("");
  const load = useCallback(
    () =>
      api("users")
        .then(setData)
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await api(
        "users",
        request("POST", Object.fromEntries(new FormData(e.currentTarget))),
      );
      e.currentTarget.reset();
      void load();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Xəta");
    }
  }
  async function update(id: string, values: object) {
    await api("users", request("PATCH", { id, ...values }));
    void load();
  }
  if (!data) return <Loading error={error} retry={load} />;
  return (
    <>
      <Head title="Admin istifadəçiləri" kicker="RBAC" />
      <form className="user-create" onSubmit={create}>
        <input name="name" required placeholder="Ad" />
        <input name="email" type="email" required placeholder="E-poçt" />
        <input name="phone" placeholder="Telefon" />
        <input
          name="password"
          type="password"
          minLength={8}
          required
          placeholder="Müvəqqəti parol"
        />
        <select name="role">
          {data.roles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select name="branchId">
          <option value="">Filial yoxdur</option>
          {data.branches.map((b) => (
            <option value={b.id} key={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button>Admin yarat</button>
      </form>
      <div className="role-guide">
        <b>SUPER_ADMIN</b> bütün sistem · <b>ADMIN</b> əməliyyat və content ·{" "}
        <b>WAREHOUSE_MANAGER</b> stok və transfer · <b>BRANCH_MANAGER</b> öz
        filialı · <b>SALES_STAFF</b> baxış və sifariş
      </div>
      <div className="admin-table">
        {data.users.map((u) => (
          <div className="user-row" key={u.id}>
            <span>
              <b>{u.name}</b>
              <small>{u.email}</small>
            </span>
            <select
              value={u.role}
              onChange={(e) => void update(u.id, { role: e.target.value })}
            >
              {data.roles.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <select
              value={u.branchId || ""}
              onChange={(e) =>
                void update(u.id, { branchId: e.target.value || null })
              }
            >
              <option value="">Filial yoxdur</option>
              {data.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => void update(u.id, { isActive: !u.isActive })}
            >
              {u.isActive ? "Deaktiv et" : "Aktiv et"}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
type Notice = {
  id: string;
  title: string;
  message: string;
  link?: string;
  readAt?: string;
  createdAt: string;
};
export function NotificationsView() {
  const [data, setData] = useState<{ items: Notice[]; unread: number }>(),
    [error, setError] = useState("");
  const load = useCallback(
    () =>
      api("notifications")
        .then(setData)
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  async function read(id?: string) {
    await api("notifications", request("PATCH", id ? { id } : { all: true }));
    void load();
  }
  if (!data) return <Loading error={error} />;
  return (
    <>
      <Head title="Bildiriş mərkəzi" kicker={`${data.unread} OXUNMAMIŞ`} />
      <button className="admin-action" onClick={() => void read()}>
        Hamısını oxunmuş et
      </button>
      <div className="notification-list">
        {data.items.map((n) => (
          <article className={n.readAt ? "" : "unread"} key={n.id}>
            <span>
              <b>{n.title}</b>
              <p>{n.message}</p>
              <small>{new Date(n.createdAt).toLocaleString("az-AZ")}</small>
            </span>
            {n.link && <Link href={n.link}>Aç</Link>}{" "}
            {!n.readAt && (
              <button onClick={() => void read(n.id)}>Oxundu</button>
            )}
          </article>
        ))}
        {!data.items.length && <Loading error="Bildiriş yoxdur." />}
      </div>
    </>
  );
}
type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: object;
  after?: object;
  createdAt: string;
  user?: { name?: string; email: string };
};
export function AuditView() {
  const [data, setData] = useState<PageResult<AuditRow>>(),
    [selected, setSelected] = useState<AuditRow>(),
    [error, setError] = useState(""),
    [page, setPage] = useState(1);
  useEffect(() => {
    void api(`audit?page=${page}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [page]);
  if (!data) return <Loading error={error} />;
  return (
    <>
      <Head title="Audit log" kicker="IMMUTABLE ACTIVITY" />
      <div className="report-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th>Tarix</th>
              <th>İstifadəçi</th>
              <th>Əməliyyat</th>
              <th>Entity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.createdAt).toLocaleString("az-AZ")}</td>
                <td>{r.user?.name || r.user?.email || "SYSTEM"}</td>
                <td>{r.action}</td>
                <td>
                  {r.entityType} · {r.entityId}
                </td>
                <td>
                  <button onClick={() => setSelected(r)}>Fərq</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager meta={data.pagination} setPage={setPage} />
      {selected && (
        <div className="audit-drawer">
          <button onClick={() => setSelected(undefined)}>Bağla</button>
          <h2>{selected.action}</h2>
          <h3>Əvvəl</h3>
          <pre>{JSON.stringify(selected.before, null, 2) || "—"}</pre>
          <h3>Sonra</h3>
          <pre>{JSON.stringify(selected.after, null, 2) || "—"}</pre>
        </div>
      )}
    </>
  );
}
type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  orderCount: number;
  totalRequested: number;
  deliveredValue: number;
  lastOrder?: string;
};
export function CustomersView({ id }: { id?: string }) {
  const [data, setData] = useState<PageResult<Customer> | Record<string, unknown>>(),
    [error, setError] = useState(""),
    [page, setPage] = useState(1);
  useEffect(() => {
    void api(`customers${id ? `?id=${id}` : `?page=${page}`}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id, page]);
  if (!data) return <Loading error={error} />;
  if (id && !("items" in data)) {
    const customer = data as Record<string, unknown>;
    return (
      <>
        <Head
          title={`${customer.firstName} ${customer.lastName}`}
          kicker="CUSTOMER DETAIL"
        />
        <pre className="customer-detail">
          {JSON.stringify(customer, null, 2)}
        </pre>
      </>
    );
  }
  const result = data as PageResult<Customer>;
  const rows = result.items;
  return (
    <>
      <Head title="Müştərilər" kicker="CUSTOMER MANAGEMENT" />
      <div className="report-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th>Müştəri</th>
              <th>Telefon</th>
              <th>E-poçt</th>
              <th>Sifariş</th>
              <th>Ümumi</th>
              <th>Delivered</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/customers/${c.id}`}>
                    {c.firstName} {c.lastName}
                  </Link>
                </td>
                <td>{c.phone}</td>
                <td>{c.email}</td>
                <td>{c.orderCount}</td>
                <td>{c.totalRequested.toFixed(2)} ₼</td>
                <td>{c.deliveredValue.toFixed(2)} ₼</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager meta={result.pagination} setPage={setPage} />
    </>
  );
}
export function ProfileView() {
  const [data, setData] = useState<Record<string, string>>(),
    [message, setMessage] = useState("");
  useEffect(() => {
    void api("profile")
      .then(setData)
      .catch((e) => setMessage(e.message));
  }, []);
  if (!data) return <Loading error={message} />;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await api(
        "profile",
        request("PATCH", Object.fromEntries(new FormData(e.currentTarget))),
      );
      setMessage("Profil yeniləndi.");
    } catch (x) {
      setMessage(x instanceof Error ? x.message : "Xəta");
    }
  }
  return (
    <>
      <Head title="Admin profil" kicker="PROFILE & SECURITY" />
      <form className="profile-form" onSubmit={save}>
        <label>
          Ad
          <input name="name" defaultValue={data.name} />
        </label>
        <label>
          E-poçt
          <input name="email" type="email" defaultValue={data.email} />
        </label>
        <label>
          Telefon
          <input name="phone" defaultValue={data.phone} />
        </label>
        <hr />
        <label>
          Cari parol
          <input name="currentPassword" type="password" />
        </label>
        <label>
          Yeni parol
          <input name="newPassword" type="password" minLength={8} />
        </label>
        <label>
          Yeni parol təkrar
          <input name="confirmPassword" type="password" />
        </label>
        <button>Yadda saxla</button>
        {message && <p>{message}</p>}
      </form>
    </>
  );
}
type Login = {
  id: string;
  email: string;
  ip?: string;
  userAgent?: string;
  success: boolean;
  createdAt: string;
  user?: { name?: string };
};
export function SecurityView() {
  const [data, setData] = useState<PageResult<Login>>(),
    [error, setError] = useState(""),
    [page, setPage] = useState(1);
  useEffect(() => {
    void api(`security?page=${page}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [page]);
  if (!data) return <Loading error={error} />;
  return (
    <>
      <Head title="Login history" kicker="ADMIN SECURITY" />
      <div className="report-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th>Tarix</th>
              <th>İstifadəçi</th>
              <th>IP</th>
              <th>User agent</th>
              <th>Nəticə</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.createdAt).toLocaleString("az-AZ")}</td>
                <td>{r.user?.name || r.email}</td>
                <td>{r.ip || "—"}</td>
                <td>{r.userAgent || "—"}</td>
                <td className={r.success ? "ok" : "bad"}>
                  {r.success ? "Uğurlu" : "Uğursuz"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager meta={data.pagination} setPage={setPage} />
    </>
  );
}
