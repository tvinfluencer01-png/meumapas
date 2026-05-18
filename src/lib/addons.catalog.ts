export type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  highlight?: boolean;
  description: string;
};

export type SubscriptionAddon = {
  id: string;
  name: string;
  price_cents: number;
  description: string;
  features: string[];
  highlight?: boolean;
};

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "credits_starter",
    name: "Inicial",
    credits: 10,
    price_cents: 1990,
    description: "Ideal para experimentar relatórios extras e consultas ao Oráculo.",
  },
  {
    id: "credits_plus",
    name: "Plus",
    credits: 50,
    price_cents: 7990,
    highlight: true,
    description: "Mais econômico para uso frequente. Melhor custo-benefício.",
  },
  {
    id: "credits_pro",
    name: "Pro",
    credits: 150,
    price_cents: 19990,
    description: "Para quem usa intensivamente todos os módulos da plataforma.",
  },
];

export const SUBSCRIPTION_ADDONS: SubscriptionAddon[] = [
  {
    id: "sub_branding_pdf",
    name: "Branding PDF Pro",
    price_cents: 2990,
    description: "Personalize seus relatórios em PDF com sua marca.",
    features: [
      "Logo personalizado nos PDFs",
      "Rodapé com nome, site e telefone",
      "Ative por categoria (Amor, Carreira, etc.)",
    ],
  },
  {
    id: "sub_unlimited_reports",
    name: "Relatórios Ilimitados",
    price_cents: 7990,
    highlight: true,
    description: "Gere quantos relatórios quiser sem consumir créditos.",
    features: [
      "Mapa astral, numerologia, amor, carreira",
      "Sem limite mensal",
      "Inclui exportação PDF",
    ],
  },
  {
    id: "sub_oracle_premium",
    name: "Oráculo Premium",
    price_cents: 4990,
    description: "Acesso ilimitado ao Oráculo IA com modelos avançados.",
    features: [
      "Conversas ilimitadas",
      "Modelos premium (GPT-5, Gemini Pro)",
      "Histórico completo",
    ],
  },
  {
    id: "sub_tarot_unlimited",
    name: "Tarot Ilimitado",
    price_cents: 3990,
    description: "Tiragens ilimitadas de Tarot (1 e 3 cartas) sem consumir créditos.",
    features: [
      "Tiragens diárias ilimitadas",
      "Spread de 3 cartas (Passado · Presente · Futuro)",
      "Interpretações com IA",
      "Exportação dos resultados em PDF",
    ],
  },
  {
    id: "sub_kabbalah_unlimited",
    name: "Meditação Cabalística Ilimitada",
    price_cents: 4490,
    description: "Meditações guiadas pela Árvore da Vida sem limite mensal.",
    features: [
      "10 Sefirot disponíveis",
      "Meditações personalizadas com IA",
      "Frase-semente e prática diária",
      "Exportação em PDF para imprimir",
    ],
  },
];

export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
