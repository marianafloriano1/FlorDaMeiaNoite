import assert from "node:assert/strict";
import test from "node:test";
import { aggregateOperationsReport } from "@/lib/reports/aggregate";
import { createReportExport } from "@/lib/reports/export";
import { parseReportFilters } from "@/lib/reports/periods";
import { parseReportFormat, safeReportFilename } from "@/lib/reports/validation";

test("TASK-011: semana e mês usam America/Sao_Paulo e fim exclusivo", () => {
  const week = parseReportFilters(new URLSearchParams("period=week&basis=paid&anchor=2026-11-08"));
  assert.deepEqual(
    { start: week?.startAt, end: week?.endAt },
    { start: "2026-11-02T03:00:00.000Z", end: "2026-11-09T03:00:00.000Z" },
  );
  const month = parseReportFilters(
    new URLSearchParams("period=month&basis=created&anchor=2026-11-08"),
  );
  assert.equal(month?.startAt, "2026-11-01T03:00:00.000Z");
  assert.equal(month?.endAt, "2026-12-01T03:00:00.000Z");
  const dstWeek = parseReportFilters(new URLSearchParams("period=week&anchor=2018-11-04"));
  assert.equal(dstWeek?.startAt, "2018-10-29T03:00:00.000Z");
  assert.equal(dstWeek?.endAt, "2018-11-05T02:00:00.000Z");
});

test("TASK-011: filtros recusam datas inválidas e formatos desconhecidos", () => {
  assert.equal(parseReportFilters(new URLSearchParams("period=year")), null);
  assert.equal(parseReportFilters(new URLSearchParams("period=week&anchor=2026-02-30")), null);
  assert.equal(parseReportFormat("csv"), null);
  assert.equal(parseReportFormat("xlsx"), "xlsx");
  assert.equal(safeReportFilename("week", "created", "pdf"), "relatorio-week-created.pdf");
});

test("TASK-011: métricas excluem não pagos, separam cancelamentos e agregam CartEvent", () => {
  const filters = parseReportFilters(
    new URLSearchParams("period=week&basis=paid&anchor=2026-11-08"),
  );
  assert.ok(filters);
  const report = aggregateOperationsReport(
    filters,
    [
      {
        id: "paid",
        status: "preparing",
        total_brl: "100.25",
        created_at: "",
        payment_confirmed_at: "2026-11-08T10:00:00Z",
      },
      {
        id: "cancelled",
        status: "cancelled",
        total_brl: "40.00",
        created_at: "",
        payment_confirmed_at: "2026-11-08T10:00:00Z",
      },
      {
        id: "unpaid",
        status: "awaiting_payment",
        total_brl: "999.00",
        created_at: "",
        payment_confirmed_at: null,
      },
    ],
    [
      { id: "line-a", order_id: "paid", product_id: "a", product_name: "Rosa", quantity: 3 },
      { id: "line-b", order_id: "paid", product_id: "b", product_name: "Lírio", quantity: 1 },
      { id: "line-c", order_id: "cancelled", product_id: "a", product_name: "Rosa", quantity: 5 },
    ],
    [
      { event_type: "cart_item_added", quantity_delta: 2 },
      { event_type: "favorite_added", quantity_delta: null },
    ],
    [
      {
        order_id: "paid",
        event_type: "item_cancelled",
        event_data: { order_item_id: "line-a", quantity_returned: 1 },
      },
      { order_id: "cancelled", event_type: "cancelled", event_data: {} },
    ],
    [
      { id: "a", name: "Rosa" },
      { id: "b", name: "Lírio" },
      { id: "c", name: "Margarida" },
    ],
  );
  assert.equal(report.paidOrderCount, 2);
  assert.equal(report.revenueBrl, 140.25);
  assert.equal(report.postPaymentCancelledOrderCount, 2);
  assert.deepEqual(report.products, [
    { productName: "Rosa", unitsSold: 2 },
    { productName: "Lírio", unitsSold: 1 },
    { productName: "Margarida", unitsSold: 0 },
  ]);
  assert.equal(report.cartItemAddedEvents, 1);
  assert.equal(report.cartUnitsAdded, 2);
  assert.equal(report.favoriteAddedEvents, 1);
});

test("TASK-011: exportações XLSX e PDF são arquivos reais e transitórios", async () => {
  const report = {
    filters: {
      period: "week" as const,
      basis: "created" as const,
      anchor: "2026-11-02",
      startAt: "2026-11-02T03:00:00.000Z",
      endAt: "2026-11-09T03:00:00.000Z",
    },
    paidOrderCount: 1,
    revenueBrl: 27.5,
    postPaymentCancelledOrderCount: 0,
    products: [{ productName: "Produto sintético", unitsSold: 1 }],
    cartItemAddedEvents: 1,
    cartUnitsAdded: 1,
    favoriteAddedEvents: 0,
  };
  const xlsx = await createReportExport(report, "xlsx");
  assert.equal(xlsx.subarray(0, 2).toString("ascii"), "PK");
  const pdf = await createReportExport(report, "pdf");
  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
});
