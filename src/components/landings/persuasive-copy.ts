import {
  Sparkles, Compass, Eye, Flame, Moon, HeartHandshake, Infinity as InfinityIcon,
  Sun, Star, Target, Users, Zap, Heart, Coins, Briefcase, Brain,
  Leaf, Sprout, Building2, KeyRound, BookOpen, Scale, TrendingUp, Waves,
  Shield, Handshake, Landmark, Activity, Sparkle, Clock, Feather, Gem,
  type LucideIcon,
} from "lucide-react";


export type PersuasivePillar = { icon: LucideIcon; title: string; desc: string };
export type PersuasiveTestimonial = { name: string; text: string; rating: number };
export type PersuasiveFaq = { q: string; a: string };

export type PersuasiveCopy = {
  eyebrow: string;                     // pill no topo do hero
  heroHeadline: string;                // linha 1 do H1
  heroHeadlineAccent: string;          // linha 2 dourada
  heroSub: string;                     // parágrafo do hero (pode conter <strong>…</strong>)
  heroBullets: string[];               // até 3 bullets
  socialProofLabel: string;            // ex.: "4.9 · +2.500 almas"
  urgencyBar: string;
  livePurchase: string;                // ex.: "37 pessoas compraram nas últimas 24h"
  painEyebrow: string;
  painHeadline: string;                // pode conter <em>…</em>
  painBody: string;                    // pode conter <strong>…</strong>
  pillarsEyebrow: string;
  pillarsHeadline: string;
  pillars: PersuasivePillar[];
  testimonialsEyebrow: string;
  testimonialsHeadline: string;
  testimonials: PersuasiveTestimonial[];
  guaranteeTitle: string;
  guaranteeBody: string;               // pode conter <strong>…</strong>
  faqEyebrow: string;
  faqHeadline: string;
  faqs: PersuasiveFaq[];
  finalEyebrow: string;
  finalHeadline: string;               // pode conter <em>…</em> e \n
  finalBody: string;
  dialogTitle: string;
  dialogDesc: string;
};

const commonHow = [
  { num: "01", title: "Preencha seus dados", desc: "Nome e informações necessárias. Leva 60 segundos." },
  { num: "02", title: "Pagamento seguro", desc: "Cartão, Pix ou boleto pelo Mercado Pago. Aprovação imediata." },
  { num: "03", title: "Receba sua leitura", desc: "PDF premium no e-mail e WhatsApp em minutos." },
];

export const COMMON_HOW = commonHow;

export const PERSUASIVE_COPY: Record<string, PersuasiveCopy> = {
  "mapa-espiritual": {
    eyebrow: "Leitura de Alma · Nível Avançado",
    heroHeadline: "A sua alma tem uma missão.",
    heroHeadlineAccent: "E ela já foi escrita.",
    heroSub: "Descubra o mapa oculto que sua alma trouxe pra esta encarnação: <strong>karma, mediunidade, feridas ancestrais e os portais exatos do seu despertar</strong> nos próximos 12 meses.",
    heroBullets: [
      "Por que certas dores se repetem — e como quebrar o ciclo",
      "Os dons espirituais que você tem (mas ainda não ativou)",
      "As datas exatas dos seus próximos saltos de consciência",
    ],
    socialProofLabel: "4.9 · +2.500 almas",
    urgencyBar: "Oferta de despertar — vagas limitadas nesta semana cósmica",
    livePurchase: "37 pessoas compraram nas últimas 24h",
    painEyebrow: "Se você chegou até aqui…",
    painHeadline: "Algo dentro de você sabe que <em>veio pra mais</em>.",
    painBody: "Você sente que está no lugar errado. Que existe um propósito maior. Que sonhos, sincronicidades e intuições estão te chamando — mas sem um mapa, tudo vira ruído. <strong>É hora de ver com clareza o que sua alma veio fazer aqui.</strong>",
    pillarsEyebrow: "O que você vai receber",
    pillarsHeadline: "6 revelações que mudam sua rota",
    pillars: [
      { icon: Compass, title: "Missão Kármica", desc: "O propósito exato pelo qual sua alma escolheu esta encarnação — e o que você precisa concluir." },
      { icon: Eye, title: "Dons Mediúnicos", desc: "Sensibilidades ocultas que já se manifestam em você e como ativá-las com segurança." },
      { icon: Flame, title: "Feridas Ancestrais", desc: "Padrões herdados que travam sua evolução — e o ritual para dissolver cada um." },
      { icon: Moon, title: "Portais de Despertar", desc: "Janelas cósmicas específicas dos seus próximos 12 meses para saltos espirituais." },
      { icon: HeartHandshake, title: "Práticas Alinhadas", desc: "Meditação, mantras e rituais escolhidos a dedo para o SEU mapa — não genéricos." },
      { icon: InfinityIcon, title: "Ciclos Evolutivos", desc: "Onde você está na roda da alma e o próximo passo pra sair do platô espiritual." },
    ],
    testimonialsEyebrow: "Provas de despertar",
    testimonialsHeadline: "Quem leu, nunca mais foi o mesmo",
    testimonials: [
      { name: "Camila R.", text: "Chorei lendo. Coisas que eu sentia há anos ganharam nome. Nunca vi algo tão preciso.", rating: 5 },
      { name: "Rafael M.", text: "A missão kármica bateu em cheio. Mudei decisões importantes depois dessa leitura.", rating: 5 },
      { name: "Juliana P.", text: "Achei que fosse mais um relatório genérico. É o oposto: parece feito só pra mim.", rating: 5 },
    ],
    guaranteeTitle: "Garantia incondicional de 7 dias",
    guaranteeBody: "Leia. Sinta. Aplique. Se em 7 dias você não sentir que este mapa mudou sua forma de enxergar sua alma, devolvemos <strong>100% do seu dinheiro</strong>. Sem perguntas, sem burocracia. O risco é todo nosso.",
    faqEyebrow: "Perguntas frequentes",
    faqHeadline: "Ainda em dúvida?",
    faqs: [
      { q: "Em quanto tempo recebo?", a: "Em poucos minutos após o pagamento aprovado. Você recebe no e-mail e no WhatsApp." },
      { q: "Preciso saber a hora exata do nascimento?", a: "Ajuda muito, mas se não souber, geramos com aproximação. Basta informar." },
      { q: "É seguro? E se eu não gostar?", a: "Garantia incondicional de 7 dias. Não gostou? Devolvemos 100% sem perguntas." },
      { q: "Como é diferente de um mapa astral comum?", a: "É focado 100% na jornada da alma: karma, mediunidade e despertar — não em previsões banais." },
    ],
    finalEyebrow: "Sua alma está chamando",
    finalHeadline: "Ou você continua adivinhando.\nOu você <em>finalmente vê</em>.",
    finalBody: "Menos que o preço de um jantar. Uma revelação que pode reorientar os próximos 10 anos da sua vida.",
    dialogTitle: "Dados para sua leitura de alma",
    dialogDesc: "Preencha com atenção — a precisão dos dados torna a leitura mais profunda. Após o pagamento criamos sua conta e enviamos o PDF por e-mail.",
  },

  "mapa-astral-completo": {
    eyebrow: "Mapa Astral · Análise Completa",
    heroHeadline: "Você não é aleatório.",
    heroHeadlineAccent: "Você foi escrito nas estrelas.",
    heroSub: "Um mapa astral profissional que revela <strong>a arquitetura invisível da sua personalidade, relacionamentos e propósito</strong> — decifrado pelos astros do dia exato em que você nasceu.",
    heroBullets: [
      "Por que você age assim (e por que os outros não te entendem)",
      "Os talentos escondidos no seu mapa que ninguém te mostrou",
      "O que os planetas dizem sobre amor, dinheiro e carreira em você",
    ],
    socialProofLabel: "4.9 · +5.000 mapas gerados",
    urgencyBar: "Análise completa — desconto especial por tempo limitado",
    livePurchase: "62 pessoas geraram o mapa nas últimas 24h",
    painEyebrow: "Cansou dos horóscopos genéricos?",
    painHeadline: "Signo solar é só <em>1%</em> do que você é.",
    painBody: "Sol, Lua, Ascendente, Vênus, Marte, casas, aspectos — tudo isso forma quem você realmente é. Ler só o signo é como julgar um livro pela capa. <strong>Está na hora de ler o livro inteiro.</strong>",
    pillarsEyebrow: "O que você vai descobrir",
    pillarsHeadline: "10+ áreas mapeadas em detalhe",
    pillars: [
      { icon: Sun, title: "Sol, Lua e Ascendente", desc: "Sua essência, emoções e a máscara que você mostra ao mundo — decifrados com precisão." },
      { icon: Heart, title: "Amor e Relacionamentos", desc: "Vênus, Marte e Casa 7: como você ama, o que atrai e o que sabota seus vínculos." },
      { icon: Briefcase, title: "Carreira e Propósito", desc: "Meio-do-Céu, Casa 10 e Saturno mostrando onde você brilha profissionalmente." },
      { icon: Brain, title: "Mente e Comunicação", desc: "Mercúrio revelando como você pensa, aprende e se expressa — e como usar isso a favor." },
      { icon: Target, title: "Talentos e Dons", desc: "Aspectos harmônicos que mostram habilidades naturais que você ainda não explorou." },
      { icon: Star, title: "Trânsitos do Ano", desc: "Os movimentos planetários que mais vão impactar sua vida nos próximos 12 meses." },
    ],
    testimonialsEyebrow: "Provas nas estrelas",
    testimonialsHeadline: "Depoimentos reais de quem se encontrou",
    testimonials: [
      { name: "Marina S.", text: "Nunca imaginei tanta profundidade. Entendi por que sempre me sentia deslocada — e finalmente aceitei quem sou.", rating: 5 },
      { name: "Bruno T.", text: "Impressionante. O que dizia sobre carreira previu exatamente a mudança que fiz meses depois.", rating: 5 },
      { name: "Larissa F.", text: "Comprei por curiosidade. Saí com um mapa que uso toda semana pra tomar decisões.", rating: 5 },
    ],
    guaranteeTitle: "Garantia total de 7 dias",
    guaranteeBody: "Leia todo o mapa. Se não sentir que valeu cada centavo, devolvemos <strong>100% do seu investimento</strong>. Sem perguntas. Sem letras miúdas. O risco é nosso.",
    faqEyebrow: "Perguntas frequentes",
    faqHeadline: "Antes de você decidir",
    faqs: [
      { q: "Em quanto tempo recebo?", a: "Poucos minutos após a aprovação do pagamento. Chega no e-mail e no WhatsApp." },
      { q: "Preciso da hora exata do nascimento?", a: "Sim, é o ideal — calcula o Ascendente e as casas com precisão. Se não souber, geramos com aproximação e você pode ajustar depois." },
      { q: "É diferente de um horóscopo comum?", a: "Totalmente. Horóscopo lê só o Sol. Aqui você recebe 10+ camadas: Sol, Lua, Ascendente, Vênus, Marte, casas, aspectos e trânsitos." },
      { q: "Serve pra quem não conhece astrologia?", a: "Perfeito pra você. O relatório é escrito em linguagem clara, sem jargão — como um mentor explicando." },
    ],
    finalEyebrow: "As estrelas já responderam",
    finalHeadline: "Você continua chutando.\nOu <em>enfim entende</em>.",
    finalBody: "O mapa astral mais completo do mercado, ao preço de um livro. Um retrato preciso de quem você é — pra vida toda.",
    dialogTitle: "Dados para seu mapa astral",
    dialogDesc: "A precisão da hora e local de nascimento define a precisão do mapa. Após o pagamento criamos sua conta e enviamos o PDF por e-mail.",
  },

  "mapa-do-amor": {
    eyebrow: "Mapa do Amor · Leitura Íntima",
    heroHeadline: "Seu coração fala uma língua.",
    heroHeadlineAccent: "Chegou a hora de traduzi-la.",
    heroSub: "Descubra <strong>como você ama, o que te atrai de verdade e os padrões invisíveis que sabotam seus relacionamentos</strong> — decifrados pelos astros do amor no seu mapa.",
    heroBullets: [
      "Por que você atrai sempre o mesmo tipo de pessoa",
      "Sua verdadeira linguagem do amor (não é o que você pensa)",
      "O que Vênus e Marte revelam sobre seu desejo e afeto",
    ],
    socialProofLabel: "4.9 · +3.200 corações lidos",
    urgencyBar: "Leitura do amor — condição especial ativa esta semana",
    livePurchase: "48 pessoas descobriram nas últimas 24h",
    painEyebrow: "Se o amor parece um enigma…",
    painHeadline: "Talvez você esteja amando <em>no idioma errado</em>.",
    painBody: "Você se entrega, mas se sente incompreendida. Escolhe pessoas parecidas e o ciclo se repete. Não é falta de sorte — é <strong>um padrão inscrito no seu mapa que ninguém te mostrou como ler</strong>.",
    pillarsEyebrow: "O que você vai desvendar",
    pillarsHeadline: "6 camadas do seu amor",
    pillars: [
      { icon: Heart, title: "Sua Vênus", desc: "Como você ama, o que te encanta e o que te faz sentir amada de verdade." },
      { icon: Flame, title: "Seu Marte", desc: "Desejo, paixão e a forma como você conquista — e como aparece nas brigas." },
      { icon: HeartHandshake, title: "Casa 7 — Parcerias", desc: "O perfil da pessoa que seu mapa atrai (e do parceiro ideal pra sua evolução)." },
      { icon: Moon, title: "Sua Lua no Amor", desc: "Do que sua alma precisa emocionalmente pra se sentir segura em um vínculo." },
      { icon: Eye, title: "Padrões que Se Repetem", desc: "As feridas de infância que você projeta no amor — e como quebrar o loop." },
      { icon: Star, title: "Janelas Astrais do Amor", desc: "Os melhores momentos dos próximos 12 meses pra encontros, DR e decisões." },
    ],
    testimonialsEyebrow: "Depoimentos de coração aberto",
    testimonialsHeadline: "Elas leram e o amor mudou",
    testimonials: [
      { name: "Beatriz L.", text: "Chorei reconhecendo cada padrão. Terminei um ciclo tóxico depois dessa leitura.", rating: 5 },
      { name: "Fernanda G.", text: "Meu marido leu comigo. Nunca conversamos tão fundo sobre o que a gente precisa.", rating: 5 },
      { name: "Aline C.", text: "Descobri por que me apaixono pelo mesmo perfil sempre. Impossível não se ver ali.", rating: 5 },
    ],
    guaranteeTitle: "Garantia de 7 dias — sem risco",
    guaranteeBody: "Leia com calma. Se não sentir que a leitura tocou algo verdadeiro em você, devolvemos <strong>100% do valor</strong>. Simples assim.",
    faqEyebrow: "Perguntas frequentes",
    faqHeadline: "Antes de abrir seu coração",
    faqs: [
      { q: "Em quanto tempo recebo?", a: "Em poucos minutos após o pagamento aprovado. Chega no seu e-mail e WhatsApp." },
      { q: "Preciso da hora exata do nascimento?", a: "Sim, é o ideal pra ler Casa 7 e Vênus com precisão. Se não souber, geramos com aproximação." },
      { q: "Serve pra quem está solteira?", a: "Sim — talvez seja o momento mais importante pra ler. Você entende o padrão antes de repeti-lo." },
      { q: "É diferente do mapa astral comum?", a: "Aqui o foco é só amor: Vênus, Marte, Casa 5, Casa 7, Lua e trânsitos afetivos. Aprofundado nesse tema." },
    ],
    finalEyebrow: "O amor está esperando você entender",
    finalHeadline: "Ou você repete o padrão.\nOu você <em>finalmente escolhe</em>.",
    finalBody: "Menos que um jantar romântico. Uma leitura que muda como você ama pelos próximos anos.",
    dialogTitle: "Dados para sua leitura do amor",
    dialogDesc: "A precisão dos dados aprofunda a leitura. Após o pagamento criamos sua conta e enviamos o PDF por e-mail.",
  },

};

export const PILL_ICONS = { Sparkles }; // export for future use
export function hasPersuasiveCopy(slug: string): boolean {
  return slug in PERSUASIVE_COPY;
}
