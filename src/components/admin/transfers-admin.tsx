"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { products } from "@/lib/catalog";
import type { Branch, Transfer, TransferStatus } from "@/lib/inventory";

type Pagination = { page: number; pageSize: number; total: number; pages: number };

export function TransfersAdmin() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [received, setReceived] = useState<Record<string, number>>({});
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 50, total: 0, pages: 0 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const response = await fetch(`/api/transfers?page=${page}`);
    if (response.status === 401) {
      window.location.replace("/admin/login?expired=1");
      return;
    }
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Transferlər yüklənmədi");
      return;
    }
    setTransfers(data.transfers || []);
    setBranches(data.branches || []);
    setPagination(data.pagination || { page, pageSize: 50, total: 0, pages: 0 });
  }, [page]);

  useEffect(() => {
    void fetch(`/api/transfers?page=${page}`)
      .then(async (response) => {
        if (response.status === 401) {
          window.location.replace("/admin/login?expired=1");
          return undefined;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Transferlər yüklənmədi");
        return data;
      })
      .then((data) => {
        if (!data) return;
        setTransfers(data.transfers || []);
        setBranches(data.branches || []);
        setPagination(data.pagination || { page, pageSize: 50, total: 0, pages: 0 });
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Transferlər yüklənmədi"));
  }, [page]);

  async function send(body: object) {
    setError("");
    const response = await fetch("/api/transfers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error);
      return;
    }
    await load();
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const productId = String(form.get("productId"));
    void send({
      action: "CREATE",
      fromBranchId: form.get("fromBranchId"),
      toBranchId: form.get("toBranchId"),
      note: form.get("note"),
      items: [{
        productId,
        variantId: `${productId}-default`,
        quantity: Number(form.get("quantity")),
      }],
    });
    event.currentTarget.reset();
  }

  const next = (status: TransferStatus): TransferStatus | undefined =>
    ({
      DRAFT: "REQUESTED",
      REQUESTED: "APPROVED",
      APPROVED: "IN_TRANSIT",
      IN_TRANSIT: "RECEIVED",
      RECEIVED: undefined,
      CANCELLED: undefined,
    })[status] as TransferStatus | undefined;

  return (
    <>
      <div className="admin-head">
        <div><span>FİLİALLARARASI</span><h1>Stok transferləri</h1></div>
      </div>
      <form className="transfer-form" onSubmit={create}>
        <select name="fromBranchId" required aria-label="Mənbə filial">
          <option value="">Mənbə filial</option>
          {branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}
        </select>
        <select name="toBranchId" required aria-label="Təyinat filialı">
          <option value="">Təyinat filialı</option>
          {branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}
        </select>
        <select name="productId" required aria-label="Məhsul">
          <option value="">Məhsul</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}
        </select>
        <input name="quantity" type="number" min="1" required placeholder="Miqdar" aria-label="Miqdar" />
        <input name="note" placeholder="Qeyd" aria-label="Qeyd" />
        <button>Transfer yarat</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      <div className="transfer-list">
        {transfers.map((transfer) => {
          const following = next(transfer.status);
          return (
            <article key={transfer.id}>
              <header><b>{transfer.transferNumber}</b><span>{transfer.status.replaceAll("_", " ")}</span></header>
              <p>{branches.find((branch) => branch.id === transfer.fromBranchId)?.name} → {branches.find((branch) => branch.id === transfer.toBranchId)?.name}</p>
              {transfer.items.map((item) => (
                <div className="transfer-item" key={item.productId}>
                  <small>{products.find((product) => product.id === item.productId)?.name}: istək {item.requestedQuantity}, göndərilib {item.shippedQuantity}, qəbul {item.receivedQuantity}</small>
                  {transfer.status === "IN_TRANSIT" && (
                    <label>
                      Qəbul edilən
                      <input
                        type="number"
                        min="0"
                        max={item.shippedQuantity}
                        defaultValue={item.shippedQuantity}
                        onChange={(event) => setReceived((values) => ({
                          ...values,
                          [`${transfer.id}:${item.productId}`]: Number(event.target.value),
                        }))}
                      />
                    </label>
                  )}
                </div>
              ))}
              {following && (
                <button type="button" onClick={() => void send({
                  id: transfer.id,
                  status: following,
                  received: following === "RECEIVED"
                    ? Object.fromEntries(transfer.items.map((item) => [
                        item.productId,
                        received[`${transfer.id}:${item.productId}`] ?? item.shippedQuantity,
                      ]))
                    : undefined,
                })}>
                  {following === "REQUESTED" ? "Sorğu göndər" : following === "APPROVED" ? "Təsdiqlə" : following === "IN_TRANSIT" ? "Yola sal" : "Qəbul et"}
                </button>
              )}
            </article>
          );
        })}
        {!transfers.length && <p>Hələ transfer yaradılmayıb.</p>}
      </div>
      <nav className="admin-pagination" aria-label="Transfer səhifələri">
        <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Əvvəlki</button>
        <span>{page} / {Math.max(1, pagination.pages)} · {pagination.total}</span>
        <button type="button" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>Növbəti</button>
      </nav>
    </>
  );
}
