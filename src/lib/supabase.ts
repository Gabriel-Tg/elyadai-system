import { createBrowserClient } from "@supabase/ssr";

function readSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return { url, anonKey };
}

export function createBrowserSupabaseClient() {
  const { url, anonKey } = readSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
