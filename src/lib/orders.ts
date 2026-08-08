import { z } from "zod";
import { multiplyMoney, sumMoney } from "./money";
import { products } from "./catalog";
import { fulfillOrder, releaseOrder, reserveOrder } from "./inventory";
export const orderStatuses = [
  "NEW",
  "CONTACTING_CUSTOMER",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export const statusLabels: Record<OrderStatus, string> = {
  NEW: "Yeni sifariş",
  CONTACTING_CUSTOMER: "Müştəri ilə əlaqə saxlanılır",
  CONFIRMED: "Təsdiqləndi",
  PREPARING: "Hazırlanır",
  READY: "Hazırdır",
  OUT_FOR_DELIVERY: "Çatdırılmaya verildi",
  DELIVERED: "Təhvil verildi",
  CANCELLED: "Ləğv edildi",
};
export const checkoutSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  phone: z
    .string()
    .regex(
      /^\+994\s?(10|50|51|55|60|70|77|99)\s?\d{3}\s?\d{2}\s?\d{2}$/,
      "Azərbaycan telefon formatından istifadə edin",
    ),
  email: z.union([z.email(), z.literal("")]).optional(),
  city: z.string().min(2),
  address: z.string().min(5),
  deliveryNote: z.string().max(500).optional(),
  idempotencyKey: z.string().min(8),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1).max(20),
        variant: z.string().optional(),
      }),
    )
    .min(1),
});
export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("994")) return `+${digits}`;
  if (digits.startsWith("0")) return `+994${digits.slice(1)}`;
  return digits.length === 9 ? `+994${digits}` : `+${digits}`;
}
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  email?: string;
  city: string;
  address: string;
  deliveryNote?: string;
  subtotal: number;
  discountTotal: number;
  total: number;
  status: OrderStatus;
  source: "WEBSITE";
  assignedBranchId?: string;
  createdAt: string;
  updatedAt: string;
  items: {
    productId: string;
    productName: string;
    sku: string;
    variantName?: string;
    price: number;
    quantity: number;
    total: number;
  }[];
  history: {
    previousStatus?: OrderStatus;
    newStatus: OrderStatus;
    changedBy: string;
    note?: string;
    createdAt: string;
  }[];
  notes: { note: string; createdAt: string }[];
};
type State = {
  orders: Order[];
  sequence: Record<number, number>;
  idempotency: Map<string, string>;
};
const globalOrders = globalThis as typeof globalThis & {
  __bantikOrders?: State;
};
const initialState: State = {
  orders: [],
  sequence: {},
  idempotency: new Map<string, string>(),
};
export const state: State = globalOrders.__bantikOrders ?? initialState;
globalOrders.__bantikOrders = state;
export function nextOrderNumber(date = new Date()) {
  const year = date.getFullYear(),
    next = (state.sequence[year] || 0) + 1;
  state.sequence[year] = next;
  return `BNT-${year}-${String(next).padStart(6, "0")}`;
}
export function calculateOrder(input: CheckoutInput) {
  const items = input.items.map((item) => {
    const p = products.find((x) => x.id === item.productId);
    if (!p || !p.active) throw new Error("Məhsul tapılmadı");
    if (p.stock === "Stokda yoxdur") throw new Error(`${p.name} stokda yoxdur`);
    return {
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      variantName: item.variant,
      price: p.price,
      quantity: item.quantity,
      total: multiplyMoney(p.price, item.quantity),
    };
  });
  const subtotal = sumMoney(items.map((item) => item.total));
  return { items, subtotal, discountTotal: 0, total: subtotal };
}
export function createOrder(raw: unknown) {
  const input = checkoutSchema.parse(raw),
    existingNo = state.idempotency.get(input.idempotencyKey);
  if (existingNo)
    return state.orders.find((x) => x.orderNumber === existingNo)!;
  const calculated = calculateOrder(input),
    now = new Date().toISOString();
  const order: Order = {
    id: crypto.randomUUID(),
    orderNumber: nextOrderNumber(),
    customerName: `${input.firstName} ${input.lastName}`,
    phone: normalizePhone(input.phone),
    email: input.email || undefined,
    city: input.city,
    address: input.address,
    deliveryNote: input.deliveryNote,
    ...calculated,
    status: "NEW",
    source: "WEBSITE",
    createdAt: now,
    updatedAt: now,
    history: [{ newStatus: "NEW", changedBy: "SYSTEM", createdAt: now }],
    notes: [],
  };
  state.orders.unshift(order);
  state.idempotency.set(input.idempotencyKey, order.orderNumber);
  return order;
}
export function trackOrder(orderNumber: string, phone: string) {
  const normalized = normalizePhone(phone);
  return state.orders.find(
    (x) =>
      x.orderNumber.toUpperCase() === orderNumber.toUpperCase() &&
      x.phone === normalized,
  );
}
export function updateStatus(
  orderNumber: string,
  status: OrderStatus,
  changedBy = "ADMIN",
  note?: string,
) {
  const order = state.orders.find((x) => x.orderNumber === orderNumber);
  if (!order) throw new Error("Sifariş tapılmadı");
  const lines = order.items.map((x) => ({
    productId: x.productId,
    variantId: `${x.productId}-default`,
    quantity: x.quantity,
    productName: x.productName,
  }));
  if (status === "CONFIRMED" && order.assignedBranchId)
    reserveOrder(order.id, order.assignedBranchId, lines, changedBy);
  if (status === "CANCELLED" && order.assignedBranchId)
    releaseOrder(order.id, order.assignedBranchId, lines, changedBy);
  if (status === "DELIVERED") {
    if (!order.assignedBranchId)
      throw new Error("Sifariş filiala təyin edilməyib");
    fulfillOrder(order.id, order.assignedBranchId, lines, changedBy);
  }
  const previousStatus = order.status;
  order.status = status;
  order.updatedAt = new Date().toISOString();
  order.history.push({
    previousStatus,
    newStatus: status,
    changedBy,
    note,
    createdAt: order.updatedAt,
  });
  return order;
}
export function addOrderNote(orderNumber: string, note: string) {
  const order = state.orders.find((x) => x.orderNumber === orderNumber);
  if (!order) throw new Error("Sifariş tapılmadı");
  order.notes.push({ note, createdAt: new Date().toISOString() });
  return order;
}
export function assignBranch(orderNumber: string, branchId: string) {
  const order = state.orders.find((x) => x.orderNumber === orderNumber);
  if (!order) throw new Error("Sifariş tapılmadı");
  order.assignedBranchId = branchId;
  return order;
}
