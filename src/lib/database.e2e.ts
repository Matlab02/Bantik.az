import assert from "node:assert/strict";
import test, { after } from "node:test";
import { db } from "./db";
import { canAccessBranch } from "./inventory";
import { isScheduledActive } from "./management";
import {
  assignDatabaseBranch,
  createDatabaseOrder,
  createDatabaseTransfer,
  trackDatabaseOrder,
  transitionDatabaseTransfer,
  updateDatabaseOrderStatus,
} from "./persistence";

after(async () => db.$disconnect());

async function stockedLine(minimum = 3) {
  return db.inventory.findFirstOrThrow({
    where: { quantity: { gte: minimum } },
    orderBy: { quantity: "desc" },
    include: { product: true, branch: true },
  });
}

function checkout(productId: string, suffix: string) {
  return {
    firstName: "E2E",
    lastName: "Customer",
    phone: "+994 50 123 45 67",
    email: "e2e@example.com",
    city: "Bakı",
    address: "Test küçəsi 10",
    deliveryNote: "Automated PostgreSQL E2E",
    idempotencyKey: `e2e-${suffix}-${crypto.randomUUID()}`,
    items: [{ productId, quantity: 1 }],
  };
}

test("customer tracking and admin fulfillment persist in PostgreSQL", async () => {
  const line = await stockedLine();
  const before = line.quantity;
  const order = await createDatabaseOrder(checkout(line.productId, "deliver"));
  assert.equal((await trackDatabaseOrder(order.orderNumber, "+994501234567"))?.id, order.id);
  assert.equal(await trackDatabaseOrder(order.orderNumber, "+994501111111"), undefined);

  await assignDatabaseBranch(order.orderNumber, line.branchId);
  await updateDatabaseOrderStatus(order.orderNumber, "CONFIRMED", "demo-admin");
  let inventory = await db.inventory.findUniqueOrThrow({ where: { id: line.id } });
  assert.equal(inventory.reservedQuantity, line.reservedQuantity + 1);
  await updateDatabaseOrderStatus(order.orderNumber, "PREPARING", "demo-admin");
  await updateDatabaseOrderStatus(order.orderNumber, "DELIVERED", "demo-admin");
  inventory = await db.inventory.findUniqueOrThrow({ where: { id: line.id } });
  assert.equal(inventory.quantity, before - 1);
  assert.equal(inventory.reservedQuantity, line.reservedQuantity);
});

test("confirmed order cancellation releases reservation", async () => {
  const line = await stockedLine();
  const before = await db.inventory.findUniqueOrThrow({ where: { id: line.id } });
  const order = await createDatabaseOrder(checkout(line.productId, "cancel"));
  await assignDatabaseBranch(order.orderNumber, line.branchId);
  await updateDatabaseOrderStatus(order.orderNumber, "CONFIRMED", "demo-admin");
  await updateDatabaseOrderStatus(order.orderNumber, "CANCELLED", "demo-admin");
  const afterCancel = await db.inventory.findUniqueOrThrow({ where: { id: line.id } });
  assert.equal(afterCancel.quantity, before.quantity);
  assert.equal(afterCancel.reservedQuantity, before.reservedQuantity);
});

test("warehouse transfer supports partial receiving and discrepancy audit", async () => {
  const source = await stockedLine(4);
  const destination = await db.inventory.findFirstOrThrow({
    where: {
      productId: source.productId,
      variantId: source.variantId,
      branchId: { not: source.branchId },
    },
  });
  const beforeSource = source.quantity;
  const beforeDestination = destination.quantity;
  const transfer = await createDatabaseTransfer(
    {
      fromBranchId: source.branchId,
      toBranchId: destination.branchId,
      items: [{ productId: source.productId, variantId: source.variantId, quantity: 2 }],
      note: "E2E transfer",
    },
    "demo-admin",
  );
  await transitionDatabaseTransfer(transfer.id, "REQUESTED", "demo-admin");
  await transitionDatabaseTransfer(transfer.id, "APPROVED", "demo-admin");
  await transitionDatabaseTransfer(transfer.id, "IN_TRANSIT", "demo-admin");
  await transitionDatabaseTransfer(transfer.id, "RECEIVED", "demo-admin", {
    [source.productId]: 1,
  });
  const [afterSource, afterDestination, movements, notification] = await Promise.all([
    db.inventory.findUniqueOrThrow({ where: { id: source.id } }),
    db.inventory.findUniqueOrThrow({ where: { id: destination.id } }),
    db.inventoryMovement.count({ where: { referenceId: transfer.id } }),
    db.adminNotification.findFirst({ where: { type: "TRANSFER_DISCREPANCY" } }),
  ]);
  assert.equal(afterSource.quantity, beforeSource - 2);
  assert.equal(afterDestination.quantity, beforeDestination + 1);
  assert.equal(movements, 2);
  assert.ok(notification);
});

test("CMS schedule and RBAC branch matrix are enforced by shared rules", async () => {
  const now = new Date();
  const active = await db.heroSlide.create({
    data: {
      desktopImage: "/campaigns/bantik-hero-v1.png",
      mobileImage: "/campaigns/bantik-hero-mobile-v1.png",
      title: "E2E scheduled hero",
      active: true,
      startAt: new Date(now.getTime() - 60_000),
      endAt: new Date(now.getTime() + 60_000),
      sortOrder: 99,
    },
  });
  assert.equal(isScheduledActive(active, now), true);
  assert.equal(canAccessBranch("SUPER_ADMIN", undefined, "branch-b"), true);
  assert.equal(canAccessBranch("ADMIN", undefined, "branch-b"), true);
  assert.equal(canAccessBranch("WAREHOUSE_MANAGER", undefined, "branch-b"), true);
  assert.equal(canAccessBranch("BRANCH_MANAGER", "branch-a", "branch-b"), false);
  assert.equal(canAccessBranch("SALES_STAFF", "branch-a", "branch-a"), true);
});
