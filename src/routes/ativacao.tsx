import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Check, Sparkles, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Starfield } from "@/components/Starfield";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { showFeedback } from "@/components/system-feedback";
import { listPublicLandingPackages } from "@/lib/landing-packages.functions";
import { createMercadoPagoCheckout } from "@/lib/addons.functions";

export const Route = createFileRoute("/ativacao")({
  component: ActivationPage,
  head: () => ({
    meta: [
      { title: "Ative seu plano — Código Cósmico" },
      { name: "description", content: "Escolha seu plano para liberar o acesso." },
    ],
  }),
});

function ActivationPage() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const listFn = useServerFn(listPublicLandingPackages);
  const checkoutFn = useServerFn(createMercadoPagoCheckout);
  const [checkingPlan, setCheckingPlan] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const pollAttempts = useRef(0);

  const { data: packages, isLoading } = useQuery({
    queryKey: ["activation-packages"],
    queryFn: () => listFn(),
  });

  // Redirect if not signed in
  useEffect(() => {
    if (!loading && !user) {
      nav({ to: "/auth", replace: true });
    }
  }, [loading, user, nav]);

  // Check active subscription (poll after returning from payment)
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const fromPayment = params.get("status") === "success" || params.get("payment") === "ok";
    if (fromPayment) setPolling(true);

    let cancelled = false;
    async function check() {
      const { data: subs } = await supabase
        .from("user_subscriptions")
        .select("addon_id, status, current_period_end")
        .eq("user_id", user!.id)
        .eq("status", "active");
      const now = Date.now();
      const hasActive = (subs ?? []).some(
        (s) => !s.current_period_end || new Date(s.current_period_end).getTime() > now,
      );
      if (cancelled) return;
      if (hasActive) {
        nav({ to: "/dashboard", replace: true });
        return;
      }
      if (fromPayment && pollAttempts.current < 8) {
        pollAttempts.current++;
        setTimeout(check, 2500);
      } else {
        setPolling(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [user, nav]);

  async function handlePick(slug: string) {
    if (!user) return;
    setCheckingPlan(slug);
    try {
      const res = await checkoutFn({
        data: { kind: "landing_package", product_id: slug },
      });
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        throw new Error("URL de pagamento não retornada");
      }
    } catch (err) {
      setCheckingPlan(null);
      showFeedback({
        title: "Erro no pagamento",
        description: err instanceof Error ? err.message : "Erro ao iniciar checkout",
        type: "error",
      });
    }
  }

  async function handleSignOut() {
    await signOut();
    nav({ to: "/auth", replace: true });
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Logo sizeClassName="size-20" animation="loading" />
      </div>
    );
  }

  if (polling) {
    return (
      <div className="min-h-screen relative flex items-center justify-center px-4 bg-background">
        <Starfield />
        <div className="relative z-10 max-w-md w-full text-center space-y-6">
          <Logo sizeClassName="size-20" animation="loading" className="mx-auto" />
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-gold" />
          <p className="text-stardust">Validando seu pagamento...</p>
          <p className="text-xs text-muted-foreground">
            Isso leva alguns segundos. Não feche esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-background text-foreground">
      <Starfield count={60} className="fixed" />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 lg:py-16">
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <Logo sizeClassName="size-12" animation="float" />
            <span className="font-serif text-xl shimmer-text">Código Cósmico</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="size-4 mr-2" /> Sair
          </Button>
        </header>

        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs mb-4">
            <Sparkles className="size-3" /> Ative sua conta
          </div>
          <h1 className="font-serif text-3xl lg:text-5xl shimmer-text">
            Escolha seu plano para começar
          </h1>
          <p className="mt-4 text-muted-foreground">
            Para liberar o acesso ao sistema, escolha um dos planos abaixo. O acesso é
            ativado automaticamente após a confirmação do pagamento.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-8 animate-spin text-gold" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...(packages ?? [])].sort((a, b) => a.price_cents - b.price_cents).map((pkg) => {
              const isLoading = checkingPlan === pkg.slug;
              return (
                <div
                  key={pkg.id}
                  className={`glass-card rounded-2xl p-6 flex flex-col ${
                    pkg.featured ? "border-gold/60 shadow-[0_0_30px_rgba(212,175,55,0.15)]" : ""
                  }`}
                >
                  {pkg.featured && (
                    <span className="self-start mb-3 text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-gold text-primary-foreground">
                      Mais escolhido
                    </span>
                  )}
                  <h3 className="font-serif text-2xl text-gold">{pkg.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      {pkg.price_label ??
                        `R$ ${(pkg.price_cents / 100).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}`}
                    </span>
                    <span className="text-sm text-muted-foreground">{pkg.sub_label}</span>
                  </div>
                  {pkg.credits_per_month > 0 && (
                    <p className="mt-1 text-xs text-gold/80">
                      +{pkg.credits_per_month} créditos por mês
                    </p>
                  )}
                  <ul className="mt-5 space-y-2 flex-1">
                    {pkg.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-stardust">
                        <Check className="size-4 text-gold mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handlePick(pkg.slug)}
                    disabled={!!checkingPlan}
                    className="mt-6 w-full bg-gold text-primary-foreground hover:bg-gold-glow font-medium"
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      pkg.cta_label
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-10">
          Pagamento seguro via Mercado Pago. Cancele quando quiser.
        </p>
      </div>
    </div>
  );
}
