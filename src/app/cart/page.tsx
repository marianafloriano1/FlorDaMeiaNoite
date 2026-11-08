"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CreatedOrder, OrderQuote } from "@/lib/orders/types";

type CartItem = {
  productId: string;
  quantity: number;
  product: { id: string; slug: string; name: string; price_brl: number } | null;
};

type Reservation = { id: string; status: string; expires_at: string };
type SavedOrder = CreatedOrder & {
  payment_confirmed_at?: string | null;
  preparation_window_start?: string | null;
  preparation_window_end?: string | null;
  cancellation_reason?: string | null;
};
type OrderLink = { order: CreatedOrder; whatsappUrl: string | null };

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [orderLink, setOrderLink] = useState<OrderLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [authenticated, setAuthenticated] = useState(true);
  const [message, setMessage] = useState("");
  const idempotencyKey = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cartResponse, reservationResponse, ordersResponse] = await Promise.all([
        fetch("/api/cart", { cache: "no-store" }),
        fetch("/api/reservations", { cache: "no-store" }),
        fetch("/api/orders", { cache: "no-store" }),
      ]);
      if (
        [cartResponse, reservationResponse, ordersResponse].some(
          (response) => response.status === 401,
        )
      ) {
        setAuthenticated(false);
        return;
      }
      if (!cartResponse.ok || !reservationResponse.ok || !ordersResponse.ok) {
        setMessage("Não foi possível carregar o carrinho e os pedidos.");
        return;
      }
      const cart = (await cartResponse.json()) as { items: CartItem[] };
      const current = (await reservationResponse.json()) as { reservation: Reservation | null };
      const saved = (await ordersResponse.json()) as { orders: SavedOrder[] };
      const activeReservation =
        current.reservation && new Date(current.reservation.expires_at).getTime() > Date.now()
          ? current.reservation
          : null;
      setItems(cart.items);
      setReservation(activeReservation);
      setOrders(saved.orders);
      setSelected(new Set(cart.items.filter((item) => item.product).map((item) => item.productId)));
      if (orderLink && !saved.orders.some((order) => order.id === orderLink.order.id))
        setOrderLink(null);
    } catch {
      setMessage("Não foi possível carregar o carrinho e os pedidos.");
    } finally {
      setLoading(false);
    }
  }, [orderLink]);

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
        body: JSON.stringify({ productIds: [...selected], idempotencyKey: idempotencyKey.current }),
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
        setQuote(null);
        setConsent(false);
        idempotencyKey.current = null;
        setMessage(
          "Reserva temporária criada. Nenhum estoque foi movimentado novamente pelo pedido.",
        );
        await load();
      } else if (body.error === "active_reservation_exists")
        setMessage("Você já possui uma reserva ativa.");
      else if (body.error === "product_unavailable")
        setMessage("Um ou mais produtos ficaram indisponíveis. Atualize o carrinho.");
      else setMessage("Não foi possível criar a reserva. Tente novamente.");
    } catch {
      setMessage("Não foi possível criar a reserva. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  async function reviewOrder() {
    if (!reservation) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/orders/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: reservation.id,
          couponCode: couponCode.trim() || null,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        quote?: OrderQuote;
        error?: string;
      };
      if (response.ok && body.quote) {
        setQuote(body.quote);
        setConsent(false);
        idempotencyKey.current = crypto.randomUUID();
      } else if (body.error === "reservation_expired") {
        setReservation(null);
        setMessage("A reserva expirou e o estoque foi liberado. Faça uma nova seleção.");
        await load();
      } else setMessage("Não foi possível calcular o total atual do pedido.");
    } catch {
      setMessage("Não foi possível calcular o total atual do pedido.");
    } finally {
      setPending(false);
    }
  }

  async function confirmOrder() {
    if (!quote || !consent) return;
    setPending(true);
    setMessage("");
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.quote_id,
          idempotencyKey: idempotencyKey.current,
          consent,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        order?: CreatedOrder;
        whatsappUrl?: string | null;
        error?: string;
      };
      if (response.ok && body.order) {
        setOrderLink({ order: body.order, whatsappUrl: body.whatsappUrl ?? null });
        setQuote(null);
        setConsent(false);
        setMessage(
          body.whatsappUrl
            ? "Pedido criado. Revise e envie manualmente a mensagem no WhatsApp; isso não confirma pagamento."
            : "Pedido criado. O WhatsApp não está disponível; você pode acompanhar o pedido nesta página.",
        );
        await load();
      } else if (body.error === "order_quote_changed") {
        setMessage(
          "O preço mudou novamente. Revise a nova diferença e confirme o total atualizado.",
        );
        await reviewOrder();
      } else if (body.error === "reservation_expired") {
        setQuote(null);
        setReservation(null);
        setMessage("A reserva expirou. O pedido não foi criado e o estoque foi liberado.");
        await load();
      } else setMessage("Não foi possível criar o pedido. Confira a reserva e tente novamente.");
    } catch {
      setMessage("Não foi possível criar o pedido. Tente novamente.");
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
        setQuote(null);
        idempotencyKey.current = null;
        setMessage("Reserva cancelada e disponibilidade liberada.");
      }
    } catch {
      setMessage("Não foi possível cancelar a reserva.");
    } finally {
      setPending(false);
    }
  }

  const orderForReservation = reservation
    ? orders.find((order) => order.reservation_id === reservation.id)
    : null;

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
          {!orderForReservation && (
            <button type="button" disabled={pending} onClick={() => void cancelReservation()}>
              Cancelar reserva
            </button>
          )}
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
              {item.product && <span>Preço unitário: {brl.format(item.product.price_brl)}</span>}
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
      {reservation && !orderForReservation && !quote && (
        <section className="intro" aria-label="Cupom e cotação">
          <label htmlFor="coupon-code">Cupom (opcional)</label>
          <input
            id="coupon-code"
            value={couponCode}
            maxLength={40}
            autoComplete="off"
            onChange={(event) => setCouponCode(event.target.value)}
          />
          <button type="button" disabled={pending} onClick={() => void reviewOrder()}>
            Revisar total e criar pedido
          </button>
        </section>
      )}
      {quote && (
        <section className="intro" aria-labelledby="quote-title">
          <h2 id="quote-title">Revise o pedido</h2>
          <ul>
            {quote.items.map((line) => (
              <li key={line.product_id}>
                {line.product_name} × {line.quantity}: {brl.format(line.current_unit_price_brl)} por
                unidade
                {line.selected_unit_price_brl !== line.current_unit_price_brl && (
                  <strong>
                    {" "}
                    — preço mudou de {brl.format(line.selected_unit_price_brl)} para{" "}
                    {brl.format(line.current_unit_price_brl)}
                  </strong>
                )}
              </li>
            ))}
          </ul>
          <p>
            Subtotal: <strong>{brl.format(quote.subtotal_brl ?? quote.total_brl)}</strong>
          </p>
          {quote.coupon && (
            <p>
              Cupom {quote.coupon.code}: desconto de{" "}
              <strong>{brl.format(quote.coupon.discount_brl)}</strong>
            </p>
          )}
          <p>
            Total atual: <strong>{brl.format(quote.total_brl)}</strong>
          </p>
          {quote.price_changed && (
            <p role="status">
              O preço de um ou mais itens mudou desde a seleção da reserva. Confirme o novo total
              para prosseguir.
            </p>
          )}
          <label>
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />{" "}
            Confirmo o total de {brl.format(quote.total_brl)}.
          </label>
          <button type="button" disabled={pending || !consent} onClick={() => void confirmOrder()}>
            Confirmar pedido e abrir WhatsApp
          </button>
        </section>
      )}
      {orderForReservation && (
        <section className="intro" aria-labelledby="pending-order-title">
          <h2 id="pending-order-title">Pedido aguardando pagamento</h2>
          <p>Referência: {orderForReservation.reference}</p>
          <p>Total: {brl.format(orderForReservation.total_brl)}</p>
          {orderForReservation.discount_brl ? (
            <p>
              Cupom {orderForReservation.coupon_code}: desconto{" "}
              {brl.format(orderForReservation.discount_brl)}
            </p>
          ) : null}
          <Link href={`/orders/${orderForReservation.reference}`}>Acompanhar pedido</Link>
        </section>
      )}
      {orderLink && (
        <section className="intro" aria-label="Pedido criado">
          <Link href={`/orders/${orderLink.order.reference}`}>
            Acompanhar pedido {orderLink.order.reference}
          </Link>
          {orderLink.whatsappUrl ? (
            <p>
              <a href={orderLink.whatsappUrl} target="_blank" rel="noreferrer">
                Abrir mensagem pré-preenchida no WhatsApp
              </a>
            </p>
          ) : null}
        </section>
      )}
      {orders
        .filter((order) => order.status === "cancelled")
        .map((order) => (
          <section className="intro" key={order.id}>
            <h2>Pedido cancelado</h2>
            <p>Referência: {order.reference}</p>
            <Link href={`/orders/${order.reference}`}>Ver detalhes</Link>
          </section>
        ))}
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
    </main>
  );
}
