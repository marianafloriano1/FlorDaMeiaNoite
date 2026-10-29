import { createClient } from "@supabase/supabase-js";

const uid = process.argv[2];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (process.env.NODE_ENV === "production" || !url || !serviceRoleKey) {
  throw new Error("This helper only works with configured local Supabase credentials.");
}
const hostname = new URL(url).hostname;
if (hostname !== "127.0.0.1" && hostname !== "localhost") {
  throw new Error("Refusing to assign an administrator role outside local Supabase.");
}
if (!uid || uid.length > 128) throw new Error("Usage: npm run auth:bootstrap-admin -- <synthetic-local-uid>");

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
async function main() {
  const { data, error } = await supabase.auth.admin.getUserById(uid);
  if (error || !data.user) throw new Error("Local Supabase user was not found.");
  if (!data.user.email_confirmed_at || !data.user.phone_confirmed_at) {
    throw new Error("Synthetic administrator must have confirmed email and phone in local Supabase.");
  }
  const { error: updateError } = await supabase.auth.admin.updateUserById(uid, {
    app_metadata: { ...data.user.app_metadata, role: "admin", suspended: false },
  });
  if (updateError) throw new Error("Could not assign the administrator role.");
  console.info("Administrator role assigned to the synthetic local Supabase account.");
}

void main();
