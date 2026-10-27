"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type CartItem = {
  productId: string;
  quantity: number;
  product: { id: string; slug: string; name: string; price_brl: number } | null;
};

type Reservation = {
  id: string;
  status: string;
  expires_at: string;
};

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [authenticated, setAuthenticated] = useState(true);
  const [message, setMessage] = useState("");
  const idempotencyKey = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cartResponse, reservationResponse] = await Promise.all([
        fetch("/api/cart", { cache: "no-store" }),
        fetch("/api/reservations", { cache: "no-store" }),
      ]);
      if (cartResponse.status === 401 || reservationResponse.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (!cartResponse.ok || !reservationResponse.ok) {
        setMessage("Não foi possível carregar o carrinho.");
        return;
      }
      const cart = (await cartResponse.json()) as { items: CartItem[] };
      const current = (await reservationResponse.json()) as { reservation: Reservation | null };
      setItems(cart.items);
      setReservation(
        current.reservation && new Date(current.reservation.expires_at).getTime() > Date.now()
          ? current.reservation
          : null,
      );
      setSelected(new Set(cart.items.filter((item) => item.product).map((item) => item.productId)));
    } catch {
      setMessage("Não foi possível carregar o carrinho.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(productId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  async function createReservation() {
    if (!selected.size) return;
    setPending(true);
    setMessage("");
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: [...selected],
          idempotencyKey: idempotencyKey.current,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        reservation?: Reservation;
        error?: string;
      };
      if (response.status === 401) {
        setAuthenticated(false);
        setMessage("Entre na sua conta para criar uma reserva.");
      } else if (response.ok && body.reservation) {
        setReservation(body.reservation);
        idempotencyKey.current = null;
        setMessage("Reserva temporária criada. Nenhum pedido ou pagamento foi iniciado.");
      } else if (body.error === "active_reservation_exists") {
        setMessage("Você já possui uma reserva ativa.");
      } else if (body.error === "product_unavailable") {
        setMessage("Um ou mais produtos ficaram indisponíveis. Atualize o carrinho.");
      } else {
        setMessage("Não foi possível criar a reserva. Tente novamente.");
      }
    } catch {
      setMessage("Não foi possível criar a reserva. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  async function removeItem(productId: string) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/cart/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!response.ok) setMessage("Não foi possível remover o produto do carrinho.");
      else await load();
    } catch {
      setMessage("Não foi possível remover o produto do carrinho.");
    } finally {
      setPending(false);
    }
  }
  async function cancelReservation() {
    if (!reservation) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/reservations/${reservation.id}`, { method: "DELETE" });
      if (!response.ok) {
        setMessage("A reserva não está mais ativa ou não pôde ser cancelada.");
        await load();
      } else {
        setReservation(null);
        idempotencyKey.current = null;
        setMessage("Reserva cancelada e disponibilidade liberada.");
      }
    } catch {
      setMessage("Não foi possível cancelar a reserva.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="catalog-shell">
      <nav className="catalog-nav" aria-label="Navegação principal">
        <Link href="/">Flor da Meia-Noite</Link>
        <Link href="/catalog">Voltar ao catálogo</Link>
      </nav>
      <header className="catalog-header">
        <p className="eyebrow">SUA CONTA</p>
        <h1>Carrinho</h1>
        <p className="description">Selecione os produtos que deseja reservar por três horas.</p>
      </header>

      {!authenticated && (
        <p className="form-error" role="status">
          Entre na sua conta para usar o carrinho. <Link href="/auth">Entrar ou criar conta</Link>
        </p>
      )}
      {loading ? <p role="status">Carregando carrinho…</p> : null}
      {reservation && (
        <section className="intro" aria-labelledby="reservation-title">
          <h2 id="reservation-title">Reserva ativa</h2>
          <p>
            Expira em{" "}
            {new Date(reservation.expires_at).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            })}
            .
          </p>
          <button type="button" disabled={pending} onClick={() => void cancelReservation()}>
            Cancelar reserva
          </button>
        </section>
      )}
      {!loading && authenticated && !items.length && <p>Seu carrinho está vazio.</p>}
      <ul className="catalog-grid">
        {items.map((item) => (
          <li className="catalog-card" key={item.productId}>
            <div className="catalog-card-content">
              <label>
                <input
                  type="checkbox"
                  checked={selected.has(item.productId)}
                  disabled={!item.product || Boolean(reservation)}
                  onChange={() => toggle(item.productId)}
                />
                <span>{item.product?.name ?? "Produto indisponível no catálogo"}</span>
              </label>
              <span>Quantidade: {item.quantity}</span>
              {item.product && (
                <span>
                  Preço unitário:{" "}
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    item.product.price_brl,
                  )}
                </span>
              )}
              <button
                type="button"
                disabled={pending || Boolean(reservation)}
                onClick={() => void removeItem(item.productId)}
              >
                Remover
              </button>
            </div>
            {!item.product && (
              <p className="form-error">Este produto não está disponível para reserva.</p>
            )}
          </li>
        ))}
      </ul>
      <div className="catalog-filter-actions">
        <button
          type="button"
          disabled={pending || loading || !authenticated || !selected.size || Boolean(reservation)}
          onClick={() => void createReservation()}
        >
          Reservar itens selecionados
        </button>
      </div>
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
    </main>
  );
}
