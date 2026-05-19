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
    id: "sub_pdf_css",
    name: "PDF CSS Avançado",
    price_cents: 1990,
    description:
      "Personalize por completo a aparência dos seus PDFs: fundo de página, marca d'água, cores de texto, fontes e moldura.",
    features: [
      "Cor ou imagem de fundo nas páginas internas",
      "Marca d'água com opacidade ajustável",
      "Cores de corpo, título e subtítulo customizáveis",
      "Tamanho de fonte e altura de linha",
      "Estilo da moldura da capa (simples, dupla, ornamental ou nenhuma)",
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
  {
    id: "sub_kabbalistic_numerology",
    name: "Numerologia Cabalística",
    price_cents: 3490,
    description: "Análise numerológica baseada na Cabala (Gematria) sem consumir créditos.",
    features: [
      "Cálculo de Caminho de Vida, Destino e Alma",
      "Interpretações cabalísticas (Gematria)",
      "Relatórios ilimitados",
      "Exportação em PDF",
    ],
  },
  {
    id: "sub_unlimited_finance",
    name: "Questões Financeiras Ilimitado",
    price_cents: 2990,
    description: "Relatórios ilimitados de Questões Financeiras baseados no seu mapa e numerologia.",
    features: [
      "Análise SWOT financeira personalizada",
      "Plano de 7 dias (melhorar/evitar/seguir)",
      "Sugestões práticas com justificativa astrológica",
      "Exportação em PDF",
    ],
  },
  {
    id: "sub_unlimited_family",
    name: "Vida Familiar Ilimitado",
    price_cents: 2990,
    description: "Relatórios ilimitados de Vida Familiar baseados no seu mapa e numerologia.",
    features: [
      "Dinâmicas familiares aprofundadas",
      "Plano de 7 dias para harmonia em casa",
      "Sugestões personalizadas por signo e numerologia",
      "Exportação em PDF",
    ],
  },
  {
    id: "sub_unlimited_health",
    name: "Saúde Ilimitado",
    price_cents: 2990,
    description: "Relatórios ilimitados de Saúde baseados no seu mapa e numerologia.",
    features: [
      "Tendências de bem-estar do mapa astral",
      "Plano de 7 dias com hábitos saudáveis",
      "Sugestões integrativas com justificativa astrológica",
      "Exportação em PDF",
    ],
  },
  {
    id: "sub_unlimited_friendships",
    name: "Amizades Ilimitado",
    price_cents: 2990,
    description: "Relatórios ilimitados de Amizades baseados no seu mapa e numerologia.",
    features: [
      "Estilo de vínculo e compatibilidades",
      "Plano de 7 dias para cultivar relações",
      "Sugestões com base em planetas e números",
      "Exportação em PDF",
    ],
  },
];

export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
