import type { CatalogFilters, CatalogProductRow } from "./types";

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function includesText(value: string | null | undefined, filter: string): boolean {
  return Boolean(value && normalized(value).includes(normalized(filter)));
}

export function filterCatalogProducts(
  products: CatalogProductRow[],
  filters: CatalogFilters,
): CatalogProductRow[] {
  return products.filter((product) => {
    const price = Number(product.price_brl);
    const query = filters.query;
    const colorFilter = filters.color;
    const searchable = [
      product.name,
      product.product_type,
      product.description,
      product.category_name,
      product.occasion,
      product.size,
      ...product.colors,
      ...product.materials,
    ];

    if (query && !searchable.some((part) => includesText(part, query))) return false;
    if (filters.flowerType && !includesText(product.product_type, filters.flowerType)) return false;
    if (colorFilter && !product.colors.some((color) => includesText(color, colorFilter)))
      return false;
    if (filters.size && !includesText(product.size, filters.size)) return false;
    if (
      filters.materials?.length &&
      !filters.materials.every((material) =>
        product.materials.some((item) => includesText(item, material)),
      )
    )
      return false;
    if (filters.minPrice !== undefined && price < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && price > filters.maxPrice) return false;
    return true;
  });
}

export function parseCatalogFilters(
  params: URLSearchParams,
): { ok: true; filters: CatalogFilters } | { ok: false; reason: string } {
  const query = params.get("q")?.trim();
  const flowerType = params.get("flowerType")?.trim();
  const color = params.get("color")?.trim();
  const size = params.get("size")?.trim();
  const materials = (params.get("materials") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const rawMin = params.get("minPrice");
  const rawMax = params.get("maxPrice");
  const minPrice = rawMin === null || rawMin === "" ? undefined : Number(rawMin);
  const maxPrice = rawMax === null || rawMax === "" ? undefined : Number(rawMax);

  if ([query, flowerType, color, size, ...materials].some((item) => item && item.length > 120)) {
    return { ok: false, reason: "filter_too_long" };
  }
  if (
    (minPrice !== undefined && (!Number.isFinite(minPrice) || minPrice < 0)) ||
    (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0))
  ) {
    return { ok: false, reason: "invalid_price_range" };
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return { ok: false, reason: "invalid_price_range" };
  }

  return {
    ok: true,
    filters: {
      ...(query ? { query } : {}),
      ...(flowerType ? { flowerType } : {}),
      ...(color ? { color } : {}),
      ...(size ? { size } : {}),
      ...(materials.length ? { materials } : {}),
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
    },
  };
}
