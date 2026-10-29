import type { CreatedOrder } from "./types";

const PHONE_E164 = /^\+[1-9]\d{7,14}$/;
const formatBrl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function buildWhatsAppOrderLink(order: CreatedOrder, origin: string): string | null {
  const storeNumber = process.env.WHATSAPP_STORE_NUMBER;
  if (!storeNumber || !PHONE_E164.test(storeNumber)) return null;
  const itemSummary = order.items
    .map((item) => `${item.product_name} x ${item.quantity}`)
    .join(", ");
  const trackingUrl = new URL(`/orders/${order.reference}`, origin).toString();
  const message = [
    `Olá! Quero acompanhar o pedido ${order.reference}.`,
    `Itens: ${itemSummary}.`,
    `Total: ${formatBrl.format(order.total_brl)}.`,
    `Acompanhe: ${trackingUrl}`,
  ].join(" ");
  const digits = storeNumber.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
