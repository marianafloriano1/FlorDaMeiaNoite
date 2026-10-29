import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CatalogProductInput } from "./admin-validation";

const productColumns =
  "id,slug,name,product_type,description,colors,price_brl,category_name,stock_quantity,occasion,size,materials,care_instructions,flower_meaning,pet_toxicity,shelf_life,content_version,status,created_at,updated_at";

export async function listAdminCatalogProducts() {
  const { data, error } = await getSupabaseAdminClient()
    .from("catalog_products")
    .select(productColumns)
    .order("name", { ascending: true })
    .limit(1000);
  if (error) throw new Error("catalog_admin_list_failed");
  return data ?? [];
}

export async function createCatalogProduct(input: CatalogProductInput) {
  const { data, error } = await getSupabaseAdminClient()
    .from("catalog_products")
    .insert({
      slug: input.slug,
      name: input.name,
      product_type: input.productType,
      description: input.description,
      colors: input.colors,
      price_brl: input.priceBrl,
      category_name: input.category,
      occasion: input.occasion,
      size: input.size,
      materials: input.materials,
      care_instructions: input.careInstructions,
      flower_meaning: input.flowerMeaning,
      pet_toxicity: input.petToxicity,
      shelf_life: input.shelfLife,
      status: input.status,
      stock_quantity: 0,
    })
    .select(productColumns)
    .single();
  if (error || !data)
    throw new Error(
      error?.code === "23505" ? "catalog_product_slug_conflict" : "catalog_admin_create_failed",
    );
  return data;
}

export async function updateCatalogProduct(id: string, input: Partial<CatalogProductInput>) {
  const client = getSupabaseAdminClient();
  const { data: current, error: readError } = await client
    .from("catalog_products")
    .select("content_version")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw new Error("catalog_admin_read_failed");
  if (!current) return null;

  const columns: Record<string, unknown> = {
    slug: input.slug,
    name: input.name,
    product_type: input.productType,
    description: input.description,
    colors: input.colors,
    price_brl: input.priceBrl,
    category_name: input.category,
    occasion: input.occasion,
    size: input.size,
    materials: input.materials,
    care_instructions: input.careInstructions,
    flower_meaning: input.flowerMeaning,
    pet_toxicity: input.petToxicity,
    shelf_life: input.shelfLife,
    status: input.status,
  };
  for (const key of Object.keys(columns)) if (columns[key] === undefined) delete columns[key];
  if (!Object.keys(columns).length) throw new Error("empty_catalog_product_update");
  const changesTranslatedContent = [
    "slug",
    "name",
    "productType",
    "description",
    "colors",
    "category",
    "occasion",
    "size",
    "materials",
    "careInstructions",
    "flowerMeaning",
    "petToxicity",
    "shelfLife",
  ].some((key) => input[key as keyof CatalogProductInput] !== undefined);

  const { data, error } = await client
    .from("catalog_products")
    .update({
      ...columns,
      ...(changesTranslatedContent ? { content_version: current.content_version + 1 } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("content_version", current.content_version)
    .select(productColumns)
    .maybeSingle();
  if (error)
    throw new Error(
      error.code === "23505" ? "catalog_product_slug_conflict" : "catalog_admin_update_failed",
    );
  if (!data) throw new Error("catalog_product_changed_concurrently");
  return data;
}

export async function adjustCatalogStock(
  productId: string,
  newQuantity: number,
  reason: string,
  actorUid: string,
) {
  const { data, error } = await getSupabaseAdminClient().rpc("admin_adjust_catalog_stock", {
    p_product_id: productId,
    p_new_quantity: newQuantity,
    p_reason: reason,
    p_actor_uid: actorUid,
  });
  if (error) throw new Error(error.message || "catalog_stock_adjustment_failed");
  return Array.isArray(data) ? data[0] : data;
}

export async function addCatalogProductImage(input: {
  productId: string;
  objectKey: string;
  altText: string;
  width: number;
  height: number;
  mimeType: string;
}) {
  const client = getSupabaseAdminClient();
  const { data: current, error: readError } = await client
    .from("catalog_product_images")
    .select("sort_order")
    .eq("product_id", input.productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) throw new Error("catalog_image_list_failed");
  const { data, error } = await client
    .from("catalog_product_images")
    .insert({
      product_id: input.productId,
      object_key: input.objectKey,
      alt_text: input.altText,
      width: input.width,
      height: input.height,
      mime_type: input.mimeType,
      sort_order: (current?.sort_order ?? -1) + 1,
    })
    .select("id,product_id,object_key,alt_text,width,height,mime_type,sort_order")
    .single();
  if (error || !data) throw new Error("catalog_image_metadata_failed");
  return data;
}
