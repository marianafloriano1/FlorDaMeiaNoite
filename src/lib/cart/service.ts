import type { SupabaseClient } from "@supabase/supabase-js";

export async function getOrCreateCustomerCart(supabase: SupabaseClient, customerId: string) {
  const { data: existing, error: readError } = await supabase
    .from("carts")
    .select("id")
    .eq("customer_id", customerId)
    .maybeSingle();
  if (readError) throw new Error("cart_read_failed");
  if (existing?.id) return existing.id as string;

  const { data: created, error: createError } = await supabase
    .from("carts")
    .insert({ customer_id: customerId })
    .select("id")
    .single();
  if (!createError && created?.id) return created.id as string;

  if (createError?.code === "23505") {
    const { data: raced, error: retryError } = await supabase
      .from("carts")
      .select("id")
      .eq("customer_id", customerId)
      .maybeSingle();
    if (!retryError && raced?.id) return raced.id as string;
  }
  throw new Error("cart_create_failed");
}
