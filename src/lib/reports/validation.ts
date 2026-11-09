import type { ReportFormat } from "./types";

export function parseReportFormat(value: unknown): ReportFormat | null {
  return value === "xlsx" || value === "pdf" ? value : null;
}

export function safeReportFilename(
  period: "week" | "month",
  basis: "created" | "paid",
  format: ReportFormat,
) {
  return `relatorio-${period}-${basis}.${format}`;
}

export function reportFilenameLabel(period: "week" | "month", anchor: string) {
  return (period === "week" ? "Semana iniciada em " : "Mês de ") + anchor;
}
