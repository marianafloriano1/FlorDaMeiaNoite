import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductActions from "@/app/catalog/[slug]/product-actions";
import { getCatalogLocale, readPublicProduct } from "@/lib/catalog/service";
import type { PublicCatalogProduct } from "@/lib/catalog/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function ProductDetails({ product }: { product: PublicCatalogProduct }) {
  return (
    <>
      {product.photos.length > 0 && (
        <div className="product-gallery">
          {product.photos.map((photo, index) => (
            <figure key={photo.url} className="product-photo">
              <Image
                src={photo.url}
                alt={photo.altText}
                fill
                preload={index === 0}
                sizes="(max-width: 800px) 100vw, 50vw"
              />
            </figure>
          ))}
        </div>
      )}
      <p className="catalog-card-category">{product.category}</p>
      <h1>{product.name}</h1>
      <p className="description">{product.description || "Descrição não disponível."}</p>
      <p className="catalog-card-price">{formatPrice(product.priceBrl)}</p>
      <p>Disponível</p>
      <ProductActions productSlug={product.slug} />
      {product.lowStockAlert && (
        <p className="catalog-low-stock-alert" role="status">
          Últimas unidades disponíveis.
        </p>
      )}
      <dl className="product-attributes">
        <div>
          <dt>Tipo</dt>
          <dd>{product.productType}</dd>
        </div>
        <div>
          <dt>Cores</dt>
          <dd>
            {product.colors.length ? product.colors.join(", ") : "Informação não disponível."}
          </dd>
        </div>
        <div>
          <dt>Ocasião</dt>
          <dd>{product.occasion || "Informação não disponível."}</dd>
        </div>
        <div>
          <dt>Tamanho</dt>
          <dd>{product.size || "Informação não disponível."}</dd>
        </div>
        <div>
          <dt>Materiais</dt>
          <dd>
            {product.materials.length ? product.materials.join(", ") : "Informação não disponível."}
          </dd>
        </div>
        <div>
          <dt>Instruções de cuidado</dt>
          <dd>{product.careInstructions}</dd>
        </div>
        <div>
          <dt>Significado das flores</dt>
          <dd>{product.flowerMeaning}</dd>
        </div>
        <div>
          <dt>Toxicidade para animais</dt>
          <dd>{product.petToxicity}</dd>
        </div>
        <div>
          <dt>Prazo de validade/perda</dt>
          <dd>{product.shelfLife}</dd>
        </div>
      </dl>
      {product.contentLocale === "pt-BR" && (
        <p className="catalog-fallback" role="status">
          Conteúdo em português (fallback).
        </p>
      )}
    </>
  );
}

export default async function CatalogProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  let product: PublicCatalogProduct | null = null;
  let unavailable = false;
  try {
    product = await readPublicProduct(
      await getSupabaseServerClient(),
      slug,
      getCatalogLocale(query.locale ?? null),
    );
  } catch {
    unavailable = true;
  }

  return (
    <main className="catalog-shell">
      <nav className="catalog-nav" aria-label="Navegação principal">
        <Link href="/">Flor da Meia-Noite</Link>
        <Link href="/catalog">Voltar ao catálogo</Link>
        <Link href="/cart">Carrinho</Link>
      </nav>
      {unavailable ? (
        <section className="intro" role="status">
          <h1>Produto temporariamente indisponível</h1>
          <p className="description">
            O catálogo não pôde ser carregado. Tente novamente mais tarde.
          </p>
        </section>
      ) : product ? (
        <ProductDetails product={product} />
      ) : (
        notFound()
      )}
    </main>
  );
}
