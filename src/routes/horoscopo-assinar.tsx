import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sun, Sparkles, Check, Loader2, Star, ShieldCheck } from "lucide-react";
import { Starfield } from "@/components/Starfield";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  listPublicHoroscopePlans,
  createHoroscopePlanCheckout,
} from "@/lib/horoscope-plans.functions";

export const Route = createFileRoute("/horoscopo-assinar")({
  head: () => ({
    meta: [
      { title: "Assine o Horóscopo Diário no WhatsApp · Código Cósmico" },
      {
        name: "description",
        content:
          "Continue recebendo sua leitura astrológica personalizada todas as manhãs no WhatsApp. Planos mensal e trimestral, cancele quando quiser.",
      },
      { property: "og:title", content: "Assine o Horóscopo Diário no WhatsApp" },
      {
        property: "og:description",
        content:
          "Toda manhã, sua leitura personalizada do signo direto no WhatsApp. Planos mensal e trimestral.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HoroscopoAssinarPage,
});

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function cycleLabel(billing_cycle: string, interval_months: number) {
  if (billing_cycle === "month") return interval_months === 1 ? "/mês" : `/${interval_months} meses`;
  if (billing_cycle === "quarter") return "/trimestre";
  if (billing_cycle === "year") return "/ano";
  return "";
}

function HoroscopoAssinarPage() {
  const navigate = useNavigate();
  const listFn = useServerFn(listPublicHoroscopePlans);
  const checkoutFn = useServerFn(createHoroscopePlanCheckout);

  const { data, isLoading } = useQuery({
    queryKey: ["horoscope-plans-public"],
    queryFn: () => listFn(),
    staleTime: 60_000,
  });

  const checkout = useMutation({
    mutationFn: async (planId: string) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate({ to: "/auth", search: { redirect: "/horoscopo-assinar" } as any });
        throw new Error("Faça login para continuar.");
      }
      return await checkoutFn({ data: { plan_id: planId } });
    },
    onSuccess: (r: any) => {
      if (r?.checkout_url) window.location.href = r.checkout_url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background text-foreground antialiased relative overflow-hidden">
      <Starfield />

      <header className="relative z-10 border-b border-gold/10 bg-background/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="size-7" />
            <span className="font-serif text-lg shimmer-text">Código Cósmico</span>
          </Link>
          <Button asChild variant="ghost" size="sm" className="text-gold hover:bg-gold/10">
            <Link to="/">← Voltar</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-12 lg:py-20">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs text-gold">
            <Sparkles className="size-3.5" /> Assinatura Horóscopo Diário
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight shimmer-text">
            Sua manhã começa com uma mensagem do céu
          </h1>
          <p className="text-lg text-muted-foreground">
            Continue recebendo sua leitura personalizada todos os dias no WhatsApp.
            Escolha um plano e defina sua periodicidade preferida.
          </p>
          <div className="flex items-center justify-center gap-6 pt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-gold text-gold" />
              ))}
            </div>
            <span>+12.000 pessoas recebem diariamente</span>
          </div>
        </div>

        <section className="mt-12 grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {isLoading || !data ? (
            <div className="sm:col-span-2 flex justify-center py-16">
              <Loader2 className="size-6 animate-spin text-gold" />
            </div>
          ) : data.plans.length === 0 ? (
            <div className="sm:col-span-2 text-center text-muted-foreground py-12">
              Nenhum plano disponível no momento.
            </div>
          ) : (
            data.plans.map((plan: any) => {
              const features: string[] = Array.isArray(plan.features) ? plan.features : [];
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border p-6 flex flex-col ${
                    plan.is_featured
                      ? "border-gold bg-gold/5 shadow-[0_0_60px_-10px_rgba(212,175,55,0.5)]"
                      : "border-gold/20 bg-secondary/40"
                  } backdrop-blur`}
                >
                  {plan.is_featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold text-background text-xs font-semibold px-3 py-1">
                      Mais popular
                    </div>
                  )}
                  <h3 className="font-serif text-2xl text-gold">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  )}
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="font-serif text-4xl shimmer-text">
                      {formatBRL(plan.price_cents)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {cycleLabel(plan.billing_cycle, plan.interval_months)}
                    </span>
                  </div>
                  <ul className="space-y-2 mt-6 flex-1">
                    {features.map((f) => (
                      <li key={f} className="flex gap-2 items-start text-sm">
                        <Check className="size-4 text-gold shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="lg"
                    className={`mt-6 w-full font-semibold ${
                      plan.is_featured
                        ? "bg-gold text-background hover:bg-gold/90"
                        : ""
                    }`}
                    disabled={checkout.isPending}
                    onClick={() => checkout.mutate(plan.id)}
                  >
                    {checkout.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>Assinar agora</>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </section>

        <div className="mt-10 max-w-2xl mx-auto rounded-lg border border-gold/20 bg-gold/5 p-4 text-sm flex gap-3">
          <ShieldCheck className="size-5 text-gold shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            Pagamento seguro via Mercado Pago. Após a confirmação você escolhe se
            quer receber diariamente, dia sim / dia não ou semanalmente. Por padrão,
            o envio é diário às 8h30. Cancele quando quiser.
          </p>
        </div>

        <section className="mt-16 max-w-2xl mx-auto space-y-3">
          <h2 className="font-serif text-xl text-gold text-center flex items-center justify-center gap-2">
            <Sun className="size-5" /> Como funciona
          </h2>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Escolha um plano e finalize o pagamento no Mercado Pago.</li>
            <li>Você é redirecionado para escolher a periodicidade preferida.</li>
            <li>Todo dia (ou na frequência escolhida) sua leitura chega no WhatsApp.</li>
          </ol>
        </section>
      </main>

      <footer className="relative z-10 border-t border-gold/10 mt-16 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Código Cósmico · <Link to="/" className="hover:text-gold">Home</Link>
      </footer>
    </div>
  );
}
