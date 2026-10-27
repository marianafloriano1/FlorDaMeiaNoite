import assert from "node:assert/strict";
import test from "node:test";
import type { CatalogProductRow } from "@/lib/catalog/types";
import {
  localizeCatalogProduct,
  type TranslationCache,
  type TranslationProvider,
} from "@/lib/translation/catalog";

const source: CatalogProductRow = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "produto-sintetico",
  name: "Produto sintético",
  product_type: "Tipo sintético",
  description: "Descrição sintética",
  colors: ["Rosa"],
  price_brl: "75.25",
  category_name: "Flores",
  occasion: null,
  size: null,
  materials: [],
  care_instructions: "Informação não disponível.",
  flower_meaning: "Informação não disponível.",
  pet_toxicity: "Informação não disponível.",
  shelf_life: "Informação não disponível.",
  content_version: 3,
  images: [],
  low_stock_alert: false,
};

function memoryCache(): TranslationCache {
  const rows = new Map<string, Record<string, unknown>>();
  return {
    async get(id, locale, version) {
      return (rows.get(`${id}:${locale}:${version}`) as never) ?? null;
    },
    async put(id, locale, version, content) {
      rows.set(`${id}:${locale}:${version}`, content);
    },
  };
}

test("usa cache por produto, idioma e versão de origem sem traduzir preço", async () => {
  const cache = memoryCache();
  let calls = 0;
  const provider: TranslationProvider = {
    async translate() {
      calls += 1;
      return { name: "Synthetic product" };
    },
  };
  const first = await localizeCatalogProduct(source, "en", cache, provider);
  const second = await localizeCatalogProduct(source, "en", cache, provider);
  assert.equal(first.resolvedLocale, "en");
  assert.equal(second.product.name, "Synthetic product");
  assert.equal(second.product.price_brl, "75.25");
  assert.equal(calls, 1);
});

test("pt-BR é origem e tradução indisponível ou com falha usa fallback sem bloquear", async () => {
  const cache = memoryCache();
  const sourceLocale = await localizeCatalogProduct(source, "pt-BR", cache);
  const disabled = await localizeCatalogProduct(source, "ru", cache);
  const failing = await localizeCatalogProduct(source, "es", cache, {
    async translate() {
      throw new Error("synthetic translation failure");
    },
  });
  assert.equal(sourceLocale.resolvedLocale, "pt-BR");
  assert.equal(disabled.resolvedLocale, "pt-BR");
  assert.equal(failing.resolvedLocale, "pt-BR");
  assert.equal(failing.product.name, source.name);
  assert.equal(failing.product.price_brl, source.price_brl);
});
