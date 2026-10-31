const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseUuid(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

export function parseOrderQuoteInput(
  value: unknown,
): { reservationId: string; couponCode: string | null } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => key !== "reservationId" && key !== "couponCode")) return null;
  const reservationId = parseUuid(body.reservationId);
  const code =
    body.couponCode === undefined || body.couponCode === null || body.couponCode === ""
      ? null
      : body.couponCode;
  if (code !== null && (typeof code !== "string" || !/^[A-Za-z0-9_-]{3,40}$/.test(code.trim())))
    return null;
  return reservationId
    ? { reservationId, couponCode: typeof code === "string" ? code.trim().toUpperCase() : null }
    : null;
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

export function parseAdminOrderAction(
  value: unknown,
):
  | { action: "inspect"; itemsConfirmed: boolean }
  | { action: "approve_inspection" }
  | { action: "confirm_payment" }
  | { action: "cancel" }
  | { action: "transition"; status: "preparing" | "ready_for_pickup" | "picked_up" }
  | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (body.action === "inspect" && typeof body.itemsConfirmed === "boolean")
    return { action: "inspect", itemsConfirmed: body.itemsConfirmed };
  if (
    body.action === "approve_inspection" ||
    body.action === "confirm_payment" ||
    body.action === "cancel"
  )
    return { action: body.action };
  if (
    body.action === "transition" &&
    (body.status === "preparing" ||
      body.status === "ready_for_pickup" ||
      body.status === "picked_up")
  )
    return { action: "transition", status: body.status };
  return null;
}
