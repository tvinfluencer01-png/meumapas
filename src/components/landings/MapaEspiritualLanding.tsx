import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles, Check, Loader2, Star, ShieldCheck, Zap, Clock, Lock,
  Flame, Moon, Eye, Compass, Infinity as InfinityIcon, HeartHandshake, Quote,
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

export function MapaEspiritualLanding({
  landing,
  onCheckoutSuccess,
}: {
  landing: Landing;
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

  const pillars = [
    { icon: Compass, title: "Missão Kármica", desc: "O propósito exato pelo qual sua alma escolheu esta encarnação — e o que você precisa concluir." },
    { icon: Eye, title: "Dons Mediúnicos", desc: "Sensibilidades ocultas que já se manifestam em você e como ativá-las com segurança." },
    { icon: Flame, title: "Feridas Ancestrais", desc: "Padrões herdados que travam sua evolução — e o ritual para dissolver cada um." },
    { icon: Moon, title: "Portais de Despertar", desc: "Janelas cósmicas específicas dos seus próximos 12 meses para saltos espirituais." },
    { icon: HeartHandshake, title: "Práticas Alinhadas", desc: "Meditação, mantras e rituais escolhidos a dedo para o SEU mapa — não genéricos." },
    { icon: InfinityIcon, title: "Ciclos Evolutivos", desc: "Onde você está na roda da alma e o próximo passo pra sair do platô espiritual." },
  ];

  const testimonials = [
    { name: "Camila R.", text: "Chorei lendo. Coisas que eu sentia há anos ganharam nome. Nunca vi algo tão preciso.", rating: 5 },
    { name: "Rafael M.", text: "A missão kármica bateu em cheio. Mudei decisões importantes depois dessa leitura.", rating: 5 },
    { name: "Juliana P.", text: "Achei que fosse mais um relatório genérico. É o oposto: parece feito só pra mim.", rating: 5 },
  ];

  const faqs = [
    { q: "Em quanto tempo recebo?", a: "Em poucos minutos após o pagamento aprovado. Você recebe no e-mail e no WhatsApp." },
    { q: "Preciso saber a hora exata do nascimento?", a: "Ajuda muito, mas se não souber, geramos com aproximação. Basta informar." },
    { q: "É seguro? E se eu não gostar?", a: "Garantia incondicional de 7 dias. Não gostou? Devolvemos 100% sem perguntas." },
    { q: "Como é diferente de um mapa astral comum?", a: "É focado 100% na jornada da alma: karma, mediunidade e despertar — não em previsões banais." },
  ];

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <Starfield count={150} className="fixed" />
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--nebula)_18%,transparent),transparent_65%)]" />
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_bottom,color-mix(in_oklab,var(--gold)_10%,transparent),transparent_60%)]" />

      {/* URGENCY BAR */}
      <div className="relative z-20 bg-gradient-to-r from-gold/20 via-gold/30 to-gold/20 border-b border-gold/40 text-center py-2 px-4 text-xs sm:text-sm">
        <span className="inline-flex items-center gap-2 text-gold-glow font-medium">
          <Flame className="size-3.5 animate-pulse" />
          Oferta de despertar — vagas limitadas nesta semana cósmica
        </span>
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/40 backdrop-blur-sm bg-background/40">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo sizeClassName="size-10" animation="float" />
          <span className="font-serif text-lg shimmer-text">Código Cósmico</span>
        </Link>
        <Button variant="ghost" size="sm" asChild><Link to="/auth">Já tenho conta</Link></Button>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10 lg:py-16">
        {/* HERO */}
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs text-gold">
                <Sparkles className="size-3" /> Leitura de Alma · Nível Avançado
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs">
                {[...Array(5)].map((_, i) => <Star key={i} className="size-3 fill-gold text-gold" />)}
                <span className="ml-1 text-muted-foreground">4.9 · +2.500 almas</span>
              </span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl shimmer-text leading-[1.02] mb-5">
              A sua alma tem uma missão.<br/>
              <span className="text-gold">E ela já foi escrita.</span>
            </h1>
            <p className="text-lg sm:text-xl text-stardust/90 mb-6 leading-relaxed">
              Descubra o mapa oculto que sua alma trouxe pra esta encarnação: <strong className="text-foreground">karma, mediunidade, feridas ancestrais e os portais exatos do seu despertar</strong> nos próximos 12 meses.
            </p>

            <ul className="space-y-2.5 mb-7">
              {[
                "Por que certas dores se repetem — e como quebrar o ciclo",
                "Os dons espirituais que você tem (mas ainda não ativou)",
                "As datas exatas dos seus próximos saltos de consciência",
              ].map((t, i) => (
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
              🔥 <span className="font-medium">37 pessoas</span> compraram nas últimas 24h
            </div>
          </div>
        </div>

        {/* PAIN AGITATION */}
        <section className="mt-20 lg:mt-28 max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-gold/80 mb-4">Se você chegou até aqui…</p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl shimmer-text mb-6 leading-tight">
            Algo dentro de você sabe que <em className="text-gold not-italic">veio pra mais</em>.
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Você sente que está no lugar errado. Que existe um propósito maior. Que sonhos, sincronicidades e intuições estão te chamando — mas sem um mapa, tudo vira ruído. <strong className="text-foreground">É hora de ver com clareza o que sua alma veio fazer aqui.</strong>
          </p>
        </section>

        {/* PILLARS */}
        <section className="mt-16 lg:mt-24">
          <div className="text-center mb-10">
            <p className="text-sm uppercase tracking-[0.3em] text-gold/80 mb-3">O que você vai receber</p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl shimmer-text">6 revelações que mudam sua rota</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pillars.map((p, i) => (
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
            <p className="text-sm uppercase tracking-[0.3em] text-gold/80 mb-3">Provas de despertar</p>
            <h2 className="font-serif text-3xl sm:text-4xl shimmer-text">Quem leu, nunca mais foi o mesmo</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
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
            {[
              { num: "01", title: "Preencha seus dados", desc: "Nome, data, hora e local de nascimento. Leva 60 segundos." },
              { num: "02", title: "Pagamento seguro", desc: "Cartão, Pix ou boleto pelo Mercado Pago. Aprovação imediata." },
              { num: "03", title: "Receba sua leitura", desc: "PDF premium de 30+ páginas no e-mail e WhatsApp." },
            ].map((s, i) => (
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
                <h3 className="font-serif text-2xl sm:text-3xl shimmer-text mb-2">Garantia incondicional de 7 dias</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Leia. Sinta. Aplique. Se em 7 dias você não sentir que este mapa mudou sua forma de enxergar sua alma, devolvemos <strong className="text-foreground">100% do seu dinheiro</strong>. Sem perguntas, sem burocracia. O risco é todo nosso.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section className="mt-20 lg:mt-28 max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-gold/80 mb-3">Perguntas frequentes</p>
            <h2 className="font-serif text-3xl sm:text-4xl shimmer-text">Ainda em dúvida?</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
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
              <p className="text-xs uppercase tracking-[0.35em] text-gold/90 mb-4">Sua alma está chamando</p>
              <h2 className="font-serif text-3xl sm:text-5xl shimmer-text mb-4 leading-tight">
                Ou você continua adivinhando.<br/>
                Ou você <em className="text-gold not-italic">finalmente vê</em>.
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                Menos que o preço de um jantar. Uma revelação que pode reorientar os próximos 10 anos da sua vida.
              </p>

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
            <DialogTitle className="font-serif shimmer-text">Dados para sua leitura de alma</DialogTitle>
            <DialogDescription>
              Preencha com atenção — a precisão dos dados torna a leitura mais profunda. Após o pagamento criamos sua conta e enviamos o PDF por e-mail.
            </DialogDescription>
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
