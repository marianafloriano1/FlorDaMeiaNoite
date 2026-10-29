import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.TASK007_TEST_SUPABASE_URL;
const anonKey = process.env.TASK007_TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TASK007_TEST_SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && anonKey && serviceRoleKey);
const mustRun = process.env.TASK007_REQUIRE_SUPABASE === "1";

async function createRoleUser(admin: SupabaseClient, role: "employee" | "customer") {
  const id = randomUUID();
  const email = `task007-${role}-${id}@example.invalid`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: `T7-${randomUUID()}-Aa1!`,
    email_confirm: true,
    app_metadata: { role },
  });
  if (error || !data.user) throw new Error("task007_synthetic_user_create_failed");
  if (role === "employee") {
    const digits = id.replace(/\D/g, "").padEnd(11, "0").slice(0, 11);
    const { error: profileError } = await admin.from("employee_profiles").insert({
      id: data.user.id,
      full_name: "Funcionária Sintética TASK-007",
      age: 30,
      phone_e164: "+15555550199",
      email,
      cpf: digits,
      hire_date: "2026-01-01",
      account_status: "active",
    });
    if (profileError) throw new Error("task007_synthetic_employee_profile_failed");
  }
  return data.user.id;
}

async function createProduct(admin: SupabaseClient, stock: number) {
  const { data, error } = await admin
    .from("catalog_products")
    .insert({
      slug: `task007-${randomUUID()}`,
      name: "Produto sintético TASK-007",
      product_type: "fixture",
      description: "Registro sintético de integração.",
      price_brl: 1,
      category_name: "Flores",
      stock_quantity: stock,
      status: "published",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("task007_synthetic_product_create_failed");
  return data.id as string;
}

test("TASK-007: Supabase valida auditoria, permissões, limiares e Storage", {
  skip:
    configured || mustRun ? false : "NOT RUN: configure apenas chaves de Supabase local isolado.",
}, async (t) => {
  if (!configured)
    throw new Error("TASK007_TEST_SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY are required");
  const parsed = new URL(url as string);
  assert.ok(
    ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname),
    "TASK-007 recusa endpoint remoto",
  );
  const admin = createClient(url as string, serviceRoleKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anon = createClient(url as string, anonKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const users: string[] = [];
  const productIds: string[] = [];
  const objectKeys: string[] = [];
  try {
    const employeeId = await createRoleUser(admin, "employee");
    users.push(employeeId);
    const customerId = await createRoleUser(admin, "customer");
    users.push(customerId);
    const productId = await createProduct(admin, 8);
    productIds.push(productId);

    await t.test("lease expirada na quinta tentativa encerra o alerta como failed", async () => {
      const leaseProductId = await createProduct(admin, 8);
      productIds.push(leaseProductId);
      const adjustment = await admin.rpc("admin_adjust_catalog_stock", {
        p_product_id: leaseProductId,
        p_new_quantity: 7,
        p_reason: "Teste sintético de lease expirada",
        p_actor_uid: employeeId,
      });
      assert.equal(adjustment.error, null);

      const { data: created, error: createdError } = await admin
        .from("catalog_stock_alert_outbox")
        .select("id")
        .eq("product_id", leaseProductId)
        .single();
      assert.equal(createdError, null);
      assert.ok(created?.id);
      const eventId = created.id as string;
      const backdate = await admin
        .from("catalog_stock_alert_outbox")
        .update({ created_at: "1900-01-01T00:00:00Z", available_at: "1900-01-01T00:00:00Z" })
        .eq("id", eventId);
      assert.equal(backdate.error, null);

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        const { data: claims, error: claimError } = await admin.rpc("claim_catalog_stock_alerts", {
          p_limit: 1,
        });
        assert.equal(claimError, null);
        assert.equal(claims?.[0]?.id, eventId);
        assert.equal(claims?.[0]?.attempt, attempt);
        if (attempt < 5) {
          const completion = await admin.rpc("finish_catalog_stock_alert", {
            p_id: eventId,
            p_sent: false,
            p_error_code: "synthetic_delivery_failure",
          });
          assert.equal(completion.error, null);
          assert.equal(completion.data, true);
          const makeRetryAvailable = await admin
            .from("catalog_stock_alert_outbox")
            .update({ available_at: "1900-01-01T00:00:00Z" })
            .eq("id", eventId);
          assert.equal(makeRetryAvailable.error, null);
        }
      }

      const expireLease = await admin
        .from("catalog_stock_alert_outbox")
        .update({ locked_until: "1900-01-01T00:00:00Z" })
        .eq("id", eventId);
      assert.equal(expireLease.error, null);
      const recovery = await admin.rpc("claim_catalog_stock_alerts", { p_limit: 1 });
      assert.equal(recovery.error, null);
      assert.ok(!recovery.data?.some((claim) => claim.id === eventId));

      const { data: recovered, error: recoveredError } = await admin
        .from("catalog_stock_alert_outbox")
        .select("status,attempts,locked_until,last_error_code")
        .eq("id", eventId)
        .single();
      assert.equal(recoveredError, null);
      assert.deepEqual(recovered, {
        status: "failed",
        attempts: 5,
        locked_until: null,
        last_error_code: "worker_lease_expired_after_max_attempts",
      });

      for (const claim of recovery.data ?? []) {
        await admin.rpc("finish_catalog_stock_alert", {
          p_id: claim.id,
          p_sent: true,
          p_error_code: null,
        });
      }
    });
    await t.test("8→7→6→8→7 envia dois eventos de cruzamento, sem spam", async () => {
      const transitions = [7, 6, 8, 7];
      for (const [index, newQuantity] of transitions.entries()) {
        const { data, error } = await admin.rpc("admin_adjust_catalog_stock", {
          p_product_id: productId,
          p_new_quantity: newQuantity,
          p_reason: `Contagem sintética ${index + 1}`,
          p_actor_uid: employeeId,
        });
        assert.equal(error, null);
        assert.equal(data?.[0]?.stock_after, newQuantity);
      }
      const { data: alerts, error: alertError } = await admin
        .from("catalog_stock_alert_outbox")
        .select("quantity_before,quantity_after,status")
        .eq("product_id", productId);
      assert.equal(alertError, null);
      assert.equal(alerts?.length, 2);
      assert.deepEqual(
        alerts?.map((alert) => [alert.quantity_before, alert.quantity_after]),
        [
          [8, 7],
          [8, 7],
        ],
      );

      const { data: audit, error: auditError } = await admin
        .from("inventory_ledger")
        .select(
          "event_type,quantity_delta,actor_uid,quantity_before,quantity_after,reason,created_at",
        )
        .eq("product_id", productId)
        .eq("event_type", "stock_adjustment")
        .order("created_at");
      assert.equal(auditError, null);
      assert.equal(audit?.length, 4);
      assert.ok(
        audit?.every((row) => row.actor_uid === employeeId && row.reason && row.created_at),
      );
      assert.deepEqual(
        audit?.map((row) => [row.quantity_before, row.quantity_after, row.quantity_delta]),
        [
          [8, 7, -1],
          [7, 6, -1],
          [6, 8, 2],
          [8, 7, -1],
        ],
      );
    });

    await t.test("mensagem pública usa sinal 1–2, oculta saldo e estoque zero", async () => {
      const { error } = await admin.rpc("admin_adjust_catalog_stock", {
        p_product_id: productId,
        p_new_quantity: 2,
        p_reason: "Contagem sintética",
        p_actor_uid: employeeId,
      });
      assert.equal(error, null);
      const { data: visible, error: visibleError } = await anon
        .from("public_catalog_products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();
      assert.equal(visibleError, null);
      assert.equal(visible?.low_stock_alert, true);
      assert.equal("stock_quantity" in (visible ?? {}), false);
      const { error: zeroError } = await admin.rpc("admin_adjust_catalog_stock", {
        p_product_id: productId,
        p_new_quantity: 0,
        p_reason: "Esgotamento sintético",
        p_actor_uid: employeeId,
      });
      assert.equal(zeroError, null);
      const { data: hidden, error: hiddenError } = await anon
        .from("public_catalog_products")
        .select("id")
        .eq("id", productId)
        .maybeSingle();
      assert.equal(hiddenError, null);
      assert.equal(hidden, null);
    });

    await t.test(
      "validação e papel não autorizado não alteram saldo; auditoria é imutável",
      async () => {
        const invalid = await admin.rpc("admin_adjust_catalog_stock", {
          p_product_id: productId,
          p_new_quantity: -1,
          p_reason: "inválido",
          p_actor_uid: employeeId,
        });
        assert.ok(invalid.error);
        const tooLong = await admin.rpc("admin_adjust_catalog_stock", {
          p_product_id: productId,
          p_new_quantity: 9,
          p_reason: "x".repeat(401),
          p_actor_uid: employeeId,
        });
        assert.ok(tooLong.error);
        const denied = await admin.rpc("admin_adjust_catalog_stock", {
          p_product_id: productId,
          p_new_quantity: 9,
          p_reason: "cliente não pode ajustar",
          p_actor_uid: customerId,
        });
        assert.match(denied.error?.message ?? "", /catalog_operator_required/);
        const { data: balance } = await admin
          .from("catalog_products")
          .select("stock_quantity")
          .eq("id", productId)
          .single();
        assert.equal(balance?.stock_quantity, 0);

        const { data: entry } = await admin
          .from("inventory_ledger")
          .select("id")
          .eq("product_id", productId)
          .eq("event_type", "stock_adjustment")
          .limit(1)
          .single();
        const update = await admin
          .from("inventory_ledger")
          .update({ reason: "alterado" })
          .eq("id", entry?.id);
        assert.match(update.error?.message ?? "", /inventory_ledger_immutable/);
        const deletion = await admin.from("inventory_ledger").delete().eq("id", entry?.id);
        assert.match(deletion.error?.message ?? "", /inventory_ledger_immutable/);
      },
    );

    await t.test(
      "ajustes concorrentes mantêm saldo não negativo e cada movimento auditado",
      async () => {
        const concurrentProductId = await createProduct(admin, 8);
        productIds.push(concurrentProductId);
        const results = await Promise.all(
          [7, 6].map((newQuantity) =>
            admin.rpc("admin_adjust_catalog_stock", {
              p_product_id: concurrentProductId,
              p_new_quantity: newQuantity,
              p_reason: "Contagem concorrente sintética",
              p_actor_uid: employeeId,
            }),
          ),
        );
        assert.ok(results.every((result) => !result.error));
        const { data: balance } = await admin
          .from("catalog_products")
          .select("stock_quantity")
          .eq("id", concurrentProductId)
          .single();
        assert.ok([6, 7].includes(balance?.stock_quantity));
        const { data: audit } = await admin
          .from("inventory_ledger")
          .select("quantity_before,quantity_after")
          .eq("product_id", concurrentProductId)
          .eq("event_type", "stock_adjustment");
        assert.equal(audit?.length, 2);
        assert.ok(audit?.every((row) => row.quantity_before >= 0 && row.quantity_after >= 0));
      },
    );

    await t.test(
      "upload de imagem de catálogo permanece público e contrato de funcionário não é usado",
      async () => {
        const objectKey = `products/${productId}/${randomUUID()}.png`;
        const png = Buffer.alloc(24);
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
        png.writeUInt32BE(1, 16);
        png.writeUInt32BE(1, 20);
        const upload = await admin.storage.from("catalog").upload(objectKey, png, {
          contentType: "image/png",
          upsert: false,
        });
        assert.equal(upload.error, null);
        objectKeys.push(objectKey);
        const { error: metadataError } = await admin.from("catalog_product_images").insert({
          product_id: productId,
          object_key: objectKey,
          alt_text: "Imagem sintética",
          width: 1,
          height: 1,
          mime_type: "image/png",
          sort_order: 0,
        });
        assert.equal(metadataError, null);
        const download = await anon.storage.from("catalog").download(objectKey);
        assert.equal(download.error, null);
        assert.ok(download.data);
      },
    );
  } finally {
    for (const objectKey of objectKeys) await admin.storage.from("catalog").remove([objectKey]);
    for (const productId of productIds)
      await admin.from("catalog_product_images").delete().eq("product_id", productId);
    for (const userId of users) {
      await admin.from("employee_profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  }
});
