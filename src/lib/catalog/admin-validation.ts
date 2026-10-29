import { CATALOG_CATEGORIES } from "./types";

const productFields = new Set([
  "slug",
  "name",
  "productType",
  "description",
  "colors",
  "priceBrl",
  "category",
  "occasion",
  "size",
  "materials",
  "careInstructions",
  "flowerMeaning",
  "petToxicity",
  "shelfLife",
  "status",
]);

export type CatalogProductInput = {
  slug: string;
  name: string;
  productType: string;
  description: string;
  colors: string[];
  priceBrl: number;
  category: (typeof CATALOG_CATEGORIES)[number];
  occasion: string | null;
  size: string | null;
  materials: string[];
  careInstructions: string;
  flowerMeaning: string;
  petToxicity: string;
  shelfLife: string;
  status: "draft" | "published";
};

function text(value: unknown, max: number, optional = false): string | null {
  if (optional && (value === null || value === undefined || value === "")) return "";
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : null;
}

function textList(value: unknown, maxItems: number, maxLength: number): string[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const result: string[] = [];
  for (const item of value) {
    const normalized = text(item, maxLength);
    if (normalized === null || !normalized) return null;
    result.push(normalized);
  }
  return result;
}

export function parseCatalogProductInput(value: unknown): CatalogProductInput | null;
export function parseCatalogProductInput(
  value: unknown,
  partial: true,
): Partial<CatalogProductInput> | null;
export function parseCatalogProductInput(
  value: unknown,
  partial = false,
): Partial<CatalogProductInput> | CatalogProductInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !productFields.has(key))) return null;
  if (!partial && [...productFields].some((key) => !(key in input))) return null;

  const result: Partial<CatalogProductInput> = {};
  const assignText = (
    key: keyof CatalogProductInput,
    max: number,
    required = true,
    nonEmpty = required,
  ) => {
    if (!(key in input)) return partial;
    const value = text(input[key], max, !required);
    if (value === null || (nonEmpty && !value)) return false;
    (result as Record<string, unknown>)[key] = required ? value : value || null;
    return true;
  };

  if (!assignText("slug", 120)) return null;
  if (result.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result.slug)) return null;
  if (!assignText("name", 200)) return null;
  if (!assignText("productType", 100)) return null;
  if (!assignText("description", 10_000, true, false)) return null;
  if ("colors" in input) {
    const colors = textList(input.colors, 40, 80);
    if (!colors) return null;
    result.colors = colors;
  } else if (!partial) return null;
  if ("priceBrl" in input) {
    if (
      typeof input.priceBrl !== "number" ||
      !Number.isFinite(input.priceBrl) ||
      input.priceBrl < 0 ||
      input.priceBrl > 99_999_999.99 ||
      Math.abs(input.priceBrl * 100 - Math.round(input.priceBrl * 100)) > 1e-7
    )
      return null;
    result.priceBrl = input.priceBrl;
  } else if (!partial) return null;
  if ("category" in input) {
    if (
      typeof input.category !== "string" ||
      !CATALOG_CATEGORIES.some((item) => item === input.category)
    )
      return null;
    result.category = input.category as CatalogProductInput["category"];
  } else if (!partial) return null;
  if (!assignText("occasion", 120, false)) return null;
  if (!assignText("size", 120, false)) return null;
  if ("materials" in input) {
    const materials = textList(input.materials, 40, 120);
    if (!materials) return null;
    result.materials = materials;
  } else if (!partial) return null;
  if (!assignText("careInstructions", 5_000, true, false)) return null;
  if (!assignText("flowerMeaning", 5_000, true, false)) return null;
  if (!assignText("petToxicity", 5_000, true, false)) return null;
  if (!assignText("shelfLife", 1_000, true, false)) return null;
  if ("status" in input) {
    if (input.status !== "draft" && input.status !== "published") return null;
    result.status = input.status;
  } else if (!partial) return null;

  return partial ? result : (result as CatalogProductInput);
}

export function parseStockAdjustment(
  value: unknown,
): { newQuantity: number; reason: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "newQuantity" && key !== "reason")) return null;
  if (!Number.isSafeInteger(input.newQuantity) || (input.newQuantity as number) < 0) return null;
  if (typeof input.reason !== "string") return null;
  const reason = input.reason.trim();
  if (!reason || reason.length > 400) return null;
  return { newQuantity: input.newQuantity as number, reason };
}
