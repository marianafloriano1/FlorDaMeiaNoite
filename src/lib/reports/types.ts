export type ReportPeriodKind = "week" | "month";
export type ReportDateBasis = "created" | "paid";
export type ReportFormat = "xlsx" | "pdf";

export type ReportFilters = {
  period: ReportPeriodKind;
  basis: ReportDateBasis;
  anchor: string;
  startAt: string;
  endAt: string;
};

export type ProductMetric = {
  productName: string;
  unitsSold: number;
};

export type OperationsReport = {
  filters: Pick<ReportFilters, "period" | "basis" | "anchor" | "startAt" | "endAt">;
  paidOrderCount: number;
  revenueBrl: number;
  postPaymentCancelledOrderCount: number;
  products: ProductMetric[];
  cartItemAddedEvents: number;
  cartUnitsAdded: number;
  favoriteAddedEvents: number;
};
