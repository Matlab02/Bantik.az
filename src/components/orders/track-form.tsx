"use client";

import { Check } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { orderStatuses, type OrderStatus, statusLabels } from "@/lib/orders";

type TrackedOrder = {
  orderNumber: string;
  customerName: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items: { productName: string; quantity: number }[];
  history: { newStatus: OrderStatus; createdAt: string }[];
};

export function TrackForm() {
  const search = useSearchParams();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderNumber: formData.get("orderNumber"),
          phone: formData.get("phone"),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error);
        setOrder(null);
      } else {
        setError("");
        setOrder(data);
      }
    } catch {
      setError("Sorğu göndərilə bilmədi. Yenidən yoxlayın.");
      setOrder(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <form action={submit} className="track-form">
        <label>
          Sifariş nömrəsi
          <input
            name="orderNumber"
            required
            defaultValue={search.get("number") || ""}
            placeholder="BNT-2026-000001"
          />
        </label>
        <label>
          Telefon nömrəsi
          <input
            name="phone"
            required
            type="tel"
            inputMode="tel"
            placeholder="+994 50 123 45 67"
          />
        </label>
        <button disabled={pending} aria-busy={pending}>
          {pending ? "Axtarılır…" : "Sifarişi tap"}
        </button>
      </form>
      <div aria-live="polite">
        {error && <p className="checkout-error">{error}</p>}
      </div>
      {order && (
        <div className="tracking-result">
          <h2>{order.orderNumber}</h2>
          <p>{order.customerName}</p>
          <div className="timeline">
            {orderStatuses.slice(0, 7).map((status, index) => {
              const current = orderStatuses.indexOf(order.status);
              const done = index <= current && order.status !== "CANCELLED";
              return (
                <div className={done ? "done" : ""} key={status}>
                  <i aria-hidden="true">{done && <Check />}</i>
                  <span>
                    <b>{statusLabels[status]}</b>
                    {done && <small>Tamamlandı</small>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
