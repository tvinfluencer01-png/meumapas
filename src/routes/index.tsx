import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { Starfield } from "@/components/Starfield";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/use-auth";
import heroAstrolabe from "@/assets/hero-astrolabe.jpg";
import oracleOrb from "@/assets/oracle-orb.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Código Cósmico — Mapa Astral, Numerologia, Tarot e IA Espiritual" },
      {
        name: "description",
        content:
          "Mapa astral preciso, numerologia cabalística, tarot, meditação na Árvore da Vida e um Oráculo de IA treinado em sabedoria milenar. Tudo em um só lugar. Comece grátis.",
      },
      { property: "og:title", content: "Código Cósmico — Onde a IA encontra o Sagrado" },
      {
        property: "og:description",
        content:
          "A plataforma espiritual mais completa do Brasil: mapa astral, numerologia, tarot, meditação cabalística e IA espiritual. Comece grátis em 60 segundos.",
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
      <TarotMeditation />
      <Compatibility />
      <Reports />
      <ProfessionalMode />
      <BrandIdentity />
      <Testimonials />
      <Pricing />
      <AddonsSection />
      <PlanComparison />
      <Guarantee />
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
        <Link to="/" className="flex items-center gap-3">
          <Logo sizeClassName="size-12" animation="float" />
          <span className="font-serif text-2xl uppercase tracking-[0.3em] text-gold">
            Código Cósmico
          </span>
        </Link>
        <div className="hidden gap-10 text-xs uppercase tracking-[0.25em] text-muted-foreground md:flex">
          <a href="#recursos" className="transition-colors hover:text-gold">Recursos</a>
          <a href="#ia" className="transition-colors hover:text-gold">IA Espiritual</a>
          <a href="#profissional" className="transition-colors hover:text-gold">Profissional</a>
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
        <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-[10px] uppercase tracking-[0.35em] text-gold">
          <span className="size-1.5 animate-pulse rounded-full bg-gold" />
          +12.847 mapas gerados · 4.9★ por leitores reais
        </span>
        <h1 className="mb-8 font-serif text-5xl italic leading-[1.05] md:text-7xl lg:text-8xl">
          Você não nasceu para <br />
          <span className="shimmer-text">viver no escuro.</span>
        </h1>
        <p className="mx-auto mb-12 max-w-2xl text-balance text-lg font-light leading-relaxed text-muted-foreground md:text-xl">
          Mapa astral cinematográfico, numerologia cabalística, tarot, meditação na Árvore da Vida
          e um Oráculo de IA treinado em sabedoria milenar — tudo conversando com{" "}
          <em className="text-stardust">a sua história</em>, em uma única plataforma.
        </p>

        <div className="mb-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to="/auth" className="gold-glow rounded-full bg-gold px-10 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:bg-gold-glow">
            Começar grátis em 60s
          </Link>
          <a href="#planos" className="rounded-full border border-border px-10 py-4 text-sm uppercase tracking-[0.2em] text-foreground transition-colors hover:border-gold/40 hover:text-gold">
            Ver planos
          </a>
        </div>
        <p className="mb-16 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Sem cartão · Cancele em 1 clique · 7 dias de garantia
        </p>

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

/* ---------------- PILLARS (recursos principais) ---------------- */
function Pillars() {
  const items = [
    {
      n: "I",
      title: "Mapa Astral Hiperpreciso",
      desc: "Swiss Ephemeris — o mesmo motor usado por astrólogos profissionais — cruzado com hora e cidade exata do seu nascimento. Planetas, casas, aspectos e trânsitos diários.",
    },
    {
      n: "II",
      title: "Dupla Numerologia",
      desc: "Pitagórica e Cabalística (Gematria) no mesmo painel. Caminho de Vida, Destino, Alma, Personalidade — interpretados em linguagem que você entende.",
    },
    {
      n: "III",
      title: "Oráculo de IA Espiritual",
      desc: "Conversa em tempo real com uma IA que LÊ o seu mapa antes de responder. Sem respostas genéricas — cada palavra alinhada à sua carta natal e numerologia.",
    },
    {
      n: "IV",
      title: "Tarot com Leitura por IA",
      desc: "Tiragens de 1 ou 3 cartas (Passado · Presente · Futuro) interpretadas à luz do seu momento astrológico. Exportação em PDF para guardar.",
    },
    {
      n: "V",
      title: "Meditação na Árvore da Vida",
      desc: "As 10 Sefirot guiadas com práticas, frases-semente e meditações personalizadas pela IA. Cabala viva, para o dia a dia.",
    },
    {
      n: "VI",
      title: "Calendário Energético",
      desc: "Trânsitos diários e lunações cruzados com seu mapa — saiba o que plantar, recolher ou descansar a cada semana.",
    },
  ];
  return (
    <section id="recursos" className="mx-auto max-w-7xl px-6 py-32">
      <div className="mb-16 max-w-2xl">
        <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold/70">
          Tudo em uma única plataforma
        </span>
        <h2 className="font-serif text-5xl italic leading-tight">
          Seis ferramentas sagradas. <br />
          <span className="text-gold">Uma só assinatura.</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <article
            key={it.n}
            className="glass-card group rounded-2xl p-10 transition-all hover:border-gold/40 hover:gold-glow"
          >
            <div className="mb-8 flex size-12 items-center justify-center rounded-full border border-gold/25 font-serif text-gold transition-colors group-hover:bg-gold/10">
              {it.n}
            </div>
            <h3 className="mb-4 font-serif text-2xl text-foreground">{it.title}</h3>
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
            zoomable e explicado em linguagem humana. <strong className="text-stardust">Zero astrologuês.</strong>
          </p>
          <ul className="space-y-4 text-sm text-muted-foreground">
            {[
              "Cálculo via Swiss Ephemeris (precisão de segundos de arco)",
              "Trânsitos diários, progressões anuais e retornos solares",
              "Aspectos traduzidos para a vida real",
              "Tooltip de cada planeta com significado contextual",
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
          Numerologia Pitagórica + Cabalística
        </span>
        <h2 className="font-serif text-5xl italic leading-tight">
          A matemática secreta <br />
          da sua <span className="text-gold">alma</span>
        </h2>
        <p className="mt-6 max-w-xl text-muted-foreground">
          Únicos no Brasil a entregar <strong className="text-stardust">duas escolas</strong> de numerologia
          no mesmo painel — pitagórica para o seu cotidiano, cabalística (Gematria) para a profundidade mística.
        </p>
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
            Oráculo Conversacional · GPT-5 · Gemini Pro
          </span>
          <h2 className="font-serif text-5xl italic leading-tight">
            Converse com a <br /> <span className="text-gold">mente infinita</span>
          </h2>
          <p className="text-muted-foreground">
            O Oráculo lê seu mapa astral e numerologia ANTES de responder. Não é um chatbot genérico —
            é um conselheiro espiritual que conhece <em className="text-stardust">você</em>.
          </p>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="h-12 w-1 bg-gold/40" />
              <p className="text-muted-foreground">
                "O que Saturno em retrógrado significa para meus planos profissionais este trimestre?"
              </p>
            </div>
            <div className="flex gap-4 opacity-80">
              <div className="h-12 w-1 bg-gold" />
              <p className="italic text-stardust">
                "Saturno transitando sua Casa 10 com seu Caminho de Vida 7 indica: três meses
                de refinamento, não de lançamento. Suas decisões em março terão peso até 2028…"
              </p>
            </div>
          </div>

          <Link to="/auth" className="inline-block rounded-full bg-stardust px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-night transition-colors hover:bg-gold">
            Consultar gratuitamente
          </Link>
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

/* ---------------- TAROT + MEDITAÇÃO ---------------- */
function TarotMeditation() {
  const items = [
    {
      tag: "Tarot Cósmico",
      title: "Cartas que conhecem seu céu",
      desc: "Tiragens de 1 ou 3 cartas (Passado · Presente · Futuro) lidas pela IA com base no seu trânsito atual. Exporte em PDF e guarde sua leitura.",
      bullets: ["Spread de 3 cartas", "Interpretação contextual", "Histórico de tiragens"],
    },
    {
      tag: "Cabala Viva",
      title: "Meditação na Árvore da Vida",
      desc: "As 10 Sefirot guiadas com frase-semente, prática diária e meditação personalizada pela IA. Imprima e leve com você.",
      bullets: ["10 Sefirot disponíveis", "Prática diária guiada", "Exportação em PDF"],
    },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-32">
      <div className="mb-16 max-w-2xl">
        <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold/70">
          Além do mapa
        </span>
        <h2 className="font-serif text-5xl italic leading-tight">
          Tarot e Cabala — <span className="text-gold">guiados pela IA</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {items.map((it) => (
          <article
            key={it.title}
            className="glass-card flex flex-col rounded-2xl p-10 transition-all hover:border-gold/30 hover:gold-glow"
          >
            <span className="mb-4 text-xs uppercase tracking-[0.3em] text-gold/80">{it.tag}</span>
            <h3 className="mb-4 font-serif text-3xl text-foreground">{it.title}</h3>
            <p className="mb-8 leading-relaxed text-muted-foreground">{it.desc}</p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {it.bullets.map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <span className="size-1.5 rounded-full bg-gold" />
                  {b}
                </li>
              ))}
            </ul>
          </article>
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
            Antes de entregar seu coração — ou assinar um contrato — descubra a geometria invisível
            que une (ou tensiona) cada vínculo da sua vida.
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

/* ---------------- REPORTS ---------------- */
function Reports() {
  const reports = [
    { t: "Amor & Vínculos", d: "Sinastria detalhada dos seus encontros e a geometria do afeto." },
    { t: "Carreira & Saturno", d: "Períodos de colheita e os desafios necessários ao crescimento profissional." },
    { t: "Questões Financeiras", d: "Análise SWOT financeira do seu mapa + plano de 7 dias para agir." },
    { t: "Saúde & Bem-estar", d: "Tendências do corpo no seu mapa + hábitos personalizados por planeta." },
    { t: "Vida Familiar", d: "Dinâmicas de casa e plano de 7 dias para harmonizar conflitos." },
    { t: "Amizades", d: "Estilo de vínculo, compatibilidades e como cultivar relações duradouras." },
    { t: "Propósito de Alma", d: "Nodos lunares e Quíron: sua ferida central e seu maior dom." },
    { t: "Ciclos Lunares", d: "Guia mensal personalizado para alinhar intenções às lunações." },
    { t: "Karma Ancestral", d: "Casas 4, 8 e 12 — padrões familiares que se repetem (e como interrompê-los)." },
  ];
  return (
    <section className="border-y border-border bg-card/20 py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 text-center">
          <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold/70">
            Capítulos do Ser · 9 categorias temáticas
          </span>
          <h2 className="font-serif text-5xl italic">Relatórios humanizados</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Cada relatório é escrito como uma conversa profunda — não um laudo técnico.
            Exporte em PDF, imprima, guarde, releia.
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
      </div>
    </section>
  );
}

/* ---------------- PROFESSIONAL MODE ---------------- */
function ProfessionalMode() {
  const feats = [
    "Clientes ilimitados com CRM (tags, notas, telefone, e-mail)",
    "Mapa, numerologia e relatórios por cliente",
    "Oráculo e Tarot contextualizados pelo cliente ativo",
    "PDFs com SUA marca: logo, cores, fontes, marca d'água",
    "Branding por categoria (Amor, Carreira, etc.)",
    "Exportação ilimitada para entregar ao seu cliente",
  ];
  return (
    <section id="profissional" className="relative overflow-hidden py-32 nebula-bg">
      <Starfield count={60} />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <span className="mb-4 inline-block rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-gold">
              Para Astrólogos e Numerólogos profissionais
            </span>
            <h2 className="mb-6 font-serif text-5xl italic leading-tight">
              Atenda 10× mais clientes. <br />
              <span className="text-gold">Sem perder a alma do seu trabalho.</span>
            </h2>
            <p className="mb-8 max-w-md leading-relaxed text-muted-foreground">
              O modo Profissional transforma o Cosmic AI em seu consultório digital: mapa, numerologia,
              relatórios e PDFs com a SUA marca, para cada cliente que entra na sua agenda.
            </p>
            <ul className="mb-10 space-y-4 text-sm">
              {feats.map((f) => (
                <li key={f} className="flex items-start gap-3 text-stardust">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/auth"
              className="gold-glow inline-block rounded-full bg-gold px-10 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:bg-gold-glow"
            >
              Ativar modo Profissional
            </Link>
          </div>
          <div className="relative">
            <div className="glass-card rounded-2xl border-gold/30 p-8 gold-glow">
              <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
                <span className="text-xs uppercase tracking-[0.3em] text-gold">Cliente ativo</span>
                <span className="text-xs text-muted-foreground">+42 clientes</span>
              </div>
              <div className="mb-6">
                <p className="font-serif text-2xl text-stardust">Marina Silva</p>
                <p className="text-xs text-muted-foreground">Capricórnio · Caminho de Vida 7</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {["Mapa", "Numerologia", "Amor", "Carreira", "Tarot", "Meditação"].map((m) => (
                  <div key={m} className="rounded-lg border border-border bg-background/50 px-3 py-2 text-center text-muted-foreground">
                    {m}
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-lg border border-gold/20 bg-gold/5 p-3 text-xs text-stardust">
                📄 PDF com sua marca pronto para entrega
              </div>
            </div>
          </div>
        </div>
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
        <div className="mb-16 text-center">
          <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold/70">
            Quem já caminha conosco
          </span>
          <h2 className="font-serif text-4xl italic">12.847 pessoas. 48 países.</h2>
        </div>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {items.map((t) => (
            <figure key={t.a} className="space-y-6">
              <div className="text-gold">★★★★★</div>
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
      anchor: null,
      feats: [
        "Mapa astral completo",
        "Numerologia básica",
        "Trânsitos diários",
        "5 créditos diários para Oráculo, Tarot e relatórios",
      ],
      cta: "Começar grátis",
      featured: false,
    },
    {
      name: "Místico",
      price: "R$ 79",
      sub: "/ mês",
      anchor: "De R$ 149 · economize 47%",
      feats: [
        "Tudo do Iniciante",
        "Oráculo IA ILIMITADO (GPT-5 e Gemini Pro)",
        "Tarot ilimitado (1 e 3 cartas)",
        "Meditação Cabalística ilimitada",
        "Numerologia Cabalística (Gematria)",
        "Relatórios temáticos ilimitados",
        "Exportação PDF premium",
      ],
      cta: "Iniciar agora",
      featured: true,
    },
    {
      name: "Profissional",
      price: "R$ 149",
      sub: "/ mês",
      anchor: "Para astrólogos e numerólogos",
      feats: [
        "Tudo do Místico",
        "Clientes ILIMITADOS (CRM completo)",
        "PDFs com SUA marca (logo + cores)",
        "PDF CSS avançado (fontes, fundos, molduras)",
        "Branding por categoria",
        "Suporte prioritário",
      ],
      cta: "Ascender",
      featured: false,
    },
  ];
  return (
    <section id="planos" className="py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 text-center">
          <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold/70">
            Investimento — não despesa
          </span>
          <h2 className="mb-4 font-serif text-5xl italic">Escolha seu horizonte</h2>
          <p className="text-sm text-muted-foreground">
            Cancele em 1 clique · 7 dias de garantia incondicional · Sem fidelidade
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
                  93% escolhem este
                </span>
              )}
              <span className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">{p.name}</span>
              <div className="mb-2 font-serif text-4xl">
                {p.price}
                <span className="text-lg text-muted-foreground">{p.sub}</span>
              </div>
              {p.anchor && (
                <p className="mb-6 text-[10px] uppercase tracking-[0.25em] text-stardust/80">
                  {p.anchor}
                </p>
              )}
              {!p.anchor && <div className="mb-6" />}
              <ul className="mb-12 flex-grow space-y-4 text-sm text-muted-foreground">
                {p.feats.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className={`block w-full py-4 text-center text-xs font-semibold uppercase tracking-[0.25em] transition-all ${
                  p.featured
                    ? "bg-gold text-primary-foreground hover:bg-gold-glow"
                    : "border border-border text-foreground hover:border-foreground"
                }`}
              >
                {p.cta}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- ADDONS À LA CARTE ---------------- */
function AddonsSection() {
  const { user } = useAuth();
  const addons = [
    { id: "credits_starter", name: "Pacote de 10 créditos", price: "R$ 19,90", sub: "uso pontual" },
    { id: "credits_plus", name: "Pacote de 50 créditos", price: "R$ 79,90", sub: "melhor custo", featured: true },
    { id: "credits_pro", name: "Pacote de 150 créditos", price: "R$ 199,90", sub: "uso intensivo" },
  ];

  return (
    <section className="border-y border-border bg-card/20 py-24">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold/70">
          Prefere sem assinar?
        </span>
        <h2 className="mb-4 font-serif text-3xl italic">Compre créditos avulsos</h2>
        <p className="mb-12 text-sm text-muted-foreground">
          Use quando quiser, expira nunca. Cada relatório, consulta ou tiragem consome 1 crédito.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {addons.map((a) => (
            <Link
              key={a.id}
              to={user ? "/addons" : "/auth"}
              className={`rounded-2xl border p-6 text-left transition-all ${
                a.featured ? "border-gold/40 bg-gold/5 gold-glow" : "border-border hover:border-gold/30"
              }`}
            >
              <p className="text-xs uppercase tracking-[0.25em] text-gold/80">{a.sub}</p>
              <p className="mt-2 font-serif text-2xl text-stardust">{a.price}</p>
              <p className="mt-1 text-sm text-muted-foreground">{a.name}</p>
              <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-gold flex items-center gap-1 group">
                Comprar agora <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- PLAN COMPARISON ---------------- */
function PlanComparison() {
  const rows = [
    { f: "Mapa astral completo", a: true, b: true, c: true },
    { f: "Trânsitos diários", a: true, b: true, c: true },
    { f: "Numerologia Pitagórica", a: true, b: true, c: true },
    { f: "Numerologia Cabalística (Gematria)", a: false, b: true, c: true },
    { f: "Oráculo IA ilimitado (GPT-5 + Gemini)", a: false, b: true, c: true },
    { f: "Tarot ilimitado", a: false, b: true, c: true },
    { f: "Meditação na Árvore da Vida", a: false, b: true, c: true },
    { f: "9 categorias de relatórios", a: false, b: true, c: true },
    { f: "Sinastria amorosa e empresarial", a: false, b: true, c: true },
    { f: "Calendário energético personalizado", a: false, b: true, c: true },
    { f: "PDFs com sua marca", a: false, b: false, c: true },
    { f: "Clientes ilimitados (CRM)", a: false, b: false, c: true },
    { f: "PDF CSS avançado", a: false, b: false, c: true },
    { f: "Suporte prioritário", a: false, b: false, c: true },
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
                <th className="py-5 text-center text-xs font-semibold uppercase tracking-[0.25em] text-gold">Místico</th>
                <th className="py-5 text-center text-xs font-semibold uppercase tracking-[0.25em] text-foreground">Profissional</th>
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

/* ---------------- GUARANTEE ---------------- */
function Guarantee() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24 text-center">
      <div className="glass-card rounded-3xl border-gold/30 p-12 gold-glow">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10 font-serif text-3xl text-gold">
          ✦
        </div>
        <h2 className="mb-4 font-serif text-3xl italic md:text-4xl">
          7 dias para se apaixonar.<br />
          <span className="text-gold">Ou seu dinheiro de volta.</span>
        </h2>
        <p className="mx-auto max-w-xl text-muted-foreground">
          Se em 7 dias você não sentir que o Cosmic AI mudou a forma como olha para a sua vida,
          devolvemos 100% do valor. Sem perguntas. Sem burocracia.
          <span className="block mt-2 text-stardust">O risco é todo nosso.</span>
        </p>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
function FAQ() {
  const qs = [
    {
      q: "Como o Cosmic AI calcula meu mapa astral?",
      a: "Usamos a biblioteca Swiss Ephemeris — o padrão astronômico profissional adotado por astrólogos do mundo todo — cruzada com sua data, horário e cidade exata de nascimento para precisão de segundos de arco.",
    },
    {
      q: "A IA substitui um astrólogo humano?",
      a: "Não. Ela complementa. Traduz astrologia complexa em linguagem clara, lê seu mapa antes de cada resposta e está disponível 24/7 — mas a interpretação profunda de um humano sensível continua insubstituível para momentos críticos. Por isso o modo Profissional existe: para potencializar (não substituir) o trabalho de astrólogos reais.",
    },
    {
      q: "Quais modelos de IA vocês usam?",
      a: "GPT-5, Gemini 2.5 Pro e Gemini 3 — sempre rotacionando para o mais adequado a cada tipo de pergunta. Tudo via Lovable AI Gateway: sem você precisar de chave de API.",
    },
    {
      q: "Meus dados estão seguros?",
      a: "Sim. Banco de dados criptografado, conformidade LGPD e nunca compartilhamos seus dados com terceiros. Sua jornada espiritual é privada.",
    },
    {
      q: "Posso cancelar quando quiser?",
      a: "Sim — sem multas, sem perguntas, sem fidelidade. Cancele em 1 clique pela área do usuário. E ainda assim, oferecemos 7 dias de garantia incondicional.",
    },
    {
      q: "Sou astrólogo profissional. Como funciona o modo Profissional?",
      a: "Você cadastra clientes ilimitados, gera mapas, numerologias, tarot e relatórios temáticos para cada um, e exporta PDFs com a SUA marca (logo, cores, fontes). É o seu consultório digital, completo.",
    },
    {
      q: "E se eu não quiser assinar?",
      a: "Sem problema. O plano Iniciante é grátis para sempre. Ou compre créditos avulsos que nunca expiram e use no seu ritmo.",
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
          Apenas 27 vagas com preço de lançamento este mês
        </span>
        <h2 className="mb-6 font-serif text-5xl italic leading-tight md:text-6xl">
          As estrelas já <br />
          <span className="shimmer-text">sabem seu nome.</span>
        </h2>
        <p className="mx-auto mb-4 max-w-lg text-muted-foreground">
          Cada dia sem o seu mapa é um dia tomando decisões com os olhos vendados.
          Receba o seu — completo, cinematográfico — em <strong className="text-stardust">60 segundos</strong>.
        </p>
        <p className="mb-12 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Sem cartão · Cancele quando quiser · 7 dias de garantia
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
              aria-label="Monograma Cosmic AI"
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
                  rest: { scale: 1 },
                  hover: { scale: 1.06 },
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                C<span className="text-stardust">·</span>AI
              </motion.span>
            </motion.div>
          </motion.article>

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
              </div>
              <div>
                <p aria-hidden="true" className="text-6xl font-light leading-none text-foreground">Aa</p>
                <div className="mt-4 space-y-1 text-xs font-medium uppercase tracking-[0.3em] text-stardust/80">
                  <p className="text-gold">Inter</p>
                  <p>Texto · 300–600</p>
                </div>
              </div>
            </div>
          </article>

          <article className="bg-background p-12 lg:col-span-12">
            <h3 className="mb-8 text-xs font-medium uppercase tracking-[0.35em] text-stardust/85">
              Paleta Cromática
            </h3>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {palette.map((c) => (
                <li key={c.name}>
                  <div
                    role="img"
                    aria-label={`Cor ${c.name}, ${c.hex}`}
                    className={`relative aspect-square w-full overflow-hidden rounded-md border border-border ${c.className}`}
                  />
                  <div className="mt-4 space-y-1">
                    <p className="font-serif text-lg text-foreground">{c.name}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold">{c.hex}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
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
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-gold/30 bg-background/90 px-5 py-3 text-xs uppercase tracking-[0.2em] text-gold backdrop-blur-md transition-all hover:bg-gold hover:text-primary-foreground"
    >
      <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
      WhatsApp
    </a>
  );
}

/* ---------------- CHATBOT FLOAT ---------------- */
function ChatbotFloat() {
  return (
    <Link
      to="/auth"
      aria-label="Abrir oráculo IA"
      className="group fixed bottom-24 right-6 z-50 flex items-center gap-3 rounded-full border border-gold/40 bg-background/90 px-5 py-3 text-xs uppercase tracking-[0.2em] text-gold backdrop-blur-md transition-all hover:bg-gold hover:text-primary-foreground"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-gold" />
      </span>
      Falar com o Oráculo
    </Link>
  );
}
