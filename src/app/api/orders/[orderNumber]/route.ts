import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  addOrderNote,
  assignBranch,
  orderStatuses,
  state,
  updateStatus,
} from "@/lib/orders";
import {
  addDatabaseOrderNote,
  assignDatabaseBranch,
  databaseReady,
  getDatabaseOrder,
  updateDatabaseOrderStatus,
} from "@/lib/persistence";
import { canAccessBranch } from "@/lib/inventory";
import { requireStaff } from "@/lib/rbac";
import { assertSameOrigin } from "@/lib/http-security";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  if (!(await auth())?.user)
    return NextResponse.json({ error: "İcazə yoxdur" }, { status: 401 });
  const staff = await requireStaff();
  const { orderNumber } = await params;
  const order = databaseReady
    ? await getDatabaseOrder(orderNumber)
    : state.orders.find((item) => item.orderNumber === orderNumber);
  if (
    order?.assignedBranchId &&
    !canAccessBranch(staff.role, staff.branchId, order.assignedBranchId)
  )
    return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });
  return order
    ? NextResponse.json(order)
    : NextResponse.json({ error: "Tapılmadı" }, { status: 404 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  if (!(await auth())?.user)
    return NextResponse.json({ error: "İcazə yoxdur" }, { status: 401 });
  const staff = await requireStaff();
  try {
    assertSameOrigin(request);
    const { orderNumber } = await params;
    const body = await request.json();
    let order = databaseReady
      ? await getDatabaseOrder(orderNumber)
      : state.orders.find((item) => item.orderNumber === orderNumber);
    if (!order)
      return NextResponse.json({ error: "Tapılmadı" }, { status: 404 });
    if (
      order.assignedBranchId &&
      !canAccessBranch(staff.role, staff.branchId, order.assignedBranchId)
    )
      return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });
    if (
      body.branchId &&
      !canAccessBranch(staff.role, staff.branchId, String(body.branchId))
    )
      return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });
    if (body.status && orderStatuses.includes(body.status))
      order = databaseReady
        ? await updateDatabaseOrderStatus(
            orderNumber,
            body.status,
            "demo-admin",
            body.statusNote,
          )
        : updateStatus(orderNumber, body.status, "ADMIN", body.statusNote);
    if (body.note?.trim())
      order = databaseReady
        ? await addDatabaseOrderNote(orderNumber, String(body.note).trim())
        : addOrderNote(orderNumber, String(body.note).trim());
    if (body.branchId)
      order = databaseReady
        ? await assignDatabaseBranch(orderNumber, String(body.branchId))
        : assignBranch(orderNumber, String(body.branchId));
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Xəta" },
      { status: 400 },
    );
  }
}
