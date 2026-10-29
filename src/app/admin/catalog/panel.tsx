"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { CATALOG_CATEGORIES } from "@/lib/catalog/types";

type Product = {
  id: string;
  slug: string;
  name: string;
  product_type: string;
  description: string;
  colors: string[];
  price_brl: number | string;
  category_name: string;
  stock_quantity: number;
  occasion: string | null;
  size: string | null;
  materials: string[];
  care_instructions: string;
  flower_meaning: string;
  pet_toxicity: string;
  shelf_life: string;
  status: "draft" | "published";
};

type Draft = {
  slug: string;
  name: string;
  productType: string;
  description: string;
  colors: string;
  priceBrl: string;
  category: string;
  occasion: string;
  size: string;
  materials: string;
  careInstructions: string;
  flowerMeaning: string;
  petToxicity: string;
  shelfLife: string;
  status: "draft" | "published";
};

const emptyDraft: Draft = {
  slug: "",
  name: "",
  productType: "",
  description: "",
  colors: "",
  priceBrl: "0",
  category: CATALOG_CATEGORIES[0],
  occasion: "",
  size: "",
  materials: "",
  careInstructions: "Informação não disponível.",
  flowerMeaning: "Informação não disponível.",
  petToxicity: "Informação não disponível.",
  shelfLife: "Informação não disponível.",
  status: "draft",
};

function toDraft(product: Product): Draft {
  return {
    slug: product.slug,
    name: product.name,
    productType: product.product_type,
    description: product.description,
    colors: product.colors.join(", "),
    priceBrl: String(product.price_brl),
    category: product.category_name,
    occasion: product.occasion ?? "",
    size: product.size ?? "",
    materials: product.materials.join(", "),
    careInstructions: product.care_instructions,
    flowerMeaning: product.flower_meaning,
    petToxicity: product.pet_toxicity,
    shelfLife: product.shelf_life,
    status: product.status,
  };
}

function toPayload(draft: Draft) {
  return {
    ...draft,
    priceBrl: Number(draft.priceBrl),
    colors: draft.colors
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    materials: draft.materials
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    occasion: draft.occasion.trim() || null,
    size: draft.size.trim() || null,
  };
}

export default function CatalogAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stock, setStock] = useState<Record<string, { newQuantity: string; reason: string }>>({});
  const [imageAlt, setImageAlt] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/catalog/products", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error ?? "catalog_admin_list_failed");
    setProducts(data.products ?? []);
  }, []);

  useEffect(() => {
    void reload().catch((cause: unknown) =>
      setError(cause instanceof Error ? cause.message : "catalog_admin_list_failed"),
    );
  }, [reload]);

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        editingId ? `/api/admin/catalog/products/${editingId}` : "/api/admin/catalog/products",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(toPayload(draft)),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "catalog_product_save_failed");
      setDraft(emptyDraft);
      setEditingId(null);
      setNotice("Produto salvo.");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "catalog_product_save_failed");
    } finally {
      setBusy(false);
    }
  }

  async function adjustStock(event: FormEvent<HTMLFormElement>, productId: string) {
    event.preventDefault();
    const value = stock[productId];
    if (!value) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/catalog/products/${productId}/stock`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newQuantity: Number(value.newQuantity), reason: value.reason }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "catalog_stock_adjustment_failed");
      setStock((current) => ({ ...current, [productId]: { newQuantity: "", reason: "" } }));
      setNotice(
        `Estoque atualizado: ${data.adjustment.stock_before} → ${data.adjustment.stock_after}.`,
      );
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "catalog_stock_adjustment_failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(event: FormEvent<HTMLFormElement>, productId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("file");
    const altText = imageAlt[productId] ?? "";
    if (!(file instanceof File)) {
      setError("Selecione uma imagem.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const bitmap = await createImageBitmap(file);
      const body = new FormData();
      body.set("file", file);
      body.set("altText", altText);
      body.set("width", String(bitmap.width));
      body.set("height", String(bitmap.height));
      bitmap.close();
      const response = await fetch(`/api/admin/catalog/products/${productId}/images`, {
        method: "POST",
        body,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "catalog_image_upload_failed");
      form.reset();
      setImageAlt((current) => ({ ...current, [productId]: "" }));
      setNotice("Imagem adicionada ao produto.");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "catalog_image_upload_failed");
    } finally {
      setBusy(false);
    }
  }

  function edit(product: Product) {
    setDraft(toDraft(product));
    setEditingId(product.id);
  }
  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <section aria-label="Gerenciamento do catálogo">
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      <form onSubmit={submitProduct}>
        <h2>{editingId ? "Editar produto" : "Cadastrar produto"}</h2>
        {!editingId && (
          <p>
            O produto começa com estoque zero. Registre o saldo inicial no ajuste auditável após
            cadastrar.
          </p>
        )}
        <label>
          Slug{" "}
          <input
            required
            maxLength={120}
            value={draft.slug}
            onChange={(e) => setField("slug", e.target.value)}
          />
        </label>
        <label>
          Nome{" "}
          <input
            required
            maxLength={200}
            value={draft.name}
            onChange={(e) => setField("name", e.target.value)}
          />
        </label>
        <label>
          Tipo{" "}
          <input
            required
            maxLength={100}
            value={draft.productType}
            onChange={(e) => setField("productType", e.target.value)}
          />
        </label>
        <label>
          Descrição{" "}
          <textarea
            maxLength={10000}
            value={draft.description}
            onChange={(e) => setField("description", e.target.value)}
          />
        </label>
        <label>
          Cores (separadas por vírgula){" "}
          <input value={draft.colors} onChange={(e) => setField("colors", e.target.value)} />
        </label>
        <label>
          Preço (BRL){" "}
          <input
            required
            type="number"
            min="0"
            max="99999999.99"
            step="0.01"
            value={draft.priceBrl}
            onChange={(e) => setField("priceBrl", e.target.value)}
          />
        </label>
        <label>
          Categoria{" "}
          <select value={draft.category} onChange={(e) => setField("category", e.target.value)}>
            {CATALOG_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          Ocasião{" "}
          <input value={draft.occasion} onChange={(e) => setField("occasion", e.target.value)} />
        </label>
        <label>
          Tamanho <input value={draft.size} onChange={(e) => setField("size", e.target.value)} />
        </label>
        <label>
          Materiais (separados por vírgula){" "}
          <input value={draft.materials} onChange={(e) => setField("materials", e.target.value)} />
        </label>
        <label>
          Cuidados{" "}
          <textarea
            value={draft.careInstructions}
            onChange={(e) => setField("careInstructions", e.target.value)}
          />
        </label>
        <label>
          Significado das flores{" "}
          <textarea
            value={draft.flowerMeaning}
            onChange={(e) => setField("flowerMeaning", e.target.value)}
          />
        </label>
        <label>
          Toxicidade para animais{" "}
          <textarea
            value={draft.petToxicity}
            onChange={(e) => setField("petToxicity", e.target.value)}
          />
        </label>
        <label>
          Prazo de validade/perda{" "}
          <textarea
            value={draft.shelfLife}
            onChange={(e) => setField("shelfLife", e.target.value)}
          />
        </label>
        <label>
          Estado{" "}
          <select
            value={draft.status}
            onChange={(e) => setField("status", e.target.value as Draft["status"])}
          >
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
          </select>
        </label>
        <button disabled={busy} type="submit">
          {editingId ? "Salvar edição" : "Cadastrar produto"}
        </button>
        {editingId && (
          <button
            disabled={busy}
            type="button"
            onClick={() => {
              setEditingId(null);
              setDraft(emptyDraft);
            }}
          >
            Cancelar edição
          </button>
        )}
      </form>

      <h2>Produtos cadastrados</h2>
      {products.length === 0 && <p>Nenhum produto encontrado.</p>}
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <article>
              <h3>
                {product.name} <small>({product.status})</small>
              </h3>
              <p>Saldo administrativo: {product.stock_quantity}</p>
              <button disabled={busy} type="button" onClick={() => edit(product)}>
                Editar dados
              </button>
              <form onSubmit={(event) => void adjustStock(event, product.id)}>
                <label>
                  Novo saldo{" "}
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={stock[product.id]?.newQuantity ?? ""}
                    onChange={(e) =>
                      setStock((current) => ({
                        ...current,
                        [product.id]: {
                          newQuantity: e.target.value,
                          reason: current[product.id]?.reason ?? "",
                        },
                      }))
                    }
                  />
                </label>
                <label>
                  Motivo (até 400 caracteres){" "}
                  <input
                    required
                    maxLength={400}
                    value={stock[product.id]?.reason ?? ""}
                    onChange={(e) =>
                      setStock((current) => ({
                        ...current,
                        [product.id]: {
                          newQuantity: current[product.id]?.newQuantity ?? "",
                          reason: e.target.value,
                        },
                      }))
                    }
                  />
                </label>
                <button disabled={busy} type="submit">
                  Registrar ajuste auditável
                </button>
              </form>
              <form onSubmit={(event) => void uploadImage(event, product.id)}>
                <label>
                  Imagem do produto{" "}
                  <input
                    required
                    type="file"
                    name="file"
                    accept="image/avif,image/webp,image/jpeg,image/png"
                  />
                </label>
                <label>
                  Texto alternativo{" "}
                  <input
                    required
                    maxLength={500}
                    value={imageAlt[product.id] ?? ""}
                    onChange={(e) =>
                      setImageAlt((current) => ({ ...current, [product.id]: e.target.value }))
                    }
                  />
                </label>
                <button disabled={busy} type="submit">
                  Adicionar imagem
                </button>
              </form>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
