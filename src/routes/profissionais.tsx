import { createFileRoute, Link } from "@tanstack/react-router";
import { Starfield } from "@/components/Starfield";
import { Logo } from "@/components/Logo";
import zodiac3dWheel from "@/assets/zodiac-3d-wheel.png";
import oracleOrb from "@/assets/oracle-orb.jpg";

export const Route = createFileRoute("/profissionais")({
  head: () => ({
    meta: [
      {
        title:
          "Código Cósmico para Profissionais — Sua Mini Franquia Astrológica",
      },
      {
        name: "description",
        content:
          "Transforme seu dom em renda. A primeira plataforma white-label para astrólogos e numerólogos venderem mapas, relatórios e leituras com a sua marca. Comissão zero, controle total.",
      },
      {
        property: "og:title",
        content:
          "Sua Mini Franquia Astrológica — Código Cósmico Profissional",
      },
      {
        property: "og:description",
        content:
          "Venda mapas astrais, relatórios e oráculo com a SUA marca. Pacotes exclusivos com add-ons e créditos para empreendedores espirituais.",
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
  component: ProfissionaisPage,
});

function ProfissionaisPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Nav />
      <Hero />
      <PainPoints />
      <HowItWorks />
      <WhiteLabelShowcase />
      <FranchisePackages />
      <RevenueExamples />
      <AddonsForPros />
      <ProTestimonials />
      <FinalCTA />
      <Footer />
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
        <div className="hidden gap-8 text-xs uppercase tracking-[0.25em] text-muted-foreground md:flex">
          <a href="#como-funciona" className="transition-colors hover:text-gold">
            Como funciona
          </a>
          <a href="#pacotes" className="transition-colors hover:text-gold">
            Pacotes
          </a>
          <a href="#receita" className="transition-colors hover:text-gold">
            Quanto rende
          </a>
          <Link to="/" className="transition-colors hover:text-gold">
            Para clientes
          </Link>
        </div>
        <Link
          to="/auth"
          className="border border-gold/30 bg-gold/10 px-6 py-2 text-xs uppercase tracking-[0.25em] text-gold transition-all hover:bg-gold hover:text-primary-foreground"
        >
          Entrar
        </Link>
      </div>
    </nav>
  );
}

/* ---------------- HERO ---------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-44 nebula-bg">
      <Starfield count={120} />
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
        <div>
          <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-[10px] uppercase tracking-[0.35em] text-gold">
            <span className="size-1.5 animate-pulse rounded-full bg-gold" />
            Para astrólogos e numerólogos
          </span>
          <h1 className="mb-8 font-serif text-5xl italic leading-[1.05] md:text-6xl lg:text-7xl">
            Seu dom merece <br />
            <span className="shimmer-text">mais que tempo livre.</span>
          </h1>
          <p className="mb-10 max-w-xl text-balance text-lg font-light leading-relaxed text-muted-foreground md:text-xl">
            Transforme sua sabedoria em uma{" "}
            <em className="text-stardust not-italic font-medium">mini franquia digital</em>.
            Venda mapas astrais, relatórios profundos, leituras de tarot e
            oráculo de IA — tudo com a <b className="text-gold">SUA marca</b>,
            cores e logotipo. Sem código. Sem comissão sobre vendas.
          </p>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <a
              href="#pacotes"
              className="gold-glow rounded-full bg-gold px-10 py-4 text-center text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:bg-gold-glow"
            >
              Quero minha franquia
            </a>
            <a
              href="#receita"
              className="rounded-full border border-border px-10 py-4 text-center text-sm uppercase tracking-[0.2em] text-foreground transition-colors hover:border-gold/40 hover:text-gold"
            >
              Ver quanto posso ganhar
            </a>
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Setup em 24h · Sem mensalidade abusiva · 7 dias de garantia
          </p>
        </div>

        <div className="relative">
          <div className="glass-card rounded-2xl border-gold/30 p-8 gold-glow">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <span className="text-xs uppercase tracking-[0.3em] text-gold">
                Sua marca em destaque
              </span>
              <span className="text-xs text-muted-foreground">PDF pronto</span>
            </div>
            <div className="mb-6">
              <p className="font-serif text-3xl italic text-stardust">
                Astróloga Marina Luz
              </p>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Mapa Astral · Marina Silva · 12/03/1992
              </p>
            </div>
            <img
              src={zodiac3dWheel}
              alt="Mapa astral com marca personalizada"
              className="mb-6 aspect-square w-full rounded-lg object-cover"
            />
            <div className="grid grid-cols-3 gap-2 text-[10px] uppercase tracking-[0.2em]">
              {["Logo seu", "Cores suas", "Domínio próprio"].map((m) => (
                <div
                  key={m}
                  className="rounded-lg border border-gold/30 bg-gold/5 px-2 py-2 text-center text-gold"
                >
                  {m}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- PAIN POINTS ---------------- */
function PainPoints() {
  const pains = [
    {
      n: "I",
      before: "Passa horas calculando mapas manualmente",
      after: "Mapa hiperpreciso em 30 segundos com Swiss Ephemeris",
    },
    {
      n: "II",
      before: "Cobra R$80 por consulta porque entrega só voz",
      after: "Entrega PDFs de 40 páginas com SUA marca — cobra R$300+",
    },
    {
      n: "III",
      before: "Atende 5 clientes por semana no limite da energia",
      after: "Sistema atende 100 enquanto você dorme",
    },
    {
      n: "IV",
      before: "Vive trocando print no WhatsApp",
      after: "Cliente acessa portal próprio com sua identidade",
    },
  ];
  return (
    <section className="border-y border-border bg-card/20 py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold/70">
            A virada
          </span>
          <h2 className="font-serif text-4xl italic md:text-5xl">
            O que mudou para os astrólogos que <br />
            <span className="text-gold">deixaram de trocar tempo por dinheiro.</span>
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {pains.map((p) => (
            <div
              key={p.n}
              className="glass-card rounded-2xl border-border p-8 transition-all hover:border-gold/30"
            >
              <div className="mb-4 font-serif text-3xl italic text-gold/60">
                {p.n}
              </div>
              <p className="mb-3 text-sm uppercase tracking-[0.2em] text-muted-foreground line-through">
                {p.before}
              </p>
              <p className="font-serif text-xl italic text-stardust">
                {p.after}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- HOW IT WORKS ---------------- */
function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Você escolhe seu pacote",
      desc: "Iniciante, Profissional ou Mestre Franqueado. Cada um com um volume de mapas, relatórios, créditos de IA e add-ons exclusivos.",
    },
    {
      n: "02",
      title: "Personaliza com sua marca",
      desc: "Suba seu logo, defina suas cores, cadastre o nome da sua consultoria. Seus PDFs, portal e e-mails saem com sua identidade — não a nossa.",
    },
    {
      n: "03",
      title: "Cadastra seus clientes",
      desc: "Cada cliente vira uma ficha completa: mapa, numerologia, histórico de leituras, tarot, oráculo. Você acessa qualquer um em 2 cliques.",
    },
    {
      n: "04",
      title: "Vende e entrega no mesmo dia",
      desc: "Cobra do cliente no seu Pix, gera o relatório em minutos, envia o PDF com sua marca. 100% do dinheiro fica com você.",
    },
  ];
  return (
    <section id="como-funciona" className="py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 text-center">
          <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold/70">
            Em 4 passos
          </span>
          <h2 className="font-serif text-5xl italic">
            Sua consultoria astrológica no ar em <span className="text-gold">24 horas</span>
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="mb-6 font-serif text-6xl italic text-gold/30">
                {s.n}
              </div>
              <h3 className="mb-3 font-serif text-xl text-stardust">
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- WHITE LABEL SHOWCASE ---------------- */
function WhiteLabelShowcase() {
  const features = [
    "Logotipo da sua marca em cada PDF",
    "Paleta de cores totalmente personalizável",
    "Capa, rodapé e marca d'água editáveis",
    "Textos de assinatura com seu nome e CRPA",
    "Templates diferentes por categoria (Amor, Carreira, Finanças…)",
    "Exportação ilimitada — entregue ao cliente em PDF, link ou imagem",
  ];
  return (
    <section className="relative overflow-hidden border-y border-border bg-card/20 py-32">
      <Starfield count={50} />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <span className="mb-4 inline-block rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-gold">
              White-label real
            </span>
            <h2 className="mb-6 font-serif text-5xl italic leading-tight">
              Sua marca brilha. <br />
              <span className="text-gold">A nossa some.</span>
            </h2>
            <p className="mb-8 max-w-md leading-relaxed text-muted-foreground">
              Diferente de plataformas que deixam "powered by" em tudo, aqui o
              Código Cósmico vira invisível. Quem aparece para o cliente final
              é <b className="text-stardust">você</b>.
            </p>
            <ul className="mb-10 space-y-4 text-sm">
              {features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-3 text-stardust"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <img
              src={oracleOrb}
              alt="Branding personalizado em ação"
              className="w-full rounded-2xl border border-gold/20 object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- FRANCHISE PACKAGES ---------------- */
function FranchisePackages() {
  const packages = [
    {
      name: "Iniciante",
      tag: "Pra começar a faturar",
      price: "R$ 97",
      period: "/mês",
      featured: false,
      perks: [
        "Até 30 clientes ativos",
        "300 créditos de IA / mês",
        "PDFs com sua marca (logo + cores)",
        "Mapa + Numerologia + Tarot",
        "Suporte por e-mail",
      ],
    },
    {
      name: "Profissional",
      tag: "O mais escolhido",
      price: "R$ 247",
      period: "/mês",
      featured: true,
      perks: [
        "Clientes ilimitados + CRM completo",
        "1.500 créditos de IA / mês",
        "Branding total (capa, fontes, marca d'água)",
        "Oráculo IA contextual por cliente",
        "Add-on Sinastria + Relatórios Anuais",
        "Suporte prioritário no WhatsApp",
      ],
    },
    {
      name: "Mestre Franqueado",
      tag: "Para consultorias",
      price: "R$ 597",
      period: "/mês",
      featured: false,
      perks: [
        "Tudo do Profissional",
        "5.000 créditos de IA / mês",
        "Até 3 assistentes na sua conta",
        "Domínio próprio (suaastrologia.com.br)",
        "Todos os add-ons inclusos",
        "Onboarding 1-a-1 + estratégia de vendas",
      ],
    },
  ];
  return (
    <section id="pacotes" className="py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 text-center">
          <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold/70">
            Pacotes de franqueado
          </span>
          <h2 className="mb-4 font-serif text-5xl italic">
            Escolha o tamanho da sua operação
          </h2>
          <p className="text-sm text-muted-foreground">
            Mude de pacote quando quiser · Cancele a qualquer momento · 7 dias
            de garantia
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {packages.map((p) => (
            <article
              key={p.name}
              className={`relative flex flex-col p-12 transition-all ${
                p.featured
                  ? "gold-glow border-2 border-gold bg-gold/5"
                  : "border border-border hover:border-gold/30"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-4 py-1 text-[10px] uppercase tracking-[0.3em] text-primary-foreground">
                  Mais procurado
                </span>
              )}
              <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-gold/70">
                {p.tag}
              </div>
              <h3 className="mb-6 font-serif text-3xl italic">{p.name}</h3>
              <div className="mb-8">
                <span className="font-serif text-5xl text-gold">{p.price}</span>
                <span className="text-sm text-muted-foreground">
                  {p.period}
                </span>
              </div>
              <ul className="mb-10 flex-1 space-y-3 text-sm">
                {p.perks.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-start gap-3 text-stardust"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" />
                    {perk}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className={`rounded-full px-6 py-3 text-center text-xs uppercase tracking-[0.2em] transition-all ${
                  p.featured
                    ? "gold-glow bg-gold text-primary-foreground hover:bg-gold-glow"
                    : "border border-gold/30 text-gold hover:bg-gold hover:text-primary-foreground"
                }`}
              >
                Começar agora
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- REVENUE EXAMPLES ---------------- */
function RevenueExamples() {
  const examples = [
    {
      product: "Mapa Astral Completo",
      yourCost: "≈ R$ 4 em créditos",
      youSell: "R$ 197",
      margin: "R$ 193",
    },
    {
      product: "Relatório Anual Personalizado",
      yourCost: "≈ R$ 8 em créditos",
      youSell: "R$ 297",
      margin: "R$ 289",
    },
    {
      product: "Sinastria (compatibilidade)",
      yourCost: "≈ R$ 6 em créditos",
      youSell: "R$ 247",
      margin: "R$ 241",
    },
    {
      product: "Leitura de Tarot + Oráculo IA",
      yourCost: "≈ R$ 2 em créditos",
      youSell: "R$ 97",
      margin: "R$ 95",
    },
  ];
  return (
    <section
      id="receita"
      className="relative overflow-hidden border-y border-border bg-card/20 py-32"
    >
      <Starfield count={40} />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold/70">
            A matemática do dom
          </span>
          <h2 className="mb-4 font-serif text-5xl italic">
            Quanto você ganha em cada venda
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            Você define o preço final. Nós cobramos só os créditos de IA usados
            na geração. Sem split, sem porcentagem sobre suas vendas — o
            dinheiro do cliente cai direto no seu Pix.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-gold/20">
          <div className="grid grid-cols-4 gap-px bg-border text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            <div className="bg-background/80 px-6 py-4">Produto</div>
            <div className="bg-background/80 px-6 py-4">Seu custo</div>
            <div className="bg-background/80 px-6 py-4">Você vende por</div>
            <div className="bg-background/80 px-6 py-4 text-gold">
              Margem líquida
            </div>
          </div>
          {examples.map((e) => (
            <div
              key={e.product}
              className="grid grid-cols-4 gap-px bg-border text-sm"
            >
              <div className="bg-background px-6 py-5 font-serif italic text-stardust">
                {e.product}
              </div>
              <div className="bg-background px-6 py-5 text-muted-foreground">
                {e.yourCost}
              </div>
              <div className="bg-background px-6 py-5 text-stardust">
                {e.youSell}
              </div>
              <div className="bg-background px-6 py-5 font-serif text-xl italic text-gold">
                {e.margin}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { n: "10", t: "mapas/mês = R$ 1.930 líquidos" },
            { n: "30", t: "clientes ativos = R$ 5.790 líquidos" },
            { n: "100", t: "entregas/mês = R$ 19.300 líquidos" },
          ].map((s) => (
            <div
              key={s.t}
              className="glass-card rounded-2xl border-gold/20 p-8 text-center"
            >
              <div className="font-serif text-5xl italic text-gold">{s.n}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                {s.t}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Projeção baseada em ticket médio de R$ 193 por entrega
        </p>
      </div>
    </section>
  );
}

/* ---------------- ADDONS FOR PROS ---------------- */
function AddonsForPros() {
  const addons = [
    {
      n: "+",
      title: "Pacote Sinastria PRO",
      desc: "Relatórios de compatibilidade entre dois mapas com interpretação IA — ideal para casais e sócios.",
    },
    {
      n: "+",
      title: "Relatório Anual Cinematográfico",
      desc: "PDF de 30+ páginas com previsão mês a mês, trânsitos importantes e janelas energéticas.",
    },
    {
      n: "+",
      title: "Mapa Empresarial",
      desc: "Análise astrológica para empresas — perfeito para vender consultoria a empreendedores.",
    },
    {
      n: "+",
      title: "Numerologia Cabalística Avançada",
      desc: "Gematria, Árvore da Vida e leituras profundas para clientes que querem mais que o pitagórico básico.",
    },
    {
      n: "+",
      title: "Calendário Energético Mensal",
      desc: "Entregue ao cliente um guia de dias favoráveis para amor, dinheiro e decisões.",
    },
    {
      n: "+",
      title: "Pacotes de Créditos com desconto",
      desc: "Compre lotes de 5.000 / 15.000 / 50.000 créditos com até 40% de desconto e revenda no varejo.",
    },
  ];
  return (
    <section className="py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 text-center">
          <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold/70">
            Módulos exclusivos
          </span>
          <h2 className="mb-4 font-serif text-5xl italic">
            Add-ons que só franqueados podem vender
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            Cada módulo é uma nova fonte de receita. Ative só os que fizerem
            sentido para o seu público — e desative quando quiser.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {addons.map((a) => (
            <div
              key={a.title}
              className="glass-card rounded-2xl border-border p-8 transition-all hover:border-gold/40"
            >
              <div className="mb-4 font-serif text-4xl italic text-gold">
                {a.n}
              </div>
              <h3 className="mb-3 font-serif text-xl text-stardust">
                {a.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {a.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- TESTIMONIALS (PROS) ---------------- */
function ProTestimonials() {
  const items = [
    {
      q: "Em 60 dias dobrei meu faturamento. Os PDFs com a minha marca elevaram o ticket de R$120 para R$320.",
      a: "Roberta L.",
      r: "Astróloga · Curitiba",
    },
    {
      q: "Saí do WhatsApp manual para uma operação com 80 clientes ativos. Hoje vivo só do consultório digital.",
      a: "Diego M.",
      r: "Numerólogo · Recife",
    },
    {
      q: "O modo franqueado pagou todos os meus cursos de astrologia. É a primeira ferramenta que realmente respeita o nosso trabalho.",
      a: "Patrícia V.",
      r: "Astróloga · Lisboa",
    },
  ];
  return (
    <section className="border-y border-border bg-card/20 py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold/70">
            Quem já empreende com a gente
          </span>
          <h2 className="font-serif text-4xl italic">
            Astrólogos que viraram empresários
          </h2>
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

/* ---------------- FINAL CTA ---------------- */
function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-32 nebula-bg">
      <Starfield count={100} />
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <h2 className="mb-8 font-serif text-5xl italic leading-tight md:text-6xl">
          O universo já te escolheu. <br />
          <span className="shimmer-text">Falta você se escolher.</span>
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Pare de trocar horas por moedas. Sua sabedoria pode atender 10×, 50×,
          100× mais pessoas — com a sua marca, no seu preço, no seu tempo.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/auth"
            className="gold-glow rounded-full bg-gold px-12 py-5 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:bg-gold-glow"
          >
            Ativar minha franquia
          </Link>
          <a
            href="#pacotes"
            className="rounded-full border border-border px-12 py-5 text-sm uppercase tracking-[0.2em] text-foreground transition-colors hover:border-gold/40 hover:text-gold"
          >
            Comparar pacotes
          </a>
        </div>
        <p className="mt-8 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          7 dias de garantia incondicional · Sem fidelidade · Cancele em 1 clique
        </p>
      </div>
    </section>
  );
}

/* ---------------- FOOTER ---------------- */
function Footer() {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 text-xs uppercase tracking-[0.25em] text-muted-foreground md:flex-row">
        <div className="flex items-center gap-3">
          <Logo sizeClassName="size-8" />
          <span className="text-gold">Código Cósmico</span>
        </div>
        <div className="flex gap-8">
          <Link to="/" className="hover:text-gold">
            Para clientes
          </Link>
          <Link to="/profissionais" className="hover:text-gold">
            Para profissionais
          </Link>
          <Link to="/auth" className="hover:text-gold">
            Entrar
          </Link>
        </div>
      </div>
    </footer>
  );
}
