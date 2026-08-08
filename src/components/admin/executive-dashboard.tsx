"use client";

import Link from "next/link";
import { AlertCircle, ArrowUpRight, Bell, Package } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ChartRow = { label: string; value?: number; orders?: number };
type Dashboard = {
  range: { label: string };
  orders: Record<string, number>;
  inventory: Record<string, number>;
  products: Record<string, number>;
  branches: { label: string; value: number; deliveredValue: number }[];
  charts: Record<string, ChartRow[]>;
  alerts: { label: string; link: string; severity: string }[];
};

const chartColors = ["#c80f1b", "#0f5278", "#d49b06", "#2b7a4b", "#76207d"];

export function ExecutiveDashboard() {
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();
  const [data, setData] = useState<Dashboard>();
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    fetch(`/api/admin/dashboard?${search}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        setData(payload);
      })
      .catch(() => setError("Dashboard məlumatları yüklənmədi. Yenidən cəhd edin."));
  }, [search]);

  // Dashboard data follows the selected URL range.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => load(), [load]);

  function range(value: string) {
    const params = new URLSearchParams(search);
    params.set("range", value);
    if (value !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    router.replace(`${path}?${params}`);
  }

  if (error) return <State text={error} retry={load} />;
  if (!data) return <State text="Dashboard yüklənir…" />;

  const status = data.charts.status ?? [];
  const totalStatus = Math.max(1, status.reduce((sum, item) => sum + (item.value || 0), 0));
  let angle = 0;
  const gradient = status.length
    ? status
        .map((item, index) => {
          const start = angle;
          angle += ((item.value || 0) / totalStatus) * 360;
          return `${chartColors[index % chartColors.length]} ${start}deg ${angle}deg`;
        })
        .join(",")
    : "#ece8e3 0deg 360deg";

  const stats = [
    ["Yeni sifarişlər", data.orders.new || 0, "+12%"],
    ["Çatdırılan sifarişlər", data.orders.delivered || 0, "+8%"],
    ["Ümumi gəlir", money(data.orders.totalValue), "+15%"],
    ["Orta sifariş dəyəri", money(data.orders.averageOrderValue), "+5%"],
  ];

  return (
    <div className="ref-dashboard">
      <div className="admin-head ref-dashboard-head">
        <div>
          <h1>Ümumi baxış</h1>
          <small>{data.range.label}</small>
        </div>
        <DateRange search={search} range={range} router={router} path={path} />
      </div>

      <div className="ref-admin-stats">
        {stats.map(([label, value, delta]) => (
          <article key={label}>
            <span>{label}</span>
            <b>{value}</b>
            <small><ArrowUpRight /> {delta}</small>
          </article>
        ))}
      </div>

      <div className="ref-dashboard-grid">
        <section className="ref-admin-card ref-trend-card">
          <header><h2>Sifarişlər (zaman üzrə)</h2><small>Son dövr</small></header>
          <TrendChart rows={data.charts.daily ?? []} />
        </section>

        <section className="ref-admin-card ref-status-card">
          <header><h2>Sifarişlər (status üzrə)</h2></header>
          <div className="ref-donut-wrap">
            <div className="ref-donut" style={{ background: `conic-gradient(${gradient})` }}>
              <span>{totalStatus}<small>cəmi</small></span>
            </div>
            <div className="ref-donut-legend">
              {status.slice(0, 5).map((item, index) => (
                <p key={item.label}>
                  <i style={{ background: chartColors[index % chartColors.length] }} />
                  <span>{item.label}</span>
                  <b>{item.value || 0}</b>
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="ref-admin-card ref-products-card">
          <header><h2>Ən çox satılan məhsullar</h2><Link href="/admin/reports/products">Hamısı</Link></header>
          <div className="ref-ranked-list">
            {(data.charts.products ?? []).slice(0, 6).map((item, index) => (
              <div key={item.label}>
                <span><Package /><i>{index + 1}</i></span>
                <b>{item.label}</b>
                <em>{item.value || 0} satış</em>
              </div>
            ))}
          </div>
        </section>

        <section className="ref-admin-card ref-alerts-card">
          <header><h2>Bildirişlər</h2><Bell /></header>
          <div>
            {data.alerts.slice(0, 6).map((alert) => (
              <Link href={alert.link} className={alert.severity} key={alert.label}>
                <AlertCircle />
                <span>{alert.label}<small>İndi yoxla</small></span>
                <ArrowUpRight />
              </Link>
            ))}
            {data.alerts.length === 0 && <p>Hazırda vacib bildiriş yoxdur.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function TrendChart({ rows }: { rows: ChartRow[] }) {
  const visible = rows.slice(-8);
  const values = visible.map((item) => item.orders || item.value || 0);
  const max = Math.max(1, ...values);
  const points = values
    .map((value, index) => {
      const x = values.length > 1 ? 20 + (index / (values.length - 1)) * 560 : 300;
      const y = 170 - (value / max) * 135;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="ref-trend-chart">
      <svg viewBox="0 0 600 190" role="img" aria-label="Sifariş trendi">
        {[35, 80, 125, 170].map((y) => <line x1="20" x2="580" y1={y} y2={y} key={y} />)}
        {points && <polyline points={points} />}
        {values.map((value, index) => {
          const x = values.length > 1 ? 20 + (index / (values.length - 1)) * 560 : 300;
          const y = 170 - (value / max) * 135;
          return <circle cx={x} cy={y} r="4" key={`${x}-${value}`} />;
        })}
      </svg>
      <div>{visible.map((item) => <span key={item.label}>{item.label}</span>)}</div>
    </div>
  );
}

function money(value: number) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function State({ text, retry }: { text: string; retry?: () => void }) {
  return (
    <div className="admin-state">
      <p>{text}</p>
      {retry && <button type="button" onClick={retry}>Yenidən yoxla</button>}
    </div>
  );
}

function DateRange({ search, range, router, path }: {
  search: ReturnType<typeof useSearchParams>;
  range: (value: string) => void;
  router: ReturnType<typeof useRouter>;
  path: string;
}) {
  const current = search.get("range") || "today";

  function custom(key: "from" | "to", value: string) {
    const params = new URLSearchParams(search);
    params.set("range", "custom");
    params.set(key, value);
    router.replace(`${path}?${params}`);
  }

  return (
    <div className="date-range">
      <select value={current} onChange={(event) => range(event.target.value)} aria-label="Tarix aralığı">
        <option value="today">Bu gün</option>
        <option value="yesterday">Dünən</option>
        <option value="7d">Son 7 gün</option>
        <option value="30d">Son 30 gün</option>
        <option value="this-month">Bu ay</option>
        <option value="last-month">Keçən ay</option>
        <option value="custom">Xüsusi tarix</option>
      </select>
      {current === "custom" && (
        <>
          <input type="date" value={search.get("from") || ""} onChange={(event) => custom("from", event.target.value)} />
          <input type="date" value={search.get("to") || ""} onChange={(event) => custom("to", event.target.value)} />
        </>
      )}
    </div>
  );
}
