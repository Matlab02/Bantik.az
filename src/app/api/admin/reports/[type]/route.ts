import { existsSync } from "node:fs";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";
import {
  assertExportSize,
  assertSafeReportRange,
  csvCell,
  safeSpreadsheetValue,
} from "@/lib/export-safety";
import { getReport, type ReportType } from "@/lib/management";
import { authError, requireStaff } from "@/lib/rbac";

const reportTypes = ["orders", "branches", "products", "brands", "inventory"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    const staff = await requireStaff();
    const type = (await params).type;
    if (!reportTypes.includes(type)) {
      return NextResponse.json({ error: "Report tapılmadı" }, { status: 404 });
    }

    const url = new URL(request.url);
    const report = await getReport(type as ReportType, url.searchParams, staff);
    assertSafeReportRange(report.range.start, report.range.end);
    const format = url.searchParams.get("format");
    if (!format) {
      return NextResponse.json(report, {
        headers: { "cache-control": "no-store" },
      });
    }

    const rows = report.rows as Record<string, string | number>[];
    assertExportSize(rows.length);
    if (format === "csv") {
      const headers = rows.length ? Object.keys(rows[0]) : [];
      const csv =
        "\uFEFF" +
        [
          headers.map(csvCell).join(","),
          ...rows.map((row) =>
            headers.map((key) => csvCell(row[key])).join(","),
          ),
        ].join("\r\n");
      return new Response(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename=bantik-${type}.csv`,
          "cache-control": "no-store",
        },
      });
    }

    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "BANTİK";
      const sheet = workbook.addWorksheet("Report");
      const headers = rows.length ? Object.keys(rows[0]) : [];
      sheet.columns = headers.map((key) => ({
        header: key,
        key,
        width: Math.max(14, key.length + 4),
      }));
      rows.forEach((row) =>
        sheet.addRow(
          Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
              key,
              typeof value === "string" ? safeSpreadsheetValue(value) : value,
            ]),
          ),
        ),
      );
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD71920" },
      };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.autoFilter = {
        from: "A1",
        to: `${columnName(Math.max(1, headers.length))}1`,
      };
      const buffer = await workbook.xlsx.writeBuffer();
      return new Response(buffer as ArrayBuffer, {
        headers: {
          "content-type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-disposition": `attachment; filename=bantik-${type}.xlsx`,
          "cache-control": "no-store",
        },
      });
    }

    if (format === "pdf") {
      const buffer = await createPdf(
        `BANTİK — ${type.toUpperCase()} REPORT`,
        report.range.label,
        rows,
      );
      return new Response(new Uint8Array(buffer), {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename=bantik-${type}.pdf`,
          "cache-control": "no-store",
        },
      });
    }
    return NextResponse.json({ error: "Format dəstəklənmir" }, { status: 400 });
  } catch (error) {
    const e = authError(error);
    const status =
      e.message === "EXPORT_TOO_LARGE"
        ? 413
        : e.message === "REPORT_RANGE_INVALID"
          ? 422
          : e.status;
    return NextResponse.json(
      {
        error:
          status === 413
            ? "Export 5 000 sətirdən böyük ola bilməz"
            : status === 422
              ? "Tarix aralığı 1–366 gün olmalıdır"
              : status === 400
                ? "Report yaradıla bilmədi"
                : e.message,
      },
      { status },
    );
  }
}

function columnName(index: number) {
  let name = "";
  while (index) {
    index--;
    name = String.fromCharCode(65 + (index % 26)) + name;
    index = Math.floor(index / 26);
  }
  return name;
}

function createPdf(
  title: string,
  range: string,
  rows: Record<string, string | number>[],
) {
  return new Promise<Buffer>((resolve, reject) => {
    const font = "C:\\Windows\\Fonts\\arial.ttf";
    const doc = new PDFDocument({
      size: "A4",
      margin: 36,
      font: existsSync(font) ? font : undefined,
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    if (existsSync(font)) doc.font(font);
    doc.fillColor("#d71920").fontSize(18).text(title);
    doc.fillColor("#555").fontSize(9).text(`Tarix aralığı: ${range}`).moveDown();
    const headers = rows.length ? Object.keys(rows[0]) : [];
    doc.fillColor("#111").fontSize(8);
    for (const row of rows.slice(0, 120)) {
      doc.text(headers.map((key) => `${key}: ${row[key] ?? ""}`).join("   "), {
        width: 520,
      });
      doc.moveDown(0.4);
      if (doc.y > 760) doc.addPage();
    }
    if (rows.length > 120) {
      doc.text(
        `… və daha ${rows.length - 120} sətir. Tam məlumat üçün Excel export istifadə edin.`,
      );
    }
    doc.end();
  });
}
