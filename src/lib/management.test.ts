import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateBranchReport,
  aggregateOrderSummary,
  aggregateProductLines,
  canAssignRole,
  canExportReports,
  canViewAudit,
  canViewCustomerPrivateData,
  countUnread,
  groupSearchResults,
  isScheduledActive,
  resolveDateRange,
} from "./management";
import { resolveWhatsappNumber } from "./settings";

test("dashboard aggregation uses real order totals", () => {
  const result = aggregateOrderSummary([
    { status: "DELIVERED", total: 40 },
    { status: "NEW", total: 20 },
  ]);
  assert.deepEqual(
    [result.totalOrders, result.deliveredValue, result.averageOrderValue],
    [2, 40, 30],
  );
});

test("date range resolves last seven calendar days", () => {
  const range = resolveDateRange("7d", null, null, new Date(2026, 7, 8, 12));
  assert.equal(range.start.getDate(), 2);
  assert.equal(range.end.getDate(), 9);
});

test("branch report aggregates order and stock metrics", () => {
  const report = aggregateBranchReport(
    [{ status: "CONFIRMED", total: 25 }],
    [{ quantity: 2, reservedQuantity: 0, minimumStock: 3 }],
  );
  assert.deepEqual([report.confirmed, report.lowStock], [1, 1]);
});

test("order report calculates cancellation rate", () => {
  const result = aggregateOrderSummary([
    { status: "CANCELLED", total: 10 },
    { status: "DELIVERED", total: 30 },
  ]);
  assert.equal(result.cancellationRate, 50);
});

test("product aggregation keeps delivered quantities separate", () => {
  const map = aggregateProductLines([
    { key: "p1", quantity: 2, total: 20, delivered: true },
    { key: "p1", quantity: 1, total: 10, delivered: false },
  ]);
  assert.deepEqual(map.get("p1"), {
    quantity: 3,
    value: 30,
    deliveredQuantity: 2,
    deliveredValue: 20,
  });
});

test("CMS scheduling excludes future content", () => {
  assert.equal(
    isScheduledActive(
      { active: true, startAt: new Date("2030-01-01") },
      new Date("2026-01-01"),
    ),
    false,
  );
});

test("settings preserve configured WhatsApp digits", () => {
  assert.equal(resolveWhatsappNumber("+994 50 111 22 33", ""), "994501112233");
});

test("WhatsApp setting falls back to environment value", () => {
  assert.equal(resolveWhatsappNumber("", "+994 55 000 00 00"), "994550000000");
});

test("user role restrictions allow assignment only by super admin", () => {
  assert.equal(canAssignRole("ADMIN", "SALES_STAFF"), false);
  assert.equal(canAssignRole("SUPER_ADMIN", "ADMIN"), true);
});

test("notification unread count ignores read records", () => {
  assert.equal(countUnread([{ readAt: null }, { readAt: new Date() }, {}]), 2);
});

test("global search results are grouped", () => {
  const groups = groupSearchResults([
    { group: "Orders", id: 1 },
    { group: "Products", id: 2 },
  ]);
  assert.deepEqual(Object.keys(groups), ["Orders", "Products"]);
});

test("report exports require a staff role", () => {
  assert.equal(canExportReports("CUSTOMER"), false);
  assert.equal(canExportReports("BRANCH_MANAGER"), true);
});

test("audit access is limited to administrative roles", () => {
  assert.equal(canViewAudit("WAREHOUSE_MANAGER"), false);
  assert.equal(canViewAudit("ADMIN"), true);
});

test("customer private data is limited to administrative roles", () => {
  assert.equal(canViewCustomerPrivateData("SALES_STAFF"), false);
  assert.equal(canViewCustomerPrivateData("SUPER_ADMIN"), true);
});
