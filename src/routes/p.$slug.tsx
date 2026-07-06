import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Check, Loader2, Star, ShieldCheck, Zap, Clock, Lock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Logo } from "@/components/Logo";
import { Starfield } from "@/components/Starfield";
import { LandingFieldsForm } from "@/components/LandingFieldsForm";
import { getPublicLanding } from "@/lib/product-landings.functions";
import { createGuestProductOrder } from "@/lib/product-orders.functions";
import { showFeedback } from "@/components/system-feedback";

import {
  captureAffiliateFromUrl,
  trackAffiliateCheckout,
  trackAffiliateSignup,
} from "@/modules/affiliate/lib/client-tracking";
import { AffiliateDebugPanel } from "@/modules/affiliate/ui/AffiliateDebugPanel";
import { PersuasiveLanding } from "@/components/landings/PersuasiveLanding";
import { PERSUASIVE_COPY } from "@/components/landings/persuasive-copy";



export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => {
    try {
      const landing = await getPublicLanding({ data: { slug: params.slug } });
      return { landing };
    } catch {
      return { landing: null };
    }
  },
  head: ({ loaderData }) => {
    const l = loaderData?.landing;
    if (!l) return { meta: [{ title: "Produto não encontrado" }] };
    const title = l.seo_title || `${l.title} — Código Cósmico`;
    const desc = l.seo_description || l.subtitle || l.title;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(l.hero_image_url ? [{ property: "og:image", content: l.hero_image_url }] : []),
      ],
    };
  },
  component: ProductLandingPage,
  errorComponent: () => <NotFound />,
  notFoundComponent: () => <NotFound />,
});

function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-background text-center p-8">
      <div>
        <h1 className="font-serif text-3xl shimmer-text mb-3">Produto não encontrado</h1>
        <p className="text-muted-foreground mb-6">Esta landing page não existe ou foi desativada.</p>
        <Button asChild><Link to="/">Voltar à página inicial</Link></Button>
      </div>
    </div>
  );
}



function ProductLandingPage() {
  const { landing } = Route.useLoaderData();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const createFn = useServerFn(createGuestProductOrder);
  const landingRef = landing ? `/p/${landing.slug}` : undefined;

  useEffect(() => {
    if (!landing) return;
    void captureAffiliateFromUrl(`${window.location.origin}/p/${landing.slug}`);
  }, [landing?.slug]);

  const mutation = useMutation({
    mutationFn: () => createFn({ data: { landing_id: landing!.id, customer_data: values } }),
    onSuccess: async (res: any) => {
      // Vincula conversões de afiliado ao order_id para creditar comissão ao aprovar pagamento.
      await Promise.allSettled([
        trackAffiliateSignup({ reference: res?.order_id ?? landingRef }),
        trackAffiliateCheckout({ value_cents: landing!.price_cents, reference: res?.order_id ?? landingRef }),
      ]);
      window.location.href = res.checkout_url;
    },
    onError: (e: Error) => {
      showFeedback({ title: "Não foi possível continuar", description: e.message, type: "error" });
    },
  });

  if (!landing) return <NotFound />;

  if (landing.slug === "mapa-espiritual") {
    return (
      <MapaEspiritualLanding
        landing={landing as any}
        onCheckoutSuccess={(orderId) => {
          void Promise.allSettled([
            trackAffiliateSignup({ reference: orderId ?? landingRef }),
            trackAffiliateCheckout({ value_cents: landing.price_cents, reference: orderId ?? landingRef }),
          ]);
        }}
      />
    );
  }


  // Ensure email + full_name are always collected for account provisioning
  const required = Array.from(new Set([
    ...((landing.required_fields as string[]) ?? []),
    "full_name",
    "email",
  ]));

  const benefits = (landing.benefits as string[]) ?? [];

  const priceFormatted = `R$ ${(landing.price_cents / 100).toFixed(2).replace(".", ",")}`;
  const installment = `ou 3x de R$ ${(landing.price_cents / 300).toFixed(2).replace(".", ",")} sem juros`;

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <Starfield count={120} className="fixed" />
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--gold)_12%,transparent),transparent_60%)]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/40 backdrop-blur-sm bg-background/40">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo sizeClassName="size-10" animation="float" />
          <span className="font-serif text-lg shimmer-text">Código Cósmico</span>
        </Link>
        <Button variant="ghost" size="sm" asChild><Link to="/auth">Já tenho conta</Link></Button>
      </header>

      {/* HERO */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10 lg:py-16">
        <AffiliateDebugPanel landingUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/p/${landing.slug}`} />
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs text-gold">
                <Sparkles className="size-3" /> Relatório exclusivo
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs">
                <Star className="size-3 fill-gold text-gold" />
                <Star className="size-3 fill-gold text-gold" />
                <Star className="size-3 fill-gold text-gold" />
                <Star className="size-3 fill-gold text-gold" />
                <Star className="size-3 fill-gold text-gold" />
                <span className="ml-1 text-muted-foreground">+2.500 clientes</span>
              </span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl shimmer-text leading-[1.05] mb-5">
              {landing.title}
            </h1>
            {landing.subtitle && (
              <p className="text-lg sm:text-xl text-stardust/90 mb-7 leading-relaxed">{landing.subtitle}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Button onClick={() => setOpen(true)} size="lg" className="text-base font-medium px-8 shadow-[0_0_30px_-6px_color-mix(in_oklab,var(--gold)_60%,transparent)]">
                {landing.cta_text} →
              </Button>
              <div className="flex flex-col justify-center">
                <span className="text-2xl font-serif text-gold leading-none">{priceFormatted}</span>
                <span className="text-xs text-muted-foreground">{installment}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Lock className="size-3.5 text-gold" /> Pagamento seguro</span>
              <span className="inline-flex items-center gap-1.5"><Zap className="size-3.5 text-gold" /> Entrega imediata</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-gold" /> Garantia 7 dias</span>
            </div>
          </div>

          <div className="relative">
            <div aria-hidden className="absolute -inset-6 rounded-3xl bg-gold/10 blur-3xl" />
            {landing.hero_image_url ? (
              <img src={landing.hero_image_url} alt={landing.title}
                style={{
                  width: landing.hero_image_width ? `${landing.hero_image_width}px` : undefined,
                  height: landing.hero_image_height ? `${landing.hero_image_height}px` : undefined,
                  maxWidth: "100%",
                  objectFit: "cover",
                }}
                className="relative rounded-2xl shadow-2xl border border-gold/30 mx-auto" />
            ) : (
              <div className="relative aspect-[4/5] rounded-2xl border border-gold/30 bg-gradient-to-br from-secondary to-background grid place-items-center">
                <Logo sizeClassName="size-32" animation="float" />
              </div>
            )}
          </div>
        </div>

        {/* DESCRIPTION */}
        {landing.description && (
          <section className="mt-16 lg:mt-24 max-w-3xl mx-auto text-center">
            <h2 className="font-serif text-3xl sm:text-4xl shimmer-text mb-6">O que você vai descobrir</h2>
            <div className="prose prose-invert max-w-none text-muted-foreground whitespace-pre-wrap text-left sm:text-center leading-relaxed">
              {landing.description}
            </div>
          </section>
        )}

        {/* BENEFITS GRID */}
        {benefits.length > 0 && (
          <section className="mt-16 lg:mt-24">
            <h2 className="font-serif text-3xl sm:text-4xl shimmer-text text-center mb-10">Benefícios exclusivos</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {benefits.map((b, i) => (
                <Card key={i} className="border-gold/20 bg-card/60 backdrop-blur-sm hover:border-gold/50 transition-colors">
                  <CardContent className="p-5 flex gap-3">
                    <div className="shrink-0 grid place-items-center size-9 rounded-full bg-gold/15 text-gold">
                      <Check className="size-4" />
                    </div>
                    <p className="text-sm leading-relaxed">{b}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* HOW IT WORKS */}
        <section className="mt-16 lg:mt-24">
          <h2 className="font-serif text-3xl sm:text-4xl shimmer-text text-center mb-10">Como funciona</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: CreditCard, title: "1. Pagamento seguro", desc: "Cartão, Pix ou boleto pelo Mercado Pago." },
              { icon: Sparkles, title: "2. Geração instantânea", desc: "Seu relatório é calculado e gerado automaticamente." },
              { icon: Clock, title: "3. Receba em minutos", desc: "PDF enviado no seu e-mail e WhatsApp." },
            ].map((s, i) => (
              <div key={i} className="text-center p-6 rounded-xl border border-gold/20 bg-card/40">
                <div className="mx-auto grid place-items-center size-12 rounded-full bg-gold/15 text-gold mb-4">
                  <s.icon className="size-5" />
                </div>
                <h3 className="font-serif text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="mt-16 lg:mt-24">
          <Card className="border-gold/50 bg-gradient-to-br from-gold/10 via-secondary/40 to-background overflow-hidden relative">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--gold)_20%,transparent),transparent_60%)]" />
            <CardContent className="relative p-8 sm:p-12 text-center">
              <div className="text-xs uppercase tracking-[0.3em] text-gold/80 mb-3">Investimento único</div>
              <div className="font-serif text-5xl sm:text-6xl text-gold mb-2">{priceFormatted}</div>
              <p className="text-sm text-muted-foreground mb-6">{installment}</p>
              <Button onClick={() => setOpen(true)} size="lg" className="text-base font-medium px-10 shadow-[0_0_40px_-8px_color-mix(in_oklab,var(--gold)_70%,transparent)]">
                {landing.cta_text} →
              </Button>
              <div className="flex flex-wrap justify-center gap-5 mt-6 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-gold" /> Garantia incondicional 7 dias</span>
                <span className="inline-flex items-center gap-1.5"><Lock className="size-3.5 text-gold" /> Compra 100% segura</span>
                <span className="inline-flex items-center gap-1.5"><Zap className="size-3.5 text-gold" /> Entrega automática</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/40 py-6 text-center text-xs text-muted-foreground mt-10">
        © {new Date().getFullYear()} Código Cósmico · Todos os direitos reservados
      </footer>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif shimmer-text">Dados para o relatório</DialogTitle>
            <DialogDescription>
              Preencha as informações abaixo. Após o pagamento, criamos sua conta automaticamente e enviamos o relatório por e-mail.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
            className="space-y-3"
          >
            <LandingFieldsForm fields={required} values={values} onChange={setValues} idPrefix="f" />

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={mutation.isPending} className="w-full">
                {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Ir para pagamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
