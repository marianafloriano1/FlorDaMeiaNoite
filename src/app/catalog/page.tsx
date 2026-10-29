import Image from "next/image";
import Link from "next/link";
import {
  catalogProductHref,
  filtersFromSearchParams,
  getCatalogLocale,
  readPublicCatalog,
} from "@/lib/catalog/service";
import type { PublicCatalogProduct } from "@/lib/catalog/types";
import { CATALOG_CATEGORIES, type CatalogLocale } from "@/lib/catalog/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;

function asSearchParams(input: SearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value)) for (const item of value) params.append(key, item);
  }
  return params;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function ProductCard({
  product,
  locale,
  preload = false,
}: {
  product: PublicCatalogProduct;
  locale: CatalogLocale;
  preload?: boolean;
}) {
  const image = product.photos[0];
  return (
    <article className="catalog-card">
      <Link className="catalog-card-image" href={catalogProductHref(product.slug, locale)}>
        {" "}
        {image ? (
          <Image
            src={image.url}
            alt={image.altText}
            fill
            preload={preload}
            unoptimized={
              image.url.startsWith("http://127.0.0.1:") || image.url.startsWith("http://localhost:")
            }
            sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
          />
        ) : (
          <span aria-hidden="true">Imagem não cadastrada</span>
        )}
      </Link>
      <div className="catalog-card-content">
        <p className="catalog-card-category">{product.category}</p>
        <h2>
          <Link href={catalogProductHref(product.slug, locale)}>{product.name}</Link>{" "}
        </h2>
        <p className="catalog-card-copy">{product.description || "Descrição não disponível."}</p>
        <p className="catalog-card-price">{formatPrice(product.priceBrl)}</p>
        <p className="catalog-card-availability">Disponível</p>
        {product.lowStockAlert && (
          <p className="catalog-low-stock-alert" role="status">
            Últimas unidades disponíveis.
          </p>
        )}
        <Link className="catalog-detail-link" href={catalogProductHref(product.slug, locale)}>
          Ver detalhes
        </Link>
      </div>
    </article>
  );
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = asSearchParams(await searchParams);
  const parsed = filtersFromSearchParams(params);
  const locale: CatalogLocale = getCatalogLocale(params.get("locale"));
  let products: PublicCatalogProduct[] = [];
  let unavailable = false;

  if (parsed.ok) {
    try {
      products = await readPublicCatalog(await getSupabaseServerClient(), parsed.filters, locale);
    } catch {
      unavailable = true;
    }
  }

  return (
    <main className="catalog-shell">
      <nav className="catalog-nav" aria-label="Navegação principal">
        <Link href="/">Flor da Meia-Noite</Link>
        <Link href="/auth">Entrar ou criar conta</Link>
      </nav>
      <header className="catalog-header">
        <p className="eyebrow">CATÁLOGO</p>
        <h1>Flores e objetos para florescer.</h1>
        <p className="description">
          Pesquise produtos e combine os filtros para encontrar o que procura.
        </p>
      </header>

      <section className="catalog-categories" aria-labelledby="categories-title">
        <h2 id="categories-title">Categorias</h2>
        <ul>
          {CATALOG_CATEGORIES.map((category) => (
            <li key={category}>{category}</li>
          ))}
        </ul>
      </section>

      <form
        className="catalog-filters"
        method="get"
        action="/catalog"
        aria-label="Busca e filtros do catálogo"
      >
        <label>
          Buscar
          <input name="q" type="search" maxLength={120} defaultValue={params.get("q") ?? ""} />
        </label>
        <label>
          Tipo de flor
          <input name="flowerType" maxLength={120} defaultValue={params.get("flowerType") ?? ""} />
        </label>
        <label>
          Cor
          <input name="color" maxLength={120} defaultValue={params.get("color") ?? ""} />
        </label>
        <label>
          Tamanho
          <input name="size" maxLength={120} defaultValue={params.get("size") ?? ""} />
        </label>
        <label>
          Materiais (separe por vírgula)
          <input name="materials" maxLength={240} defaultValue={params.get("materials") ?? ""} />
        </label>
        <label>
          Preço mínimo (R$)
          <input
            name="minPrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue={params.get("minPrice") ?? ""}
          />
        </label>
        <label>
          Preço máximo (R$)
          <input
            name="maxPrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue={params.get("maxPrice") ?? ""}
          />
        </label>
        <label>
          Idioma
          <select name="locale" defaultValue={locale}>
            <option value="pt-BR">Português</option>
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="ru">Русский</option>
          </select>
        </label>
        <div className="catalog-filter-actions">
          <button type="submit">Aplicar filtros</button>
          <Link href="/catalog">Limpar</Link>
        </div>
      </form>

      <section className="catalog-results" aria-labelledby="results-title">
        <h2 id="results-title">Produtos</h2>
        {!parsed.ok && (
          <p className="form-error" role="alert">
            A faixa de preço ou os filtros informados são inválidos.
          </p>
        )}
        {unavailable && (
          <p className="form-error" role="status">
            O catálogo está temporariamente indisponível. Você pode continuar navegando pelo site.
          </p>
        )}
        {!unavailable && parsed.ok && products.length === 0 && (
          <p className="catalog-empty">Nenhum produto disponível corresponde à busca.</p>
        )}
        {products.some((product) => product.contentLocale !== locale) && (
          <p className="catalog-fallback" role="status">
            Alguns conteúdos estão em português enquanto a tradução não está disponível.
          </p>
        )}
        <div className="catalog-grid">
          {products.map((product, index) => (
            <ProductCard
              key={product.slug}
              product={product}
              locale={locale}
              preload={index === 0}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
