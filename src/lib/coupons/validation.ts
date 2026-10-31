import type { CouponType } from "./types";

export type CouponInput = {
  code: string;
  discountType: CouponType;
  discountValue: number;
  validFrom: string;
  validUntil: string;
  minimumEligibleBrl: number | null;
  maximumRedemptions: number | null;
  maximumPerCustomer: number | null;
  active: boolean;
  productIds: string[];
  categories: string[];
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseCouponInput(value: unknown, partial = false): Partial<CouponInput> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const allowed = new Set([
    "code",
    "discountType",
    "discountValue",
    "validFrom",
    "validUntil",
    "minimumEligibleBrl",
    "maximumRedemptions",
    "maximumPerCustomer",
    "active",
    "productIds",
    "categories",
  ]);
  if (Object.keys(data).some((key) => !allowed.has(key))) return null;
  if (partial && Object.keys(data).length === 0) return null;
  if (Array.isArray(data.productIds) && data.productIds.length > 100) return null;
  if (Array.isArray(data.categories) && data.categories.length > 100) return null;
  if (
    !partial &&
    ["code", "discountType", "discountValue", "validFrom", "validUntil"].some(
      (key) => !(key in data),
    )
  )
    return null;
  const result: Partial<CouponInput> = {};
  const has = (key: string) => key in data;
  if (has("code")) {
    if (typeof data.code !== "string" || !/^[A-Za-z0-9_-]{3,40}$/.test(data.code.trim()))
      return null;
    result.code = data.code.trim().toUpperCase();
  }
  if (has("discountType")) {
    if (data.discountType !== "percentage" && data.discountType !== "fixed") return null;
    result.discountType = data.discountType;
  }
  if (has("discountValue")) {
    if (
      typeof data.discountValue !== "number" ||
      !Number.isFinite(data.discountValue) ||
      data.discountValue <= 0 ||
      Math.round(data.discountValue * 100) !== data.discountValue * 100 ||
      (data.discountType === "percentage" && data.discountValue > 100)
    )
      return null;
    result.discountValue = data.discountValue;
  }
  for (const key of ["validFrom", "validUntil"] as const) {
    if (!has(key)) continue;
    if (typeof data[key] !== "string" || !Number.isFinite(Date.parse(data[key] as string)))
      return null;
    result[key] = data[key] as string;
  }
  if (
    result.validFrom &&
    result.validUntil &&
    Date.parse(result.validUntil) <= Date.parse(result.validFrom)
  )
    return null;
  for (const key of ["minimumEligibleBrl", "maximumRedemptions", "maximumPerCustomer"] as const) {
    if (!has(key)) continue;
    const item = data[key];
    if (item === null) {
      result[key] = null;
      continue;
    }
    if (
      typeof item !== "number" ||
      !Number.isFinite(item) ||
      (key === "minimumEligibleBrl" ? item < 0 : item < 1) ||
      (key === "minimumEligibleBrl"
        ? Math.round(item * 100) !== item * 100
        : !Number.isSafeInteger(item))
    )
      return null;
    result[key] = item;
  }
  if (has("active")) {
    if (typeof data.active !== "boolean") return null;
    result.active = data.active;
  }
  if (has("productIds")) {
    if (
      !Array.isArray(data.productIds) ||
      data.productIds.some((id) => typeof id !== "string" || !uuid.test(id)) ||
      new Set(data.productIds).size !== data.productIds.length
    )
      return null;
    result.productIds = data.productIds as string[];
  }
  if (has("categories")) {
    if (
      !Array.isArray(data.categories) ||
      data.categories.some(
        (item) => typeof item !== "string" || !item.trim() || item.length > 120,
      ) ||
      new Set(data.categories).size !== data.categories.length
    )
      return null;
    result.categories = (data.categories as string[]).map((item) => item.trim());
  }
  return result;
}

export function normalizeCouponCode(value: unknown): string | null {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{3,40}$/.test(value.trim())) return null;
  return value.trim().toUpperCase();
}
