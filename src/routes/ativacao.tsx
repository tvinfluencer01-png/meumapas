import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Starfield } from "@/components/Starfield";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/ativacao")({
  component: ActivationRedirect,
  head: () => ({
    meta: [
      { title: "Ativação — Código Cósmico" },
      { name: "description", content: "Validando ativação do seu pacote." },
    ],
  }),
});

function ActivationRedirect() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [message, setMessage] = useState("Validando seu pagamento...");

  useEffect(() => {
    if (loading) return;

    if (!user) {
      nav({ to: "/auth", search: { mode: "signup" } as never, replace: true });
      return;
    }

    let attempts = 0;
    const maxAttempts = 6;

    async function check() {
      attempts++;
      const { data: subs } = await supabase
        .from("user_subscriptions")
        .select("addon_id, status, current_period_end")
        .eq("user_id", user!.id)
        .eq("status", "active");

      const now = Date.now();
      const hasActive = (subs ?? []).some(
        (s) => !s.current_period_end || new Date(s.current_period_end).getTime() > now,
      );

      if (hasActive) {
        nav({ to: "/dashboard", replace: true });
        return;
      }

      if (attempts >= maxAttempts) {
        setMessage("Pagamento não confirmado. Voltando para os planos...");
        setTimeout(() => nav({ to: "/addons", replace: true }), 1500);
        return;
      }

      setMessage(`Validando seu pagamento... (${attempts}/${maxAttempts})`);
      setTimeout(check, 2500);
    }

    check();
  }, [loading, user, nav]);

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4">
      <Starfield />
      <div className="relative z-10 max-w-md w-full text-center space-y-6">
        <Logo className="mx-auto" />
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
