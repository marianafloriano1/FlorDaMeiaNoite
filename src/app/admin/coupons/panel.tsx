"use client";

import { useState } from "react";
import type { Coupon } from "@/lib/coupons/types";

export default function CouponPanel({ initialCoupons }: { initialCoupons: Coupon[] }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function create(form: FormData) {
    setBusy(true);
    const payload = {
      code: String(form.get("code") ?? ""),
      discountType: String(form.get("discountType") ?? "percentage"),
      discountValue: Number(form.get("discountValue")),
      validFrom: new Date(String(form.get("validFrom"))).toISOString(),
      validUntil: new Date(String(form.get("validUntil"))).toISOString(),
      minimumEligibleBrl: form.get("minimumEligibleBrl")
        ? Number(form.get("minimumEligibleBrl"))
        : null,
      maximumRedemptions: form.get("maximumRedemptions")
        ? Number(form.get("maximumRedemptions"))
        : null,
      maximumPerCustomer: form.get("maximumPerCustomer")
        ? Number(form.get("maximumPerCustomer"))
        : null,
      productIds: [],
      categories: String(form.get("categories") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };
    const response = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      setCoupons((current) => [body.coupon as Coupon, ...current]);
      setMessage("Cupom criado.");
    } else
      setMessage("Não foi possível criar o cupom; confirme MFA recente e os campos informados.");
    setBusy(false);
  }
  async function deactivate(coupon: Coupon) {
    setBusy(true);
    const response = await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !coupon.active }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      setCoupons((current) =>
        current.map((item) => (item.id === coupon.id ? (body.coupon as Coupon) : item)),
      );
      setMessage("Status do cupom atualizado.");
    } else setMessage("Não foi possível atualizar o cupom; confirme MFA recente.");
    setBusy(false);
  }
  return (
    <section className="intro">
      <h2>Criar campanha</h2>
      <form action={create}>
        <label>
          Código{" "}
          <input name="code" required minLength={3} maxLength={40} pattern="[A-Za-z0-9_-]+" />
        </label>
        <label>
          Tipo{" "}
          <select name="discountType">
            <option value="percentage">Percentual</option>
            <option value="fixed">Valor fixo (BRL)</option>
          </select>
        </label>
        <label>
          Desconto <input name="discountValue" type="number" min="0.01" step="0.01" required />
        </label>
        <label>
          Início <input name="validFrom" type="datetime-local" required />
        </label>
        <label>
          Fim <input name="validUntil" type="datetime-local" required />
        </label>
        <label>
          Mínimo elegível (opcional){" "}
          <input name="minimumEligibleBrl" type="number" min="0" step="0.01" />
        </label>
        <label>
          Usos globais (ilimitado se vazio){" "}
          <input name="maximumRedemptions" type="number" min="1" step="1" />
        </label>
        <label>
          Usos por cliente (ilimitado se vazio){" "}
          <input name="maximumPerCustomer" type="number" min="1" step="1" />
        </label>
        <label>
          Categorias (opcional, separadas por vírgula) <input name="categories" />
        </label>
        <button type="submit" disabled={busy}>
          Criar cupom
        </button>
      </form>
      <h2>Campanhas existentes</h2>
      <ul>
        {coupons.map((coupon) => (
          <li key={coupon.id}>
            {coupon.code} —{" "}
            {coupon.discount_type === "percentage"
              ? `${coupon.discount_value}%`
              : `R$ ${coupon.discount_value.toFixed(2)}`}{" "}
            — {coupon.active ? "ativo" : "inativo"}{" "}
            <button type="button" disabled={busy} onClick={() => void deactivate(coupon)}>
              {coupon.active ? "Desativar" : "Ativar"}
            </button>{" "}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const value = window.prompt("Novo código do cupom", coupon.code);
                if (value === null) return;
                const amount = window.prompt(
                  "Novo valor do desconto",
                  String(coupon.discount_value),
                );
                if (amount === null) return;
                void (async () => {
                  setBusy(true);
                  const response = await fetch(`/api/admin/coupons/${coupon.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code: value, discountValue: Number(amount) }),
                  });
                  const body = await response.json().catch(() => ({}));
                  if (response.ok)
                    setCoupons((current) =>
                      current.map((item) =>
                        item.id === coupon.id ? (body.coupon as Coupon) : item,
                      ),
                    );
                  else
                    setMessage(
                      "Não foi possível editar o cupom; confirme MFA recente e os valores.",
                    );
                  setBusy(false);
                })();
              }}
            >
              Editar código/valor
            </button>
          </li>
        ))}
      </ul>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
