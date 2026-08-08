import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/auth";
import { assertSameOrigin } from "@/lib/http-security";
import { logger } from "@/lib/logger";
import { notifyOrder } from "@/lib/notifications";
import { createOrder, orderStatuses, state } from "@/lib/orders";
import {
  createDatabaseOrder,
  databaseReady,
  listDatabaseOrdersPage,
} from "@/lib/persistence";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { requireStaff } from "@/lib/rbac";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = await rateLimit("checkout", ip, { limit: 8, windowMs: 60_000 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Çox sayda sifariş cəhdi edildi. Bir qədər sonra yenidən yoxlayın." },
      { status: 429, headers: { "retry-after": String(limited.retryAfter) } },
    );
  }
  try {
    assertSameOrigin(request);
    const payload = await request.json();
    const order = databaseReady
      ? await createDatabaseOrder(payload)
      : createOrder(payload);
    void notifyOrder(order);
    logger.info("order.created", { orderNumber: order.orderNumber, source: order.source });
    return NextResponse.json({ orderNumber: order.orderNumber }, { status: 201 });
  } catch (error) {
    logger.error("order.create_failed", { error, ip });
    return NextResponse.json(
      {
        error:
          error instanceof ZodError
            ? error.issues[0]?.message
            : error instanceof Error && error.message === "INVALID_ORIGIN"
              ? "Sorğunun mənbəyi etibarlı deyil."
              : "Sifariş yaradıla bilmədi. Məlumatları yoxlayın.",
      },
      { status: error instanceof Error && error.message === "INVALID_ORIGIN" ? 403 : 400 },
    );
  }
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "İcazə yoxdur" }, { status: 401 });
  const staff = await requireStaff();
  const branchOnly =
    staff.role === "BRANCH_MANAGER" || staff.role === "SALES_STAFF"
      ? staff.branchId
      : undefined;
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number(params.get("page") || 1));
  const pageSize = Math.min(100, Math.max(10, Number(params.get("pageSize") || 50)));
  if (databaseReady) {
    const requestedStatus = params.get("status");
    const result = await listDatabaseOrdersPage({
      assignedBranchId: branchOnly,
      page,
      pageSize,
      query: params.get("q") || undefined,
      status: orderStatuses.find((status) => status === requestedStatus),
    });
    return NextResponse.json({
      items: result.items,
      pagination: {
        page,
        pageSize,
        total: result.total,
        pages: Math.ceil(result.total / pageSize),
      },
    });
  }
  const all = state.orders.filter(
    (item) => !branchOnly || item.assignedBranchId === branchOnly,
  );
  const start = (page - 1) * pageSize;
  return NextResponse.json({
    items: all.slice(start, start + pageSize),
    pagination: { page, pageSize, total: all.length, pages: Math.ceil(all.length / pageSize) },
  });
}
