import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

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
      router.invalidate();
      qc.invalidateQueries();
      if (event === "SIGNED_OUT" || (!s && event !== "INITIAL_SESSION")) {
        router.navigate({ to: "/auth", replace: true });
      }
    });

    (async () => {
      const { data } = await supabase.auth.getSession();
      let current = data.session;
      // Proactively refresh if the access token is expired or about to expire
      const exp = current?.expires_at ?? 0;
      const nowSec = Math.floor(Date.now() / 1000);
      if (current && exp - nowSec < 60) {
        const { data: refreshed, error } = await supabase.auth.refreshSession();
        if (error) {
          await supabase.auth.signOut();
          current = null;
        } else {
          current = refreshed.session;
        }
      }
      setSession(current);
      setLoading(false);
    })();

    return () => subscription.unsubscribe();
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
