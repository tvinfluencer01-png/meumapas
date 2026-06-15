import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { getFreshSession } from "@/lib/auth-session";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const qc = useQueryClient();
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      // Ignore noisy events that fire on every tab focus / hourly refresh.
      // Only act on real identity transitions to avoid thrashing the router
      // and the query cache (which can cause the app to appear to "restart").
      if (
        event !== "SIGNED_IN" &&
        event !== "SIGNED_OUT" &&
        event !== "USER_UPDATED" &&
        event !== "INITIAL_SESSION"
      ) {
        // TOKEN_REFRESHED / PASSWORD_RECOVERY / etc.: just update the session.
        setSession(s);
        return;
      }

      setSession(s);
      const shouldReleaseLoading = bootstrappedRef.current || event !== "INITIAL_SESSION";

      if (shouldReleaseLoading) {
        setLoading(false);
        router.invalidate();
        // Never invalidate queries on SIGNED_OUT — they would refetch against
        // a cleared session and produce a 401 storm.
        if (event !== "SIGNED_OUT") {
          qc.invalidateQueries();
        }
      }

      if (bootstrappedRef.current && event === "SIGNED_OUT") {
        router.navigate({ to: "/auth", replace: true });
      }
    });

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      } finally {
        bootstrappedRef.current = true;
        setLoading(false);
      }
    })();

    return () => {
      subscription.unsubscribe();
    };
  }, [router, qc]);


  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
