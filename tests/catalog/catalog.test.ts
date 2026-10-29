import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { filterCatalogProducts, parseCatalogFilters } from "@/lib/catalog/filters";
import {
  catalogProductHref,
  getCatalogLocale,
  projectPublicProduct,
  readPublicCatalog,
  readPublicProduct,
} from "@/lib/catalog/service";
import { CATALOG_CATEGORIES, type CatalogProductRow } from "@/lib/catalog/types";

const syntheticProduct = (overrides: Partial<CatalogProductRow> = {}): CatalogProductRow => ({
  id: "00000000-0000-4000-8000-000000000001",
  slug: "produto-sintetico-a",
  name: "Produto sintético A",
  product_type: "Tipo sintético",
  description: "Descrição sintética para teste.",
  colors: ["Rosa"],
  price_brl: "45.50",
  category_name: "Flores",
  occasion: null,
  size: "Médio",
  materials: ["Papel sintético", "Fita sintética"],
  care_instructions: "Informação não disponível.",
  flower_meaning: "Informação não disponível.",
  pet_toxicity: "Informação não disponível.",
  shelf_life: "Informação não disponível.",
  content_version: 1,
  images: [],
  low_stock_alert: false,
  ...overrides,
});

test("mantém exatamente as 16 categorias fixas", () => {
  assert.equal(CATALOG_CATEGORIES.length, 16);
  assert.equal(new Set(CATALOG_CATEGORIES).size, 16);
  assert.ok(CATALOG_CATEGORIES.includes("Ferramentas de jardinagem"));
});

test("T006: links do catálogo preservam locale e pt-BR permanece padrão", () => {
  const slug = "produto-sintetico";
  assert.equal(
    catalogProductHref(slug, getCatalogLocale("en")),
    "/catalog/produto-sintetico?locale=en",
  );
  assert.equal(
    catalogProductHref(slug, getCatalogLocale("es")),
    "/catalog/produto-sintetico?locale=es",
  );
  assert.equal(
    catalogProductHref(slug, getCatalogLocale("ru")),
    "/catalog/produto-sintetico?locale=ru",
  );
  assert.equal(catalogProductHref(slug, getCatalogLocale(null)), "/catalog/produto-sintetico");
});

test("T006: detalhe usa a tradução persistida do locale propagado", async () => {
  const row = syntheticProduct();
  let requestedLocale: string | undefined;
  const client = {
    from(table: string) {
      if (table === "public_catalog_products") {
        const query = {
          select() {
            return query;
          },
          eq() {
            return query;
          },
          async maybeSingle() {
            return { data: row, error: null };
          },
        };
        return query;
      }
      const query = {
        select() {
          return query;
        },
        eq(_column: string, value: string) {
          requestedLocale = value;
          return query;
        },
        async in() {
          return {
            data: [
              {
                product_id: row.id,
                source_version: row.content_version,
                content: { name: "Synthetic translated product" },
              },
            ],
            error: null,
          };
        },
      };
      return query;
    },
    storage: {
      from: () => ({
        getPublicUrl: () => ({ data: { publicUrl: "https://example.invalid/image.webp" } }),
      }),
    },
  };

  const detail = await readPublicProduct(client as never, row.slug, getCatalogLocale("en"));
  assert.equal(requestedLocale, "en");
  assert.equal(detail?.name, "Synthetic translated product");
  assert.equal(detail?.contentLocale, "en");
  assert.equal(detail?.priceBrl, 45.5);
});

test("aplica cada filtro de catálogo individualmente", () => {
  const products = [
    syntheticProduct(),
    syntheticProduct({
      id: "00000000-0000-4000-8000-000000000002",
      slug: "produto-sintetico-b",
      product_type: "Outro arranjo sintético",
      description: "Texto alternativo sintético.",
      colors: ["Branco"],
      size: "Grande",
      materials: ["Vidro sintético"],
      price_brl: "120.00",
    }),
  ];
  assert.equal(filterCatalogProducts(products, { flowerType: "tipo SINTÉTICO" }).length, 1);
  assert.equal(filterCatalogProducts(products, { color: "rosa" }).length, 1);
  assert.equal(filterCatalogProducts(products, { size: "médio" }).length, 1);
  assert.equal(filterCatalogProducts(products, { materials: ["fita sintética"] }).length, 1);
  assert.equal(filterCatalogProducts(products, { minPrice: 40, maxPrice: 50 }).length, 1);
  assert.equal(filterCatalogProducts(products, { query: "descrição sintética" }).length, 1);
});

test("combina busca, tipo, cor, tamanho, materiais e faixa de preço", () => {
  const products = [
    syntheticProduct(),
    syntheticProduct({
      id: "00000000-0000-4000-8000-000000000002",
      slug: "produto-sintetico-b",
      colors: ["Branco"],
    }),
  ];
  const result = filterCatalogProducts(products, {
    query: "sintético",
    flowerType: "tipo",
    color: "rosa",
    size: "médio",
    materials: ["papel sintético", "fita sintética"],
    minPrice: 45,
    maxPrice: 46,
  });
  assert.deepEqual(
    result.map(({ slug }) => slug),
    ["produto-sintetico-a"],
  );
});

test("recusa faixa de preço inválida e aceita filtros combináveis", () => {
  const invalid = parseCatalogFilters(new URLSearchParams("minPrice=50&maxPrice=49"));
  assert.equal(invalid.ok, false);
  const valid = parseCatalogFilters(
    new URLSearchParams("q=flor&color=rosa&materials=papel%2Cfita&minPrice=1"),
  );
  assert.equal(valid.ok, true);
  if (valid.ok) assert.deepEqual(valid.filters.materials, ["papel", "fita"]);
});

test("projection pública não inclui saldo interno e mantém preço como BRL numérico", () => {
  const projected = projectPublicProduct(syntheticProduct(), {
    storage: {
      from: () => ({
        getPublicUrl: () => ({ data: { publicUrl: "https://example.invalid/image.webp" } }),
      }),
    },
  } as never);
  assert.equal(projected.priceBrl, 45.5);
  assert.equal(projected.availability, "available");
  assert.equal(projected.lowStockAlert, false);
  assert.equal("stock_quantity" in projected, false);
  assert.equal("stock" in projected, false);
});

test("projeta somente o sinal de alerta para estoques 1 e 2", () => {
  for (const stock of [4, 2, 1, 0]) {
    const product = projectPublicProduct(
      syntheticProduct({ low_stock_alert: stock >= 1 && stock <= 2 }),
      {
        storage: {
          from: () => ({
            getPublicUrl: () => ({ data: { publicUrl: "https://example.invalid/image.webp" } }),
          }),
        },
      } as never,
    );
    assert.equal(product.lowStockAlert, stock === 1 || stock === 2);
    assert.equal("stock_quantity" in product, false);
    assert.equal("stock" in product, false);
  }
});

test("view pública deriva alerta 1–2, oculta saldo e exclui estoque zero", async () => {
  const sql = await readFile("supabase/migrations/202610250001_catalog.sql", "utf8");
  const alertMigration = await readFile(
    "supabase/migrations/202610250002_catalog_low_stock_alert.sql",
    "utf8",
  );
  assert.match(sql, /stock_quantity integer not null/);
  assert.match(sql, /stock_quantity > 0/);
  assert.match(sql, /public_catalog_products/);
  assert.match(sql, /Ferramentas de jardinagem/);
  assert.doesNotMatch(sql, /select[^;]*stock_quantity[^;]*from public\.public_catalog_products/is);
  assert.match(alertMigration, /\(p\.stock_quantity between 1 and 2\) as low_stock_alert/i);
  assert.match(alertMigration, /where p\.status = 'published' and p\.stock_quantity > 0/i);
  assert.doesNotMatch(alertMigration, /p\.stock_quantity\s*,/i);
});

test("listagem e detalhe mostram o texto exato somente com o sinal de alerta", async () => {
  const listing = await readFile("src/app/catalog/page.tsx", "utf8");
  const detail = await readFile("src/app/catalog/[slug]/page.tsx", "utf8");
  for (const page of [listing, detail]) {
    assert.match(page, /product\.lowStockAlert &&/);
    assert.match(page, /Últimas unidades disponíveis\./);
  }
});

test("erro ao ler traduções mantém o produto em pt-BR e não bloqueia o catálogo", async () => {
  const row = syntheticProduct({ low_stock_alert: true });
  const client = {
    from(table: string) {
      if (table === "public_catalog_products") {
        const query = {
          select() {
            return query;
          },
          order() {
            return query;
          },
          async limit() {
            return { data: [row], error: null };
          },
        };
        return query;
      }
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        async in() {
          throw new Error("synthetic translation read failure");
        },
      };
      return query;
    },
    storage: {
      from: () => ({
        getPublicUrl: () => ({ data: { publicUrl: "https://example.invalid/image.webp" } }),
      }),
    },
  };

  const [product] = await readPublicCatalog(client as never, {}, "en");
  assert.equal(product.name, row.name);
  assert.equal(product.contentLocale, "pt-BR");
  assert.equal(product.priceBrl, 45.5);
  assert.equal(product.lowStockAlert, true);
});
