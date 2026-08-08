"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
type Report = {
  range: { label: string };
  summary?: Record<string, number>;
  rows: Record<string, string | number>[];
};
type Branch = { id: string; name: string };
const titles = {
  orders: "Sifariş reportu",
  products: "Məhsul performansı",
  brands: "Brend performansı",
  branches: "Filial performansı",
  inventory: "Inventory reportu",
};
export function ReportView({ type }: { type: keyof typeof titles }) {
  const search = useSearchParams(),
    router = useRouter(),
    path = usePathname(),
    [report, setReport] = useState<Report>(),
    [branches, setBranches] = useState<Branch[]>([]),
    [error, setError] = useState("");
  const load = useCallback(() => {
    setError("");
    fetch(`/api/admin/reports/${type}?${search}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setReport(data);
      })
      .catch(() => setError("Report məlumatları yüklənmədi."));
  }, [search, type]);
  // Report filters live in the URL and every URL change refreshes server data.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => load(), [load]);
  useEffect(() => {
    void fetch("/api/branches")
      .then((response) => response.json())
      .then((items) => setBranches(Array.isArray(items) ? items : []));
  }, []);
  function set(key: string, value: string) {
    const p = new URLSearchParams(search);
    if (value) p.set(key, value);
    else p.delete(key);
    router.replace(`${path}?${p}`);
  }
  const exportHref = (format: string) =>
    `/api/admin/reports/${type}?${search}&format=${format}`;
  return (
    <>
      <div className="admin-head">
        <div>
          <span>REPORTING</span>
          <h1>{titles[type]}</h1>
          <small>{report?.range.label}</small>
        </div>
        <div className="export-actions">
          <a href={exportHref("csv")}>CSV</a>
          <a href={exportHref("xlsx")}>Excel</a>
          <a href={exportHref("pdf")}>PDF</a>
        </div>
      </div>
      <div className="report-filters">
        <select
          value={search.get("range") || "30d"}
          onChange={(e) => set("range", e.target.value)}
        >
          <option value="today">Bu gün</option>
          <option value="yesterday">Dünən</option>
          <option value="7d">Son 7 gün</option>
          <option value="30d">Son 30 gün</option>
          <option value="this-month">Bu ay</option>
          <option value="last-month">Keçən ay</option>
          <option value="custom">Xüsusi</option>
        </select>
        <select
          value={search.get("branch") || ""}
          onChange={(e) => set("branch", e.target.value)}
        >
          <option value="">Bütün filiallar</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        {type === "orders" && (
          <>
            <input
              placeholder="Sifariş, müştəri, telefon"
              value={search.get("q") || ""}
              onChange={(e) => set("q", e.target.value)}
            />
            <select
              value={search.get("status") || ""}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="">Bütün statuslar</option>
              <option>NEW</option>
              <option>CONFIRMED</option>
              <option>PREPARING</option>
              <option>DELIVERED</option>
              <option>CANCELLED</option>
            </select>
          </>
        )}
        {search.get("range") === "custom" && (
          <>
            <input
              type="date"
              value={search.get("from") || ""}
              onChange={(e) => set("from", e.target.value)}
            />
            <input
              type="date"
              value={search.get("to") || ""}
              onChange={(e) => set("to", e.target.value)}
            />
          </>
        )}
      </div>
      {error ? (
        <div className="admin-state">
          <p>{error}</p>
          <button onClick={load}>Yenidən yoxla</button>
        </div>
      ) : !report ? (
        <div className="admin-state">
          <p>Report hazırlanır…</p>
        </div>
      ) : (
        <>
          <div className="report-summary">
            {report.summary &&
              Object.entries(report.summary).map(([key, value]) => (
                <article key={key}>
                  <span>{label(key)}</span>
                  <b>
                    {typeof value === "number" &&
                    key.toLowerCase().includes("value")
                      ? money(value)
                      : Number(value).toFixed(value % 1 ? 2 : 0)}
                  </b>
                </article>
              ))}
          </div>
          <DynamicTable rows={report.rows} />
        </>
      )}
    </>
  );
}
function DynamicTable({ rows }: { rows: Record<string, string | number>[] }) {
  if (!rows.length)
    return (
      <div className="admin-state">
        <p>Seçilən filtrlərə uyğun məlumat yoxdur.</p>
      </div>
    );
  const headers = Object.keys(rows[0]);
  return (
    <div className="report-table-wrap">
      <table className="report-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {headers.map((h) => (
                <td key={h}>
                  {typeof row[h] === "number"
                    ? Number(row[h]).toLocaleString("az-AZ", {
                        maximumFractionDigits: 2,
                      })
                    : String(row[h] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function label(value: string) {
  return value.replace(/([A-Z])/g, " $1").trim();
}
function money(value: number) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
  }).format(value);
}
