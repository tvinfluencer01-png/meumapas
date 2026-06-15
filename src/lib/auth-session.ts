import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

// Only refresh when the access token is actually about to expire.
// Supabase's own autoRefreshToken handles the normal refresh schedule —
// we just need a safety net for the moments right around expiry.
const SESSION_REFRESH_BUFFER_SECONDS = 15;

// In-memory cache of the latest session, kept in sync with Supabase via
// onAuthStateChange. Reading from memory (instead of localStorage on every
// server function call) avoids redundant refresh attempts — fewer refreshes
// mean fewer chances of a transient network failure forcing a logout.
let cachedSession: Session | null = null;
let cacheInitialized = false;
let refreshPromise: Promise<Session | null> | null = null;

function isStillValid(session: Session | null): session is Session {
  if (!session) return false;
  const expiresAt = session.expires_at ?? 0;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return expiresAt - nowSeconds >= SESSION_REFRESH_BUFFER_SECONDS;
}

function primeCache() {
  if (cacheInitialized || typeof window === "undefined") return;
  cacheInitialized = true;

  // Initial hydrate from storage.
  supabase.auth
    .getSession()
    .then(({ data }) => {
      cachedSession = data.session;
    })
    .catch(() => {
      // Ignore — keep cachedSession as null until the next event.
    });

  // Keep the cache aligned with every real auth transition. We deliberately
  // accept TOKEN_REFRESHED here so the cached access_token stays current
  // without us having to call refreshSession() ourselves.
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedSession = session;
  });
}

async function refreshStoredSession(): Promise<Session | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const { data: refreshed, error } = await supabase.auth.refreshSession();

      if (error) {
        // Transient refresh failure (network blip, rate limit, etc.).
        // Never sign the user out here — fall back to whatever session is
        // still on disk and let Supabase's autoRefresh retry on its own.
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
  primeCache();

  // Fast path: the in-memory session is still valid — no I/O, no refresh.
  if (isStillValid(cachedSession)) return cachedSession;

  // Cache might be cold (very first call) — hit storage once before deciding.
  if (!cachedSession) {
    const { data } = await supabase.auth.getSession();
    cachedSession = data.session;
    if (isStillValid(cachedSession)) return cachedSession;
    if (!cachedSession) return null;
  }

  // Cached session is expired or about to expire — refresh it.
  const refreshed = await refreshStoredSession();
  if (refreshed) cachedSession = refreshed;
  return cachedSession;
}

export async function getFreshAccessToken(): Promise<string | null> {
  const session = await getFreshSession();
  return session?.access_token ?? null;
}
