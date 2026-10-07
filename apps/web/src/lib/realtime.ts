import { createClient } from "@supabase/supabase-js";
export async function realtimeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const response = await fetch("/api/session", { cache: "no-store" });
  if (!response.ok) return null;
  const session = await response.json();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await client.realtime.setAuth(session.access_token);
  return { client, user_id: session.user_id };
}
