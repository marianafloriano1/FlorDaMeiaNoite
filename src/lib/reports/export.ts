import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { OperationsReport, ReportFormat } from "./types";

function rows(report: OperationsReport) {
  return [
    ["Relatório operacional", "Valor"],
    ["Período", report.filters.period],
    ["Base de data", report.filters.basis],
    ["Início (UTC)", report.filters.startAt],
    ["Fim exclusivo (UTC)", report.filters.endAt],
    ["Pedidos pagos", report.paidOrderCount],
    ["Faturamento líquido (BRL)", report.revenueBrl],
    ["Pedidos com cancelamento pós-pagamento", report.postPaymentCancelledOrderCount],
    ["Eventos de adição ao carrinho", report.cartItemAddedEvents],
    ["Unidades adicionadas ao carrinho", report.cartUnitsAdded],
    ["Eventos de favorito", report.favoriteAddedEvents],
    [],
    ["Produto", "Unidades líquidas em pedidos pagos"],
    ...report.products.map((item) => [item.productName, item.unitsSold]),
  ];
}

async function makeXlsx(report: OperationsReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relatório");
  sheet.addRows(rows(report));
  sheet.getColumn(1).width = 42;
  sheet.getColumn(2).width = 30;
  sheet.getRow(1).font = { bold: true };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function makePdf(report: OperationsReport): Promise<Buffer> {
  return await new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("error", reject);
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.fontSize(18).text("Relatório operacional");
    document.moveDown();
    document.fontSize(11);
    for (const row of rows(report)) {
      if (!row.length) {
        document.moveDown();
        continue;
      }
      document.text(`${String(row[0])}: ${String(row[1] ?? "")}`);
    }
    document.end();
  });
}

export async function createReportExport(
  report: OperationsReport,
  format: ReportFormat,
): Promise<Buffer> {
  return format === "xlsx" ? makeXlsx(report) : makePdf(report);
}
