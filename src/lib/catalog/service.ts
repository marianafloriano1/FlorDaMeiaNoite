import type { SupabaseClient } from "@supabase/supabase-js";
import type { TranslatedCatalogContent } from "@/lib/translation/catalog";
import { filterCatalogProducts, parseCatalogFilters } from "./filters";
import type {
  CatalogFilters,
  CatalogLocale,
  CatalogProductRow,
  PublicCatalogProduct,
} from "./types";
import { CATALOG_LOCALES } from "./types";

const translatedFields = [
  "name",
  "product_type",
  "description",
  "colors",
  "category_name",
  "occasion",
  "size",
  "materials",
  "care_instructions",
  "flower_meaning",
  "pet_toxicity",
  "shelf_life",
] as const;

function isCatalogLocale(value: string | null): value is CatalogLocale {
  return value !== null && CATALOG_LOCALES.some((locale) => locale === value);
}

export function getCatalogLocale(value: string | null): CatalogLocale {
  return isCatalogLocale(value) ? value : "pt-BR";
}

export function catalogProductHref(slug: string, locale: CatalogLocale): string {
  const path = `/catalog/${encodeURIComponent(slug)}`;
  return locale === "pt-BR" ? path : `${path}?locale=${encodeURIComponent(locale)}`;
}

export function projectPublicProduct(
  row: CatalogProductRow,
  client: SupabaseClient,
  localized?: TranslatedCatalogContent,
  contentLocale: CatalogLocale = "pt-BR",
): PublicCatalogProduct {
  const product = { ...row, ...localized };
  return {
    slug: product.slug,
    name: product.name,
    productType: product.product_type,
    description: product.description,
    colors: product.colors,
    photos: (product.images ?? []).map((image) => ({
      url: client.storage.from("catalog").getPublicUrl(image.objectKey).data.publicUrl,
      altText: image.altText,
      width: image.width,
      height: image.height,
      mimeType: image.mimeType,
    })),
    priceBrl: Number(product.price_brl),
    category: product.category_name,
    availability: "available",
    lowStockAlert: row.low_stock_alert === true,
    occasion: product.occasion,
    size: product.size,
    materials: product.materials,
    careInstructions: product.care_instructions,
    flowerMeaning: product.flower_meaning,
    petToxicity: product.pet_toxicity,
    shelfLife: product.shelf_life,
    contentLocale,
  };
}

async function loadTranslations(
  client: SupabaseClient,
  rows: CatalogProductRow[],
  locale: CatalogLocale,
): Promise<Map<string, TranslatedCatalogContent>> {
  const translations = new Map<string, TranslatedCatalogContent>();
  if (locale === "pt-BR" || rows.length === 0) return translations;
  let data: Array<{
    product_id: string;
    source_version: number;
    content: unknown;
  }> | null;
  try {
    const result = await client
      .from("public_catalog_translations")
      .select("product_id, locale, source_version, content")
      .eq("locale", locale)
      .in(
        "product_id",
        rows.map((row) => row.id),
      );
    if (result.error || !result.data) return translations;
    data = result.data;
  } catch {
    return translations;
  }

  const versions = new Map(rows.map((row) => [row.id, row.content_version]));
  for (const entry of data) {
    if (
      versions.get(entry.product_id) !== entry.source_version ||
      !entry.content ||
      typeof entry.content !== "object" ||
      Array.isArray(entry.content)
    ) {
      continue;
    }
    const entryContent = entry.content as Record<string, unknown>;
    const safeContent: Record<string, unknown> = {};
    for (const field of translatedFields) {
      if (Object.hasOwn(entryContent, field)) safeContent[field] = entryContent[field];
    }
    translations.set(entry.product_id, safeContent as TranslatedCatalogContent);
  }
  return translations;
}

export async function readPublicCatalog(
  client: SupabaseClient,
  filters: CatalogFilters,
  locale: CatalogLocale,
): Promise<PublicCatalogProduct[]> {
  const { data, error } = await client
    .from("public_catalog_products")
    .select("*")
    .order("name", { ascending: true })
    .limit(1000);
  if (error) {
    console.error("CATALOG_SUPABASE_ERROR", error);
    throw new Error("catalog_read_failed");
  }
  const rows = (data ?? []) as unknown as CatalogProductRow[];
  const filtered = filterCatalogProducts(rows, filters);
  const translations = await loadTranslations(client, filtered, locale);
  return filtered.map((row) => {
    const translated = translations.get(row.id);
    return projectPublicProduct(row, client, translated, translated ? locale : "pt-BR");
  });
}

export async function readPublicProduct(
  client: SupabaseClient,
  slug: string,
  locale: CatalogLocale,
): Promise<PublicCatalogProduct | null> {
  const { data, error } = await client
    .from("public_catalog_products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error("catalog_read_failed");
  if (!data) return null;

  const row = data as unknown as CatalogProductRow;
  const translations = await loadTranslations(client, [row], locale);
  const translated = translations.get(row.id);
  return projectPublicProduct(row, client, translated, translated ? locale : "pt-BR");
}

export function filtersFromSearchParams(params: URLSearchParams) {
  return parseCatalogFilters(params);
}
