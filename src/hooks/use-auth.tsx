import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setLoading(false);
      router.invalidate();
      qc.invalidateQueries();
      if (event === "SIGNED_OUT" || (!s && event !== "INITIAL_SESSION")) {
        router.navigate({ to: "/auth", replace: true });
      }
    });

    (async () => {
      try {
        const current = await getFreshSession();
        setSession(current);
      } finally {
        setLoading(false);
      }
    })();

    // Proactively keep the cached session fresh so the auth-attacher
    // middleware never sends an expired bearer token to server functions.
    const refresh = () => {
      getFreshSession().catch(() => {});
    };
    const interval = window.setInterval(refresh, 30_000);
    const onFocus = () => refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      subscription.unsubscribe();
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
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
