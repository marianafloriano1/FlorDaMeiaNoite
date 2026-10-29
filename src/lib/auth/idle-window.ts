const ADMIN_IDLE_LIMIT_MS = 60 * 60 * 1000;

export function isAdminSessionWithinIdleWindow(lastActivityAt: Date, now: Date): boolean {
  return now.getTime() - lastActivityAt.getTime() <= ADMIN_IDLE_LIMIT_MS;
}
