import assert from "node:assert/strict";
import test from "node:test";
import {
  assertExportSize,
  assertSafeReportRange,
  csvCell,
  safeSpreadsheetValue,
} from "./export-safety";

test("spreadsheet formulas are neutralized", () => {
  assert.equal(safeSpreadsheetValue("=2+2"), "'=2+2");
  assert.equal(safeSpreadsheetValue("+SUM(A1:A2)"), "'+SUM(A1:A2)");
  assert.equal(csvCell("@cmd"), '"\'@cmd"');
  assert.equal(safeSpreadsheetValue("BANTİK"), "BANTİK");
});

test("exports and report ranges are bounded", () => {
  assert.doesNotThrow(() => assertExportSize(5_000));
  assert.throws(() => assertExportSize(5_001), /EXPORT_TOO_LARGE/);
  assert.doesNotThrow(() =>
    assertSafeReportRange(new Date("2026-01-01"), new Date("2026-02-01")),
  );
  assert.throws(
    () => assertSafeReportRange(new Date("2024-01-01"), new Date("2026-01-02")),
    /REPORT_RANGE_INVALID/,
  );
});
