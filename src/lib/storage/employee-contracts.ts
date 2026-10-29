import "server-only";
import { randomUUID } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const CONTRACT_BUCKET = "employee-contracts";

function validateObjectKey(objectKey: string) {
  if (!objectKey || objectKey.startsWith("/") || objectKey.includes(".."))
    throw new Error("invalid_object_key");
}

export async function readEmployeeContract(objectKey: string): Promise<Buffer> {
  validateObjectKey(objectKey);
  const { data, error } = await getSupabaseAdminClient()
    .storage.from(CONTRACT_BUCKET)
    .download(objectKey);
  if (error || !data) throw new Error("contract_download_unavailable");
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteEmployeeContract(objectKey: string): Promise<void> {
  validateObjectKey(objectKey);
  const { error } = await getSupabaseAdminClient()
    .storage.from(CONTRACT_BUCKET)
    .remove([objectKey]);
  if (error && !error.message.toLowerCase().includes("not found"))
    throw new Error("contract_delete_unavailable");
}

export async function writeEmployeeContract(
  employeeUid: string,
  fileName: string,
  content: Buffer,
  contentType: string,
) {
  const maxBytes = Number(process.env.EMPLOYEE_CONTRACT_MAX_BYTES);
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1)
    throw new Error("EMPLOYEE_CONTRACT_MAX_BYTES is required");
  if (!content.length || content.length > maxBytes) throw new Error("file_size_not_allowed");
  const extension = fileName.toLowerCase().match(/\.(pdf|png|jpe?g)$/)?.[0];
  if (!extension || !["application/pdf", "image/png", "image/jpeg"].includes(contentType)) {
    throw new Error("file_type_not_allowed");
  }
  const objectKey = `employees/${employeeUid}/${randomUUID()}${extension}`;
  const { error } = await getSupabaseAdminClient()
    .storage.from(CONTRACT_BUCKET)
    .upload(objectKey, content, {
      contentType,
      cacheControl: "0",
      upsert: false,
    });
  if (error) throw new Error("contract_upload_unavailable");
  return objectKey;
}
