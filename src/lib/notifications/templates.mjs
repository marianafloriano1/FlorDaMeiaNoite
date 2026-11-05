import { resolveNotificationLocale } from "./schedule.mjs";

const statusLabels = {
  "pt-BR": {
    awaiting_payment: "aguardando pagamento",
    preparing: "em preparo",
    ready_for_pickup: "pronto para retirada",
    picked_up: "retirado",
    cancelled: "cancelado",
    resolved: "concluído",
  },
  en: {
    awaiting_payment: "awaiting payment",
    preparing: "being prepared",
    ready_for_pickup: "ready for pickup",
    picked_up: "picked up",
    cancelled: "cancelled",
    resolved: "resolved",
  },
  es: {
    awaiting_payment: "pendiente de pago",
    preparing: "en preparación",
    ready_for_pickup: "listo para recoger",
    picked_up: "retirado",
    cancelled: "cancelado",
    resolved: "completado",
  },
  ru: {
    awaiting_payment: "ожидает оплаты",
    preparing: "готовится",
    ready_for_pickup: "готов к выдаче",
    picked_up: "получен",
    cancelled: "отменён",
    resolved: "завершён",
  },
};

const copy = {
  "pt-BR": {
    order_created: ["Pedido recebido", "Recebemos seu pedido."],
    order_status: ["Atualização do pedido", "O status do seu pedido foi atualizado."],
    ready_for_pickup: ["Pedido pronto para retirada", "Seu pedido está pronto para retirada."],
    pickup_reminder_24h: [
      "Lembrete de retirada",
      "Sua retirada está prevista para aproximadamente 24 horas.",
    ],
    pickup_reminder_1h: [
      "Lembrete de retirada",
      "Sua retirada está prevista para aproximadamente 1 hora.",
    ],
    perishable_daily: [
      "Lembrete de retirada",
      "Há um item perecível aguardando retirada no pedido.",
    ],
  },
  en: {
    order_created: ["Order received", "We received your order."],
    order_status: ["Order update", "Your order status was updated."],
    ready_for_pickup: ["Order ready for pickup", "Your order is ready for pickup."],
    pickup_reminder_24h: [
      "Pickup reminder",
      "Your pickup is scheduled for approximately 24 hours from now.",
    ],
    pickup_reminder_1h: [
      "Pickup reminder",
      "Your pickup is scheduled for approximately 1 hour from now.",
    ],
    perishable_daily: ["Pickup reminder", "A perishable item in your order is awaiting pickup."],
  },
  es: {
    order_created: ["Pedido recibido", "Recibimos tu pedido."],
    order_status: ["Actualización del pedido", "El estado de tu pedido se ha actualizado."],
    ready_for_pickup: ["Pedido listo para recoger", "Tu pedido está listo para recoger."],
    pickup_reminder_24h: [
      "Recordatorio de recogida",
      "La recogida está prevista para dentro de aproximadamente 24 horas.",
    ],
    pickup_reminder_1h: [
      "Recordatorio de recogida",
      "La recogida está prevista para dentro de aproximadamente 1 hora.",
    ],
    perishable_daily: [
      "Recordatorio de recogida",
      "Hay un artículo perecedero del pedido pendiente de recogida.",
    ],
  },
  ru: {
    order_created: ["Заказ получен", "Мы получили ваш заказ."],
    order_status: ["Обновление заказа", "Статус вашего заказа обновлён."],
    ready_for_pickup: ["Заказ готов к выдаче", "Ваш заказ готов к выдаче."],
    pickup_reminder_24h: [
      "Напоминание о получении",
      "Получение запланировано примерно через 24 часа.",
    ],
    pickup_reminder_1h: [
      "Напоминание о получении",
      "Получение запланировано примерно через 1 час.",
    ],
    perishable_daily: [
      "Напоминание о получении",
      "В заказе есть скоропортящийся товар, ожидающий получения.",
    ],
  },
};

const labels = {
  "pt-BR": { reference: "Referência", status: "Status", pickup: "Retirada" },
  en: { reference: "Reference", status: "Status", pickup: "Pickup" },
  es: { reference: "Referencia", status: "Estado", pickup: "Recogida" },
  ru: { reference: "Номер", status: "Статус", pickup: "Получение" },
};

function formatPickupTime(value, locale) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("invalid_notification_pickup_at");
  return new Intl.DateTimeFormat(locale, {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function renderNotification(input) {
  if (!/^[0-9a-f-]{36}$/i.test(input.orderReference))
    throw new Error("invalid_notification_order_reference");
  const locale = resolveNotificationLocale(input.locale);
  const template = copy[locale]?.[input.type];
  if (!template) throw new Error("invalid_notification_type");
  const label = labels[locale];
  const lines = [template[1], `${label.reference}: ${input.orderReference}`];
  if (input.type === "order_status") {
    const status = input.orderStatus ? statusLabels[locale][input.orderStatus] : undefined;
    if (!status) throw new Error("invalid_notification_order_status");
    lines.push(`${label.status}: ${status}`);
  }
  if (input.scheduledPickupAt)
    lines.push(`${label.pickup}: ${formatPickupTime(input.scheduledPickupAt, locale)}`);
  return { subject: template[0], text: lines.join("\n") };
}
