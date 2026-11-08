import type { CouponInput } from "./validation";

type RpcResult = { data: unknown; error: { message: string } | null };
type CouponRpcClient = {
  rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<RpcResult>;
};

export async function callCouponAdminRpc(
  db: CouponRpcClient,
  input: Partial<CouponInput>,
  id?: string,
) {
  return id
    ? db.rpc("admin_update_coupon", { p_coupon_id: id, p_coupon: input })
    : db.rpc("admin_create_coupon", { p_coupon: input });
}
