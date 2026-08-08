export const MAX_EXPORT_ROWS = 5_000;
export const MAX_REPORT_RANGE_DAYS = 366;

export function safeSpreadsheetValue(value: unknown) {
  const text = String(value ?? "");
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

export function csvCell(value: unknown) {
  return `"${safeSpreadsheetValue(value).replaceAll('"', '""')}"`;
}

export function assertSafeReportRange(from: Date, to: Date) {
  const days = (to.getTime() - from.getTime()) / 86_400_000;
  if (!Number.isFinite(days) || days <= 0 || days > MAX_REPORT_RANGE_DAYS) {
    throw new Error("REPORT_RANGE_INVALID");
  }
}

export function assertExportSize(count: number) {
  if (count > MAX_EXPORT_ROWS) throw new Error("EXPORT_TOO_LARGE");
}
