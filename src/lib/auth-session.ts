import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

const SESSION_REFRESH_BUFFER_SECONDS = 60;

export async function getFreshSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  let session = data.session;

  if (!session) return null;

  const expiresAt = session.expires_at ?? 0;
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (expiresAt - nowSeconds >= SESSION_REFRESH_BUFFER_SECONDS) {
    return session;
  }

  const { data: refreshed, error } = await supabase.auth.refreshSession();

  if (error) {
    await supabase.auth.signOut();
    return null;
  }

  return refreshed.session;
}

export async function getFreshAccessToken(): Promise<string | null> {
  const session = await getFreshSession();
  return session?.access_token ?? null;
}