import { NextResponse } from "next/server";
import {
  createTransfer,
  inventoryState,
  transitionTransfer,
} from "@/lib/inventory";
import {
  createDatabaseTransfer,
  databaseReady,
  listDatabaseTransfers,
  transitionDatabaseTransfer,
} from "@/lib/persistence";
import { authError, requireStaff } from "@/lib/rbac";
import { assertSameOrigin } from "@/lib/http-security";
export async function GET(request: Request) {
  try {
    await requireStaff();
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get("page") || 1));
    const pageSize = Math.min(100, Math.max(10, Number(params.get("pageSize") || 50)));
    return NextResponse.json(
      databaseReady
        ? await listDatabaseTransfers({ page, pageSize })
        : {
            transfers: inventoryState.transfers,
            branches: inventoryState.branches,
            pagination: { page: 1, pageSize, total: inventoryState.transfers.length, pages: 1 },
          },
    );
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
      ]),
      body = await request.json();
    const transfer = databaseReady
      ? body.action === "CREATE"
        ? await createDatabaseTransfer(body, staff.id)
        : await transitionDatabaseTransfer(
            String(body.id),
            body.status,
            staff.id,
            body.received,
          )
      : body.action === "CREATE"
        ? createTransfer({ ...body, userId: staff.id })
        : transitionTransfer(
            String(body.id),
            body.status,
            staff.id,
            body.received,
          );
    return NextResponse.json(transfer);
  } catch (error) {
    const e = authError(error);
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
}
