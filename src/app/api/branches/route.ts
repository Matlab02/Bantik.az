import { NextResponse } from "next/server";
import { inventoryState } from "@/lib/inventory";
import {
  createDatabaseBranch,
  databaseReady,
  listDatabaseBranches,
  updateDatabaseBranch,
} from "@/lib/persistence";
import { authError, requireStaff } from "@/lib/rbac";
import { assertSameOrigin } from "@/lib/http-security";
export async function GET() {
  try {
    await requireStaff();
    return NextResponse.json(
      databaseReady ? await listDatabaseBranches() : inventoryState.branches,
    );
  } catch (error) {
    const e = authError(error);
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const staff = await requireStaff(["SUPER_ADMIN"]),
      body = await request.json();
    if (!body.name || !body.code || !body.address)
      throw new Error("Ad, kod və ünvan məcburidir");
    if (databaseReady)
      return NextResponse.json(await createDatabaseBranch(body, staff.id));
    if (inventoryState.branches.some((x) => x.code === body.code))
      throw new Error("Filial kodu unikaldır");
    const branch = {
      id: crypto.randomUUID(),
      slug: String(body.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-"),
      name: String(body.name),
      code: String(body.code),
      type:
        body.type === "WAREHOUSE" ? ("WAREHOUSE" as const) : ("STORE" as const),
      address: String(body.address),
      phone: String(body.phone || ""),
      active: true,
    };
    inventoryState.branches.push(branch);
    inventoryState.audits.unshift({
      id: crypto.randomUUID(),
      userId: staff.id,
      action: "BRANCH_CREATED",
      entityType: "Branch",
      entityId: branch.id,
      after: branch,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json(branch);
  } catch (error) {
    const e = authError(error);
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
}
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const staff = await requireStaff(["SUPER_ADMIN"]),
      body = await request.json();
    if (databaseReady)
      return NextResponse.json(await updateDatabaseBranch(body, staff.id));
    const branch = inventoryState.branches.find((x) => x.id === body.id);
    if (!branch) throw new Error("Filial tapılmadı");
    const before = structuredClone(branch);
    if (body.name) branch.name = String(body.name);
    if (body.address) branch.address = String(body.address);
    if (typeof body.active === "boolean") branch.active = body.active;
    inventoryState.audits.unshift({
      id: crypto.randomUUID(),
      userId: staff.id,
      action: "BRANCH_UPDATED",
      entityType: "Branch",
      entityId: branch.id,
      before,
      after: branch,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json(branch);
  } catch (error) {
    const e = authError(error);
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
}
