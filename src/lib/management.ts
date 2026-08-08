import { db } from "./db";
import type { Staff } from "./rbac";
export const rangeKeys = [
  "today",
  "yesterday",
  "7d",
  "30d",
  "this-month",
  "last-month",
  "custom",
] as const;
export type RangeKey = (typeof rangeKeys)[number];
export function resolveDateRange(
  key: string | undefined,
  from?: string | null,
  to?: string | null,
  now = new Date(),
) {
  const endOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
    startOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate());
  let start = startOfDay(now),
    end = endOfDay(now),
    label = "Bu gün";
  if (key === "yesterday") {
    start = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() - 1,
    );
    end = startOfDay(now);
    label = "Dünən";
  } else if (key === "7d") {
    start = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() - 6,
    );
    label = "Son 7 gün";
  } else if (key === "30d") {
    start = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() - 29,
    );
    label = "Son 30 gün";
  } else if (key === "this-month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    label = "Bu ay";
  } else if (key === "last-month") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 1);
    label = "Keçən ay";
  } else if (key === "custom" && from && to) {
    start = startOfDay(new Date(`${from}T00:00:00`));
    end = endOfDay(new Date(`${to}T00:00:00`));
    label = `${from} — ${to}`;
  }
  return {
    key: rangeKeys.includes(key as RangeKey) ? (key as RangeKey) : "today",
    start,
    end,
    label,
  };
}
export function aggregateOrderSummary(
  orders: { status: string; total: number }[],
) {
  const total = orders.reduce((s, x) => s + x.total, 0),
    delivered = orders.filter((x) => x.status === "DELIVERED"),
    cancelled = orders.filter((x) => x.status === "CANCELLED");
  return {
    totalOrders: orders.length,
    delivered: delivered.length,
    cancelled: cancelled.length,
    totalValue: total,
    deliveredValue: delivered.reduce((s, x) => s + x.total, 0),
    averageOrderValue: orders.length ? total / orders.length : 0,
    cancellationRate: orders.length
      ? (cancelled.length / orders.length) * 100
      : 0,
  };
}
export function isScheduledActive(
  item: { active: boolean; startAt?: Date | null; endAt?: Date | null },
  now = new Date(),
) {
  return (
    item.active &&
    (!item.startAt || item.startAt <= now) &&
    (!item.endAt || item.endAt >= now)
  );
}

export function aggregateBranchReport(
  orders: { status: string; total: number }[],
  inventory: { quantity: number; reservedQuantity: number; minimumStock: number }[],
) {
  const summary = aggregateOrderSummary(orders);
  return {
    ...summary,
    confirmed: orders.filter((order) => order.status === "CONFIRMED").length,
    inventoryUnits: inventory.reduce((sum, item) => sum + item.quantity, 0),
    lowStock: inventory.filter((item) => {
      const available = item.quantity - item.reservedQuantity;
      return available > 0 && available <= item.minimumStock;
    }).length,
    outOfStock: inventory.filter(
      (item) => item.quantity - item.reservedQuantity <= 0,
    ).length,
  };
}

export function aggregateProductLines(
  lines: { key: string; quantity: number; total: number; delivered: boolean }[],
) {
  const map = new Map<
    string,
    { quantity: number; value: number; deliveredQuantity: number; deliveredValue: number }
  >();
  for (const line of lines) {
    const row = map.get(line.key) || {
      quantity: 0,
      value: 0,
      deliveredQuantity: 0,
      deliveredValue: 0,
    };
    row.quantity += line.quantity;
    row.value += line.total;
    if (line.delivered) {
      row.deliveredQuantity += line.quantity;
      row.deliveredValue += line.total;
    }
    map.set(line.key, row);
  }
  return map;
}

const roleRank: Record<string, number> = {
  SALES_STAFF: 1,
  BRANCH_MANAGER: 2,
  WAREHOUSE_MANAGER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

export function canAssignRole(actor: string, target: string) {
  return actor === "SUPER_ADMIN" && (roleRank[target] || 0) <= roleRank[actor];
}

export function canExportReports(role: string) {
  return role in roleRank;
}

export function canViewAudit(role: string) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canViewCustomerPrivateData(role: string) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function countUnread(items: { readAt?: Date | string | null }[]) {
  return items.filter((item) => !item.readAt).length;
}

export function groupSearchResults<T extends { group: string }>(items: T[]) {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    (groups[item.group] ||= []).push(item);
    return groups;
  }, {});
}
const money = (value: unknown) => Number(value);
export async function getDashboard(params: URLSearchParams, staff: Staff) {
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const range = resolveDateRange(
      params.get("range") || undefined,
      params.get("from"),
      params.get("to"),
    ),
    branchOnly =
      staff.role === "BRANCH_MANAGER" || staff.role === "SALES_STAFF"
        ? staff.branchId
        : params.get("branch") || undefined,
    orders = await db.order.findMany({
      where: {
        createdAt: { gte: range.start, lt: range.end },
        assignedBranchId: branchOnly,
      },
      include: {
        assignedBranch: true,
        items: { include: { product: { include: { brand: true } } } },
      },
    }),
    inventory = await db.inventory.findMany({
      where: { branchId: branchOnly },
    }),
    products = await db.product.findMany({
      select: { active: true, isNew: true, bestseller: true },
    }),
    [brandCount, categoryCount, branches, transfers] = await Promise.all([
      db.brand.count({ where: { isActive: true } }),
      db.category.count({ where: { isActive: true } }),
      db.branch.findMany({ where: { isActive: true } }),
      db.stockTransfer.findMany({
        where: { status: { in: ["REQUESTED", "IN_TRANSIT"] } },
        include: { items: true },
      }),
    ]),
    serialized = orders.map((x) => ({ ...x, total: money(x.total) })),
    summary = aggregateOrderSummary(serialized),
    byStatus = Object.entries(
      serialized.reduce<Record<string, number>>((a, x) => {
        a[x.status] = (a[x.status] || 0) + 1;
        return a;
      }, {}),
    ).map(([label, value]) => ({ label, value })),
    byBranch = branches.map((branch) => {
      const rows = serialized.filter((x) => x.assignedBranchId === branch.id);
      return {
        label: branch.name,
        value: rows.length,
        deliveredValue: rows
          .filter((x) => x.status === "DELIVERED")
          .reduce((s, x) => s + x.total, 0),
      };
    }),
    daily = Object.values(
      serialized.reduce<
        Record<string, { label: string; orders: number; value: number }>
      >((a, x) => {
        const key = x.createdAt.toISOString().slice(0, 10);
        a[key] ??= { label: key, orders: 0, value: 0 };
        a[key].orders++;
        if (x.status === "DELIVERED") a[key].value += x.total;
        return a;
      }, {}),
    ).sort((a, b) => a.label.localeCompare(b.label)),
    productMap = new Map<string, { label: string; value: number }>(),
    brandMap = new Map<string, { label: string; value: number }>();
  for (const order of serialized)
    for (const item of order.items) {
      const product = item.product?.name || item.productName,
        brand = item.product?.brand.name || "Naməlum";
      productMap.set(product, {
        label: product,
        value: (productMap.get(product)?.value || 0) + item.quantity,
      });
      brandMap.set(brand, {
        label: brand,
        value: (brandMap.get(brand)?.value || 0) + item.quantity,
      });
    }
  const physical = inventory.reduce((s, x) => s + x.quantity, 0),
    reserved = inventory.reduce((s, x) => s + x.reservedQuantity, 0),
    low = inventory.filter(
      (x) =>
        x.quantity - x.reservedQuantity > 0 &&
        x.quantity - x.reservedQuantity <= x.minimumStock,
    ).length,
    out = inventory.filter((x) => x.quantity - x.reservedQuantity <= 0).length,
    newOrders = serialized.filter((x) => x.status === "NEW").length;
  return {
    range,
    orders: {
      ...summary,
      new: newOrders,
      confirmed: serialized.filter((x) => x.status === "CONFIRMED").length,
      preparing: serialized.filter((x) => x.status === "PREPARING").length,
    },
    inventory: {
      physical,
      reserved,
      available: physical - reserved,
      low,
      out,
      inTransit: transfers.reduce(
        (s, t) =>
          s +
          t.items.reduce(
            (a, i) => a + i.shippedQuantity - i.receivedQuantity,
            0,
          ),
        0,
      ),
    },
    products: {
      active: products.filter((x) => x.active).length,
      new: products.filter((x) => x.isNew).length,
      bestseller: products.filter((x) => x.bestseller).length,
      brands: brandCount,
      categories: categoryCount,
    },
    branches: byBranch,
    charts: {
      daily,
      status: byStatus,
      branches: byBranch,
      products: [...productMap.values()]
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
      brands: [...brandMap.values()]
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    },
    alerts: [
      {
        label: `${newOrders} yeni sifariş`,
        link: "/admin/orders",
        severity: "red",
      },
      {
        label: `${low} kritik stok`,
        link: "/admin/inventory?status=LOW_STOCK",
        severity: "amber",
      },
      {
        label: `${out} stokda olmayan`,
        link: "/admin/inventory?status=OUT_OF_STOCK",
        severity: "red",
      },
      {
        label: `${transfers.filter((x) => x.status === "REQUESTED").length} transfer sorğusu`,
        link: "/admin/transfers",
        severity: "blue",
      },
      {
        label: `${transfers.filter((x) => x.status === "IN_TRANSIT" && x.items.some((i) => i.receivedQuantity < i.shippedQuantity && i.receivedQuantity > 0)).length} transfer fərqi`,
        link: "/admin/transfers",
        severity: "amber",
      },
    ],
  };
}
export type ReportType =
  "orders" | "branches" | "products" | "brands" | "inventory";
export async function getReport(
  type: ReportType,
  params: URLSearchParams,
  staff: Staff,
) {
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const range = resolveDateRange(
      params.get("range") || "30d",
      params.get("from"),
      params.get("to"),
    ),
    branchOnly =
      staff.role === "BRANCH_MANAGER" || staff.role === "SALES_STAFF"
        ? staff.branchId
        : params.get("branch") || undefined;
  if (type === "orders") {
    const orders = await db.order.findMany({
        where: {
          createdAt: { gte: range.start, lt: range.end },
          assignedBranchId: branchOnly,
          status: (params.get("status") as never) || undefined,
          OR: params.get("q")
            ? [
                {
                  orderNumber: {
                    contains: params.get("q")!,
                    mode: "insensitive",
                  },
                },
                {
                  customerName: {
                    contains: params.get("q")!,
                    mode: "insensitive",
                  },
                },
                { phone: { contains: params.get("q")! } },
              ]
            : undefined,
        },
        include: { assignedBranch: true },
        orderBy: { createdAt: "desc" },
        take: 5_001,
      }),
      rows = orders.map((x) => ({
        Sifariş: x.orderNumber,
        Müştəri: x.customerName,
        Telefon: x.phone,
        Filial: x.assignedBranch?.name || "Təyin edilməyib",
        Status: x.status,
        Mənbə: x.source,
        Məbləğ: money(x.total),
        Tarix: x.createdAt.toISOString(),
      }));
    return {
      type,
      range,
      summary: aggregateOrderSummary(
        orders.map((x) => ({ status: x.status, total: money(x.total) })),
      ),
      rows,
    };
  }
  if (type === "branches") {
    const branches = await db.branch.findMany({
        where: { isActive: true },
        include: {
          assignedOrders: {
            where: { createdAt: { gte: range.start, lt: range.end } },
            take: 5_001,
          },
          inventory: true,
        },
      }),
      rows = branches
        .filter((x) => !branchOnly || x.id === branchOnly)
        .map((x) => {
          const orders = x.assignedOrders.map((o) => ({
              status: o.status,
              total: money(o.total),
            })),
            s = aggregateOrderSummary(orders);
          return {
            Filial: x.name,
            Sifariş: s.totalOrders,
            Təsdiqlənmiş: orders.filter((o) => o.status === "CONFIRMED").length,
            Çatdırılmış: s.delivered,
            Ləğv: s.cancelled,
            "Ümumi dəyər": s.totalValue,
            "Çatdırılmış dəyər": s.deliveredValue,
            "Orta sifariş": s.averageOrderValue,
            "Ləğv faizi": s.cancellationRate,
            Stok: x.inventory.reduce((a, i) => a + i.quantity, 0),
            Kritik: x.inventory.filter(
              (i) =>
                i.quantity - i.reservedQuantity > 0 &&
                i.quantity - i.reservedQuantity <= i.minimumStock,
            ).length,
            "Stokda yoxdur": x.inventory.filter(
              (i) => i.quantity - i.reservedQuantity <= 0,
            ).length,
          };
        });
    return { type, range, rows };
  }
  if (type === "products" || type === "brands") {
    const items = await db.orderItem.findMany({
        where: {
          order: {
            createdAt: { gte: range.start, lt: range.end },
            assignedBranchId: branchOnly,
          },
        },
        include: {
          order: true,
          product: {
            include: { brand: true, category: true, inventory: true },
          },
        },
        take: 5_001,
      }),
      map = new Map<string, Record<string, string | number>>();
    for (const item of items) {
      const key =
          type === "brands"
            ? item.product?.brand.name || "Naməlum"
            : item.product?.name || item.productName,
        old = map.get(key) || {
          [type === "brands" ? "Brend" : "Məhsul"]: key,
          "Sifariş miqdarı": 0,
          "Çatdırılmış miqdar": 0,
          "Sifariş dəyəri": 0,
          "Çatdırılmış dəyər": 0,
        };
      old["Sifariş miqdarı"] = Number(old["Sifariş miqdarı"]) + item.quantity;
      old["Sifariş dəyəri"] = Number(old["Sifariş dəyəri"]) + money(item.total);
      if (item.order.status === "DELIVERED") {
        old["Çatdırılmış miqdar"] =
          Number(old["Çatdırılmış miqdar"]) + item.quantity;
        old["Çatdırılmış dəyər"] =
          Number(old["Çatdırılmış dəyər"]) + money(item.total);
      }
      if (item.product) {
        old["Brend"] = item.product.brand.name;
        old["Kateqoriya"] = item.product.category.name;
        old["Fiziki stok"] = item.product.inventory.reduce(
          (s, x) => s + x.quantity,
          0,
        );
        old["Rezerv"] = item.product.inventory.reduce(
          (s, x) => s + x.reservedQuantity,
          0,
        );
        old["Available"] = Number(old["Fiziki stok"]) - Number(old["Rezerv"]);
      }
      map.set(key, old);
    }
    return {
      type,
      range,
      rows: [...map.values()].sort(
        (a, b) => Number(b["Sifariş miqdarı"]) - Number(a["Sifariş miqdarı"]),
      ),
    };
  }
  const inventory = await db.inventory.findMany({
      where: { branchId: branchOnly },
      include: { branch: true, product: true },
      take: 5_001,
    }),
    movements = await db.inventoryMovement.findMany({
      where: {
        branchId: branchOnly,
        createdAt: { gte: range.start, lt: range.end },
      },
      take: 5_001,
    }),
    rows = inventory.map((x) => ({
      Filial: x.branch.name,
      Məhsul: x.product.name,
      SKU: x.product.sku,
      Fiziki: x.quantity,
      Rezerv: x.reservedQuantity,
      Available: x.quantity - x.reservedQuantity,
      Minimum: x.minimumStock,
      Status:
        x.quantity - x.reservedQuantity <= 0
          ? "OUT OF STOCK"
          : x.quantity - x.reservedQuantity <= x.minimumStock
            ? "LOW STOCK"
            : "IN STOCK",
    }));
  return {
    type,
    range,
    summary: {
      physical: inventory.reduce((s, x) => s + x.quantity, 0),
      reserved: inventory.reduce((s, x) => s + x.reservedQuantity, 0),
      available: inventory.reduce(
        (s, x) => s + x.quantity - x.reservedQuantity,
        0,
      ),
      low: rows.filter((x) => x.Status === "LOW STOCK").length,
      out: rows.filter((x) => x.Status === "OUT OF STOCK").length,
      damaged: movements
        .filter((x) => x.type === "DAMAGED")
        .reduce((s, x) => s + Math.abs(x.quantity), 0),
      adjustments: movements.filter((x) => x.type === "ADJUSTMENT").length,
      received: movements
        .filter((x) => x.type === "STOCK_IN")
        .reduce((s, x) => s + x.quantity, 0),
      transferIn: movements
        .filter((x) => x.type === "TRANSFER_IN")
        .reduce((s, x) => s + x.quantity, 0),
      transferOut: movements
        .filter((x) => x.type === "TRANSFER_OUT")
        .reduce((s, x) => s + Math.abs(x.quantity), 0),
    },
    rows,
  };
}
