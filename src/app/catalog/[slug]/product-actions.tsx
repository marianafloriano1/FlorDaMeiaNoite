"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ProductActions({ productSlug }: { productSlug: string }) {
  const [favorite, setFavorite] = useState(false);
  const [authenticated, setAuthenticated] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/favorites", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          setAuthenticated(false);
          return null;
        }
        if (!response.ok) return null;
        return (await response.json()) as {
          items?: Array<{ product: { slug: string } | null }>;
        };
      })
      .then((body) => {
        if (body?.items) setFavorite(body.items.some((item) => item.product?.slug === productSlug));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [productSlug]);

  async function saveFavorite() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/favorites", {
        method: favorite ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSlug }),
      });
      if (response.status === 401) {
        setAuthenticated(false);
        setMessage("Entre na sua conta para usar os favoritos.");
      } else if (!response.ok) {
        setMessage("Não foi possível atualizar os favoritos. Tente novamente.");
      } else {
        setFavorite(!favorite);
        setMessage(favorite ? "Removido dos favoritos." : "Adicionado aos favoritos.");
      }
    } catch {
      setMessage("Não foi possível atualizar os favoritos. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  async function addToCart() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/cart/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSlug, quantity: 1 }),
      });
      if (response.status === 401) {
        setAuthenticated(false);
        setMessage("Entre na sua conta para usar o carrinho.");
      } else if (!response.ok) {
        setMessage("Não foi possível adicionar o produto ao carrinho.");
      } else {
        setMessage("Produto adicionado ao carrinho.");
      }
    } catch {
      setMessage("Não foi possível adicionar o produto ao carrinho.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-label="Ações do produto" className="product-actions">
      <div className="catalog-filter-actions">
        <button type="button" disabled={pending} onClick={() => void addToCart()}>
          Adicionar ao carrinho
        </button>
        <button type="button" disabled={pending} onClick={() => void saveFavorite()}>
          {favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        </button>
        <Link href="/cart">Ver carrinho</Link>
      </div>
      {message && (
        <p className={authenticated ? "form-message" : "form-error"} role="status">
          {message}
        </p>
      )}
      {!authenticated && (
        <p>
          <Link href="/auth">Entrar ou criar conta</Link>
        </p>
      )}
    </section>
  );
}
