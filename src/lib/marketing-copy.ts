/**
 * Gera copy persuasiva com gatilhos mentais + hashtags para materiais do afiliado.
 * Pura no cliente — usa título/tipo/descrição do material como semente.
 */

export type CopyPack = {
  title: string;
  copy: string;
  hashtags: string[];
};

const KIND_ANGLE: Record<string, { hook: string; cta: string; tags: string[] }> = {
  video: {
    hook: "Assiste até o fim — o que a maioria ignora nesse vídeo muda tudo.",
    cta: "🎬 Toca no link e desbloqueia o seu agora.",
    tags: ["video", "reels", "viral"],
  },
  reel: {
    hook: "Se você chegou até aqui, é porque o universo quer te mostrar isto.",
    cta: "✨ Link na bio pra descobrir o seu.",
    tags: ["reels", "fyp", "viral"],
  },
  story: {
    hook: "Poucas pessoas sabem disto — e é por isso que travam.",
    cta: "👉 Arrasta pra cima e descobre.",
    tags: ["stories", "dicadodia"],
  },
  banner: {
    hook: "Enquanto você lê isto, milhares já descobriram o próprio mapa.",
    cta: "🔮 Clica e vê o seu em minutos.",
    tags: ["banner", "promo"],
  },
  carousel: {
    hook: "Arrasta pro lado — o slide 3 vai te surpreender.",
    cta: "💫 Salva esse post e clica no link.",
    tags: ["carrossel", "dica"],
  },
  logo: {
    hook: "Marca que carrega propósito — e resultado.",
    cta: "🌙 Conhece o universo por trás.",
    tags: ["marca", "branding"],
  },
  copy: {
    hook: "A copy certa converte silêncio em cliente.",
    cta: "📩 Usa essa e mede o resultado.",
    tags: ["copy", "marketing"],
  },
  pdf: {
    hook: "Material que a maioria vende — você recebe de graça.",
    cta: "📥 Baixa antes que saia do ar.",
    tags: ["ebook", "gratis"],
  },
  training: {
    hook: "Não é sorte, é método. E hoje ele é seu.",
    cta: "🎓 Entra no treinamento agora.",
    tags: ["treinamento", "aula"],
  },
};

const BASE_TAGS = [
  "codigocosmico",
  "mapaastral",
  "astrologia",
  "espiritualidade",
  "autoconhecimento",
  "numerologia",
  "tarot",
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
}

export function buildCopyPack(m: {
  title?: string | null;
  description?: string | null;
  content?: string | null;
  kind?: string | null;
  tags?: string[] | null;
}): CopyPack {
  const kind = (m.kind ?? "banner").toLowerCase();
  const angle = KIND_ANGLE[kind] ?? KIND_ANGLE.banner!;
  const rawTitle = (m.title ?? "Descubra seu mapa cósmico").trim();

  // Título com gatilho de curiosidade + urgência
  const title = /[?!]$/.test(rawTitle)
    ? rawTitle
    : `${rawTitle} — o que ninguém te contou`;

  // Copy: gancho + prova social + benefício + escassez + CTA
  const seed =
    (m.description ?? m.content ?? "").trim() ||
    "Uma leitura personalizada que revela padrões, talentos e o momento certo pra agir.";

  const copy = [
    `🌌 ${angle.hook}`,
    ``,
    `${seed}`,
    ``,
    `✅ Feito por especialistas + IA astrológica`,
    `✅ Mais de 10 mil pessoas já transformaram suas escolhas`,
    `⏳ Oferta por tempo limitado — não perca a janela cósmica`,
    ``,
    angle.cta,
  ].join("\n");

  // Hashtags: base + tags do material + termos derivados do título + ângulo
  const extra = (m.tags ?? []).map(slugify).filter(Boolean);
  const fromTitle = rawTitle
    .split(/\s+/)
    .map(slugify)
    .filter((t) => t.length >= 4)
    .slice(0, 3);

  const set = new Set<string>();
  [...angle.tags, ...BASE_TAGS, ...extra, ...fromTitle].forEach((t) => {
    const s = slugify(t);
    if (s) set.add(s);
  });

  const hashtags = Array.from(set)
    .slice(0, 15)
    .map((t) => `#${t}`);

  return { title, copy, hashtags };
}
