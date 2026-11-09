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
  if (!identity) return json({ error: "authentication_required" }, 401);
  if (identity.role !== "employee" && identity.role !== "admin")
    return json({ error: "forbidden" }, 403);
  const id = parseUuid((await context.params).id);
  const action = parseAdminOrderAction(await request.json().catch(() => null));
  if (!id || !action) return json({ error: "invalid_order_action" }, 400);
  if (identity.role === "admin") {
    const denial = getAdminMutationDenial(identity.role, await hasAdminStepUp(identity.uid));
    if (denial) return json({ error: denial.error }, denial.status);
  }
  const adminOnly = [
    "approve_inspection",
    "confirm_payment",
    "cancel",
    "schedule_pickup",
    "classify_item",
    "cancel_nonperishable_item",
    "discard_perishable_item",
  ];
  if (identity.role === "employee" && adminOnly.includes(action.action))
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
              ? await supabase.rpc("cancel_order", {
                  p_order_id: id,
                  p_used_quantities: action.usedQuantities.map((item) => ({
                    order_item_id: item.orderItemId,
                    quantity_used: item.quantityUsed,
                  })),
                  p_customer_agreement_confirmed: action.customerAgreementConfirmed,
                })
              : action.action === "schedule_pickup"
                ? await supabase.rpc("set_order_pickup_schedule", {
                    p_order_id: id,
                    p_pickup_at: action.scheduledPickupAt,
                  })
                : action.action === "classify_item"
                  ? await supabase.rpc("classify_order_item", {
                      p_order_id: id,
                      p_order_item_id: action.orderItemId,
                      p_perishable: action.perishable,
                    })
                  : action.action === "cancel_nonperishable_item"
                    ? await supabase.rpc("cancel_nonperishable_order_item", {
                        p_order_id: id,
                        p_order_item_id: action.orderItemId,
                        p_quantity_used: action.quantityUsed,
                        p_customer_agreement_confirmed: action.customerAgreementConfirmed,
                      })
                    : action.action === "discard_perishable_item"
                      ? await supabase.rpc("discard_perishable_order_item", {
                          p_order_id: id,
                          p_order_item_id: action.orderItemId,
                        })
                      : action.action === "record_issue"
                        ? await supabase.rpc("record_order_issue", {
                            p_order_id: id,
                            p_order_item_id: action.orderItemId,
                            p_issue_type: action.issueType,
                            p_idempotency_key: action.idempotencyKey,
                          })
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
      if (rpc.error.message.includes("order_item_not_found"))
        return json({ error: "order_item_not_found" }, 404);
      if (rpc.error.message.includes("customer_agreement_required"))
        return json({ error: "customer_agreement_required" }, 400);
      if (
        ["invalid_order_item_usage", "invalid_order_issue", "invalid_pickup_schedule"].some(
          (text) => rpc.error.message.includes(text),
        )
      )
        return json({ error: "invalid_order_action" }, 400);
      if (rpc.error.message.includes("order_operator_required"))
        return json({ error: "order_operator_required" }, 403);
      if (
        [
          "not_allowed",
          "not_payable",
          "not_approvable",
          "not_cancellable",
          "not_inspectable",
          "not_schedulable",
          "not_classifiable",
          "not_cancellable",
          "not_discardable",
          "deadline_not_reached",
          "schedule_required",
          "items_unclassified",
          "transition_not_allowed",
          "idempotency_key_conflict",
          "pickup_schedule_must_be_future",
        ].some((text) => rpc.error.message.includes(text))
      )
        return json({ error: "order_transition_not_allowed" }, 409);
      return json({ error: "order_update_failed" }, 503);
    }
    return json({ result: rpc.data });
  } catch {
    return json({ error: "order_update_failed" }, 503);
  }
}
