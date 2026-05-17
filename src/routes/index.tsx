import { createFileRoute, Link } from "@tanstack/react-router";
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
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
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
    <section className="relative overflow-hidden px-6 pb-20 pt-44 nebula-bg">
      <Starfield count={120} />
      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <span className="mb-8 block text-xs uppercase tracking-[0.5em] text-gold/70">
          A interseção entre sabedoria ancestral e inteligência artificial
        </span>
        <h1 className="mb-8 font-serif text-5xl italic leading-[1.05] md:text-7xl lg:text-8xl">
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
        <h2 className="mb-6 font-serif text-5xl italic leading-tight md:text-6xl">
          As estrelas já <br />
          <span className="shimmer-text">sabem seu nome</span>
        </h2>
        <p className="mb-12 text-muted-foreground">
          Comece grátis. Sem cartão. Receba seu mapa astral em 60 segundos.
        </p>
        <button className="gold-glow rounded-full bg-gold px-12 py-5 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:bg-gold-glow">
          Descobrir meu mapa agora
        </button>
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
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-gold/30 bg-background/90 px-5 py-3 text-xs uppercase tracking-[0.2em] text-gold backdrop-blur-md transition-all hover:bg-gold hover:text-primary-foreground"
    >
      <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
      WhatsApp
    </a>
  );
}
