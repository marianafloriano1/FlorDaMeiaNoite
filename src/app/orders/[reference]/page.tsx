"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const labels: Record<string, string> = {
  awaiting_payment: "Aguardando pagamento",
  preparing: "Em preparo",
  ready_for_pickup: "Pronto para retirada",
  picked_up: "Retirado com sucesso",
  cancelled: "Cancelado",
};

type Detail = {
  order: {
    status: string;
    total_brl: number;
    payment_confirmed_at: string | null;
    preparation_window_start: string | null;
    preparation_window_end: string | null;
    cancellation_reason: string | null;
    created_at: string;
  };
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price_brl: number;
  }>;
  events: Array<{
    id: string;
    event_type: string;
    from_status: string | null;
    to_status: string | null;
    created_at: string;
  }>;
  cancellationPolicyText: string | null;
};

export default function OrderTrackingPage() {
  const params = useParams<{ reference: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [message, setMessage] = useState("Carregando pedido…");

  useEffect(() => {
    let active = true;
    void fetch(`/api/orders/${params.reference}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error("order_unavailable");
        return body as Detail;
      })
      .then((body) => {
        if (active) {
          setDetail(body);
          setMessage("");
        }
      })
      .catch(() => {
        if (active) setMessage("Não foi possível localizar este pedido.");
      });
    return () => {
      active = false;
    };
  }, [params.reference]);

  return (
    <main className="catalog-shell">
      <nav className="catalog-nav">
        <Link href="/">Flor da Meia-Noite</Link>
        <Link href="/cart">Carrinho</Link>
      </nav>
      <header className="catalog-header">
        <p className="eyebrow">SUA CONTA</p>
        <h1>Acompanhar pedido</h1>
      </header>
      {!detail ? (
        <p role="status">{message}</p>
      ) : (
        <section className="intro">
          <h2>{labels[detail.order.status] ?? "Pedido"}</h2>
          {detail.order.payment_confirmed_at &&
            detail.order.preparation_window_start &&
            detail.order.preparation_window_end && (
              <p>
                Pagamento confirmado. Janela estimada para início do preparo:{" "}
                {new Date(detail.order.preparation_window_start).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
                –
                {new Date(detail.order.preparation_window_end).toLocaleTimeString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
                .
              </p>
            )}
          {detail.order.cancellation_reason === "reservation_expired" && (
            <p>
              A reserva expirou antes da confirmação do pagamento; o pedido foi cancelado e a
              disponibilidade liberada.
            </p>
          )}
          {detail.order.status === "awaiting_payment" && (
            <section aria-labelledby="cancellation-policy-title">
              <h3 id="cancellation-policy-title">Política de cancelamento antes do pagamento</h3>
              {detail.cancellationPolicyText ? (
                <p>{detail.cancellationPolicyText}</p>
              ) : (
                <p>
                  A política da loja ainda não foi configurada. O pagamento não pode ser confirmado
                  enquanto esse texto não estiver disponível.
                </p>
              )}
            </section>
          )}
          <ul>
            {detail.items.map((item) => (
              <li key={item.product_id}>
                {item.product_name} × {item.quantity} —{" "}
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                  item.unit_price_brl,
                )}
              </li>
            ))}
          </ul>
          <p>
            Total:{" "}
            <strong>
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                detail.order.total_brl,
              )}
            </strong>
          </p>
          <h3>Histórico</h3>
          <ol>
            {detail.events.map((event) => (
              <li key={event.id}>
                {event.to_status ? (labels[event.to_status] ?? event.event_type) : event.event_type}{" "}
                —{" "}
                {new Date(event.created_at).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
