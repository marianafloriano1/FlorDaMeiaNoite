export function normalizePhoneNumber(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.startsWith("+") ? value : `+${value}`;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}
