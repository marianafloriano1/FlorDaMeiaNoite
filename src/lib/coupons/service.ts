import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { callCouponAdminRpc } from "./admin-rpc";
import type { Coupon } from "./types";
import type { CouponInput } from "./validation";

export async function listCoupons(): Promise<Coupon[]> {
  const db = await getSupabaseServerClient();
  const { data, error } = await db.rpc("admin_list_coupons");
  if (error) throw new Error("coupon_list_failed");
  return (data ?? []) as Coupon[];
}

export async function saveCoupon(input: Partial<CouponInput>, id?: string): Promise<Coupon> {
  const db = await getSupabaseServerClient();
  const { data, error } = await callCouponAdminRpc(db, input, id);
  if (error) {
    if (error.message.includes("coupon_code_conflict")) throw new Error("coupon_code_conflict");
    throw new Error("coupon_save_failed");
  }
  return data as Coupon;
}
