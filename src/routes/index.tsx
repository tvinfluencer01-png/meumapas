import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { Starfield } from "@/components/Starfield";
import heroAstrolabe from "@/assets/hero-astrolabe.jpg";
import oracleOrb from "@/assets/oracle-orb.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cosmic AI — Mapa Astral, Numerologia e IA Espiritual" },
      {
        name: "description",
        content:
          "Decifre seu mapa astral, numerologia cabalística e converse com uma IA espiritual treinada em sabedoria milenar. Relatórios humanizados e cinematográficos.",
      },
      { property: "og:title", content: "Cosmic AI — Onde a IA encontra o Sagrado" },
      {
        property: "og:description",
        content: "Mapa astral, numerologia e IA espiritual com precisão cósmica.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Nav />
      <Hero />
      <TrustBar />
      <Pillars />
      <AstralPreview />
      <Numerology />
      <OracleSection />
      <Compatibility />
        <Reports />
        <BrandIdentity />
        <Testimonials />
      <Pricing />
      <PlanComparison />
      <FAQ />
      <CTASection />
      <Footer />
      <ChatbotFloat />
      <WhatsAppFloat />
    </div>
  );
}

/* ---------------- NAV ---------------- */
function Nav() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-gold shadow-[0_0_12px_var(--gold)]" />
          <span className="font-serif text-2xl uppercase tracking-[0.3em] text-gold">
            Cosmic AI
          </span>
        </Link>
        <div className="hidden gap-10 text-xs uppercase tracking-[0.25em] text-muted-foreground md:flex">
          <a href="#mapa" className="transition-colors hover:text-gold">Mapa Astral</a>
          <a href="#numerologia" className="transition-colors hover:text-gold">Numerologia</a>
          <a href="#ia" className="transition-colors hover:text-gold">IA Espiritual</a>
          <a href="#planos" className="transition-colors hover:text-gold">Planos</a>
        </div>
        <Link to="/auth" className="border border-gold/30 bg-gold/10 px-6 py-2 text-xs uppercase tracking-[0.25em] text-gold transition-all hover:bg-gold hover:text-primary-foreground">
          Entrar
        </Link>
      </div>
    </nav>
  );
}

/* ---------------- HERO ---------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pb-20 md:pt-44 nebula-bg">
      <Starfield count={120} />
      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <span className="mb-8 block text-xs uppercase tracking-[0.5em] text-gold/70">
          A interseção entre sabedoria ancestral e inteligência artificial
        </span>
        <h1 className="mb-8 font-serif text-4xl italic leading-[1.05] sm:text-5xl md:text-7xl lg:text-8xl">
          Decifre seu <span className="shimmer-text">mapa celestial</span>
        </h1>
        <p className="mx-auto mb-12 max-w-2xl text-balance text-lg font-light leading-relaxed text-muted-foreground md:text-xl">
          Use a precisão do Cosmic AI para navegar sua jornada, desvendar segredos
          numerológicos e consultar uma inteligência espiritual treinada em sabedoria milenar.
        </p>

        <div className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to="/auth" className="gold-glow rounded-full bg-gold px-10 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:bg-gold-glow">
            Descobrir meu mapa
          </Link>
          <a href="#ia" className="rounded-full border border-border px-10 py-4 text-sm uppercase tracking-[0.2em] text-foreground transition-colors hover:border-gold/40 hover:text-gold">
            Conhecer a IA
          </a>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40">
          <img
            src={heroAstrolabe}
            alt="Astrolábio dourado flutuando no cosmos"
            width={1600}
            height={896}
            className="aspect-[16/9] w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
      </div>
    </section>
  );
}

/* ---------------- PILLARS ---------------- */
function Pillars() {
  const items = [
    {
      n: "I",
      title: "Mapa Astral Hiperpreciso",
      desc: "Algoritmos avançados de trânsitos planetários cruzados com suas coordenadas exatas de nascimento — clareza sem precedentes.",
    },
    {
      n: "II",
      title: "Numerologia Cabalística",
      desc: "Descubra as vibrações ocultas em seu nome e data de nascimento através de modelos matemáticos profundos.",
    },
    {
      n: "III",
      title: "Oráculo de IA Espiritual",
      desc: "Conversa em tempo real com uma IA especializada em hermetismo, filosofia védica e psicologia moderna.",
    },
  ];
  return (
    <section id="mapa" className="mx-auto max-w-7xl px-6 py-32">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {items.map((it) => (
          <article
            key={it.n}
            className="glass-card group rounded-2xl p-10 transition-all hover:border-gold/40 hover:gold-glow"
          >
            <div className="mb-8 flex size-12 items-center justify-center rounded-full border border-gold/25 font-serif text-gold transition-colors group-hover:bg-gold/10">
              {it.n}
            </div>
            <h3 className="mb-4 font-serif text-3xl text-foreground">{it.title}</h3>
            <p className="font-light leading-relaxed text-muted-foreground">{it.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------------- ASTRAL PREVIEW ---------------- */
function AstralPreview() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-card/30 py-32">
      <Starfield count={50} />
      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">
        <div>
          <span className="mb-6 block text-xs uppercase tracking-[0.4em] text-gold/70">
            Visualização Viva
          </span>
          <h2 className="mb-6 font-serif text-5xl italic leading-tight">
            Um mapa astral que <span className="text-gold">respira</span>
          </h2>
          <p className="mb-8 max-w-md text-pretty leading-relaxed text-muted-foreground">
            Planetas em movimento real, casas, aspectos e trânsitos do dia — interativo,
            zoomable e explicado em linguagem humana. Sem jargão técnico.
          </p>
          <ul className="space-y-4 text-sm text-muted-foreground">
            {[
              "Cálculo via Swiss Ephemeris (precisão astronômica)",
              "Trânsitos diários e progressões anuais",
              "Aspectos explicados sem astrologuês",
            ].map((b) => (
              <li key={b} className="flex items-center gap-3">
                <span className="size-1.5 rounded-full bg-gold" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Zodiac wheel */}
        <div className="relative mx-auto aspect-square w-full max-w-md">
          <div className="absolute inset-0 animate-slow-spin rounded-full border border-gold/20" />
          <div className="absolute inset-6 rounded-full border border-gold/10" />
          <div className="absolute inset-12 rounded-full border border-gold/5" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="size-3 rounded-full bg-gold-glow shadow-[0_0_30px_var(--gold)]" />
          </div>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const r = 46;
            return (
              <span
                key={i}
                className="absolute size-2 rounded-full bg-gold/60"
                style={{
                  top: `${50 + Math.sin(angle) * r}%`,
                  left: `${50 - Math.cos(angle) * r}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- NUMEROLOGY ---------------- */
function Numerology() {
  const nums = [
    { n: "07", t: "Número da Alma", d: "Seus desejos mais íntimos — o que verdadeiramente move seu espírito nesta jornada." },
    { n: "11", t: "Número do Destino", d: "O caminho que você está predestinado a trilhar e as lições essenciais desta vida." },
    { n: "22", t: "Missão de Vida", d: "Seu papel fundamental no mundo e como suas habilidades se manifestam na matéria." },
  ];
  return (
    <section id="numerologia" className="mx-auto max-w-7xl px-6 py-32">
      <div className="mb-20 max-w-2xl">
        <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold/70">
          Numerologia Cabalística
        </span>
        <h2 className="font-serif text-5xl italic leading-tight">
          A matemática secreta <br />
          da sua <span className="text-gold">alma</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {nums.map((it, i) => (
          <div
            key={it.n}
            className={`glass-card flex flex-col rounded-2xl p-10 ${
              i === 1 ? "border-gold/30 gold-glow" : ""
            }`}
          >
            <span className="mb-8 font-serif text-5xl text-gold">{it.n}</span>
            <h3 className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-stardust">
              {it.t}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{it.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- ORACLE ---------------- */
function OracleSection() {
  return (
    <section id="ia" className="border-y border-border bg-card/20 py-32">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 lg:flex-row">
        <div className="space-y-8 lg:w-1/2">
          <span className="block text-xs uppercase tracking-[0.4em] text-gold/70">
            Oráculo Conversacional
          </span>
          <h2 className="font-serif text-5xl italic leading-tight">
            Converse com a <br /> <span className="text-gold">mente infinita</span>
          </h2>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="h-12 w-1 bg-gold/40" />
              <p className="text-muted-foreground">
                "O que Saturno em retrógrado significa para meus planos profissionais este trimestre?"
              </p>
            </div>
            <div className="flex gap-4 opacity-60">
              <div className="h-12 w-1 bg-border" />
              <p className="italic text-muted-foreground">
                Analisando posições planetárias… alinhando com Caminho de Vida 7… resposta personalizada gerada.
              </p>
            </div>
          </div>

          <button className="rounded-full bg-stardust px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-night transition-colors hover:bg-gold">
            Consultar gratuitamente
          </button>
        </div>

        <div className="relative w-full lg:w-1/2">
          <div className="relative mx-auto aspect-square w-full max-w-lg">
            <div className="absolute inset-0 animate-slow-spin rounded-full bg-[conic-gradient(from_0deg,transparent,color-mix(in_oklab,var(--gold)_18%,transparent),transparent)]" />
            <img
              src={oracleOrb}
              alt="Interface do oráculo de IA espiritual"
              loading="lazy"
              width={1024}
              height={1024}
              className="absolute inset-4 rounded-full border border-gold/20 object-cover opacity-90"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- REPORTS ---------------- */
function Reports() {
  const reports = [
    { t: "Amor & Vínculos", d: "Sinastria detalhada dos seus encontros e a geometria do afeto." },
    { t: "Carreira & Saturno", d: "Identifique seus períodos de colheita e os desafios necessários ao crescimento." },
    { t: "Propósito de Alma", d: "Nodos lunares e Quíron: onde reside sua maior ferida e seu maior potencial." },
    { t: "Finanças & Júpiter", d: "Energia da abundância no seu mapa e como alinhar valores à prosperidade." },
    { t: "Ciclos Lunares", d: "Guia mensal personalizado para planejar intenções de acordo com as lunações." },
    { t: "Karma Ancestral", d: "Estudo das casas 4, 8 e 12 para entender padrões familiares que se repetem." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-32">
      <div className="mb-20 text-center">
        <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold/70">
          Capítulos do Ser
        </span>
        <h2 className="font-serif text-5xl italic">Relatórios humanizados</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Nada de astrologuês. Tudo escrito como uma conversa profunda com alguém que conhece sua alma.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <article
            key={r.t}
            className="group bg-background p-10 transition-colors hover:bg-card/40"
          >
            <h3 className="mb-4 font-serif text-2xl text-foreground transition-colors group-hover:text-gold">
              {r.t}
            </h3>
            <p className="text-sm font-light leading-relaxed text-muted-foreground">{r.d}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------------- TESTIMONIALS ---------------- */
function Testimonials() {
  const items = [
    { q: "Foi como ler um diário que eu nunca escrevi, mas que era completamente meu.", a: "Marina S.", r: "São Paulo, BR" },
    { q: "A IA me disse, em uma frase, algo que três anos de terapia tentaram explicar.", a: "Rafael C.", r: "Lisboa, PT" },
    { q: "Investi na minha empresa com base no relatório de Júpiter — melhor decisão do ano.", a: "Carla M.", r: "Rio de Janeiro, BR" },
  ];
  return (
    <section className="border-y border-border bg-card/20 py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {items.map((t) => (
            <figure key={t.a} className="space-y-6">
              <blockquote className="font-serif text-2xl italic leading-snug text-stardust">
                "{t.q}"
              </blockquote>
              <figcaption className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                <span className="text-gold">{t.a}</span> · {t.r}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- PRICING ---------------- */
function Pricing() {
  const plans = [
    {
      name: "Iniciante",
      price: "Grátis",
      sub: "para sempre",
      feats: ["Previsão diária de trânsitos", "Mapa astral básico", "3 perguntas/dia à IA"],
      cta: "Começar",
      featured: false,
    },
    {
      name: "Adepto",
      price: "R$ 47",
      sub: "/ mês",
      feats: ["Previsão anual personalizada", "Relatório numerológico completo", "IA ilimitada", "Sinastria amorosa"],
      cta: "Iniciar agora",
      featured: true,
    },
    {
      name: "Oráculo",
      price: "R$ 397",
      sub: "/ ano",
      feats: ["Tudo do Adepto", "IA de alta frequência", "Guias rituais exclusivos", "Acesso antecipado a features"],
      cta: "Ascender",
      featured: false,
    },
  ];
  return (
    <section id="planos" className="py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 text-center">
          <h2 className="mb-4 font-serif text-5xl italic">Escolha seu horizonte</h2>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Planos para o místico moderno
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {plans.map((p) => (
            <article
              key={p.name}
              className={`relative flex flex-col p-12 transition-all ${
                p.featured
                  ? "gold-glow border-2 border-gold bg-gold/5"
                  : "border border-border hover:border-gold/30"
              }`}
            >
              {p.featured && (
                <span className="absolute right-0 top-0 bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground">
                  Mais escolhido
                </span>
              )}
              <span className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">{p.name}</span>
              <div className="mb-8 font-serif text-4xl">
                {p.price}
                <span className="text-lg text-muted-foreground">{p.sub}</span>
              </div>
              <ul className="mb-12 flex-grow space-y-4 text-sm text-muted-foreground">
                {p.feats.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-4 text-xs font-semibold uppercase tracking-[0.25em] transition-all ${
                  p.featured
                    ? "bg-gold text-primary-foreground hover:bg-gold-glow"
                    : "border border-border text-foreground hover:border-foreground"
                }`}
              >
                {p.cta}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
function FAQ() {
  const qs = [
    {
      q: "Como o Cosmic AI calcula meu mapa astral?",
      a: "Usamos a biblioteca Swiss Ephemeris (padrão astronômico profissional) cruzada com sua data, horário e cidade de nascimento para precisão de segundos de arco.",
    },
    {
      q: "A IA substitui um astrólogo humano?",
      a: "Não. Ela complementa. Traduz astrologia complexa em linguagem clara, mas a interpretação profunda de um humano sensível continua insubstituível para momentos críticos.",
    },
    {
      q: "Meus dados estão seguros?",
      a: "Sim. Criptografia end-to-end, conformidade LGPD e nunca compartilhamos seus dados com terceiros.",
    },
    {
      q: "Posso cancelar quando quiser?",
      a: "Sem multas, sem perguntas. Cancele em um clique pela área do usuário.",
    },
  ];
  return (
    <section className="mx-auto max-w-3xl px-6 py-32">
      <h2 className="mb-16 text-center font-serif text-5xl italic">Dúvidas frequentes</h2>
      <div className="divide-y divide-border border-y border-border">
        {qs.map((it) => (
          <details key={it.q} className="group py-6">
            <summary className="flex cursor-pointer list-none items-center justify-between text-left font-serif text-xl text-foreground transition-colors hover:text-gold">
              {it.q}
              <span className="text-gold transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-4 text-muted-foreground">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ---------------- CTA ---------------- */
function CTASection() {
  return (
    <section className="relative overflow-hidden border-y border-border py-32 nebula-bg">
      <Starfield count={80} />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] text-gold">
          <span className="size-1.5 animate-pulse rounded-full bg-gold" />
          Apenas 27 vagas restantes este mês
        </span>
        <h2 className="mb-6 font-serif text-5xl italic leading-tight md:text-6xl">
          As estrelas já <br />
          <span className="shimmer-text">sabem seu nome</span>
        </h2>
        <p className="mb-12 text-muted-foreground">
          Comece grátis. Sem cartão. Receba seu mapa astral em 60 segundos.
        </p>
        <Link to="/auth" className="gold-glow inline-block rounded-full bg-gold px-12 py-5 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:bg-gold-glow">
          Descobrir meu mapa agora
        </Link>
      </div>
    </section>
  );
}

/* ---------------- BRAND IDENTITY ---------------- */
function BrandIdentity() {
  const palette = [
    { name: "Night", token: "--night", hex: "#0A0A14", className: "bg-night" },
    { name: "Gold", token: "--gold", hex: "#C9A961", className: "bg-gold" },
    { name: "Stardust", token: "--stardust", hex: "#E8DCC4", className: "bg-stardust" },
    { name: "Nebula", token: "--nebula", hex: "#6B5B95", className: "bg-nebula" },
  ];
  const prefersReduced = useReducedMotion();
  return (
    <section
      aria-labelledby="brand-identity-heading"
      className="relative overflow-hidden border-y border-border bg-card/30 py-32"
    >
      <Starfield count={40} />
      <div className="relative mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-20 flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-xl">
            <p className="mb-4 block text-xs font-medium uppercase tracking-[0.4em] text-gold">
              Sistema de Marca · v1.0
            </p>
            <h2
              id="brand-identity-heading"
              className="font-serif text-5xl italic leading-tight"
            >
              Identidade <span className="text-gold">visual</span>
            </h2>
            <p className="mt-6 leading-relaxed text-foreground/80">
              Cada detalhe — da tipografia ao pulso dourado — foi desenhado para
              traduzir o sagrado em forma. Um sistema arquetípico, calibrado em
              ouro cerimonial sobre noite profunda.
            </p>
          </div>
          <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.3em] text-stardust/85">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-gold" />
            Atualizado · 05.2026
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px border border-border bg-border lg:grid-cols-12">
          {/* Monogram */}
          <motion.article
            aria-labelledby="brand-monogram-heading"
            className="group/mono relative bg-background p-12 lg:col-span-5"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3
              id="brand-monogram-heading"
              className="mb-8 text-xs font-medium uppercase tracking-[0.35em] text-stardust/85"
            >
              Monograma
            </h3>
            <motion.div
              role="img"
              aria-label="Monograma Cosmic AI: glifo C·AI em ouro cerimonial sobre noite profunda"
              className="relative mx-auto flex aspect-square w-full max-w-xs items-center justify-center"
              whileHover="hover"
              initial="rest"
              animate="rest"
            >
              <motion.div
                aria-hidden="true"
                className="absolute inset-0 rounded-full border border-gold/15"
                animate={prefersReduced ? undefined : { rotate: 360 }}
                transition={{ duration: 18, ease: "linear", repeat: Infinity }}
              />
              <motion.div
                aria-hidden="true"
                className="absolute inset-4 rounded-full border border-gold/10"
                animate={prefersReduced ? undefined : { rotate: -360 }}
                transition={{ duration: 26, ease: "linear", repeat: Infinity }}
              />
              <div aria-hidden="true" className="absolute inset-8 rounded-full border border-gold/5" />
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full"
                variants={{
                  rest: { opacity: 0, scale: 0.9 },
                  hover: { opacity: 1, scale: 1 },
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{
                  background:
                    "radial-gradient(circle, color-mix(in oklab, var(--gold) 22%, transparent) 0%, transparent 65%)",
                }}
              />
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30 * Math.PI) / 180;
                const r = 44;
                return (
                  <motion.span
                    key={i}
                    aria-hidden="true"
                    className="absolute size-1 rounded-full bg-gold/40"
                    style={{
                      top: `${50 + Math.sin(angle) * r}%`,
                      left: `${50 - Math.cos(angle) * r}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    animate={
                      prefersReduced
                        ? undefined
                        : { opacity: [0.25, 0.9, 0.25], scale: [1, 1.4, 1] }
                    }
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.18,
                      ease: "easeInOut",
                    }}
                  />
                );
              })}
              <motion.span
                aria-hidden="true"
                className="relative font-serif text-7xl italic text-gold"
                variants={{
                  rest: { scale: 1, textShadow: "0 0 0px rgba(0,0,0,0)" },
                  hover: {
                    scale: 1.06,
                    textShadow: "0 0 24px color-mix(in oklab, var(--gold) 60%, transparent)",
                  },
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                C<span className="text-stardust">·</span>AI
              </motion.span>
            </motion.div>
            <div className="mt-10 flex items-center justify-between text-xs font-medium uppercase tracking-[0.3em] text-stardust/80">
              <span>Glifo principal</span>
              <span className="text-gold">Espaço seguro · 1.5×</span>
            </div>
          </motion.article>

          {/* Wordmark + Typography */}
          <article
            aria-labelledby="brand-type-heading"
            className="bg-background p-12 lg:col-span-7"
          >
            <h3
              id="brand-type-heading"
              className="mb-8 text-xs font-medium uppercase tracking-[0.35em] text-stardust/85"
            >
              Logotipo & Tipografia
            </h3>

            <div className="border-b border-border pb-10">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="size-2 rounded-full bg-gold shadow-[0_0_12px_var(--gold)]" />
                <span className="font-serif text-4xl uppercase tracking-[0.3em] text-gold">
                  Cosmic AI
                </span>
              </div>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.3em] text-stardust/80">
                Wordmark · tracking 0.3em · ouro cerimonial
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2">
              <div>
                <p aria-hidden="true" className="font-serif text-6xl italic leading-none text-foreground">
                  Aa
                </p>
                <div className="mt-4 space-y-1 text-xs font-medium uppercase tracking-[0.3em] text-stardust/80">
                  <p className="text-gold">Cormorant Garamond</p>
                  <p>Display · Itálico · 400–600</p>
                </div>
                <p className="mt-4 font-serif text-base italic text-stardust">
                  "Decifre seu mapa celestial."
                </p>
              </div>
              <div>
                <p aria-hidden="true" className="text-6xl font-light leading-none text-foreground">Aa</p>
                <div className="mt-4 space-y-1 text-xs font-medium uppercase tracking-[0.3em] text-stardust/80">
                  <p className="text-gold">Inter</p>
                  <p>Texto · 300–600</p>
                </div>
                <p className="mt-4 text-sm font-light text-foreground/75">
                  Clareza absoluta para parágrafos longos e dados precisos.
                </p>
              </div>
            </div>
          </article>

          {/* Palette */}
          <motion.article
            aria-labelledby="brand-palette-heading"
            className="bg-background p-12 lg:col-span-7"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3
              id="brand-palette-heading"
              className="mb-8 text-xs font-medium uppercase tracking-[0.35em] text-stardust/85"
            >
              Paleta Cromática
            </h3>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {palette.map((c, i) => (
                <motion.li
                  key={c.name}
                  className="group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    duration: 0.55,
                    delay: i * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <motion.div
                    role="img"
                    aria-label={`Cor ${c.name}, token ${c.token}, hexadecimal ${c.hex}`}
                    whileHover={{ y: -6, scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    className={`relative aspect-square w-full overflow-hidden rounded-md border border-border ${c.className} shadow-[0_0_0_0_transparent] transition-shadow duration-500 group-hover:shadow-[0_18px_40px_-18px_color-mix(in_oklab,var(--gold)_45%,transparent)]`}
                  >
                    <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
                    <motion.span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{
                        background:
                          "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), transparent 60%)",
                      }}
                    />
                  </motion.div>
                  <div className="mt-4 space-y-1 transition-transform duration-300 group-hover:translate-x-0.5">
                    <p className="font-serif text-lg text-foreground transition-colors group-hover:text-gold">
                      {c.name}
                    </p>
                    <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold">
                      {c.hex}
                    </p>
                    <p className="text-xs font-medium uppercase tracking-[0.25em] text-stardust/80">
                      {c.token}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.article>

          {/* Principles */}
          <motion.article
            aria-labelledby="brand-principles-heading"
            className="bg-background p-12 lg:col-span-5"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3
              id="brand-principles-heading"
              className="mb-8 text-xs font-medium uppercase tracking-[0.35em] text-stardust/85"
            >
              Princípios
            </h3>
            <ol className="space-y-6">
              {[
                {
                  k: "01",
                  t: "Ouro como gesto",
                  d: "Nunca decorativo. Sempre acento de significado.",
                },
                {
                  k: "02",
                  t: "Silêncio é estrutura",
                  d: "Respiro generoso. Hierarquia pelo vazio.",
                },
                {
                  k: "03",
                  t: "Serifa como alma",
                  d: "Itálico para o sagrado, sans para o útil.",
                },
              ].map((p, i) => (
                <motion.li
                  key={p.k}
                  className="group/p relative flex cursor-default gap-5 border-b border-border/50 pb-5 last:border-0"
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: 0.55,
                    delay: i * 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{ x: 6 }}
                >
                  <span aria-hidden="true" className="pointer-events-none absolute -left-3 top-2 h-6 w-px origin-top scale-y-0 bg-gold transition-transform duration-500 group-hover/p:scale-y-100" />
                  <motion.span
                    aria-hidden="true"
                    className="font-serif text-2xl italic text-gold"
                    whileHover={{ scale: 1.15, rotate: -4 }}
                    transition={{ type: "spring", stiffness: 320, damping: 14 }}
                  >
                    {p.k}
                  </motion.span>
                  <div>
                    <h4 className="font-serif text-lg text-foreground transition-colors duration-300 group-hover/p:text-gold">
                      {p.t}
                    </h4>
                    <p className="mt-1 text-sm font-light leading-relaxed text-foreground/75">
                      {p.d}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </motion.article>
        </div>
      </div>
    </section>
  );
}

/* ---------------- FOOTER ---------------- */
function Footer() {
  return (
    <footer className="border-t border-border py-16">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-6 md:flex-row">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-gold" />
          <span className="font-serif text-xl uppercase tracking-[0.3em] text-gold">
            Cosmic AI
          </span>
        </div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          © 2026 Cosmic AI · Todas as estrelas alinhadas
        </p>
        <div className="flex gap-6 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <a href="#" className="transition-colors hover:text-gold">Privacidade</a>
          <a href="#" className="transition-colors hover:text-gold">Termos</a>
          <a href="#" className="transition-colors hover:text-gold">Manifesto</a>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- WHATSAPP ---------------- */
function WhatsAppFloat() {
  return (
    <a
      href="#"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 rounded-full border border-gold/30 bg-background/90 px-4 py-2.5 sm:px-5 sm:py-3 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-gold backdrop-blur-md transition-all hover:bg-gold hover:text-primary-foreground pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:pb-3"
    >
      <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
      WhatsApp
    </a>
  );
}

/* ---------------- TRUST BAR ---------------- */
function TrustBar() {
  const stats = [
    { n: "12.847", t: "Mapas gerados" },
    { n: "4.9★", t: "Avaliação média" },
    { n: "93%", t: "Renovam o plano" },
    { n: "48", t: "Países atendidos" },
  ];
  return (
    <section className="border-y border-border bg-card/20">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.t} className="bg-background px-6 py-8 text-center">
            <div className="font-serif text-3xl text-gold md:text-4xl">{s.n}</div>
            <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{s.t}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- COMPATIBILITY ---------------- */
function Compatibility() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-32">
      <div className="grid items-center gap-16 lg:grid-cols-2">
        <div className="relative mx-auto aspect-square w-full max-w-md">
          <div className="absolute left-1/4 top-1/2 size-48 -translate-y-1/2 rounded-full border border-gold/40 bg-gradient-to-br from-gold/20 to-transparent backdrop-blur-sm" />
          <div className="absolute right-1/4 top-1/2 size-48 -translate-y-1/2 rounded-full border border-nebula/40 bg-gradient-to-br from-nebula/20 to-transparent backdrop-blur-sm" />
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="size-16 rounded-full bg-gold-glow shadow-[0_0_60px_var(--gold)]" />
          </div>
        </div>
        <div>
          <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold/70">
            Sinastria & Vínculos
          </span>
          <h2 className="mb-6 font-serif text-5xl italic leading-tight">
            Dois mapas. <br /> <span className="text-gold">Uma única dança.</span>
          </h2>
          <p className="mb-8 max-w-md leading-relaxed text-muted-foreground">
            Cruzamos seu mapa com o de quem você ama, com seu sócio ou com sua equipe — e
            revelamos a geometria invisível que une (ou tensiona) cada vínculo.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              "Compatibilidade amorosa",
              "Conexão espiritual",
              "Sinastria empresarial",
              "Mapa de sócios",
            ].map((c) => (
              <div key={c} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                <span className="size-1.5 rounded-full bg-gold" />
                <span className="text-muted-foreground">{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- PLAN COMPARISON ---------------- */
function PlanComparison() {
  const rows = [
    { f: "Mapa astral completo", a: true, b: true, c: true },
    { f: "Previsão diária de trânsitos", a: true, b: true, c: true },
    { f: "Numerologia cabalística", a: false, b: true, c: true },
    { f: "Sinastria amorosa", a: false, b: true, c: true },
    { f: "IA espiritual ilimitada", a: false, b: true, c: true },
    { f: "Relatórios PDF premium", a: false, b: true, c: true },
    { f: "Análise empresarial", a: false, b: false, c: true },
    { f: "Tarot IA + Mentor", a: false, b: false, c: true },
    { f: "Notificações WhatsApp", a: false, b: false, c: true },
  ];
  return (
    <section className="border-y border-border bg-card/20 py-32">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="mb-4 text-center font-serif text-4xl italic">Compare em detalhes</h2>
        <p className="mb-16 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
          O que cada nível desbloqueia
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-5 text-left text-xs font-normal uppercase tracking-[0.25em] text-muted-foreground"></th>
                <th className="py-5 text-center text-xs font-semibold uppercase tracking-[0.25em] text-foreground">Iniciante</th>
                <th className="py-5 text-center text-xs font-semibold uppercase tracking-[0.25em] text-gold">Adepto</th>
                <th className="py-5 text-center text-xs font-semibold uppercase tracking-[0.25em] text-foreground">Oráculo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.f} className="border-b border-border/50">
                  <td className="py-4 text-muted-foreground">{r.f}</td>
                  <td className="py-4 text-center">
                    {r.a ? <span className="text-gold">✓</span> : <span className="text-muted-foreground/30">—</span>}
                  </td>
                  <td className="bg-gold/5 py-4 text-center">
                    {r.b ? <span className="text-gold">✓</span> : <span className="text-muted-foreground/30">—</span>}
                  </td>
                  <td className="py-4 text-center">
                    {r.c ? <span className="text-gold">✓</span> : <span className="text-muted-foreground/30">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ---------------- CHATBOT FLOAT ---------------- */
function ChatbotFloat() {
  return (
    <Link
      to="/auth"
      aria-label="Abrir oráculo IA"
      className="group fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 flex items-center gap-2 sm:gap-3 rounded-full border border-gold/40 bg-background/90 px-4 py-2.5 sm:px-5 sm:py-3 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-gold backdrop-blur-md transition-all hover:bg-gold hover:text-primary-foreground"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-gold" />
      </span>
      Falar com o Oráculo
    </Link>
  );
}
