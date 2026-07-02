import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles, DollarSign, TrendingUp, Users, Rocket, ShieldCheck,
  Gift, LineChart, Award, Zap,
} from "lucide-react";

export const Route = createFileRoute("/programa-afiliados")({
  component: ProgramaAfiliadosPage,
  head: () => ({
    meta: [
      { title: "Programa de Afiliados — Código Cósmico" },
      { name: "description", content: "Ganhe comissões recorrentes divulgando os produtos do Código Cósmico. Cadastre-se gratuitamente e comece a lucrar hoje." },
      { property: "og:title", content: "Programa de Afiliados — Código Cósmico" },
      { property: "og:description", content: "Comissões recorrentes, painel completo, pagamentos em PIX. Torne-se afiliado agora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const benefits = [
  { icon: DollarSign, title: "Comissões generosas", text: "Até 40% em cada venda + comissões recorrentes por assinatura ativa." },
  { icon: TrendingUp, title: "Escalabilidade real", text: "Ganhos exponenciais com níveis Bronze → Diamante e bônus por volume." },
  { icon: Zap, title: "Pagamento em PIX", text: "Saque a qualquer momento. Aprovação rápida direto na sua chave PIX." },
  { icon: LineChart, title: "Dashboard completo", text: "Rastreio em tempo real de cliques, conversões, ROI e ranking." },
  { icon: Gift, title: "Materiais prontos", text: "Banners, copy, vídeos e links UTM otimizados para você divulgar." },
  { icon: ShieldCheck, title: "Antifraude com IA", text: "Sua comissão protegida por scoring inteligente e atribuição multi-touch." },
];

const steps = [
  { n: "01", title: "Cadastre-se", text: "Preencha seus dados e receba seu código exclusivo de afiliado em segundos." },
  { n: "02", title: "Divulgue", text: "Compartilhe seu link personalizado nas redes sociais, WhatsApp, blog ou email." },
  { n: "03", title: "Receba", text: "A cada venda aprovada, sua comissão cai automática no seu saldo. Saque quando quiser." },
];

function ProgramaAfiliadosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border py-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,hsl(var(--gold)/0.15),transparent_60%)]" />
        <div className="mx-auto max-w-5xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] text-gold">
            <Sparkles className="size-3" /> Programa de Afiliados
          </div>
          <h1 className="font-serif text-4xl leading-tight md:text-6xl">
            Transforme sua audiência em <span className="text-gold">renda cósmica</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Divulgue os produtos do Código Cósmico — Mapas Astrais, Numerologia, Tarot e mais — e receba comissões
            recorrentes com um dos programas mais completos do mercado esotérico.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="bg-gold text-black hover:bg-gold/90">
              <Link to="/affiliate/register">
                <Rocket className="mr-2 size-4" /> Cadastrar-se agora
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/affiliate/login">Já sou afiliado · Entrar</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* NÚMEROS */}
      <section className="border-b border-border py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 text-center md:grid-cols-4">
          {[
            { v: "40%", l: "Comissão máxima" },
            { v: "24h", l: "Aprovação de saque" },
            { v: "5", l: "Níveis de carreira" },
            { v: "R$ 50", l: "Saque mínimo" },
          ].map((s) => (
            <div key={s.l}>
              <div className="font-serif text-4xl text-gold">{s.v}</div>
              <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-serif text-3xl md:text-4xl">Por que ser afiliado Código Cósmico?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Uma plataforma pensada para quem quer viver de divulgação digital com transparência total.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <Card key={b.title} className="border-border/60 bg-card/50">
                <CardContent className="pt-6">
                  <b.icon className="size-8 text-gold" />
                  <h3 className="mt-4 font-serif text-xl">{b.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{b.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="border-y border-border bg-card/30 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-serif text-3xl md:text-4xl">Como funciona</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10 font-serif text-2xl text-gold">
                  {s.n}
                </div>
                <h3 className="mt-4 font-serif text-xl">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GAMIFICAÇÃO */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <Award className="mx-auto size-10 text-gold" />
          <h2 className="mt-4 font-serif text-3xl md:text-4xl">Suba de nível, ganhe mais</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Bronze, Prata, Ouro, Platina e Diamante. Cada nível desbloqueia bônus de comissão, badges exclusivas
            e missões com recompensas em pontos.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {["Bronze","Prata","Ouro","Platina","Diamante"].map((n) => (
              <span key={n} className="rounded-full border border-gold/40 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-gold">
                {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Users className="mx-auto size-10 text-gold" />
          <h2 className="mt-4 font-serif text-3xl md:text-4xl">Pronto para começar?</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Cadastro 100% gratuito. Sem mensalidades. Sem letra miúda. Você só ganha.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="bg-gold text-black hover:bg-gold/90">
              <Link to="/affiliate/register">
                <Sparkles className="mr-2 size-4" /> Quero ser afiliado
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Entrar na minha conta</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <Link to="/" className="hover:text-gold">← Voltar à página inicial</Link>
      </footer>
    </div>
  );
}
