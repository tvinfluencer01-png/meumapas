import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, LogOut, Sparkles } from "lucide-react";
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
      { title: "Ativar conta — Código Cósmico" },
      { name: "description", content: "Escolha seu pacote para ativar sua jornada cósmica." },
    ],
  }),
});

function priceLabel(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function ActivationPage() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const listFn = useServerFn(listPublicLandingPackages);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  // Redireciona usuário não autenticado para criação de conta
  useEffect(() => {
    if (!loading && !user) {
      nav({ to: "/auth", search: { mode: "signup" } as any, replace: true });
    }
  }, [loading, user, nav]);

  // Se já tem pacote ativo, vai direto pro dashboard
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: subs } = await supabase
        .from("user_subscriptions")
        .select("addon_id, status, current_period_end")
        .eq("user_id", user.id)
        .eq("status", "active");
      const now = Date.now();
      const hasActive = (subs ?? []).some(
        (s) => !s.current_period_end || new Date(s.current_period_end).getTime() > now,
      );
      if (hasActive) {
        nav({ to: "/dashboard", replace: true });
      }
    })();
  }, [user, nav]);

  const { data: packages, isLoading } = useQuery({
    queryKey: ["activation-packages"],
    queryFn: () => listFn(),
    staleTime: 60_000,
  });

  async function handleChoose(slug: string) {
    setCheckingOut(slug);
    try {
      const res = await createMercadoPagoCheckout({
        data: { kind: "landing_package", product_id: slug },
      });
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
      }
    } catch (err) {
      setCheckingOut(null);
      showFeedback({
        title: "Erro ao iniciar pagamento",
        description: err instanceof Error ? err.message : "Tente novamente.",
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
        <Logo sizeClassName="size-24" animation="loading" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Starfield count={80} className="fixed" />
      <div className="absolute inset-0 nebula-bg pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 lg:py-16">
        <div className="flex flex-col items-center text-center mb-10">
          <Logo sizeClassName="size-20" animation="float" className="mb-4" />
          <h1 className="font-serif text-3xl lg:text-4xl shimmer-text">
            Ative sua jornada cósmica
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl">
            Olá, <span className="text-gold">{user.email}</span>. Para liberar o
            sistema, escolha o pacote que melhor te acompanha. O acesso é
            liberado automaticamente após a confirmação do pagamento.
          </p>
          <button
            onClick={handleSignOut}
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gold transition-colors"
          >
            <LogOut className="size-3" /> Sair
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-8 text-gold animate-spin" />
          </div>
        ) : !packages || packages.length === 0 ? (
          <div className="text-center text-muted-foreground py-20">
            Nenhum pacote disponível no momento. Tente novamente em instantes.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => {
              const isLoading = checkingOut === pkg.slug;
              return (
                <div
                  key={pkg.id}
                  className={`relative glass-card rounded-2xl p-6 flex flex-col ${
                    pkg.featured
                      ? "border-gold/60 gold-glow"
                      : "border-border"
                  }`}
                >
                  {pkg.featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest bg-gold text-primary-foreground px-3 py-1 rounded-full font-semibold">
                      <Sparkles className="size-3" /> Mais escolhido
                    </span>
                  )}
                  <h3 className="font-serif text-2xl shimmer-text">{pkg.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gold">
                      {pkg.price_label ?? priceLabel(pkg.price_cents)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {pkg.sub_label}
                    </span>
                  </div>
                  {pkg.credits_per_month > 0 && (
                    <p className="mt-1 text-xs text-gold/80">
                      + {pkg.credits_per_month} créditos / mês
                    </p>
                  )}
                  <ul className="mt-5 space-y-2 flex-1">
                    {pkg.features.map((f, i) => (
                      <li key={i} className="flex gap-2 text-sm text-stardust">
                        <Check className="size-4 text-gold shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handleChoose(pkg.slug)}
                    disabled={isLoading || !!checkingOut}
                    className="mt-6 w-full bg-gold text-primary-foreground hover:bg-gold-glow font-medium"
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      pkg.cta_label || "Escolher"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Pagamento seguro processado por Mercado Pago. Você retorna a este
          sistema automaticamente após a confirmação.
        </p>
      </div>
    </div>
  );
}
