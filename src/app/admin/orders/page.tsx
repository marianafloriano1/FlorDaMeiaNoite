"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type AdminOrder = {
  id: string;
  public_reference: string;
  status: string;
  total_brl: number;
  payment_confirmed_at: string | null;
  preparation_window_start: string | null;
  preparation_window_end: string | null;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price_brl: number;
  }>;
  inspection: { items_confirmed: boolean; approved_at: string | null } | null;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [message, setMessage] = useState("Carregando pedidos…");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/orders", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage("Não foi possível carregar a fila de pedidos.");
      return;
    }
    setOrders(body.orders ?? []);
    setMessage("");
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function act(orderId: string, action: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(
          body.error === "admin_mfa_required"
            ? "Faça a verificação MFA para executar esta ação."
            : "A ação não foi autorizada ou o pedido mudou de estado.",
        );
      } else await load();
    } catch {
      setMessage("Não foi possível atualizar o pedido.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="catalog-shell">
      <nav className="catalog-nav">
        <Link href="/">Flor da Meia-Noite</Link>
        <Link href="/profile">Perfil</Link>
      </nav>
      <header className="catalog-header">
        <p className="eyebrow">OPERAÇÃO</p>
        <h1>Fila de pedidos</h1>
      </header>
      {message && <p role="status">{message}</p>}
      <ul className="catalog-grid">
        {orders.map((order) => (
          <li className="catalog-card" key={order.id}>
            <h2>Pedido {order.public_reference}</h2>
            <p>Estado: {order.status}</p>
            <p>
              Total:{" "}
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                order.total_brl,
              )}
            </p>
            <ul>
              {order.items.map((item) => (
                <li key={item.product_id}>
                  {item.product_name} × {item.quantity}
                </li>
              ))}
            </ul>
            {!order.inspection && order.status === "awaiting_payment" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void act(order.id, { action: "inspect", itemsConfirmed: true })}
              >
                Registrar conferência dos itens
              </button>
            )}
            {order.inspection?.items_confirmed && !order.inspection.approved_at && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void act(order.id, { action: "approve_inspection" })}
              >
                Aprovar conferência (admin)
              </button>
            )}
            {order.inspection?.approved_at && !order.payment_confirmed_at && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void act(order.id, { action: "confirm_payment" })}
              >
                Confirmar pagamento manual (admin)
              </button>
            )}
            {order.payment_confirmed_at && order.status === "awaiting_payment" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void act(order.id, { action: "transition", status: "preparing" })}
              >
                Iniciar preparo
              </button>
            )}
            {order.status === "preparing" && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void act(order.id, { action: "transition", status: "ready_for_pickup" })
                }
              >
                Marcar pronto para retirada
              </button>
            )}
            {order.status === "ready_for_pickup" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void act(order.id, { action: "transition", status: "picked_up" })}
              >
                Registrar retirada
              </button>
            )}
            {order.status === "awaiting_payment" && !order.payment_confirmed_at && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void act(order.id, { action: "cancel" })}
              >
                Cancelar pedido não pago (admin)
              </button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
