import { createClient } from "@supabase/supabase-js";

// Service-role client — server-side only, bypasses RLS.
// Never import this in client components or expose it to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase admin env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}
