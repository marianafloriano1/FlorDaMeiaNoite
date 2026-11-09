import type { ReportDateBasis, ReportFilters, ReportPeriodKind } from "./types";

const TIME_ZONE = "America/Sao_Paulo";
const localParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function dateParts(value: Date) {
  const parts = Object.fromEntries(
    localParts.formatToParts(value).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function localMidnightUtc(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error("invalid_report_date");
  const target = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const start = target - 6 * 60 * 60 * 1000;
  for (let minute = 0; minute <= 12 * 60; minute += 1) {
    const candidate = start + minute * 60 * 1000;
    const local = dateParts(new Date(candidate));
    if (
      local.year === Number(match[1]) &&
      local.month === Number(match[2]) &&
      local.day === Number(match[3])
    )
      return new Date(candidate).toISOString();
  }
  throw new Error("invalid_report_date");
}
function localToday(now: Date): string {
  const parts = dateParts(now);
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return [
    String(shifted.getUTCFullYear()).padStart(4, "0"),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function parseReportFilters(
  params: URLSearchParams,
  now = new Date(),
): ReportFilters | null {
  const periodValue = params.get("period") ?? "week";
  const basisValue = params.get("basis") ?? "created";
  if (periodValue !== "week" && periodValue !== "month") return null;
  if (basisValue !== "created" && basisValue !== "paid") return null;
  const period: ReportPeriodKind = periodValue;
  const basis: ReportDateBasis = basisValue;

  const anchor = params.get("anchor") ?? localToday(now);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(anchor);
  if (!match) return null;
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (
    parsed.getUTCFullYear() !== Number(match[1]) ||
    parsed.getUTCMonth() + 1 !== Number(match[2]) ||
    parsed.getUTCDate() !== Number(match[3])
  )
    return null;

  let startDate = anchor;
  let endDate: string;
  if (period === "week") {
    const mondayOffset = (parsed.getUTCDay() + 6) % 7;
    startDate = shiftDate(anchor, -mondayOffset);
    endDate = shiftDate(startDate, 7);
  } else {
    startDate = `${anchor.slice(0, 7)}-01`;
    const [year, month] = startDate.split("-").map(Number);
    endDate = [
      String(month === 12 ? year + 1 : year),
      String(month === 12 ? 1 : month + 1).padStart(2, "0"),
      "01",
    ].join("-");
  }

  return {
    period,
    basis,
    anchor,
    startAt: localMidnightUtc(startDate),
    endAt: localMidnightUtc(endDate),
  };
}
