import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles, Check, Loader2, Star, ShieldCheck, Zap, Clock, Lock, Flame, Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Logo } from "@/components/Logo";
import { Starfield } from "@/components/Starfield";
import { LandingFieldsForm } from "@/components/LandingFieldsForm";
import { createGuestProductOrder } from "@/lib/product-orders.functions";
import { showFeedback } from "@/components/system-feedback";
import type { PersuasiveCopy } from "./persuasive-copy";
import { COMMON_HOW } from "./persuasive-copy";

type Landing = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  hero_image_url: string | null;
  hero_image_width: number | null;
  hero_image_height: number | null;
  price_cents: number;
  cta_text: string;
  required_fields: string[] | null;
  benefits: string[] | null;
};

function Html({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function PersuasiveLanding({
  landing,
  copy,
  onCheckoutSuccess,
}: {
  landing: Landing;
  copy: PersuasiveCopy;
  onCheckoutSuccess?: (orderId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const createFn = useServerFn(createGuestProductOrder);

  const required = Array.from(new Set([...(landing.required_fields ?? []), "full_name", "email"]));

  const mutation = useMutation({
    mutationFn: () => createFn({ data: { landing_id: landing.id, customer_data: values } }),
    onSuccess: async (res: any) => {
      onCheckoutSuccess?.(res?.order_id);
      window.location.href = res.checkout_url;
    },
    onError: (e: Error) => {
      showFeedback({ title: "Não foi possível continuar", description: e.message, type: "error" });
    },
  });

  const priceFormatted = `R$ ${(landing.price_cents / 100).toFixed(2).replace(".", ",")}`;
  const installment = `ou 3x de R$ ${(landing.price_cents / 300).toFixed(2).replace(".", ",")} sem juros`;
  const oldPrice = `R$ ${((landing.price_cents * 1.8) / 100).toFixed(2).replace(".", ",")}`;

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <Starfield count={150} className="fixed" />
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--nebula)_18%,transparent),transparent_65%)]" />
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_bottom,color-mix(in_oklab,var(--gold)_10%,transparent),transparent_60%)]" />

      {/* URGENCY BAR */}
      <div className="relative z-20 bg-gradient-to-r from-gold/20 via-gold/30 to-gold/20 border-b border-gold/40 text-center py-2 px-4 text-xs sm:text-sm">
        <span className="inline-flex items-center gap-2 text-gold-glow font-medium">
          <Flame className="size-3.5 animate-pulse" />
          {copy.urgencyBar}
        </span>
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10 lg:py-16">
        {/* HERO */}
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs text-gold">
                <Sparkles className="size-3" /> {copy.eyebrow}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs">
                {[...Array(5)].map((_, i) => <Star key={i} className="size-3 fill-gold text-gold" />)}
                <span className="ml-1 text-muted-foreground">{copy.socialProofLabel}</span>
              </span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl shimmer-text leading-[1.02] mb-5">
              {copy.heroHeadline}<br />
              <span className="text-gold">{copy.heroHeadlineAccent}</span>
            </h1>
            <p className="text-lg sm:text-xl text-stardust/90 mb-6 leading-relaxed">
              <Html html={copy.heroSub} />
            </p>

            <ul className="space-y-2.5 mb-7">
              {copy.heroBullets.map((t, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm sm:text-base">
                  <Check className="size-5 text-gold shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-5">
              <Button onClick={() => setOpen(true)} size="lg"
                className="text-base font-medium px-8 shadow-[0_0_40px_-6px_color-mix(in_oklab,var(--gold)_70%,transparent)] hover:scale-[1.02] transition-transform">
                {landing.cta_text} →
              </Button>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm line-through text-muted-foreground">{oldPrice}</span>
                  <span className="text-2xl font-serif text-gold leading-none">{priceFormatted}</span>
                </div>
                <span className="text-xs text-muted-foreground">{installment}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Lock className="size-3.5 text-gold" /> Pagamento 100% seguro</span>
              <span className="inline-flex items-center gap-1.5"><Zap className="size-3.5 text-gold" /> Entrega em minutos</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-gold" /> Garantia 7 dias</span>
            </div>
          </div>

          <div className="relative">
            <div aria-hidden className="absolute -inset-8 rounded-full bg-nebula/20 blur-3xl animate-pulse" />
            <div aria-hidden className="absolute -inset-4 rounded-3xl bg-gold/15 blur-2xl" />
            {landing.hero_image_url ? (
              <img src={landing.hero_image_url} alt={landing.title}
                className="relative rounded-2xl shadow-2xl border border-gold/30 mx-auto max-w-full object-cover" />
            ) : (
              <div className="relative aspect-[4/5] rounded-2xl border border-gold/30 bg-gradient-to-br from-secondary to-background grid place-items-center">
                <Logo sizeClassName="size-32" animation="float" />
              </div>
            )}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-md border border-gold/40 rounded-full px-4 py-2 text-xs whitespace-nowrap shadow-xl">
              🔥 <span className="font-medium">{copy.livePurchase}</span>
            </div>
          </div>
        </div>

        {/* PAIN */}
        <section className="mt-20 lg:mt-28 max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-gold/80 mb-4">{copy.painEyebrow}</p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl shimmer-text mb-6 leading-tight">
            <Html html={copy.painHeadline.replace(/<em>/g, '<em class="text-gold not-italic">')} />
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            <Html html={copy.painBody} />
          </p>
        </section>

        {/* PILLARS */}
        <section className="mt-16 lg:mt-24">
          <div className="text-center mb-10">
            <p className="text-sm uppercase tracking-[0.3em] text-gold/80 mb-3">{copy.pillarsEyebrow}</p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl shimmer-text">{copy.pillarsHeadline}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {copy.pillars.map((p, i) => (
              <Card key={i} className="border-gold/20 bg-card/60 backdrop-blur-sm hover:border-gold/50 hover:-translate-y-1 transition-all group">
                <CardContent className="p-6">
                  <div className="grid place-items-center size-12 rounded-full bg-gradient-to-br from-gold/25 to-nebula/25 text-gold mb-4 group-hover:scale-110 transition-transform">
                    <p.icon className="size-5" />
                  </div>
                  <h3 className="font-serif text-xl mb-2 text-gold">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="mt-20 lg:mt-28">
          <div className="text-center mb-10">
            <p className="text-sm uppercase tracking-[0.3em] text-gold/80 mb-3">{copy.testimonialsEyebrow}</p>
            <h2 className="font-serif text-3xl sm:text-4xl shimmer-text">{copy.testimonialsHeadline}</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {copy.testimonials.map((t, i) => (
              <Card key={i} className="border-gold/20 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-6">
                  <Quote className="size-6 text-gold/60 mb-3" />
                  <p className="text-sm leading-relaxed mb-4 italic">"{t.text}"</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t.name}</span>
                    <div className="flex gap-0.5">
                      {[...Array(t.rating)].map((_, j) => <Star key={j} className="size-3 fill-gold text-gold" />)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mt-20 lg:mt-28">
          <div className="text-center mb-10">
            <p className="text-sm uppercase tracking-[0.3em] text-gold/80 mb-3">É simples assim</p>
            <h2 className="font-serif text-3xl sm:text-4xl shimmer-text">Do pagamento à revelação em minutos</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 relative">
            <div aria-hidden className="hidden sm:block absolute top-6 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
            {COMMON_HOW.map((s, i) => (
              <div key={i} className="relative text-center p-6 rounded-xl border border-gold/20 bg-card/60 backdrop-blur-sm">
                <div className="mx-auto grid place-items-center size-14 rounded-full bg-gradient-to-br from-gold/25 to-nebula/25 text-gold font-serif text-lg mb-4 border border-gold/40">
                  {s.num}
                </div>
                <h3 className="font-serif text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* GUARANTEE */}
        <section className="mt-20 lg:mt-28">
          <Card className="border-gold/40 bg-gradient-to-br from-gold/5 via-card/60 to-nebula/10 overflow-hidden">
            <CardContent className="p-8 sm:p-10 grid sm:grid-cols-[auto_1fr] gap-6 items-center">
              <div className="mx-auto sm:mx-0 grid place-items-center size-24 rounded-full bg-gold/15 border-2 border-gold/50 text-gold shrink-0">
                <ShieldCheck className="size-12" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-serif text-2xl sm:text-3xl shimmer-text mb-2">{copy.guaranteeTitle}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  <Html html={copy.guaranteeBody} />
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section className="mt-20 lg:mt-28 max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-gold/80 mb-3">{copy.faqEyebrow}</p>
            <h2 className="font-serif text-3xl sm:text-4xl shimmer-text">{copy.faqHeadline}</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {copy.faqs.map((f, i) => (
              <AccordionItem key={i} value={`i-${i}`} className="border border-gold/20 bg-card/60 backdrop-blur-sm rounded-xl px-5">
                <AccordionTrigger className="text-left font-serif text-lg hover:text-gold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* FINAL CTA */}
        <section className="mt-20 lg:mt-28">
          <Card className="border-gold/60 bg-gradient-to-br from-nebula/20 via-secondary/40 to-background overflow-hidden relative">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--gold)_25%,transparent),transparent_60%)]" />
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,color-mix(in_oklab,var(--nebula)_25%,transparent),transparent_60%)]" />
            <CardContent className="relative p-8 sm:p-14 text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-gold/90 mb-4">{copy.finalEyebrow}</p>
              <h2 className="font-serif text-3xl sm:text-5xl shimmer-text mb-4 leading-tight">
                <Html html={copy.finalHeadline.replace(/\n/g, "<br/>").replace(/<em>/g, '<em class="text-gold not-italic">')} />
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">{copy.finalBody}</p>

              <div className="flex items-baseline justify-center gap-3 mb-2">
                <span className="text-lg line-through text-muted-foreground">{oldPrice}</span>
                <span className="font-serif text-5xl sm:text-6xl text-gold">{priceFormatted}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-8">{installment} · pagamento único</p>

              <Button onClick={() => setOpen(true)} size="lg"
                className="text-base font-medium px-12 py-6 shadow-[0_0_50px_-8px_color-mix(in_oklab,var(--gold)_80%,transparent)] hover:scale-[1.03] transition-transform">
                {landing.cta_text} →
              </Button>

              <div className="flex flex-wrap justify-center gap-5 mt-8 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-gold" /> Garantia 7 dias</span>
                <span className="inline-flex items-center gap-1.5"><Lock className="size-3.5 text-gold" /> Compra segura</span>
                <span className="inline-flex items-center gap-1.5"><Zap className="size-3.5 text-gold" /> Entrega automática</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5 text-gold" /> Acesso imediato</span>
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
            <DialogTitle className="font-serif shimmer-text">{copy.dialogTitle}</DialogTitle>
            <DialogDescription>{copy.dialogDesc}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
            <LandingFieldsForm fields={required} values={values} onChange={setValues} idPrefix="f" />
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={mutation.isPending} className="w-full">
                {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Ir para pagamento seguro →"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
