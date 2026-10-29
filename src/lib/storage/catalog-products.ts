import "server-only";
import { randomUUID } from "node:crypto";
import { addCatalogProductImage } from "@/lib/catalog/admin-service";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { validateCatalogProductImage } from "./catalog-image-validation";

const catalogBucket = "catalog";
const extensions: Record<string, string> = {
  "image/avif": "avif",
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export async function uploadCatalogProductImage(input: {
  productId: string;
  content: Buffer;
  contentType: string;
  altText: string;
  width: number;
  height: number;
}) {
  const invalid = validateCatalogProductImage(input);
  if (invalid) throw new Error(invalid);
  const extension = extensions[input.contentType];

  const objectKey = `products/${input.productId}/${randomUUID()}.${extension}`;
  const client = getSupabaseAdminClient();
  const { error: uploadError } = await client.storage
    .from(catalogBucket)
    .upload(objectKey, input.content, {
      contentType: input.contentType,
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError) throw new Error("catalog_image_upload_failed");
  try {
    return await addCatalogProductImage({
      productId: input.productId,
      objectKey,
      altText: input.altText,
      width: input.width,
      height: input.height,
      mimeType: input.contentType,
    });
  } catch (error) {
    await client.storage
      .from(catalogBucket)
      .remove([objectKey])
      .catch(() => undefined);
    throw error;
  }
}
