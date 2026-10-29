import { NextResponse } from "next/server";
import { hasAdminStepUp, requireSameOrigin, requireSession } from "@/lib/auth/http";
import { getAdminMutationDenial } from "@/lib/auth/step-up";
import { parseAdminOrderAction, parseUuid } from "@/lib/orders/validation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireSameOrigin())) return json({ error: "forbidden" }, 403);
  const identity = await requireSession();
  if (identity?.role !== "employee" && identity?.role !== "admin")
    return json({ error: "forbidden" }, 403);
  const id = parseUuid((await context.params).id);
  const action = parseAdminOrderAction(await request.json().catch(() => null));
  if (!id || !action) return json({ error: "invalid_order_action" }, 400);
  if (identity.role === "admin") {
    const denial = getAdminMutationDenial(identity.role, await hasAdminStepUp(identity.uid));
    if (denial) return json({ error: denial.error }, denial.status);
  }
  if (
    identity.role === "employee" &&
    ["approve_inspection", "confirm_payment", "cancel"].includes(action.action)
  )
    return json({ error: "admin_role_required" }, 403);
  if (action.action === "confirm_payment" && !process.env.ORDER_CANCELLATION_POLICY_TEXT?.trim())
    return json({ error: "cancellation_policy_not_configured" }, 503);
  try {
    const supabase = await getSupabaseServerClient();
    const rpc =
      action.action === "inspect"
        ? await supabase.rpc("record_order_inspection", {
            p_order_id: id,
            p_items_confirmed: action.itemsConfirmed,
          })
        : action.action === "approve_inspection"
          ? await supabase.rpc("approve_order_inspection", { p_order_id: id })
          : action.action === "confirm_payment"
            ? await supabase.rpc("confirm_order_payment", { p_order_id: id })
            : action.action === "cancel"
              ? await supabase.rpc("cancel_unpaid_order", { p_order_id: id })
              : await supabase.rpc("transition_order", {
                  p_order_id: id,
                  p_next_status: action.status,
                });
    if (rpc.error) {
      if (rpc.error.message.includes("admin_role_required"))
        return json({ error: "admin_role_required" }, 403);
      if (rpc.error.message.includes("admin_mfa_required"))
        return json({ error: "admin_mfa_required" }, 428);
      if (rpc.error.message.includes("order_not_found"))
        return json({ error: "order_not_found" }, 404);
      if (
        ["not_allowed", "not_payable", "not_approvable", "not_cancellable", "not_inspectable"].some(
          (text) => rpc.error.message.includes(text),
        )
      )
        return json({ error: "order_transition_not_allowed" }, 409);
      return json({ error: "order_update_failed" }, 503);
    }
    return json({ result: rpc.data });
  } catch {
    return json({ error: "order_update_failed" }, 503);
  }
}
