import { NextResponse } from "next/server";
import { z } from "zod";

import { databaseReady, trackDatabaseOrder } from "@/lib/persistence";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { normalizePhone, trackOrder, type OrderStatus } from "@/lib/orders";

const trackingSchema = z.object({
  orderNumber: z.string().regex(/^BNT-\d{4}-\d{6}$/),
  phone: z.string().min(9).max(24),
});

export async function POST(request: Request) {
  const limited = await rateLimit("order-track", clientIp(request), {
    limit: 8,
    windowMs: 10 * 60_000,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Çox sayda yoxlama cəhdi edildi. Bir qədər sonra yenidən yoxlayın." },
      { status: 429, headers: { "retry-after": String(limited.retryAfter) } },
    );
  }
  const parsed = trackingSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Sifariş nömrəsi və telefon formatını yoxlayın." },
      { status: 400 },
    );
  }
  const phone = normalizePhone(parsed.data.phone);
  const order = databaseReady
    ? await trackDatabaseOrder(parsed.data.orderNumber, phone)
    : trackOrder(parsed.data.orderNumber, phone);
  if (!order)
    return NextResponse.json(
      { error: "Sifariş tapılmadı və ya məlumatlar uyğun deyil." },
      { status: 404 },
    );
  return NextResponse.json({
    orderNumber: order.orderNumber,
    customerName: order.customerName.split(" ")[0],
    total: order.total,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
    })),
    history: order.history.map(
      ({ newStatus, createdAt }: { newStatus: OrderStatus; createdAt: string }) => ({
        newStatus,
        createdAt,
      }),
    ),
  });
}
