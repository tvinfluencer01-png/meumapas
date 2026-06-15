import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

const SESSION_REFRESH_BUFFER_SECONDS = 60;
let refreshPromise: Promise<Session | null> | null = null;

async function refreshStoredSession(): Promise<Session | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const { data: refreshed, error } = await supabase.auth.refreshSession();

      if (error) {
        // Do NOT sign the user out on a transient refresh failure
        // (network blip, rate limit, etc). Supabase will retry on its own.
        // Falling back to the currently stored session avoids kicking the
        // user back to the login screen on every flaky network.
        const { data } = await supabase.auth.getSession();
        return data.session;
      }

      return refreshed.session;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function getFreshSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  let session = data.session;

  if (!session) return null;

  const expiresAt = session.expires_at ?? 0;
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (expiresAt - nowSeconds >= SESSION_REFRESH_BUFFER_SECONDS) {
    return session;
  }

  return refreshStoredSession();
}

export async function getFreshAccessToken(): Promise<string | null> {
  const session = await getFreshSession();
  return session?.access_token ?? null;
}