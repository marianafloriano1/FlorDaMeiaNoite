const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseUuid(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

export function parseOrderQuoteInput(value: unknown): { reservationId: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const reservationId = parseUuid((value as Record<string, unknown>).reservationId);
  return reservationId ? { reservationId } : null;
}

export function parseCreateOrderInput(value: unknown): {
  quoteId: string;
  idempotencyKey: string;
  consent: boolean;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const quoteId = parseUuid(body.quoteId);
  const idempotencyKey = parseUuid(body.idempotencyKey);
  if (!quoteId || !idempotencyKey || body.consent !== true) return null;
  return { quoteId, idempotencyKey, consent: true };
}

export function parseAdminOrderAction(value: unknown):
  | { action: "inspect"; itemsConfirmed: boolean }
  | { action: "approve_inspection" }
  | { action: "confirm_payment" }
  | {
      action: "cancel";
      usedQuantities: Array<{ orderItemId: string; quantityUsed: number }>;
      customerAgreementConfirmed: boolean;
    }
  | { action: "schedule_pickup"; scheduledPickupAt: string }
  | { action: "classify_item"; orderItemId: string; perishable: boolean }
  | {
      action: "cancel_nonperishable_item";
      orderItemId: string;
      quantityUsed: number;
      customerAgreementConfirmed: boolean;
    }
  | { action: "discard_perishable_item"; orderItemId: string }
  | {
      action: "record_issue";
      orderItemId: string;
      issueType: "defect" | "damage";
      idempotencyKey: string;
    }
  | { action: "transition"; status: "preparing" | "ready_for_pickup" | "picked_up" }
  | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (body.action === "inspect" && typeof body.itemsConfirmed === "boolean")
    return { action: "inspect", itemsConfirmed: body.itemsConfirmed };
  if (body.action === "approve_inspection" || body.action === "confirm_payment")
    return { action: body.action };
  if (body.action === "cancel") {
    const rawItems = body.usedQuantities;
    if (rawItems !== undefined && (!Array.isArray(rawItems) || rawItems.length > 100)) return null;
    const usedQuantities: Array<{ orderItemId: string; quantityUsed: number }> = [];
    for (const raw of rawItems ?? []) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
      const item = raw as Record<string, unknown>;
      const orderItemId = parseUuid(item.orderItemId);
      if (
        !orderItemId ||
        !Number.isSafeInteger(item.quantityUsed) ||
        (item.quantityUsed as number) < 0
      )
        return null;
      usedQuantities.push({ orderItemId, quantityUsed: item.quantityUsed as number });
    }
    return {
      action: "cancel",
      usedQuantities,
      customerAgreementConfirmed: body.customerAgreementConfirmed === true,
    };
  }
  if (body.action === "schedule_pickup" && typeof body.scheduledPickupAt === "string") {
    const timestamp = Date.parse(body.scheduledPickupAt);
    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return null;
    return { action: "schedule_pickup", scheduledPickupAt: new Date(timestamp).toISOString() };
  }
  if (body.action === "classify_item") {
    const orderItemId = parseUuid(body.orderItemId);
    if (orderItemId && typeof body.perishable === "boolean")
      return { action: "classify_item", orderItemId, perishable: body.perishable };
  }
  if (body.action === "cancel_nonperishable_item") {
    const orderItemId = parseUuid(body.orderItemId);
    if (
      orderItemId &&
      Number.isSafeInteger(body.quantityUsed) &&
      (body.quantityUsed as number) >= 0
    )
      return {
        action: "cancel_nonperishable_item",
        orderItemId,
        quantityUsed: body.quantityUsed as number,
        customerAgreementConfirmed: body.customerAgreementConfirmed === true,
      };
  }
  if (body.action === "discard_perishable_item") {
    const orderItemId = parseUuid(body.orderItemId);
    if (orderItemId) return { action: "discard_perishable_item", orderItemId };
  }
  if (body.action === "record_issue") {
    const orderItemId = parseUuid(body.orderItemId);
    const idempotencyKey = parseUuid(body.idempotencyKey);
    if (
      orderItemId &&
      idempotencyKey &&
      (body.issueType === "defect" || body.issueType === "damage")
    )
      return { action: "record_issue", orderItemId, issueType: body.issueType, idempotencyKey };
  }
  if (
    body.action === "transition" &&
    (body.status === "preparing" ||
      body.status === "ready_for_pickup" ||
      body.status === "picked_up")
  )
    return { action: "transition", status: body.status };
  return null;
}
