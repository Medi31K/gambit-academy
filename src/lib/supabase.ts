import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The publishable key is public by design: Row Level Security in the database
// decides what each visitor may read and write.
const url = cleanUrl(import.meta.env["VITE_SUPABASE_URL"] as string | undefined);
const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;

let client: SupabaseClient | null = null;

export function cleanUrl(value: string | undefined): string | undefined {
  return (
    value
      ?.trim()
      .replace(/\/+$/, "")
      .replace(/\/rest\/v1$/, "") || undefined
  );
}

// Null on the server and when the site isn't connected to a database yet, so
// pages can fall back to their empty states instead of crashing.
export function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined" || !url || !key) return null;
  client ??= createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

export function requireSupabase(): SupabaseClient {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Gambit Academy can't reach its database right now.");
  return supabase;
}
