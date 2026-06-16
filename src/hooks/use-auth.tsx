import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
  const bootstrappedRef = useRef(false);

  const routerRef = useRef(router);
  const qcRef = useRef(qc);
  routerRef.current = router;
  qcRef.current = qc;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      // Always keep local session in sync, but only act on real identity
      // transitions. INITIAL_SESSION / TOKEN_REFRESHED must NOT invalidate
      // the router or query cache — that would re-render the current page
      // (e.g. the /auth form) and wipe what the user is typing.
      setSession(s);

      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        if (bootstrappedRef.current) {
          routerRef.current.invalidate();
          qcRef.current.invalidateQueries();
        }
      } else if (event === "SIGNED_OUT") {
        if (bootstrappedRef.current) {
          routerRef.current.invalidate();
          routerRef.current.navigate({ to: "/auth", replace: true });
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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
