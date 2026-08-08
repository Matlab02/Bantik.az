"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Order, orderStatuses, statusLabels } from "@/lib/orders";

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  useEffect(() => {
    fetch(`/api/orders?page=${page}&pageSize=50`)
      .then((response) => response.ok ? response.json() : { items: [], pagination: { pages: 1 } })
      .then((data) => {
        setOrders(data.items);
        setPages(data.pagination.pages || 1);
      });
  }, [page]);
  const shown = useMemo(
    () =>
      orders.filter(
        (o) =>
          (!status || o.status === status) &&
          (!query ||
            `${o.orderNumber} ${o.customerName} ${o.phone}`
              .toLowerCase()
              .includes(query.toLowerCase())),
      ),
    [orders, query, status],
  );
  return (
    <>
      <div className="admin-head">
        <div>
          <span>PHASE 3</span>
          <h1>Sifarişlər</h1>
        </div>
      </div>
      <nav className="admin-pagination" aria-label="Sifariş səhifələri">
        <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Əvvəlki</button>
        <span>{page} / {pages}</span>
        <button disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Növbəti</button>
      </nav>
      <div className="order-filters">
        <input
          aria-label="Sifariş axtar"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nömrə, müştəri və ya telefon"
        />
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Bütün statuslar</option>
          {orderStatuses.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-table order-table">
        <div className="admin-tr admin-th">
          <span>Sifariş</span>
          <span>Müştəri</span>
          <span>Məbləğ</span>
          <span>Status</span>
          <span></span>
        </div>
        {shown.map((o) => (
          <div className="admin-tr" key={o.id}>
            <span>
              <b>{o.orderNumber}</b>
              <small>{new Date(o.createdAt).toLocaleString("az-AZ")}</small>
            </span>
            <span>
              {o.customerName}
              <small>{o.phone}</small>
            </span>
            <span>{o.total.toFixed(2)} ₼</span>
            <span>{statusLabels[o.status]}</span>
            <span>
              <Link href={`/admin/orders/${o.orderNumber}`}>Aç</Link>
            </span>
          </div>
        ))}
        {!shown.length && <p className="admin-empty">Sifariş tapılmadı.</p>}
      </div>
    </>
  );
}
