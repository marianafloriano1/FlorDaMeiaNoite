export type CartItemInput = { productSlug: string; quantity: number };
export type ReservationInput = { productIds: string[]; idempotencyKey: string };

const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isProductSlug(value: unknown): value is string {
  return typeof value === "string" && PRODUCT_SLUG_PATTERN.test(value);
}

export function parseCartItemInput(value: unknown): CartItemInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some((key) => key !== "productSlug" && key !== "quantity") ||
    !isProductSlug(input.productSlug) ||
    !Number.isSafeInteger(input.quantity) ||
    Number(input.quantity) < 1 ||
    Number(input.quantity) > 2_147_483_647
  ) {
    return null;
  }
  return { productSlug: input.productSlug, quantity: Number(input.quantity) };
}

export function parseProductIdInput(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "productId") || !isUuid(input.productId))
    return null;
  return input.productId;
}
export function parseProductSlugInput(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some((key) => key !== "productSlug") ||
    !isProductSlug(input.productSlug)
  ) {
    return null;
  }
  return input.productSlug;
}

export function parseReservationInput(value: unknown): ReservationInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some((key) => key !== "productIds" && key !== "idempotencyKey") ||
    !Array.isArray(input.productIds) ||
    input.productIds.length === 0 ||
    !input.productIds.every(isUuid) ||
    new Set(input.productIds).size !== input.productIds.length ||
    !isUuid(input.idempotencyKey)
  ) {
    return null;
  }
  return { productIds: input.productIds, idempotencyKey: input.idempotencyKey };
}
