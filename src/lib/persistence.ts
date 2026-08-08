import { db } from "./db";
import { checkoutSchema, OrderStatus } from "./orders";
import type { Order } from "./orders";
import { multiplyMoney, sumMoney } from "./money";
export const databaseReady = Boolean(db);
const numberValue = (value: unknown) => Number(value);
export async function createDatabaseOrder(raw: unknown) {
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const input = checkoutSchema.parse(raw),
    existing = await db.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { items: true, history: true, notes: true },
    });
  if (existing) return serializeOrder(existing);
  return db.$transaction(
    async (tx) => {
      const year = new Date().getFullYear(),
        sequence = await tx.orderSequence.upsert({
          where: { year },
          create: { year, value: 1 },
          update: { value: { increment: 1 } },
        }),
        ids = input.items.map((x) => x.productId),
        catalog = await tx.product.findMany({
          where: { id: { in: ids }, active: true },
          include: { variants: true, inventory: true },
        });
      const lines = input.items.map((line) => {
          const product = catalog.find((x) => x.id === line.productId);
          if (!product) throw new Error("Məhsul tapılmadı");
          const available = product.inventory.reduce(
            (sum, row) => sum + row.quantity - row.reservedQuantity,
            0,
          );
          if (available < line.quantity)
            throw new Error(`${product.name} üçün kifayət qədər stok yoxdur`);
          const price = numberValue(product.price);
          return {
            productId: product.id,
            variantId: product.variants[0]?.id,
            productName: product.name,
            sku: product.sku,
            variantName: line.variant || product.variants[0]?.name,
            price,
            quantity: line.quantity,
            total: multiplyMoney(price, line.quantity),
          };
        }),
        subtotal = sumMoney(lines.map((line) => line.total)),
        orderNumber = `BNT-${year}-${String(sequence.value).padStart(6, "0")}`,
        phone = input.phone.replace(/\s/g, ""),
        customer = await tx.customer.upsert({
          where: { phone },
          update: {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email || undefined,
          },
          create: {
            firstName: input.firstName,
            lastName: input.lastName,
            phone,
            email: input.email || undefined,
          },
        });
      const order = await tx.order.create({
        data: {
          orderNumber,
          idempotencyKey: input.idempotencyKey,
          customerId: customer.id,
          customerName: `${input.firstName} ${input.lastName}`,
          phone,
          email: input.email || undefined,
          city: input.city,
          address: input.address,
          deliveryNote: input.deliveryNote,
          subtotal,
          discountTotal: 0,
          total: subtotal,
          status: "NEW",
          source: "WEBSITE",
          items: { create: lines },
          history: { create: { newStatus: "NEW", changedBy: "SYSTEM" } },
        },
        include: { items: true, history: true, notes: true },
      });
      await tx.adminNotification.create({
        data: {
          type: "NEW_ORDER",
          title: "Yeni sifariş",
          message: `${orderNumber} · ${order.customerName} · ${subtotal.toFixed(2)} ₼`,
          link: `/admin/orders/${orderNumber}`,
        },
      });
      return serializeOrder(order);
    },
    { isolationLevel: "Serializable" },
  );
}
export async function listDatabaseOrders(assignedBranchId?: string) {
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return (
    await db.order.findMany({
      where: assignedBranchId ? { assignedBranchId } : undefined,
      orderBy: { createdAt: "desc" },
      include: { items: true, history: true, notes: true },
    })
  ).map(serializeOrder);
}

export async function listDatabaseOrdersPage(options: {
  assignedBranchId?: string;
  page: number;
  pageSize: number;
  query?: string;
  status?: OrderStatus;
}) {
  const query = options.query?.trim().slice(0, 64);
  const where = {
    assignedBranchId: options.assignedBranchId,
    status: options.status,
    OR: query
      ? [
          { orderNumber: { contains: query, mode: "insensitive" as const } },
          { customerName: { contains: query, mode: "insensitive" as const } },
          { phone: { contains: query } },
        ]
      : undefined,
  };
  const [rows, total] = await db.$transaction([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
      include: { items: true, history: true, notes: true },
    }),
    db.order.count({ where }),
  ]);
  return { items: rows.map(serializeOrder), total };
}
export async function getDatabaseOrder(orderNumber: string) {
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { items: true, history: true, notes: true },
  });
  return order ? serializeOrder(order) : undefined;
}
export async function trackDatabaseOrder(orderNumber: string, phone: string) {
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const order = await db.order.findFirst({
    where: {
      orderNumber: { equals: orderNumber, mode: "insensitive" },
      phone: phone.replace(/\s/g, ""),
    },
    include: { items: true, history: true },
  });
  return order ? serializeOrder({ ...order, notes: [] }) : undefined;
}
export async function assignDatabaseBranch(
  orderNumber: string,
  assignedBranchId: string,
) {
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return serializeOrder(
    await db.order.update({
      where: { orderNumber },
      data: { assignedBranchId },
      include: { items: true, history: true, notes: true },
    }),
  );
}
export async function addDatabaseOrderNote(
  orderNumber: string,
  note: string,
  authorId?: string,
) {
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const order = await db.order.findUniqueOrThrow({ where: { orderNumber } });
  await db.orderNote.create({ data: { orderId: order.id, note, authorId } });
  return getDatabaseOrder(orderNumber);
}
export async function updateDatabaseOrderStatus(
  orderNumber: string,
  status: OrderStatus,
  changedBy: string,
  note?: string,
) {
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return db.$transaction(
    async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
          where: { orderNumber },
          include: { items: true },
        }),
        action =
          status === "CONFIRMED"
            ? "RESERVE"
            : status === "CANCELLED"
              ? "RELEASE"
              : status === "DELIVERED"
                ? "FULFILL"
                : undefined;
      if (action) {
        if (!order.assignedBranchId)
          throw new Error("Sifariş filiala təyin edilməyib");
        const done = await tx.inventoryOrderAction.findUnique({
          where: { orderId_action: { orderId: order.id, action } },
        });
        if (!done) {
          for (const line of order.items) {
            const inventory = await tx.inventory.findFirst({
              where: {
                branchId: order.assignedBranchId,
                productId: line.productId || undefined,
                variantId: line.variantId || undefined,
              },
            });
            if (!inventory)
              throw new Error(
                `${line.productName} üçün filial stoku tapılmadı`,
              );
            const available = inventory.quantity - inventory.reservedQuantity;
            if (action === "RESERVE" && available < line.quantity)
              throw new Error(
                `${line.productName} üçün ${line.quantity} ədəd tələb olunur, filialda yalnız ${available} ədəd mövcuddur.`,
              );
            if (
              action === "FULFILL" &&
              (inventory.quantity < line.quantity ||
                inventory.reservedQuantity < line.quantity)
            )
              throw new Error(
                `${line.productName} üçün kifayət qədər rezerv stok yoxdur`,
              );
            const before = inventory.quantity;
            if (action === "RESERVE")
              await tx.inventory.update({
                where: { id: inventory.id },
                data: { reservedQuantity: { increment: line.quantity } },
              });
            if (action === "RELEASE")
              await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                  reservedQuantity: {
                    decrement: Math.min(
                      inventory.reservedQuantity,
                      line.quantity,
                    ),
                  },
                },
              });
            if (action === "FULFILL")
              await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                  quantity: { decrement: line.quantity },
                  reservedQuantity: { decrement: line.quantity },
                },
              });
            await tx.inventoryMovement.create({
              data: {
                branchId: order.assignedBranchId,
                productId: line.productId!,
                variantId: line.variantId,
                type:
                  action === "RESERVE"
                    ? "ORDER_RESERVATION"
                    : action === "RELEASE"
                      ? "ORDER_RELEASE"
                      : "ORDER_FULFILLMENT",
                quantity: action === "FULFILL" ? -line.quantity : 0,
                quantityBefore: before,
                quantityAfter:
                  action === "FULFILL" ? before - line.quantity : before,
                referenceType: "ORDER",
                referenceId: order.id,
                createdById: changedBy === "demo-admin" ? undefined : changedBy,
                note,
              },
            });
          }
          await tx.inventoryOrderAction.create({
            data: { orderId: order.id, action },
          });
        }
      }
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: status,
          changedBy,
          note,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: changedBy === "demo-admin" ? undefined : changedBy,
          action: "ORDER_STATUS_CHANGED",
          entityType: "Order",
          entityId: order.id,
          before: { status: order.status },
          after: { status },
          metadata: { orderNumber },
        },
      });
      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status },
        include: { items: true, history: true, notes: true },
      });
      return serializeOrder(updated);
    },
    { isolationLevel: "Serializable" },
  );
}
export async function databaseInventorySnapshot(branchId?: string) {
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const inventory = await db.inventory.findMany({
      where: branchId ? { branchId } : undefined,
      include: {
        product: {
          include: {
            brand: true,
            category: true,
            images: { orderBy: { position: "asc" }, take: 1 },
          },
        },
        branch: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    movements = await db.inventoryMovement.findMany({
      where: branchId ? { branchId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    branches = await db.branch.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    }),
    rows = inventory.map((x) => ({
      ...x,
      availableQuantity: x.quantity - x.reservedQuantity,
      status:
        x.quantity - x.reservedQuantity <= 0
          ? "OUT_OF_STOCK"
          : x.quantity - x.reservedQuantity <= x.minimumStock
            ? "LOW_STOCK"
            : "IN_STOCK",
      product: {
        name: x.product.name,
        sku: x.product.sku,
        barcode: x.product.barcode || "",
        brand: x.product.brand.name,
        category: x.product.category.name,
        image: x.product.images[0]?.url || "/products/lip-oil-v1.png",
      },
    }));
  return {
    summary: {
      products: new Set(rows.map((x) => x.productId)).size,
      total: rows.reduce((s, x) => s + x.quantity, 0),
      reserved: rows.reduce((s, x) => s + x.reservedQuantity, 0),
      available: rows.reduce((s, x) => s + x.availableQuantity, 0),
      low: rows.filter((x) => x.status === "LOW_STOCK").length,
      out: rows.filter((x) => x.status === "OUT_OF_STOCK").length,
      inTransit: await db.stockTransferItem
        .aggregate({
          _sum: { shippedQuantity: true, receivedQuantity: true },
          where: { transfer: { status: "IN_TRANSIT" } },
        })
        .then(
          (x) => (x._sum.shippedQuantity || 0) - (x._sum.receivedQuantity || 0),
        ),
    },
    inventory: rows,
    branches: branches.map((x) => ({
      id: x.id,
      name: x.name,
      slug: x.slug,
      code: x.code,
      type: x.type,
      address: x.address,
      phone: x.phone || undefined,
      active: x.isActive,
    })),
    movements,
  };
}
export async function databaseInventoryMutation(
  body: Record<string, unknown>,
  userId: string,
) {
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return db.$transaction(
    async (tx) => {
      if (body.action === "MINIMUM" || body.action === "BULK_MINIMUM") {
        const minimumStock = Number(body.minimumStock);
        if (!Number.isInteger(minimumStock) || minimumStock < 0)
          throw new Error("Minimum stok yanlışdır");
        const result =
          body.action === "MINIMUM"
            ? await tx.inventory.update({
                where: { id: String(body.inventoryId) },
                data: { minimumStock },
              })
            : await tx.inventory.updateMany({
                where: body.branchId
                  ? { branchId: String(body.branchId) }
                  : undefined,
                data: { minimumStock },
              });
        await tx.auditLog.create({
          data: {
            action: String(body.action),
            entityType: "Inventory",
            entityId: String(body.inventoryId || body.branchId || "ALL"),
            after: { minimumStock },
            userId: userId === "demo-admin" ? undefined : userId,
          },
        });
        return result;
      }
      const item = await tx.inventory.findFirstOrThrow({
          where: {
            branchId: String(body.branchId),
            productId: String(body.productId),
          },
        }),
        before = item.quantity;
      let after = before,
        type: "STOCK_IN" | "ADJUSTMENT" | "DAMAGED",
        delta = 0;
      if (body.action === "RECEIVE") {
        delta = Number(body.quantity);
        if (!Number.isInteger(delta) || delta <= 0)
          throw new Error("Miqdar müsbət olmalıdır");
        after = before + delta;
        type = "STOCK_IN";
      } else if (body.action === "ADJUST") {
        after = Number(body.physicalQuantity);
        if (!String(body.reason || "").trim())
          throw new Error("Səbəb məcburidir");
        if (!Number.isInteger(after) || after < item.reservedQuantity)
          throw new Error("Fiziki stok rezervdən az və ya mənfi ola bilməz");
        delta = after - before;
        type = "ADJUSTMENT";
      } else if (body.action === "DAMAGE") {
        const amount = Number(body.quantity);
        if (!String(body.note || "").trim())
          throw new Error("Zədə qeydi məcburidir");
        if (
          !Number.isInteger(amount) ||
          amount <= 0 ||
          item.quantity - item.reservedQuantity < amount
        )
          throw new Error("Kifayət qədər available stok yoxdur");
        after = before - amount;
        delta = -amount;
        type = "DAMAGED";
      } else throw new Error("Əməliyyat tanınmadı");
      const updated = await tx.inventory.update({
        where: { id: item.id },
        data: { quantity: after },
      });
      await tx.inventoryMovement.create({
        data: {
          branchId: item.branchId,
          productId: item.productId,
          variantId: item.variantId,
          type,
          quantity: delta,
          quantityBefore: before,
          quantityAfter: after,
          referenceType: String(body.action),
          referenceId: body.referenceId ? String(body.referenceId) : undefined,
          note: String(body.note || body.reason || ""),
          createdById: userId === "demo-admin" ? undefined : userId,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: userId === "demo-admin" ? undefined : userId,
          action: type,
          entityType: "Inventory",
          entityId: item.id,
          before: { quantity: before },
          after: { quantity: after },
          metadata: body as object,
        },
      });
      const available = updated.quantity - updated.reservedQuantity;
      if (available <= updated.minimumStock) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { name: true },
        });
        await tx.adminNotification.create({
          data: {
            type: available <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
            title: available <= 0 ? "Stok bitdi" : "Kritik stok",
            message: `${product?.name || item.productId}: ${available} available`,
            link: `/admin/inventory?status=${available <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK"}`,
          },
        });
      }
      return updated;
    },
    { isolationLevel: "Serializable" },
  );
}
export async function listDatabaseTransfers(
  options: { page?: number; pageSize?: number } = {},
) {
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(10, options.pageSize || 50));
  const [transfers, total, branches] = await Promise.all([
    db.stockTransfer.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.stockTransfer.count(),
    db.branch.findMany({ orderBy: { code: "asc" } }),
  ]);
  return {
    transfers: transfers.map((x) => ({
      ...x,
      createdAt: x.createdAt.toISOString(),
      shippedAt: x.shippedAt?.toISOString(),
      receivedAt: x.receivedAt?.toISOString(),
    })),
    branches: branches.map((x) => ({
      id: x.id,
      name: x.name,
      slug: x.slug,
      code: x.code,
      type: x.type,
      address: x.address,
      phone: x.phone || undefined,
      active: x.isActive,
    })),
    pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
  };
}
export async function createDatabaseTransfer(
  body: Record<string, unknown>,
  userId: string,
) {
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return db.$transaction(
    async (tx) => {
      const items = body.items as {
        productId: string;
        variantId?: string;
        quantity: number;
      }[];
      if (
        String(body.fromBranchId) === String(body.toBranchId) ||
        !items?.length
      )
        throw new Error("Transfer məlumatları yanlışdır");
      const year = new Date().getFullYear(),
        sequence = await tx.transferSequence.upsert({
          where: { year },
          create: { year, value: 1 },
          update: { value: { increment: 1 } },
        }),
        transfer = await tx.stockTransfer.create({
          data: {
            transferNumber: `TRF-${year}-${String(sequence.value).padStart(6, "0")}`,
            fromBranchId: String(body.fromBranchId),
            toBranchId: String(body.toBranchId),
            createdById: userId === "demo-admin" ? undefined : userId,
            note: String(body.note || ""),
            items: {
              create: items.map((x) => ({
                productId: x.productId,
                variantId: x.variantId,
                requestedQuantity: Number(x.quantity),
              })),
            },
          },
          include: { items: true },
        });
      await tx.auditLog.create({
        data: {
          action: "TRANSFER_CREATED",
          entityType: "StockTransfer",
          entityId: transfer.id,
          after: { transferNumber: transfer.transferNumber },
          userId: userId === "demo-admin" ? undefined : userId,
        },
      });
      await tx.adminNotification.create({
        data: {
          type: "TRANSFER_REQUEST",
          title: "Yeni transfer",
          message: `${transfer.transferNumber} yaradıldı`,
          link: "/admin/transfers",
        },
      });
      return transfer;
    },
    { isolationLevel: "Serializable" },
  );
}
export async function transitionDatabaseTransfer(
  id: string,
  status: "REQUESTED" | "APPROVED" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED",
  userId: string,
  received?: Record<string, number>,
) {
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return db.$transaction(
    async (tx) => {
      const transfer = await tx.stockTransfer.findUniqueOrThrow({
          where: { id },
          include: { items: true },
        }),
        allowed: Record<string, string[]> = {
          DRAFT: ["REQUESTED", "CANCELLED"],
          REQUESTED: ["APPROVED", "CANCELLED"],
          APPROVED: ["IN_TRANSIT", "CANCELLED"],
          IN_TRANSIT: ["RECEIVED"],
        };
      if (!allowed[transfer.status]?.includes(status))
        throw new Error("Bu transfer keçidi mümkün deyil");
      if (status === "APPROVED") {
        for (const line of transfer.items) {
          const item = await tx.inventory.findFirstOrThrow({
            where: {
              branchId: transfer.fromBranchId,
              productId: line.productId,
              variantId: line.variantId,
            },
          });
          if (item.quantity - item.reservedQuantity < line.requestedQuantity)
            throw new Error("Mənbə filialında kifayət qədər stok yoxdur");
        }
        for (const line of transfer.items) {
          const item = await tx.inventory.findFirstOrThrow({
            where: {
              branchId: transfer.fromBranchId,
              productId: line.productId,
              variantId: line.variantId,
            },
          });
          await tx.inventory.update({
            where: { id: item.id },
            data: { reservedQuantity: { increment: line.requestedQuantity } },
          });
        }
      }
      if (status === "CANCELLED" && transfer.status === "APPROVED")
        for (const line of transfer.items) {
          const item = await tx.inventory.findFirstOrThrow({
            where: {
              branchId: transfer.fromBranchId,
              productId: line.productId,
              variantId: line.variantId,
            },
          });
          await tx.inventory.update({
            where: { id: item.id },
            data: {
              reservedQuantity: {
                decrement: Math.min(
                  item.reservedQuantity,
                  line.requestedQuantity,
                ),
              },
            },
          });
        }
      if (status === "IN_TRANSIT")
        for (const line of transfer.items) {
          const item = await tx.inventory.findFirstOrThrow({
              where: {
                branchId: transfer.fromBranchId,
                productId: line.productId,
                variantId: line.variantId,
              },
            }),
            before = item.quantity;
          if (item.reservedQuantity < line.requestedQuantity)
            throw new Error("Transfer üçün rezerv stok tapılmadı");
          await tx.inventory.update({
            where: { id: item.id },
            data: {
              quantity: { decrement: line.requestedQuantity },
              reservedQuantity: { decrement: line.requestedQuantity },
            },
          });
          await tx.stockTransferItem.update({
            where: { id: line.id },
            data: { shippedQuantity: line.requestedQuantity },
          });
          await tx.inventoryMovement.create({
            data: {
              branchId: item.branchId,
              productId: item.productId,
              variantId: item.variantId,
              type: "TRANSFER_OUT",
              quantity: -line.requestedQuantity,
              quantityBefore: before,
              quantityAfter: before - line.requestedQuantity,
              referenceType: "TRANSFER",
              referenceId: id,
            },
          });
        }
      if (status === "RECEIVED")
        for (const line of transfer.items) {
          const amount = received?.[line.productId] ?? line.shippedQuantity;
          if (amount < 0 || amount > line.shippedQuantity)
            throw new Error("Qəbul miqdarı yanlışdır");
          const item = await tx.inventory.findFirstOrThrow({
              where: {
                branchId: transfer.toBranchId,
                productId: line.productId,
                variantId: line.variantId,
              },
            }),
            before = item.quantity;
          await tx.inventory.update({
            where: { id: item.id },
            data: { quantity: { increment: amount } },
          });
          await tx.stockTransferItem.update({
            where: { id: line.id },
            data: { receivedQuantity: amount },
          });
          await tx.inventoryMovement.create({
            data: {
              branchId: item.branchId,
              productId: item.productId,
              variantId: item.variantId,
              type: "TRANSFER_IN",
              quantity: amount,
              quantityBefore: before,
              quantityAfter: before + amount,
              referenceType: "TRANSFER",
              referenceId: id,
              note:
                amount < line.shippedQuantity
                  ? `Fərq: ${line.shippedQuantity - amount}`
                  : undefined,
            },
          });
        }
      const updated = await tx.stockTransfer.update({
        where: { id },
        data: {
          status,
          approvedById:
            status === "APPROVED" && userId !== "demo-admin"
              ? userId
              : undefined,
          receivedById:
            status === "RECEIVED" && userId !== "demo-admin"
              ? userId
              : undefined,
          shippedAt: status === "IN_TRANSIT" ? new Date() : undefined,
          receivedAt: status === "RECEIVED" ? new Date() : undefined,
        },
        include: { items: true },
      });
      await tx.auditLog.create({
        data: {
          action: "TRANSFER_STATUS_CHANGED",
          entityType: "StockTransfer",
          entityId: id,
          before: { status: transfer.status },
          after: { status },
          userId: userId === "demo-admin" ? undefined : userId,
        },
      });
      if (status === "REQUESTED" || status === "RECEIVED") {
        const discrepancy =
          status === "RECEIVED" &&
          updated.items.some(
            (item) => item.receivedQuantity !== item.shippedQuantity,
          );
        await tx.adminNotification.create({
          data: {
            type: discrepancy
              ? "TRANSFER_DISCREPANCY"
              : status === "RECEIVED"
                ? "TRANSFER_RECEIVED"
                : "TRANSFER_REQUEST",
            title: discrepancy
              ? "Transfer fərqi"
              : status === "RECEIVED"
                ? "Transfer qəbul edildi"
                : "Transfer sorğusu",
            message: `${updated.transferNumber}: ${status}`,
            link: "/admin/transfers",
          },
        });
      }
      return updated;
    },
    { isolationLevel: "Serializable" },
  );
}
export async function listDatabaseBranches() {
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return (await db.branch.findMany({ orderBy: { code: "asc" } })).map((x) => ({
    id: x.id,
    name: x.name,
    slug: x.slug,
    code: x.code,
    type: x.type,
    address: x.address,
    phone: x.phone || undefined,
    active: x.isActive,
  }));
}
export async function createDatabaseBranch(
  body: Record<string, unknown>,
  userId: string,
) {
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return db.$transaction(async (tx) => {
    const branch = await tx.branch.create({
      data: {
        name: String(body.name),
        slug: String(body.name)
          .toLocaleLowerCase("az")
          .replace(/[^a-z0-9əöüğışç]+/g, "-")
          .replace(/^-|-$/g, ""),
        code: String(body.code),
        type: body.type === "WAREHOUSE" ? "WAREHOUSE" : "STORE",
        address: String(body.address),
        phone: String(body.phone || ""),
      },
    });
    await tx.auditLog.create({
      data: {
        action: "BRANCH_CREATED",
        entityType: "Branch",
        entityId: branch.id,
        after: { name: branch.name, code: branch.code },
        userId: userId === "demo-admin" ? undefined : userId,
      },
    });
    return branch;
  });
}
export async function updateDatabaseBranch(
  body: Record<string, unknown>,
  userId: string,
) {
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return db.$transaction(async (tx) => {
    const before = await tx.branch.findUniqueOrThrow({
        where: { id: String(body.id) },
      }),
      branch = await tx.branch.update({
        where: { id: before.id },
        data: {
          name: body.name ? String(body.name) : undefined,
          address: body.address ? String(body.address) : undefined,
          isActive: typeof body.active === "boolean" ? body.active : undefined,
        },
      });
    await tx.auditLog.create({
      data: {
        action: "BRANCH_UPDATED",
        entityType: "Branch",
        entityId: branch.id,
        before: {
          name: before.name,
          address: before.address,
          isActive: before.isActive,
        },
        after: {
          name: branch.name,
          address: branch.address,
          isActive: branch.isActive,
        },
        userId: userId === "demo-admin" ? undefined : userId,
      },
    });
    return branch;
  });
}
// Prisma Decimal and Date values are normalized for client components and API DTOs.
type SerializableOrder = Record<string, unknown> & {
  subtotal: unknown;
  discountTotal: unknown;
  total: unknown;
  createdAt: string | Date;
  updatedAt: string | Date;
  items?: Array<Record<string, unknown> & { price: unknown; total: unknown }>;
  history?: Array<Record<string, unknown> & { createdAt: string | Date }>;
  notes?: Array<Record<string, unknown> & { createdAt: string | Date }>;
};
function serializeOrder(order: SerializableOrder): Order {
  return {
    ...order,
    subtotal: numberValue(order.subtotal),
    discountTotal: numberValue(order.discountTotal),
    total: numberValue(order.total),
    createdAt: new Date(order.createdAt).toISOString(),
    updatedAt: new Date(order.updatedAt).toISOString(),
    items: (order.items || []).map((x) => ({
      ...x,
      price: numberValue(x.price),
      total: numberValue(x.total),
    })),
    history: (order.history || []).map((x) => ({
      ...x,
      createdAt: new Date(x.createdAt).toISOString(),
    })),
    notes: (order.notes || []).map((x) => ({
      ...x,
      createdAt: new Date(x.createdAt).toISOString(),
    })),
  } as unknown as Order;
}
