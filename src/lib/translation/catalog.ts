import type { CatalogLocale, CatalogProductRow } from "@/lib/catalog/types";

export type TranslatedCatalogContent = Partial<
  Pick<
    CatalogProductRow,
    | "name"
    | "product_type"
    | "description"
    | "colors"
    | "category_name"
    | "occasion"
    | "size"
    | "materials"
    | "care_instructions"
    | "flower_meaning"
    | "pet_toxicity"
    | "shelf_life"
  >
>;

export type TranslationProvider = {
  translate(
    source: CatalogProductRow,
    locale: Exclude<CatalogLocale, "pt-BR">,
  ): Promise<TranslatedCatalogContent>;
};

export type TranslationCache = {
  get(
    productId: string,
    locale: Exclude<CatalogLocale, "pt-BR">,
    sourceVersion: number,
  ): Promise<TranslatedCatalogContent | null>;
  put(
    productId: string,
    locale: Exclude<CatalogLocale, "pt-BR">,
    sourceVersion: number,
    content: TranslatedCatalogContent,
  ): Promise<void>;
};

export type LocalizedCatalogProduct = {
  product: CatalogProductRow;
  resolvedLocale: CatalogLocale;
};

export async function localizeCatalogProduct(
  source: CatalogProductRow,
  locale: CatalogLocale,
  cache: TranslationCache,
  provider?: TranslationProvider,
): Promise<LocalizedCatalogProduct> {
  if (locale === "pt-BR") return { product: source, resolvedLocale: "pt-BR" };

  try {
    const cached = await cache.get(source.id, locale, source.content_version);
    if (cached) return { product: { ...source, ...cached }, resolvedLocale: locale };
    if (!provider) return { product: source, resolvedLocale: "pt-BR" };

    const translated = await provider.translate(source, locale);
    await cache.put(source.id, locale, source.content_version, translated);
    return { product: { ...source, ...translated }, resolvedLocale: locale };
  } catch {
    return { product: source, resolvedLocale: "pt-BR" };
  }
}
