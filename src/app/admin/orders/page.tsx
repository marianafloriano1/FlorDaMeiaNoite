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
  scheduled_pickup_at: string | null;
  items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price_brl: number;
    perishability: "perishable" | "non_perishable" | null;
    line_status: "open" | "picked_up" | "cancelled" | "discarded";
    quantity_used: number;
  }>;
  inspection: { items_confirmed: boolean; approved_at: string | null } | null;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [role, setRole] = useState<"employee" | "admin" | null>(null);
  const [pickupDates, setPickupDates] = useState<Record<string, string>>({});
  const [usedQuantities, setUsedQuantities] = useState<Record<string, number>>({});
  const [agreements, setAgreements] = useState<Record<string, boolean>>({});
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
    setRole(body.role ?? null);
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

  function dateInputValue(value: string | null) {
    if (!value) return "";
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(value));
    const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
  }

  function pickupIso(value: string) {
    return value ? new Date(`${value}:00-03:00`).toISOString() : "";
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
            <p>
              Retirada agendada:{" "}
              {order.scheduled_pickup_at
                ? new Date(order.scheduled_pickup_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })
                : "a definir"}
            </p>
            {role === "admin" &&
              order.status !== "picked_up" &&
              order.status !== "cancelled" &&
              order.status !== "resolved" && (
                <div>
                  <label>
                    Data e hora acordadas para retirada (America/Sao_Paulo)
                    <input
                      type="datetime-local"
                      value={pickupDates[order.id] ?? dateInputValue(order.scheduled_pickup_at)}
                      onChange={(event) =>
                        setPickupDates((current) => ({
                          ...current,
                          [order.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy || !pickupDates[order.id]}
                    onClick={() =>
                      void act(order.id, {
                        action: "schedule_pickup",
                        scheduledPickupAt: pickupIso(pickupDates[order.id] ?? ""),
                      })
                    }
                  >
                    Salvar agenda de retirada
                  </button>
                </div>
              )}
            <ul>
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.product_name} × {item.quantity} — {item.line_status}
                  {role === "admin" && item.line_status === "open" && (
                    <>
                      <label>
                        Classificação da linha
                        <select
                          value={item.perishability ?? ""}
                          onChange={(event) => {
                            if (event.target.value)
                              void act(order.id, {
                                action: "classify_item",
                                orderItemId: item.id,
                                perishable: event.target.value === "perishable",
                              });
                          }}
                        >
                          <option value="">Classificar…</option>
                          <option value="perishable">Perecível</option>
                          <option value="non_perishable">Não perecível</option>
                        </select>
                      </label>
                      {item.perishability === "perishable" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void act(order.id, {
                              action: "discard_perishable_item",
                              orderItemId: item.id,
                            })
                          }
                        >
                          Registrar descarte após o prazo
                        </button>
                      )}
                      {item.perishability === "non_perishable" && (
                        <div>
                          <label>
                            Quantidade usada
                            <input
                              type="number"
                              min={0}
                              max={item.quantity}
                              value={usedQuantities[item.id] ?? 0}
                              onChange={(event) =>
                                setUsedQuantities((current) => ({
                                  ...current,
                                  [item.id]: Number(event.target.value),
                                }))
                              }
                            />
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={agreements[order.id] ?? false}
                              onChange={(event) =>
                                setAgreements((current) => ({
                                  ...current,
                                  [order.id]: event.target.checked,
                                }))
                              }
                            />
                            Acordo de cancelamento confirmado com o cliente
                          </label>
                          <button
                            type="button"
                            disabled={busy || !agreements[order.id]}
                            onClick={() =>
                              void act(order.id, {
                                action: "cancel_nonperishable_item",
                                orderItemId: item.id,
                                quantityUsed: usedQuantities[item.id] ?? 0,
                                customerAgreementConfirmed: agreements[order.id] ?? false,
                              })
                            }
                          >
                            Cancelar linha não perecível após 7 dias
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void act(order.id, {
                            action: "record_issue",
                            orderItemId: item.id,
                            issueType: "defect",
                            idempotencyKey: crypto.randomUUID(),
                          })
                        }
                      >
                        Registrar defeito
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void act(order.id, {
                            action: "record_issue",
                            orderItemId: item.id,
                            issueType: "damage",
                            idempotencyKey: crypto.randomUUID(),
                          })
                        }
                      >
                        Registrar avaria
                      </button>
                    </>
                  )}
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
            {role === "admin" &&
              order.status === "awaiting_payment" &&
              !order.payment_confirmed_at && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act(order.id, { action: "cancel" })}
                >
                  Cancelar pedido não pago (admin)
                </button>
              )}
            {order.payment_confirmed_at &&
              role === "admin" &&
              ["awaiting_payment", "preparing", "ready_for_pickup"].includes(order.status) && (
                <div>
                  <label>
                    <input
                      type="checkbox"
                      checked={agreements[order.id] ?? false}
                      onChange={(event) =>
                        setAgreements((current) => ({
                          ...current,
                          [order.id]: event.target.checked,
                        }))
                      }
                    />
                    Acordo de cancelamento confirmado com o cliente (não armazene o conteúdo da
                    conversa)
                  </label>
                  <button
                    type="button"
                    disabled={busy || !agreements[order.id]}
                    onClick={() =>
                      void act(order.id, {
                        action: "cancel",
                        customerAgreementConfirmed: true,
                        usedQuantities: order.items
                          .filter((item) => item.line_status === "open")
                          .map((item) => ({
                            orderItemId: item.id,
                            quantityUsed: usedQuantities[item.id] ?? 0,
                          })),
                      })
                    }
                  >
                    Cancelar pedido pago e devolver somente itens não usados
                  </button>
                </div>
              )}
          </li>
        ))}
      </ul>
    </main>
  );
}
