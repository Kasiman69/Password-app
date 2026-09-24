import { createClient } from "@supabase/supabase-js";

// Public connection settings. Access is enforced by Supabase Auth and database RLS.
export const supabase = createClient(
  "https://yqlhwioswwqqaqpankwr.supabase.co",
  "sb_publishable_fq9mJ9VnLRaDnFwg6EA_sQ_LAX4132v",
  { auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" } },
);
