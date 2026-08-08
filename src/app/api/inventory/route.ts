import { NextResponse } from "next/server";
import {
  adjustStock,
  available,
  canAccessBranch,
  damageStock,
  dashboard,
  inventoryState,
  receiveStock,
  stockStatus,
} from "@/lib/inventory";
import { products } from "@/lib/catalog";
import { authError, requireStaff } from "@/lib/rbac";
import { assertSameOrigin } from "@/lib/http-security";
import {
  databaseInventoryMutation,
  databaseInventorySnapshot,
  databaseReady,
} from "@/lib/persistence";
export async function GET(request: Request) {
  try {
    const staff = await requireStaff();
    const branch = new URL(request.url).searchParams.get("branch") || undefined;
    const effective =
      staff.role === "BRANCH_MANAGER" || staff.role === "SALES_STAFF"
        ? staff.branchId
        : branch;
    if (effective && !canAccessBranch(staff.role, staff.branchId, effective))
      throw new Error("FORBIDDEN");
    if (databaseReady)
      return NextResponse.json(await databaseInventorySnapshot(effective));
    const rows = inventoryState.inventory
      .filter((x) => !effective || x.branchId === effective)
      .map((x) => ({
        ...x,
        availableQuantity: available(x),
        status: stockStatus(x),
        product: products.find((p) => p.id === x.productId),
      }));
    return NextResponse.json({
      summary: dashboard(effective),
      inventory: rows,
      branches: inventoryState.branches.filter((x) => x.active),
      movements: inventoryState.movements,
    });
  } catch (error) {
    const e = authError(error);
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const staff = await requireStaff([
      "SUPER_ADMIN",
      "ADMIN",
      "WAREHOUSE_MANAGER",
      "BRANCH_MANAGER",
    ]);
    const body = await request.json();
    if (!canAccessBranch(staff.role, staff.branchId, String(body.branchId)))
      throw new Error("FORBIDDEN");
    if (databaseReady)
      return NextResponse.json(await databaseInventoryMutation(body, staff.id));
    let result;
    if (body.action === "RECEIVE")
      result = receiveStock({ ...body, userId: staff.id });
    else if (body.action === "ADJUST")
      result = adjustStock({ ...body, userId: staff.id });
    else if (body.action === "DAMAGE")
      result = damageStock({ ...body, userId: staff.id });
    else if (body.action === "MINIMUM") {
      const item = inventoryState.inventory.find(
        (x) => x.id === body.inventoryId,
      );
      if (!item) throw new Error("Stok tapılmadı");
      if (!Number.isInteger(body.minimumStock) || body.minimumStock < 0)
        throw new Error("Minimum stok yanlışdır");
      item.minimumStock = body.minimumStock;
      result = item;
    } else if (body.action === "BULK_MINIMUM") {
      if (!Number.isInteger(body.minimumStock) || body.minimumStock < 0)
        throw new Error("Minimum stok yanlışdır");
      const rows = inventoryState.inventory.filter(
        (x) => !body.branchId || x.branchId === body.branchId,
      );
      rows.forEach((x) => (x.minimumStock = body.minimumStock));
      result = { count: rows.length };
    } else throw new Error("Əməliyyat tanınmadı");
    return NextResponse.json(result);
  } catch (error) {
    const e = authError(error);
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
}
