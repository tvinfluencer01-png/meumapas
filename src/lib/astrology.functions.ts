import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import * as Astro from "astronomy-engine";
import { runWithProviderFallback } from "@/lib/ai-resolver.server";
import {
  consumeCredits,
  refundCredits,
  getCreditCost,
  hasUnlimitedAccess,
  type CreditAction,
} from "@/lib/credits.functions";
import { buildSimplePdf, type SimplePdfBlock } from "@/lib/simple-pdf";
import { safeParseLlmJson } from "@/lib/json-sanitize";
import { PLANET_MEANING, SIGN_MEANING, ASPECT_MEANING, SIGN_GUIDANCE } from "@/lib/astro-meanings";
import {
  resolveBrandingPayload,
  isBrandingEnabledFor,
} from "@/lib/pdf-branding.functions";
import { pickCrossPromotionForReport } from "@/lib/marketing.functions";

// Fire-and-forget structured error logger. Writes to app_logs via service role
// so failures are captured even when the user context is absent.
async function logFnError(
  fn: string,
  err: unknown,
  userId: string | null,
  extra: Record<string, unknown> = {},
) {
  try {
    const message = err instanceof Error ? err.message : String(err ?? "unknown");
    const stack = err instanceof Error ? err.stack ?? null : null;
    await supabaseAdmin.from("app_logs").insert({
      event: "serverfn_error",
      user_id: userId,
      payload: { fn, message, stack, ...extra },
    });
  } catch (logErr) {
    console.error("[logFnError] failed:", logErr);
  }
}

// --- helpers de interpretação humanizada (por planeta, signo e aspecto) ----
// Cada planeta rege uma área concreta da vida. O signo dá o "jeito" com que
// essa área acontece. A combinação dos dois vira uma frase específica —
// evita que a leitura fique repetitiva ou genérica.
const PLANET_AREA: Record<string, string> = {
  Sol: "sua vitalidade, autoestima e a forma como você quer ser visto",
  Lua: "seu mundo emocional, o seu jeito de acolher e a sua vida familiar",
  Mercúrio: "sua comunicação, seus estudos, contratos e a rotina de trabalho",
  Vênus: "sua vida amorosa, seus prazeres, sua estética e o dinheiro que entra",
  Marte: "sua coragem, seu desejo sexual e o modo como você briga pelo que quer",
  Júpiter: "suas oportunidades, viagens, ensino e a sua fé no futuro",
  Saturno: "sua carreira, disciplina, responsabilidades e o que exige maturidade",
  Urano: "as mudanças bruscas, sua liberdade e onde a rotina precisa ser quebrada",
  Netuno: "seus sonhos, sua espiritualidade, a arte e o que pede intuição",
  Plutão: "suas transformações profundas, o seu poder pessoal e o que precisa morrer para renascer",
};
type SignNarrative = {
  rhythm: string[];
  concrete: string[];
  medicine: string[];
  shadow: string[];
};

const SIGN_NARRATIVE: Record<string, SignNarrative> = {
  "Áries": {
    rhythm: ["arranque, franqueza e coragem imediata", "impulso de abrir caminhos sem esperar licença", "ação direta quando algo precisa nascer"],
    concrete: ["decisões rápidas, disputas e recomeços visíveis", "situações que pedem iniciativa antes de garantia", "testes de coragem, autonomia e presença"],
    medicine: ["escolher uma prioridade por vez", "respirar antes de transformar urgência em briga", "usar a força para proteger, não para atropelar"],
    shadow: ["pressa que corta etapas importantes", "competição por qualquer motivo", "começar mais do que consegue sustentar"],
  },
  "Touro": {
    rhythm: ["constância, presença e decisões amadurecidas aos poucos", "escuta do corpo e respeito ao valor real das coisas", "construção paciente antes de qualquer salto"],
    concrete: ["segurança, dinheiro, conforto e lealdade na mesma conversa", "o corpo pedindo ritmo e as finanças pedindo critério", "uma escolha simples precisando provar valor no cotidiano"],
    medicine: ["transformar estabilidade em base viva", "negociar tempo, preço e afeto com honestidade", "fazer do prazer uma disciplina, não uma fuga"],
    shadow: ["resistência a mudar só para não perder controle", "conforto usado como desculpa para adiar movimento", "posse, rigidez ou silêncio acumulado"],
  },
  "Gêmeos": {
    rhythm: ["mobilidade mental, perguntas e conexões rápidas", "troca de ideias antes de formar conclusão", "curiosidade que aprende conversando"],
    concrete: ["mensagens, estudos, deslocamentos curtos e convites simultâneos", "informações cruzadas exigindo filtro", "diálogos que mudam o rumo de uma decisão"],
    medicine: ["anotar antes de responder", "separar ruído de informação útil", "dar sequência prática ao que foi prometido"],
    shadow: ["dispersão elegante, mas pouco comprometida", "promessas leves demais", "falar para escapar de sentir"],
  },
  "Câncer": {
    rhythm: ["memória afetiva, proteção e vínculo emocional", "movimento em ondas, conforme o coração se sente seguro", "sensibilidade que percebe o clima antes das palavras"],
    concrete: ["família, casa, intimidade e cuidado voltando à cena", "necessidades emocionais pedindo nome", "assuntos antigos procurando acolhimento maduro"],
    medicine: ["cuidar do próprio ninho antes de salvar todos", "pedir ajuda sem transformar afeto em dívida", "separar proteção de controle emocional"],
    shadow: ["mágoa guardada em silêncio", "anulação para não desagradar", "dependência disfarçada de cuidado"],
  },
  "Leão": {
    rhythm: ["expressão, calor humano e desejo de reconhecimento", "criatividade que precisa aparecer", "presença magnética quando há verdade no gesto"],
    concrete: ["convites para liderar, criar ou se expor", "momentos em que sua voz ocupa o centro", "situações que testam orgulho e generosidade"],
    medicine: ["brilhar servindo algo maior", "agradecer quem sustenta os bastidores", "mostrar talento sem transformar tudo em palco"],
    shadow: ["drama por falta de validação", "orgulho ferido comandando escolhas", "necessidade de aplauso acima da verdade"],
  },
  "Virgem": {
    rhythm: ["precisão, melhoria contínua e atenção ao detalhe", "ordem construída por pequenos ajustes", "discernimento prático diante do caos"],
    concrete: ["rotina, saúde, trabalho e pendências pedindo método", "detalhes negligenciados cobrando revisão", "tarefas simples revelando onde falta cuidado"],
    medicine: ["aceitar o bom antes do perfeito", "organizar sem endurecer", "criar descanso dentro da agenda"],
    shadow: ["autocrítica que paralisa", "preocupação excessiva com falhas", "servir demais e reclamar em silêncio"],
  },
  "Libra": {
    rhythm: ["equilíbrio, negociação e senso estético", "olhar para o outro antes de fechar posição", "busca por harmonia sem perder elegância"],
    concrete: ["parcerias, contratos, acordos e escolhas compartilhadas", "conversas que pedem justiça e proporção", "relações espelhando desejos não assumidos"],
    medicine: ["decidir mesmo sem consenso total", "escrever combinados claros", "escutar o próprio desejo antes de agradar"],
    shadow: ["adiamento para evitar desconforto", "gentileza usada como máscara", "dependência de aprovação"],
  },
  "Escorpião": {
    rhythm: ["intensidade, profundidade e leitura do invisível", "mudança por dentro antes de aparecer por fora", "coragem de tocar o que estava escondido"],
    concrete: ["verdades vindo à tona, intimidade e dinheiro compartilhado", "rupturas silenciosas que pedem honestidade", "processos de perda, cura e reconstrução"],
    medicine: ["falar sobre o que dói antes de virar ressentimento", "soltar uma forma de controle", "usar profundidade para curar, não para vigiar"],
    shadow: ["ciúme, suspeita ou controle emocional", "cortes feitos no calor da defesa", "manipulação por medo de vulnerabilidade"],
  },
  "Sagitário": {
    rhythm: ["expansão, fé e busca por sentido", "horizonte largo, às vezes maior que o plano", "movimento que aprende atravessando fronteiras"],
    concrete: ["estudos, viagens, publicações e conversas filosóficas", "oportunidades que pedem visão de futuro", "convites para ensinar, aprender ou arriscar mais"],
    medicine: ["aterrar a visão em calendário", "prometer apenas o que pode cumprir", "transformar entusiasmo em direção"],
    shadow: ["exagero travestido de confiança", "fuga das tarefas pequenas", "verdade dita sem cuidado"],
  },
  "Capricórnio": {
    rhythm: ["maturidade, estratégia e construção de longo prazo", "realismo que transforma desejo em estrutura", "subida lenta, porém orientada por resultado"],
    concrete: ["carreira, responsabilidades e cobranças de desempenho", "decisões que pedem compromisso adulto", "autoridades, prazos e metas organizando o caminho"],
    medicine: ["combinar disciplina com pausas", "delegar o peso que não é só seu", "medir progresso sem esquecer o corpo"],
    shadow: ["dureza consigo e com os outros", "adiar prazer indefinidamente", "confundir valor pessoal com produtividade"],
  },
  "Aquário": {
    rhythm: ["originalidade, visão coletiva e necessidade de liberdade", "pensamento à frente do ambiente", "ruptura inteligente com formatos antigos"],
    concrete: ["amizades, redes, tecnologia e projetos coletivos", "ideias fora da caixa pedindo aplicação", "grupos mostrando onde você pertence ou não"],
    medicine: ["aproximar-se emocionalmente sem perder autonomia", "traduzir ideias em passos práticos", "inovar sem abandonar vínculos importantes"],
    shadow: ["frieza como defesa", "rompimento por reflexo", "rebeldia que rejeita qualquer limite"],
  },
  "Peixes": {
    rhythm: ["sensibilidade, imaginação e escuta espiritual", "movimento sutil que sente antes de explicar", "compaixão que atravessa fronteiras emocionais"],
    concrete: ["sonhos, sinais, arte e momentos de recolhimento", "ambientes carregados afetando sua energia", "situações que pedem entrega com discernimento"],
    medicine: ["criar horários e limites para proteger a energia", "dar forma concreta à inspiração", "ajudar sem desaparecer dentro da dor alheia"],
    shadow: ["fuga da realidade", "vitimização silenciosa", "limites frouxos que viram cansaço"],
  },
};

const PLANET_EXPRESSION: Record<string, { focus: string; scene: string; practice: string; warning: string }> = {
  Sol: {
    focus: "a identidade procura uma forma honesta de ocupar espaço",
    scene: "escolhas de visibilidade, autoestima e direção pessoal",
    practice: "agir de modo coerente com aquilo que você quer irradiar",
    warning: "buscar segurança externa para validar quem você já é",
  },
  Lua: {
    focus: "as emoções revelam do que você precisa para se sentir inteiro",
    scene: "reações íntimas, família, descanso e necessidade de pertencimento",
    practice: "acolher o sentimento antes de decidir a partir dele",
    warning: "confundir proteção emocional com repetição de hábito antigo",
  },
  Mercúrio: {
    focus: "a mente busca nomear, negociar e organizar a experiência",
    scene: "conversas, estudos, contratos, mensagens e rotina de trabalho",
    practice: "transformar pensamento em palavra clara e depois em método",
    warning: "usar raciocínio para justificar uma resistência emocional",
  },
  Vênus: {
    focus: "o prazer mostra como você ama, atrai e reconhece valor",
    scene: "relações afetivas, estética, dinheiro recebido e escolhas de gosto",
    practice: "cultivar beleza com presença e reciprocidade",
    warning: "comprar paz, afeto ou conforto para evitar uma conversa necessária",
  },
  Marte: {
    focus: "o desejo decide onde a energia precisa virar atitude",
    scene: "conflitos, iniciativa, sexualidade, competição e coragem cotidiana",
    practice: "direcionar força para uma ação concreta e limpa",
    warning: "reagir para descarregar tensão em vez de escolher uma batalha real",
  },
  Júpiter: {
    focus: "a expansão aparece onde a vida pede confiança e visão maior",
    scene: "oportunidades, estudos superiores, viagens, fé e crescimento",
    practice: "unir esperança com compromisso prático",
    warning: "inflar expectativas sem medir consequências",
  },
  Saturno: {
    focus: "a maturidade indica onde é preciso construir autoridade interna",
    scene: "responsabilidades, prazos, carreira, limites e cobranças legítimas",
    practice: "assumir o próximo passo sem transformar disciplina em castigo",
    warning: "endurecer para parecer forte enquanto adia vulnerabilidades",
  },
  Urano: {
    focus: "a liberdade aponta onde a vida não aceita mais moldes estreitos",
    scene: "quebras de rotina, inovação, redes, tecnologia e mudanças inesperadas",
    practice: "renovar o formato sem destruir o que ainda tem vida",
    warning: "romper por ansiedade antes de entender o recado da mudança",
  },
  Netuno: {
    focus: "a intuição dissolve certezas para abrir uma escuta mais fina",
    scene: "sonhos, espiritualidade, arte, compaixão e zonas de idealização",
    practice: "dar contorno ao invisível com rituais, limites e criação",
    warning: "confundir entrega espiritual com fuga de realidade",
  },
  Plutão: {
    focus: "a transformação revela onde você recupera poder pessoal",
    scene: "crises, renascimentos, vínculos intensos e verdades profundas",
    practice: "encarar o que precisa morrer para que a vida volte a circular",
    warning: "controlar pessoas ou resultados para não tocar a própria ferida",
  },
};

function narrativePick(items: string[], planet: string, sign: string, offset = 0): string {
  if (!items.length) return "um movimento muito particular deste mapa";
  const seed = [...`${planet}:${sign}:${offset}`].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return items[Math.abs(seed) % items.length];
}

function degreeNarrative(degree?: number): string {
  if (typeof degree !== "number" || !Number.isFinite(degree)) return "";
  if (degree < 10) return "Como está no primeiro decanato, essa força costuma aparecer de maneira mais instintiva e inaugural.";
  if (degree < 20) return "Por estar na faixa central do signo, essa força tende a buscar consistência antes de mudar de direção.";
  return "Nos graus finais do signo, a experiência ganha maturidade e pede fechamento consciente de padrões antigos.";
}

function planetSignReading(planet: string, sign: string, degree?: number): {
  what: string;
  events: string;
  tip: string;
  warn: string;
} {
  const area = PLANET_AREA[planet] ?? "essa área da sua vida";
  const signNarrative = SIGN_NARRATIVE[sign];
  const planetExpression = PLANET_EXPRESSION[planet] ?? {
    focus: "esta função interna procura expressão própria",
    scene: "situações que colocam este tema em evidência",
    practice: "escutar o que essa energia está pedindo e agir com consciência",
    warning: "reagir no automático e repetir padrões antigos",
  };
  const rhythm = signNarrative ? narrativePick(signNarrative.rhythm, planet, sign, 1) : "um ritmo muito próprio";
  const concrete = signNarrative ? narrativePick(signNarrative.concrete, planet, sign, 2) : "situações concretas do cotidiano";
  const medicine = signNarrative ? narrativePick(signNarrative.medicine, planet, sign, 3) : "agir com presença e discernimento";
  const shadow = signNarrative ? narrativePick(signNarrative.shadow, planet, sign, 4) : "repetição inconsciente de padrões";
  const degreeNote = degreeNarrative(degree);

  return {
    what: `${planet} em ${sign} atua sobre ${area}. Neste ponto do mapa, ${planetExpression.focus} por meio de ${rhythm}, criando uma assinatura que não deve ser lida apenas pelo signo, mas pela função específica deste planeta.${degreeNote ? ` ${degreeNote}` : ""}`,
    events: `Na vida prática, isso aparece em ${planetExpression.scene}; em ${sign}, o cenário costuma envolver ${concrete}. Observe quando esse tema pede presença, porque ali a leitura deixa de ser simbólica e vira escolha concreta.`,
    tip: `A prática recomendada é ${planetExpression.practice}. Para harmonizar com ${sign}, acrescente este cuidado: ${medicine}.`,
    warn: `O ponto de sombra surge quando você começa a ${planetExpression.warning}; nesse signo, o excesso pode tomar a forma de ${shadow}. Reconhecer o sinal cedo evita que ele conduza suas decisões por você.`,
  };
}

// --- leitura contextual de aspecto (dois planetas + tipo) ------------------
type AspectKind = {
  vibe: string; // como o encontro acontece
  events: string; // que tipo de situação tende a aparecer
  tip: string; // como usar bem
  warn: string; // o que evitar
};
const ASPECT_KIND: Record<string, AspectKind> = {
  conjuncao: {
    vibe: "faz essas duas energias funcionarem grudadas — onde uma aparece, a outra vem junto",
    events: "essa dupla vira uma marca sua: as pessoas percebem esse tema com força, e situações que envolvem os dois assuntos costumam aparecer no mesmo momento",
    tip: "aprender a usar essa força concentrada de propósito, escolhendo onde investir essa intensidade",
    warn: "deixar essa dupla te dominar e viver só nesse registro, esquecendo outras áreas da vida",
  },
  trigono: {
    vibe: "cria um fluxo natural — o que envolve esses dois temas costuma correr fácil para você",
    events: "portas se abrem sem esforço nestes assuntos: ajuda chega, pessoas certas aparecem e caminhos parecem se encaixar",
    tip: "usar esse talento de propósito, e não só quando a vida cobra — o que vem fácil precisa de intenção para virar realização",
    warn: "achar que sempre vai vir de graça e desperdiçar o dom por acomodação",
  },
  sextil: {
    vibe: "abre uma janela de oportunidade — o encontro dessas energias é positivo, mas depende de você dar o primeiro passo",
    events: "convites, ideias e conexões concretas aparecem nessas áreas, mas costumam passar rápido se você não se mexer",
    tip: "responder rápido quando a chance aparecer e transformar o convite em compromisso concreto",
    warn: "esperar cair do céu — se você não agir, a oportunidade vai para outra pessoa",
  },
  quadratura: {
    vibe: "cria uma tensão real entre essas duas partes — parece que uma sabota a outra até você tomar uma atitude",
    events: "situações se repetem nessas áreas até você mudar de postura: mesmos tipos de conflito, mesmas pessoas parecidas, mesmo cansaço",
    tip: "usar o incômodo como sinal de mudança: onde dá atrito é justamente onde está a maior evolução possível",
    warn: "culpar os outros, forçar no automático ou desistir — o padrão volta até virar aprendizado",
  },
  oposicao: {
    vibe: "coloca esses dois temas em polos opostos — vive-se um extremo de cada vez até aprender a integrar",
    events: "os assuntos aparecem através de outras pessoas: parceiros, sócios ou situações que espelham o que você ainda não assumiu",
    tip: "reconhecer o que o outro está te mostrando e buscar o meio-termo entre os dois extremos",
    warn: "projetar o problema nos outros e virar réu ou vítima da relação",
  },
};
function normalizeAspect(a: string): keyof typeof ASPECT_KIND | null {
  const s = a.toLowerCase();
  if (s.includes("conjun")) return "conjuncao";
  if (s.includes("trig")) return "trigono";
  if (s.includes("sext")) return "sextil";
  if (s.includes("quadr")) return "quadratura";
  if (s.includes("opos")) return "oposicao";
  return null;
}
// Palavras curtas por planeta, usadas para gerar dicas ÚNICAS por aspecto
// (evita que todo aspecto do mesmo tipo saia com o mesmo texto).
const PLANET_KEYWORD: Record<string, string> = {
  Sol: "sua identidade e brilho pessoal",
  Lua: "suas emoções, memórias e cuidado",
  Mercúrio: "sua comunicação, contratos e rotina",
  Vênus: "seu amor, prazer e finanças",
  Marte: "sua ação, coragem e desejo",
  Júpiter: "sua expansão, fé e oportunidades",
  Saturno: "sua estrutura, carreira e limites",
  Urano: "sua liberdade e mudanças bruscas",
  Netuno: "sua sensibilidade e intuição",
  Plutão: "seu poder e transformações profundas",
};
const PLANET_VERB_TIP: Record<string, string> = {
  Sol: "expor-se com verdade em",
  Lua: "cuidar de si antes de mergulhar em",
  Mercúrio: "conversar e escrever com clareza sobre",
  Vênus: "cultivar prazer e beleza em torno de",
  Marte: "agir com propósito, não por impulso, em",
  Júpiter: "expandir com discernimento em",
  Saturno: "construir passo a passo em",
  Urano: "arriscar o novo em",
  Netuno: "meditar e ouvir sinais antes de decidir em",
  Plutão: "deixar morrer o que já passou em",
};
const PLANET_VERB_WARN: Record<string, string> = {
  Sol: "buscar aprovação alheia em",
  Lua: "afogar-se em emoção sem falar sobre",
  Mercúrio: "falar demais e ouvir de menos em",
  Vênus: "trocar seu valor por afeto em",
  Marte: "reagir na raiva quando o assunto for",
  Júpiter: "prometer o que não vai cumprir em",
  Saturno: "endurecer e se cobrar em excesso em",
  Urano: "cortar vínculos por reflexo em",
  Netuno: "fugir da realidade dentro de",
  Plutão: "controlar ou manipular em",
};
function aspectReading(a: { a: string; b: string; aspect: string }): {
  narrative: string;
  tip: string;
  warn: string;
} {
  const A = PLANET_AREA[a.a] ?? `o tema de ${a.a}`;
  const B = PLANET_AREA[a.b] ?? `o tema de ${a.b}`;
  const kwA = PLANET_KEYWORD[a.a] ?? `o tema de ${a.a}`;
  const kwB = PLANET_KEYWORD[a.b] ?? `o tema de ${a.b}`;
  const vTipA = PLANET_VERB_TIP[a.a] ?? "cuidar de";
  const vWarnB = PLANET_VERB_WARN[a.b] ?? "descuidar de";
  const k = normalizeAspect(a.aspect);
  const kind = k ? ASPECT_KIND[k] : null;
  if (!kind) {
    const fallbackTemplates = [
      {
        narrative: `${a.a} e ${a.b} formam um diálogo particular entre ${A} e ${B}. A leitura central é integrar ${kwA} com ${kwB} sem deixar uma força engolir a outra.`,
        tip: `Escolha um gesto concreto ligado a ${kwB} e pratique ${vTipA} esse tema por sete dias.`,
        warn: `O desvio aparece quando você tenta ${vWarnB} ${kwB}; aí o aspecto vira repetição em vez de aprendizado.`,
      },
      {
        narrative: `Este contato entre ${a.a} e ${a.b} pede escuta fina: ${A} busca resposta enquanto ${B} mostra onde a vida cobra integração.`,
        tip: `Transforme a tensão em método: antes de decidir, nomeie o que ${kwA} deseja e o que ${kwB} precisa preservar.`,
        warn: `Não force solução rápida quando o tema for ${kwB}; a pressa costuma ativar ${vWarnB} esse campo.`,
      },
    ];
    const index = Math.abs([...`${a.a}-${a.b}-${a.aspect}`].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) % fallbackTemplates.length;
    return fallbackTemplates[index];
  }
  const templates = [
    {
      narrative: `${a.a} em aspecto com ${a.b} coloca ${A} diante de ${B}. A dinâmica é esta: ${kind.vibe}. O aprendizado envolve ${kwA} encontrando uma forma madura de dialogar com ${kwB}.`,
      tip: `Para trabalhar esse par, pratique ${vTipA} ${kwB}; depois transforme ${kind.tip} em uma atitude observável.`,
      warn: `A armadilha é ${vWarnB} ${kwB}, especialmente quando você cai em ${kind.warn}.`,
    },
    {
      narrative: `Quando ${a.a} toca ${a.b}, duas áreas internas entram em cena: ${A} e ${B}. ${kind.events}. O mapa pede que você perceba qual delas costuma falar mais alto.`,
      tip: `Use a semana para testar uma resposta diferente: ${vTipA} ${kwB} antes de repetir a reação conhecida.`,
      warn: `Se esse ponto for vivido no automático, tende a virar ${kind.warn}; a saída começa quando você identifica ${kwA} sem negar ${kwB}.`,
    },
    {
      narrative: `Este aspecto entre ${a.a} e ${a.b} funciona como um espelho entre ${kwA} e ${kwB}. ${kind.vibe}. A maturidade nasce quando você para de tratar essas forças como inimigas.`,
      tip: `Dê forma prática ao aspecto: escolha uma conversa, tarefa ou decisão ligada a ${kwB} e aplique ${vTipA} esse campo.`,
      warn: `Cuide para não ${vWarnB} ${kwB}; quando isso acontece, ${kind.warn}.`,
    },
    {
      narrative: `A pergunta deste encontro é simples: como permitir que ${a.a} expresse ${A} sem atropelar ${B}, território de ${a.b}? ${kind.events}.`,
      tip: `A resposta prática é reduzir abstrações: faça um pequeno compromisso que una ${kwA} e ${kwB} ainda esta semana.`,
      warn: `O excesso aparece quando ${vWarnB} ${kwB}; nesse ponto, pause antes de transformar defesa em destino.`,
    },
  ];
  const index = Math.abs([...`${a.a}-${a.b}-${a.aspect}`].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) % templates.length;
  return templates[index];
}

// --- número pessoal do dia (numerologia — mesma lógica do dashboard) -------
function numReduce(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split("").reduce((a, b) => a + Number(b), 0);
  }
  return n;
}
function personalDayNumber(dateISO: string, birthISO: string): number {
  const [by, bm, bd] = birthISO.split("-").map(Number);
  const [y, m, d] = dateISO.split("-").map(Number);
  const personalYear = numReduce(numReduce(bm) + numReduce(bd) + numReduce(y));
  const personalMonth = numReduce(personalYear + numReduce(m));
  return numReduce(personalMonth + numReduce(d));
}
const PERSONAL_DAY_VIBE: Record<number, string> = {
  1: "recomeço · iniciar",
  2: "vínculo · escutar",
  3: "expressão · criar",
  4: "estrutura · organizar",
  5: "movimento · mudar",
  6: "cuidado · nutrir",
  7: "introspecção · estudar",
  8: "poder · decidir",
  9: "fechamento · soltar",
  11: "intuição elevada · inspirar",
  22: "grande construção · realizar",
  33: "cura coletiva · servir",
};
function personalDayVibe(n: number): string { return PERSONAL_DAY_VIBE[n] ?? "equilíbrio"; }


// --- date helpers ----------------------------------------------------------
function getWeekRange(reference = new Date()) {
  const d = new Date(reference);
  const day = d.getDay(); // 0 = domingo, 1 = segunda...
  const diffToMonday = (day + 6) % 7; // quantos dias para voltar à segunda
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function formatWeekRange(reference = new Date()) {
  const { monday, sunday } = getWeekRange(reference);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const start = monday.toLocaleDateString("pt-BR", opts);
  const end = sunday.toLocaleDateString("pt-BR", opts);
  return { start, end, monthLabel: monday.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) };
}

function formatMonthLabel(reference = new Date()) {
  return reference.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function formatYearLabel(reference = new Date()) {
  return String(reference.getFullYear());
}

// Gera uma leitura horoscópica curta via IA (com fallback) usando o trio Sol/Lua/Asc.
async function buildHoroscopeReading(params: {
  sunSign?: string;
  moonSign?: string;
  ascSign?: string;
  weekRange: { start: string; end: string };
  monthLabel: string;
  userId?: string | null;
}): Promise<string> {
  const { sunSign, moonSign, ascSign, weekRange, monthLabel, userId } = params;
  const fallback =
    `Esta semana (${weekRange.start} a ${weekRange.end}), em ${monthLabel}, o céu convida você a honrar o que pulsa em ${sunSign ?? "seu Sol"}, ` +
    `acolher o que sente em ${moonSign ?? "sua Lua"} e expressar no mundo a presença de ${ascSign ?? "seu Ascendente"}. ` +
    `Permita-se pausar, sentir os movimentos sutis e agir com intenção. Pequenos gestos de cuidado e clareza abrem portas maiores.`;
  try {
    const prompt = `Escreva uma leitura horoscópica em português brasileiro, tom acolhedor e prático, em segunda pessoa ("você"), em 3 a 4 parágrafos curtos (máx. 250 palavras). Semana de ${weekRange.start} a ${weekRange.end} em ${monthLabel}. Integre Sol em ${sunSign ?? "—"}, Lua em ${moonSign ?? "—"} e Ascendente em ${ascSign ?? "—"}. Cubra clima geral, amor, trabalho e um cuidado. Sem listas, sem markdown, sem emojis. Nunca prometa eventos certos.`;
    const { result: text } = await runWithProviderFallback(
      supabaseAdmin, userId ?? null,
      async (model) => (await Promise.race([
        generateText({ model, prompt }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("horoscope timeout")), 12_000)),
      ])).text,
      { addonId: "sub_astrologer_numerologist" },
    );
    const cleaned = text.trim();
    return cleaned.length > 40 ? cleaned : fallback;
  } catch (err) {
    console.error("[buildHoroscopeReading] AI error", err);
    return fallback;
  }
}


// --- helpers --------------------------------------------------------------
const SIGNS = [
  "Áries", "Touro", "Gêmeos", "Câncer", "Leão", "Virgem",
  "Libra", "Escorpião", "Sagitário", "Capricórnio", "Aquário", "Peixes",
];

const PLANETS: { name: string; body: Astro.Body }[] = [
  { name: "Sol", body: Astro.Body.Sun },
  { name: "Lua", body: Astro.Body.Moon },
  { name: "Mercúrio", body: Astro.Body.Mercury },
  { name: "Vênus", body: Astro.Body.Venus },
  { name: "Marte", body: Astro.Body.Mars },
  { name: "Júpiter", body: Astro.Body.Jupiter },
  { name: "Saturno", body: Astro.Body.Saturn },
  { name: "Urano", body: Astro.Body.Uranus },
  { name: "Netuno", body: Astro.Body.Neptune },
  { name: "Plutão", body: Astro.Body.Pluto },
];

function signOf(lonDeg: number) {
  const lon = ((lonDeg % 360) + 360) % 360;
  const idx = Math.floor(lon / 30);
  return { sign: SIGNS[idx], degree: lon - idx * 30, longitude: lon };
}

// Equatorial -> ecliptic longitude (J2000 approx, refined enough for natal preview)
function eclipticLongitudeFromEqu(ra_hours: number, dec_deg: number, date: Date) {
  // Obliquity of date (low precision)
  const T = (date.getTime() / 86400000 + 2440587.5 - 2451545.0) / 36525;
  const eps = (23.4392911 - 0.0130042 * T) * Math.PI / 180;
  const ra = (ra_hours * 15) * Math.PI / 180;
  const dec = dec_deg * Math.PI / 180;
  const sinL = Math.sin(ra) * Math.cos(eps) + Math.tan(dec) * Math.sin(eps);
  const cosL = Math.cos(ra);
  let lon = Math.atan2(sinL, cosL) * 180 / Math.PI;
  if (lon < 0) lon += 360;
  return lon;
}

function computeAscendantMC(date: Date, lat: number, lon: number) {
  // Local sidereal time
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  gmst = ((gmst % 360) + 360) % 360;
  const lst = ((gmst + lon) % 360 + 360) % 360;
  const ramc = lst;
  const eps = (23.4392911 - 0.0130042 * T) * Math.PI / 180;
  const phi = lat * Math.PI / 180;
  const ramcRad = ramc * Math.PI / 180;

  const mc = (Math.atan2(Math.sin(ramcRad), Math.cos(ramcRad) * Math.cos(eps) - 0) * 180) / Math.PI;
  const mcLon = ((mc + 360) % 360);

  const asc =
    Math.atan2(
      -Math.cos(ramcRad),
      Math.sin(ramcRad) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps),
    ) * 180 / Math.PI;
  const ascLon = ((asc + 360) % 360);

  return { ascendant: ascLon, midheaven: mcLon };
}

function placidusHouses(asc: number, mc: number) {
  // Equal-house fallback from Asc; precise Placidus requires iterative solver.
  const houses: number[] = [];
  for (let i = 0; i < 12; i++) houses.push(((asc + i * 30) % 360 + 360) % 360);
  // Override the 10th with MC for visual accuracy
  houses[9] = mc;
  return houses;
}

const ASPECTS = [
  { name: "Conjunção", angle: 0, orb: 8 },
  { name: "Oposição", angle: 180, orb: 8 },
  { name: "Trígono", angle: 120, orb: 7 },
  { name: "Quadratura", angle: 90, orb: 7 },
  { name: "Sextil", angle: 60, orb: 5 },
];

function computeAspects(planets: { name: string; longitude: number }[]) {
  const out: { a: string; b: string; aspect: string; orb: number }[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const diff = Math.abs(planets[i].longitude - planets[j].longitude) % 360;
      const angle = diff > 180 ? 360 - diff : diff;
      for (const a of ASPECTS) {
        if (Math.abs(angle - a.angle) <= a.orb) {
          out.push({
            a: planets[i].name,
            b: planets[j].name,
            aspect: a.name,
            orb: Number(Math.abs(angle - a.angle).toFixed(2)),
          });
          break;
        }
      }
    }
  }
  return out;
}

// --- input schema ---------------------------------------------------------
const ChartInput = z.object({
  birthDataId: z.string().uuid().optional(),
  clientProfileId: z.string().uuid().nullable().optional(),
  fullName: z.string().min(1),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  timeUnknown: z.boolean().optional(),
  latitude: z.number(),
  longitude: z.number(),
  timezoneOffset: z.number().min(-14).max(14).default(0),
});

// Health probe — confirms the astrology serverFn is deployed and reachable.
// Used by the UI to disable "Gerar mapa" gracefully when the backend is stale.
export const pingAstro = createServerFn({ method: "GET" }).handler(async () => {
  return { ok: true as const, at: Date.now() };
});

export const computeNatalChart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ChartInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    
    // Charge credits for chart calculation
    const action: CreditAction = "astro_chart";
    const unlimited = await hasUnlimitedAccess(userId, action);
    const cost = unlimited ? 0 : await getCreditCost(action);
    let charged = false;
    if (!unlimited) {
      const ok = await consumeCredits(userId, action, "Cálculo de Mapa Astral");
      if (!ok) {
        throw new Error(`Saldo insuficiente. Gerar o mapa custa ${cost} créditos.`);
      }
      charged = cost > 0;
    }

    try {

      const time = data.timeUnknown ? "12:00:00" : (data.birthTime ?? "12:00:00");
      const [h, mi, s] = time.split(":").map(Number);
      const [y, mo, d] = data.birthDate.split("-").map(Number);
      const utcMs =
        Date.UTC(y, mo - 1, d, h, mi, s ?? 0) - data.timezoneOffset * 3600_000;
      const date = new Date(utcMs);

      const observer = new Astro.Observer(data.latitude, data.longitude, 0);

      const planets = PLANETS.map(({ name, body }) => {
        const eq = Astro.Equator(body, date, observer, true, true);
        const lon = eclipticLongitudeFromEqu(eq.ra, eq.dec, date);
        const s = signOf(lon);
        return { name, ...s };
      });

      const { ascendant, midheaven } = computeAscendantMC(
        date,
        data.latitude,
        data.longitude,
      );
      const houses = placidusHouses(ascendant, midheaven).map((deg, i) => ({
        house: i + 1,
        ...signOf(deg),
      }));
      const ascSign = signOf(ascendant);
      const mcSign = signOf(midheaven);

      const aspects = computeAspects(planets);

      const summary =
        `${data.fullName} — Sol em ${planets[0].sign}, Lua em ${planets[1].sign}, Ascendente em ${ascSign.sign}. ` +
        `${aspects.length} aspectos principais detectados.`;

      const { data: saved, error } = await context.supabase
        .from("astro_charts")
        .insert({
          user_id: context.userId,
          birth_data_id: data.birthDataId ?? null,
          client_profile_id: data.clientProfileId ?? null,
          engine: "swiss_ephemeris",
          planets,
          houses,
          aspects,
          ascendant,
          midheaven,
          summary,
        })
        .select()
        .single();

      if (error) {
        console.error("[astro] save error:", error);
        await logFnError("computeNatalChart.persist", error, context.userId, {
          birthDataId: data.birthDataId ?? null,
        });
      }

      return {
        id: saved?.id ?? null,
        planets,
        houses,
        aspects,
        ascendant: { ...ascSign, longitude: ascendant },
        midheaven: { ...mcSign, longitude: midheaven },
        summary,
      };
    } catch (err) {
      if (charged) {
        await refundCredits(userId, "astro_chart", {
          reason: err instanceof Error ? `Falha no mapa: ${err.message}`.slice(0, 200) : "Falha no mapa",
          actorLabel: "system:astro",
          originalReference: "Cálculo de Mapa Astral",
        }).catch(() => {});
      }
      await logFnError("computeNatalChart", err, context.userId, {

        birthDataId: data.birthDataId ?? null,
        birthDate: data.birthDate,
      });
      throw err;
    }
  });

/* ============================================================
 * Previsões astrais (próximos dias, semana, mês, ano) via IA
 * ============================================================ */

type DeepArea = {
  title: string;
  reading: string;    // interpretação profunda (várias parágrafos)
  opportunities: string; // oportunidades específicas do mapa nessa área
  tips: string[];     // ações práticas concretas (>=5)
  avoid: string[];    // armadilhas a evitar (>=3)
};

type AstroForecast = {
  synthesis: string;   // síntese inicial cinematográfica
  love: DeepArea;
  money: DeepArea;
  health: DeepArea;
  purpose: DeepArea;
  business: DeepArea;
  family: DeepArea;
  spirituality: DeepArea;
  relationships: DeepArea; // amizades e vínculos sociais
  shadows: DeepArea;   // sombras, feridas kármicas, padrões a curar
  nextDays: string;
  week: string;
  month: string;
  year: string;
  closing: string;     // fechamento inspirador
  generatedAt: string;
  antiRepeatVersion?: string;
};

const ASTRO_ANTI_REPEAT_VERSION = "length-audit-v4-parallel";

// Coerce forecast time-window fields (nextDays/week/month/year) into readable
// text. The LLM sometimes returns a string, sometimes an object shaped like a
// DeepArea, sometimes an empty string. Handle all cases so the PDF is never
// blank.
function coerceForecastText(value: unknown, period: string): string {
  if (typeof value === "string") {
    const t = value.trim();
    if (t && t !== "—") return t;
  }
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    const parts: string[] = [];
    for (const key of ["reading", "text", "summary", "description", "content", "opportunities"]) {
      const s = v[key];
      if (typeof s === "string" && s.trim()) parts.push(s.trim());
    }
    const tips = v.tips;
    if (Array.isArray(tips)) {
      const list = tips.filter((t) => typeof t === "string" && t.trim()).map((t) => `• ${t}`).join("\n");
      if (list) parts.push(list);
    }
    if (parts.length) return parts.join("\n\n");
  }
  return `Previsões para ${period} indisponíveis nesta geração. Gere as previsões novamente para obter uma leitura detalhada deste período.`;
}

// -----------------------------------------------------------
// FASE 1 anti-repetição: geração em 3 lotes com memória cumulativa.
// Lote A: síntese (baseline).
// Lote B: 9 áreas de vida em sequência, cada uma recebe digest de tudo que já saiu.
// Lote C: previsões temporais + closing em sequência, também com digest atualizado.
// -----------------------------------------------------------

const DEEP_AREA_SPECS: Record<keyof Pick<AstroForecast,
  "love" | "money" | "health" | "purpose" | "business" | "family" | "spirituality" | "relationships" | "shadows"
>, { title: string; readingWords: number; oppWords: number; tips: string; avoid: string; focus: string }> = {
  love: { title: "Amor e Vínculo Afetivo", readingWords: 900, oppWords: 300, tips: "7 a 9", avoid: "5",
    focus: "Vênus, Marte, Lua, Casa 5 e 7. Como ama, atrai, sabota, floresce; parceiro complementar; feridas de rejeição." },
  money: { title: "Dinheiro, Prosperidade e Abundância", readingWords: 900, oppWords: 300, tips: "7 a 9", avoid: "5",
    focus: "Vênus, Júpiter, Saturno, Casa 2 e 8. Crenças herdadas, talentos monetizáveis, ciclos de escassez/abundância." },
  health: { title: "Saúde, Corpo e Vitalidade", readingWords: 800, oppWords: 260, tips: "7 a 9", avoid: "5",
    focus: "Sol, Marte, Saturno, Casa 6. Pontos sensíveis, padrões emocionais, ritmo ideal. NUNCA diagnóstico clínico." },
  purpose: { title: "Propósito de Vida e Missão da Alma", readingWords: 900, oppWords: 300, tips: "7 a 9", avoid: "5",
    focus: "MC, Sol, Nodos, Casa 10. Dom central, ferida iniciática, chamado kármico." },
  business: { title: "Negócios, Carreira e Empreendimentos", readingWords: 900, oppWords: 320, tips: "7 a 9", avoid: "5",
    focus: "MC, Casa 10, Saturno, Marte, Júpiter. Vocação, liderança, nicho, modelo de negócio, sócios ideais." },
  family: { title: "Família, Raízes e Ancestralidade", readingWords: 750, oppWords: 260, tips: "6 a 8", avoid: "4",
    focus: "Casa 4 e 10, Lua, Saturno. Pai/mãe/irmãos/filhos, padrão herdado, ferida ancestral, papel no clã." },
  spirituality: { title: "Espiritualidade, Fé e Conexão com o Sagrado", readingWords: 750, oppWords: 260, tips: "6 a 8", avoid: "4",
    focus: "Netuno, Plutão, Júpiter, Casa 9 e 12. Tradições ressoantes, dons mediúnicos, caminho de despertar." },
  relationships: { title: "Amizades e Círculos Sociais", readingWords: 600, oppWords: 200, tips: "6", avoid: "4",
    focus: "Mercúrio, Casa 11. Como faz amigos, círculo saudável, papel em grupo." },
  shadows: { title: "Sombras, Feridas e Padrões a Curar", readingWords: 800, oppWords: 260, tips: "6 a 8", avoid: "4",
    focus: "Plutão, Lilith, quadraturas e oposições. Ferida central, mecanismo de defesa, projeção." },
};

// Contador simples de palavras (usado pelo auditor de tamanho)
function countWords(s: string | undefined | null): number {
  if (!s) return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

const SECTION_DIVERSITY: Record<string, { lens: string; opening: string; avoid: string }> = {
  love: {
    lens: "vínculo íntimo, linguagem afetiva, desejo, medo de rejeição e maturidade emocional",
    opening: "comece por uma cena emocional concreta, não por uma definição astrológica",
    avoid: "prosperidade, carreira, missão, corpo, ancestralidade e espiritualidade como tema principal",
  },
  money: {
    lens: "valor pessoal, escolhas financeiras, talentos monetizáveis, segurança material e circulação de abundância",
    opening: "comece por uma decisão prática envolvendo recursos, preço, troca ou merecimento",
    avoid: "romance, família, cura espiritual e propósito abstrato como eixo central",
  },
  health: {
    lens: "ritmo do corpo, energia diária, tensão acumulada, descanso e autocuidado sem diagnóstico clínico",
    opening: "comece pela sensação do corpo ao acordar ou ao atravessar a rotina",
    avoid: "dinheiro, casamento, vocação e mediunidade como tema principal",
  },
  purpose: {
    lens: "chamado da alma, direção existencial, dom central, coragem de assumir identidade e serviço",
    opening: "comece por uma pergunta existencial que só este mapa poderia provocar",
    avoid: "dicas financeiras, hábitos de saúde e descrição de parceiro ideal como núcleo",
  },
  business: {
    lens: "posicionamento profissional, liderança, nicho, estratégia, autoridade e parcerias de trabalho",
    opening: "comece por uma situação de trabalho, decisão de mercado ou escolha de liderança",
    avoid: "romance, família de origem, espiritualidade devocional e autocuidado corporal como foco",
  },
  family: {
    lens: "raízes, lar, lealdades invisíveis, pai/mãe, pertencimento e padrão ancestral",
    opening: "comece por uma memória simbólica de casa, origem ou pertencimento",
    avoid: "negócios, dinheiro, amizades amplas e previsão anual como tema principal",
  },
  spirituality: {
    lens: "fé, silêncio, sonhos, intuição, rituais, entrega e relação pessoal com o invisível",
    opening: "comece por um sinal sutil, sonho, silêncio ou chamado interior",
    avoid: "estratégia comercial, orçamento, relação amorosa e rotina física como eixo central",
  },
  relationships: {
    lens: "amizades, grupos, redes, afinidades, colaboração e lugar social sem romantizar",
    opening: "comece por uma conversa, convite, grupo ou mudança de círculo social",
    avoid: "casal romântico, dinheiro, saúde e ancestralidade como assunto dominante",
  },
  shadows: {
    lens: "mecanismo de defesa, projeção, medo oculto, compulsão, cura e integração da sombra",
    opening: "comece pelo ponto em que a pessoa se protege tanto que acaba se limitando",
    avoid: "tom motivacional genérico, prosperidade fácil, romance idealizado e previsão cronológica",
  },
};

const FORECAST_DIVERSITY: Record<string, { lens: string; opening: string }> = {
  nextDays: {
    lens: "microdecisões, sinais imediatos, pequenas mudanças de humor e atitudes dos próximos dias",
    opening: "comece com uma data ou janela curta e uma ação simples observável",
  },
  week: {
    lens: "organização da semana, prioridade emocional, encontros, trabalho e ajuste de rota",
    opening: "comece pela cadência da semana, como se fosse uma travessia em etapas",
  },
  month: {
    lens: "tema mensal, virada de percepção, oportunidade central e cuidado recorrente",
    opening: "comece pelo arco do mês, não por eventos isolados",
  },
  year: {
    lens: "ciclo amplo, amadurecimento, escolhas irreversíveis, colheitas e preparação de futuro",
    opening: "comece com uma imagem de ciclo longo, estação ou construção de destino",
  },
  closing: {
    lens: "benção final, parábola inédita, integração espiritual e chamado amoroso à ação",
    opening: "comece diretamente com uma parábola breve que não use jardim, rio, ponte, estrada ou porta",
  },
};

const DIGEST_STOP_WORDS = new Set([
  "a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
  "por", "para", "com", "sem", "sob", "sobre", "entre", "e", "ou", "mas", "que", "se", "sua", "seu", "suas", "seus",
  "você", "voce", "te", "lhe", "ao", "aos", "à", "às", "isso", "essa", "esse", "esta", "este", "como", "quando",
]);

function normalizeRepeatText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeAll(text: string): string[] {
  const normalized = normalizeRepeatText(text);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

function tokenizeSignificant(text: string): string[] {
  return tokenizeAll(text).filter((w) => w.length > 2 && !DIGEST_STOP_WORDS.has(w));
}

function ngrams(words: string[], size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i <= words.length - size; i++) {
    out.push(words.slice(i, i + size).join(" "));
  }
  return out;
}

function splitReadableSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Extrai um digest curto do que já foi escrito para injetar como "não repita".
// Além de frases completas, inclui n-grams significativos para bloquear
// repetições semânticas de estruturas e combinações de palavras.
function buildAntiRepeatDigest(prev: string): string {
  if (!prev) return "";
  const clean = prev.replace(/\s+/g, " ").trim();
  const sentences = splitReadableSentences(clean).filter((s) => tokenizeAll(s).length >= 8);
  const pickedSentences: string[] = [];
  const seen = new Set<string>();
  for (const s of sentences) {
    const key = normalizeRepeatText(s).slice(0, 90);
    if (seen.has(key)) continue;
    seen.add(key);
    pickedSentences.push(s.length > 220 ? s.slice(0, 220) + "…" : s);
    if (pickedSentences.length >= 18) break;
  }

  const words = tokenizeSignificant(clean);
  const pickedPhrases: string[] = [];
  const phraseSeen = new Set<string>();
  for (const size of [8, 7, 6]) {
    for (const gram of ngrams(words, size)) {
      if (phraseSeen.has(gram)) continue;
      phraseSeen.add(gram);
      pickedPhrases.push(gram);
      if (pickedPhrases.length >= 32) break;
    }
    if (pickedPhrases.length >= 32) break;
  }

  const blocks: string[] = [];
  if (pickedSentences.length) blocks.push(`Frases já usadas:\n- ${pickedSentences.join("\n- ")}`);
  if (pickedPhrases.length) blocks.push(`Sequências/ideias já usadas:\n- ${pickedPhrases.join("\n- ")}`);
  return blocks.join("\n");
}

function deepAreaToText(area: Partial<DeepArea> | null | undefined): string {
  if (!area) return "";
  return [
    area.title,
    area.reading,
    area.opportunities,
    ...(Array.isArray(area.tips) ? area.tips : []),
    ...(Array.isArray(area.avoid) ? area.avoid : []),
  ]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join("\n");
}

function auditTextAgainstRegistry(text: string, registry: Set<string>): string {
  if (!text || tokenizeAll(text).length < 10) return text;
  const sentences = splitReadableSentences(text);
  if (sentences.length <= 1) {
    for (const gram of ngrams(tokenizeAll(text), 10)) registry.add(gram);
    return text;
  }
  const kept: string[] = [];
  for (const sentence of sentences) {
    const grams = ngrams(tokenizeAll(sentence), 10);
    const repeated = grams.length > 0 && grams.some((gram) => registry.has(gram));
    if (!repeated) kept.push(sentence);
    for (const gram of grams) registry.add(gram);
  }
  const audited = kept.join(" ").trim();
  return audited.length >= Math.min(240, text.length * 0.45) ? audited : text;
}

function auditListAgainstRegistry(items: string[], registry: Set<string>): string[] {
  const out: string[] = [];
  const local = new Set<string>();
  for (const item of items) {
    const key = normalizeRepeatText(item).slice(0, 120);
    const grams = ngrams(tokenizeAll(item), 8);
    const repeated = local.has(key) || grams.some((gram) => registry.has(gram));
    if (!repeated) out.push(item);
    local.add(key);
    for (const gram of grams) registry.add(gram);
  }
  return out.length ? out : items;
}

function auditArea(area: DeepArea, registry: Set<string>): DeepArea {
  return {
    ...area,
    reading: auditTextAgainstRegistry(area.reading, registry),
    opportunities: auditTextAgainstRegistry(area.opportunities, registry),
    tips: auditListAgainstRegistry(area.tips ?? [], registry),
    avoid: auditListAgainstRegistry(area.avoid ?? [], registry),
  };
}

function auditForecastRepetition(forecast: AstroForecast): AstroForecast {
  const registry = new Set<string>();
  return {
    ...forecast,
    synthesis: auditTextAgainstRegistry(forecast.synthesis, registry),
    love: auditArea(forecast.love, registry),
    money: auditArea(forecast.money, registry),
    health: auditArea(forecast.health, registry),
    purpose: auditArea(forecast.purpose, registry),
    business: auditArea(forecast.business, registry),
    family: auditArea(forecast.family, registry),
    spirituality: auditArea(forecast.spirituality, registry),
    relationships: auditArea(forecast.relationships, registry),
    shadows: auditArea(forecast.shadows, registry),
    nextDays: auditTextAgainstRegistry(forecast.nextDays, registry),
    week: auditTextAgainstRegistry(forecast.week, registry),
    month: auditTextAgainstRegistry(forecast.month, registry),
    year: auditTextAgainstRegistry(forecast.year, registry),
    closing: auditTextAgainstRegistry(forecast.closing, registry),
  };
}

async function buildForecastWithAI(chart: {
  planets: { name: string; sign: string; degree: number }[];
  ascendant: number | null;
  midheaven: number | null;
  aspects: { a: string; b: string; aspect: string; orb: number }[];
  summary: string | null;
}, userId?: string | null): Promise<AstroForecast> {
  const ascSign = chart.ascendant != null ? SIGNS[Math.floor(chart.ascendant / 30)] : "—";
  const mcSign = chart.midheaven != null ? SIGNS[Math.floor(chart.midheaven / 30)] : "—";
  const planetsBlock = chart.planets
    .map((p) => `${p.name} em ${p.sign} (${p.degree.toFixed(1)}°)`)
    .join("\n");
  const aspectsBlock = chart.aspects
    .slice(0, 20)
    .map((a) => `${a.a} ${a.aspect} ${a.b} (orbe ${a.orb}°)`)
    .join("\n");

  const today = new Date();
  const todayStr = today.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const week = formatWeekRange(today);
  const monthLabel = formatMonthLabel(today);
  const yearLabel = formatYearLabel(today);

  // PROMPT MASTER (system) — persona + R1..R9. Compartilhado por todos os lotes.
  const system = `Você é o **Oráculo Cósmico**, astrólogo profissional com formação em astrologia psicológica (Jung, Liz Greene, Steven Forrest), evolutiva e cabalística.
Escreve em português brasileiro, tom acolhedor, íntimo, poético e profundamente prático. Nunca prevê eventos certos — mostra tendências, arquétipos e caminhos.
Fala diretamente ao leitor em segunda pessoa ("você"), como um mentor que já leu a alma da pessoa.
NUNCA use markdown, títulos com #, asteriscos, listas com - ou emojis. Apenas texto corrido em parágrafos separados por linha em branco.
Cite planetas, signos, casas e aspectos ESPECÍFICOS do mapa em cada leitura — não escreva genéricos que caberiam a qualquer pessoa.
Cada tip deve ser uma AÇÃO CONCRETA e executável hoje ou nesta semana, nunca conselho vago.

REGRAS ANTIRREPETIÇÃO (obrigatórias):
R1. Nunca reutilize textos entre planetas diferentes, mesmo no mesmo signo. Sempre PLANETA + SIGNO + CASA + ASPECTOS.
R2. Nenhuma frase >10 palavras pode repetir-se no documento. Varie sempre a redação.
R3. Proibido "Na sua vida real isso aparece como…", "Perceba o padrão antes de agir.", "Esse aspecto cria uma tensão…", "Esse aspecto abre uma janela…", "Em concreto…", "Usando a força de X para sustentar Y." e paráfrases idênticas.
R4. Alterne estruturas narrativas por aspecto: (a) psicológica, (b) exemplo cotidiano, (c) reflexão, (d) pergunta ao leitor, (e) conselho prático, (f) metáfora, (g) desafio semanal. Nunca duas iguais em sequência.
R5. Antes de escrever, verifique se conceitos já foram usados; aborde por outro ângulo, com vocabulário novo.
R6. Similaridade semântica entre seções não pode passar de 60%.
R7. Listas "tips"/"avoid" variam em quantidade e formato entre capítulos.
R8. Mantenha personalização profunda e humana; quebre padrões de template imediatamente.
R9. Não reduza extensão — aumente a diversidade textual.
R10. Se uma seção anterior falou de um tema, a próxima deve mudar o ângulo, a cena, os verbos, as metáforas e o campo de aplicação. Não basta trocar sinônimos.`;

  const chartBlock = `Data de referência: ${todayStr} · Semana: ${week.start} a ${week.end} · Mês: ${monthLabel} · Ano: ${yearLabel}.

MAPA NATAL
Ascendente: ${ascSign}
Meio do Céu: ${mcSign}
Planetas:
${planetsBlock}

Aspectos principais:
${aspectsBlock}

Resumo interno: ${chart.summary ?? "—"}`;

  async function callJson<T>(prompt: string): Promise<T> {
    const { result: text } = await runWithProviderFallback(
      supabaseAdmin, userId ?? null,
      async (model) => (await generateText({ model, system, prompt })).text,
      { addonId: "sub_astrologer_numerologist", modelHint: "openai/gpt-5.5" },
    );
    return safeParseLlmJson<T>(text);
  }

  function antiRepeatBlock(prevText: string): string {
    const digest = buildAntiRepeatDigest(prevText);
    if (!digest) return "";
    return `\n\nMEMÓRIA ANTI-REPETIÇÃO DO DOCUMENTO\n${digest}\n\nINSTRUÇÃO CRÍTICA: NÃO repita, NÃO parafraseie e NÃO use estrutura semântica parecida com os itens acima. Se o próximo texto ficar parecido, reescreva mentalmente antes de responder, mudando cena, metáfora, verbo principal, área prática e ritmo da frase.\n`;
  }

  // ---------- LOTE A: síntese ----------
  const synthPrompt = `${chartBlock}

Gere APENAS a síntese cinematográfica de abertura do relatório.
Costure Sol/Lua/Ascendente/MC, arquétipo dominante, missão desta encarnação e clima do momento atual (${monthLabel}).
3 a 4 parágrafos densos, mín. 500 palavras.

Responda EXCLUSIVAMENTE com JSON válido, sem markdown:
{ "synthesis": "texto aqui" }`;
  const synthJson = await callJson<{ synthesis: string }>(synthPrompt);
  const synthesis = synthJson.synthesis ?? "";

  // ---------- LOTE B: 9 áreas em sequência (digest cumulativo) ----------
  let cumulativeText = synthesis;
  const areaEntries = Object.entries(DEEP_AREA_SPECS) as Array<[keyof typeof DEEP_AREA_SPECS, typeof DEEP_AREA_SPECS[keyof typeof DEEP_AREA_SPECS]]>;
  const areaResults: Array<readonly [keyof typeof DEEP_AREA_SPECS, DeepArea]> = [];
  for (const [key, spec] of areaEntries) {
    const diversity = SECTION_DIVERSITY[key];
    const prompt = `${chartBlock}

Gere APENAS a seção "${spec.title}" (chave: ${key}) do relatório astrológico.
Foco temático: ${spec.focus}
Ângulo exclusivo desta seção: ${diversity?.lens ?? spec.focus}.
Forma de abertura obrigatória: ${diversity?.opening ?? "comece com uma cena concreta e específica"}.
Evite invadir estes temas nesta seção: ${diversity?.avoid ?? "temas de outras áreas do relatório"}.
Estrutura obrigatória:
- "reading": 4 a 6 parágrafos, mín. ${spec.readingWords} palavras.
- "opportunities": 1 a 2 parágrafos, mín. ${spec.oppWords} palavras — janelas concretas abrindo agora.
- "tips": ${spec.tips} ações concretas, cada uma iniciada por verbo no imperativo suave.
- "avoid": ${spec.avoid} armadilhas específicas.
${antiRepeatBlock(cumulativeText)}
Responda EXCLUSIVAMENTE com JSON válido, sem markdown:
{ "title": "${spec.title}", "reading": "…", "opportunities": "…", "tips": ["…"], "avoid": ["…"] }`;
    try {
      const area = await callJson<DeepArea>(prompt);
      const normalizedArea: DeepArea = {
        title: area.title || spec.title,
        reading: area.reading || "",
        opportunities: area.opportunities || "",
        tips: Array.isArray(area.tips) ? area.tips : [],
        avoid: Array.isArray(area.avoid) ? area.avoid : [],
      };
      // Auditor de tamanho: se veio abaixo de 85% do alvo, pede expansão
      const targetTotal = spec.readingWords + spec.oppWords;
      const currentTotal = countWords(normalizedArea.reading) + countWords(normalizedArea.opportunities);
      if (currentTotal < Math.floor(targetTotal * 0.85)) {
        try {
          const expandPrompt = `${chartBlock}

Você já escreveu esta versão da seção "${spec.title}" (chave: ${key}) e ela ficou CURTA (${currentTotal} palavras contra alvo de ${targetTotal}).
Reescreva EXPANDINDO em profundidade — sem inventar novos temas, sem repetir frases já escritas, aprofundando exemplos, nuances, contexto emocional e prático.

Versão atual (base para expandir, não copiar frases inteiras):
"""
${normalizedArea.reading}

${normalizedArea.opportunities}
"""

Requisitos:
- "reading": mín. ${spec.readingWords} palavras, 5 a 7 parágrafos densos.
- "opportunities": mín. ${spec.oppWords} palavras.
- "tips": ${spec.tips} ações.
- "avoid": ${spec.avoid} armadilhas.
${antiRepeatBlock(cumulativeText)}
Responda EXCLUSIVAMENTE com JSON válido, sem markdown:
{ "title": "${spec.title}", "reading": "…", "opportunities": "…", "tips": ["…"], "avoid": ["…"] }`;
          const expanded = await callJson<DeepArea>(expandPrompt);
          const expandedTotal = countWords(expanded.reading) + countWords(expanded.opportunities);
          if (expandedTotal > currentTotal) {
            normalizedArea.reading = expanded.reading || normalizedArea.reading;
            normalizedArea.opportunities = expanded.opportunities || normalizedArea.opportunities;
            normalizedArea.tips = Array.isArray(expanded.tips) && expanded.tips.length ? expanded.tips : normalizedArea.tips;
            normalizedArea.avoid = Array.isArray(expanded.avoid) && expanded.avoid.length ? expanded.avoid : normalizedArea.avoid;
          }
        } catch (e) {
          console.warn(`[astro] expansão de ${key} falhou, mantendo versão curta`, e);
        }
      }
      areaResults.push([key, normalizedArea] as const);
      cumulativeText = [cumulativeText, deepAreaToText(normalizedArea)].join("\n\n");
    } catch (e) {
      console.error(`[astro] falha na seção ${key}`, e);
      const fallback = {
        title: spec.title,
        reading: `Interpretação de "${spec.title}" indisponível nesta geração. Gere novamente as previsões para receber a leitura completa.`,
        opportunities: "",
        tips: [],
        avoid: [],
      } as DeepArea;
      areaResults.push([key, fallback] as const);
      cumulativeText = [cumulativeText, deepAreaToText(fallback)].join("\n\n");
    }
  }
  const areas = Object.fromEntries(areaResults) as Record<keyof typeof DEEP_AREA_SPECS, DeepArea>;

  // ---------- LOTE C: previsões temporais + closing em sequência ----------
  const forecastSpecs: Array<{ key: "nextDays" | "week" | "month" | "year" | "closing"; label: string; words: number; brief: string }> = [
    { key: "nextDays", label: "Próximos 5 a 7 dias", words: 650, brief: `Tendências a partir de ${todayStr}. Mencione cada dia com data e nome do dia da semana, o que é aquele dia energeticamente e como aproveitá-lo em linguagem simples para leigos.` },
    { key: "week", label: "Semana atual", words: 650, brief: `Semana de ${week.start} a ${week.end}: emoções, foco, relacionamentos, trabalho, dia a dia.` },
    { key: "month", label: "Mês", words: 750, brief: `Mês de ${monthLabel}: tema central, oportunidades, cuidados, marcos semanais.` },
    { key: "year", label: "Ano", words: 950, brief: `Ano ${yearLabel}: grandes ciclos, áreas de crescimento, decisões importantes, trimestres.` },
    { key: "closing", label: "Fechamento", words: 350, brief: "Síntese viva, benção final aprofundada, parábola breve original e chamado amoroso à ação. 3 parágrafos densos." },
  ];

  // Roda as 5 seções temporais EM PARALELO — sequencial estava estourando o
  // timeout do worker (o Lote B já consome ~60-90s) e devolvia previsões vazias.
  // A diversidade entre elas fica garantida pelos "lenses/openings" de FORECAST_DIVERSITY.
  const baseCumulative = cumulativeText;
  const forecastPromises = forecastSpecs.map(async (spec) => {
    const diversity = FORECAST_DIVERSITY[spec.key];
    const prompt = `${chartBlock}

Gere APENAS a seção "${spec.label}" (chave: ${spec.key}).
${spec.brief}
Ângulo exclusivo desta seção: ${diversity?.lens ?? spec.brief}.
Forma de abertura obrigatória: ${diversity?.opening ?? "comece com uma imagem temporal específica"}.
Mín. ${spec.words} palavras, 4 a 6 parágrafos densos, sem listas, sem markdown.
${antiRepeatBlock(baseCumulative)}
Responda EXCLUSIVAMENTE com JSON válido, sem markdown:
{ "${spec.key}": "texto aqui" }`;
    try {
      const j = await callJson<Record<string, string>>(prompt);
      const text = (j[spec.key] ?? "").toString().trim();
      return [spec.key, text] as const;
    } catch (e) {
      console.error(`[astro] falha na seção ${spec.key}`, e);
      return [spec.key, ""] as const;
    }
  });
  const forecastResults = await Promise.all(forecastPromises);
  for (const [, text] of forecastResults) {
    if (text) cumulativeText = [cumulativeText, text].join("\n\n");
  }
  const forecastMap = Object.fromEntries(forecastResults) as Record<typeof forecastSpecs[number]["key"], string>;


  return auditForecastRepetition({
    synthesis,
    love: areas.love,
    money: areas.money,
    health: areas.health,
    purpose: areas.purpose,
    business: areas.business,
    family: areas.family,
    spirituality: areas.spirituality,
    relationships: areas.relationships,
    shadows: areas.shadows,
    nextDays: forecastMap.nextDays,
    week: forecastMap.week,
    month: forecastMap.month,
    year: forecastMap.year,
    closing: forecastMap.closing,
    generatedAt: new Date().toISOString(),
    antiRepeatVersion: ASTRO_ANTI_REPEAT_VERSION,
  });
}


export const generateAstroForecast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ chartId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: chart } = await supabaseAdmin
      .from("astro_charts")
      .select("*")
      .eq("id", data.chartId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!chart) throw new Error("Mapa não encontrado");

    const action: CreditAction = "astro_forecast";
    const unlimited = await hasUnlimitedAccess(userId, action);
    const cost = unlimited ? 0 : await getCreditCost(action);
    let charged = false;
    if (!unlimited) {
      const ok = await consumeCredits(userId, action, `Previsões mapa ${chart.id}`);
      if (!ok) throw new Error(`Saldo insuficiente. Esta geração custa ${cost} créditos.`);
      charged = cost > 0;
    }

    try {
      const forecast = await buildForecastWithAI({
        planets: chart.planets as any,
        ascendant: chart.ascendant as number | null,
        midheaven: chart.midheaven as number | null,
        aspects: chart.aspects as any,
        summary: chart.summary,
      }, userId);
      await supabaseAdmin
        .from("astro_charts")
        .update({ forecast, forecast_generated_at: forecast.generatedAt })
        .eq("id", chart.id);
      return forecast;
    } catch (err) {
      if (charged) {
        await refundCredits(userId, action, {
          reason: err instanceof Error ? `Falha em previsões: ${err.message}`.slice(0, 200) : "Falha em previsões",
          actorLabel: "system:astro",
          originalReference: `Previsões mapa ${chart.id}`,
        }).catch(() => {});
      }
      await logFnError("generateAstroForecast", err, userId, { chartId: chart.id });
      throw err;
    }
  });

/* ============================================================
 * Exportar PDF completo do Mapa Astral
 * ============================================================ */

export const exportAstroPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      chartId: z.string().uuid(),
      chartImageB64: z.string().min(100).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: chart } = await supabaseAdmin
      .from("astro_charts")
      .select("*")
      .eq("id", data.chartId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!chart) throw new Error("Mapa não encontrado");

    const action: CreditAction = "astro_pdf";
    const unlimited = await hasUnlimitedAccess(userId, action);
    const cost = unlimited ? 0 : await getCreditCost(action);
    let charged = false;
    if (!unlimited) {
      const ok = await consumeCredits(userId, action, `PDF mapa ${chart.id}`);
      if (!ok) throw new Error(`Saldo insuficiente. Este PDF custa ${cost} créditos.`);
      charged = cost > 0;
    }

    try {
      let rawForecast: Partial<AstroForecast> =
        chart.forecast && typeof chart.forecast === "object"
          ? (chart.forecast as Partial<AstroForecast>)
          : {};

      // Gera as previsões AGORA se estiverem faltando/incompletas — o usuário
      // pediu explicitamente que o mapa saia inteiro de uma só vez (semana
      // incluída). Salva no chart para reutilizar em exportações futuras.
      const forecastLooksIncomplete =
        !rawForecast ||
        typeof rawForecast !== "object" ||
        rawForecast.antiRepeatVersion !== ASTRO_ANTI_REPEAT_VERSION ||
        !rawForecast.love ||
        !rawForecast.week ||
        typeof rawForecast.week !== "string" ||
        (rawForecast.week as string).trim().length < 40;
      if (forecastLooksIncomplete) {
        try {
          // Timeout de segurança — se a IA demorar demais, o PDF ainda sai
          // com o fallback (evita "sandbox proxy failed" por timeout do worker).
          const generated = await Promise.race<AstroForecast>([
            buildForecastWithAI({
              planets: chart.planets as any,
              ascendant: chart.ascendant as number | null,
              midheaven: chart.midheaven as number | null,
              aspects: chart.aspects as any,
              summary: chart.summary,
            }, userId),
            new Promise<AstroForecast>((_, rej) =>
              setTimeout(() => rej(new Error("forecast_timeout")), 180_000),
            ),
          ]);
          rawForecast = generated;
          await supabaseAdmin
            .from("astro_charts")
            .update({ forecast: generated, forecast_generated_at: generated.generatedAt })
            .eq("id", chart.id);
        } catch (err) {
          console.error("[exportAstroPdf] auto-forecast failed, using fallback", err);
        }
      }

      // Fallback com dicas VARIADAS por área — evita a repetição visível de
      // "Faça isto/Evite isto" idênticos em todas as seções quando a IA falha.
      const FALLBACK_TIPS_BY_AREA: Record<string, { tips: string[]; avoid: string[] }> = {
        "Amor e Vínculo Afetivo": {
          tips: [
            "Marque um encontro semanal só de escuta, sem celular por perto.",
            "Escreva 3 qualidades da pessoa amada antes de qualquer conversa difícil.",
            "Diga em voz alta o que sente antes que vire cobrança silenciosa.",
            "Reserve um gesto de afeto por dia — um toque, uma frase, um bilhete.",
            "Combine expectativas em vez de esperar que sejam adivinhadas.",
          ],
          avoid: [
            "Guardar mágoa esperando o outro perceber sozinho.",
            "Comparar a sua relação com casais das redes sociais.",
            "Discutir temas sérios cansado, com fome ou sob álcool.",
          ],
        },
        "Dinheiro, Prosperidade e Abundância": {
          tips: [
            "Registre por 15 dias cada entrada e saída, sem julgar, só observando.",
            "Separe 10% de cada receita em uma conta que você não vê no app.",
            "Reveja uma assinatura recorrente e cancele a que menos usa.",
            "Escreva 3 crenças sobre dinheiro que herdou da sua família.",
            "Peça reajuste, aumente uma tarifa ou lance uma oferta pequena esta semana.",
          ],
          avoid: [
            "Comprar por ansiedade ou para preencher vazio emocional.",
            "Fugir dos números e deixar boletos vencerem por medo de olhar.",
            "Ceder desconto sem receber algo em troca.",
          ],
        },
        "Saúde, Corpo e Vitalidade": {
          tips: [
            "Beba um copo de água ao acordar, antes de qualquer tela.",
            "Caminhe 20 minutos ao ar livre pelo menos 4 vezes na semana.",
            "Durma no mesmo horário por 7 dias seguidos e observe o efeito.",
            "Reduza um estimulante (café, açúcar, tela noturna) e sinta o corpo.",
            "Agende UMA consulta preventiva que você vem adiando.",
          ],
          avoid: [
            "Tratar sintomas repetidos com Dr. Google — procure profissional.",
            "Comer em pé, no automático, olhando a tela do trabalho.",
            "Ignorar cansaço crônico como se fosse frescura.",
          ],
        },
        "Propósito de Vida e Missão da Alma": {
          tips: [
            "Liste 5 momentos da sua vida em que perdeu a noção do tempo — ali mora seu dom.",
            "Reserve 30 min por semana para um projeto que não gera dinheiro ainda.",
            "Peça a 3 pessoas: 'em que eu te ajudo sem perceber?' e anote.",
            "Estude por 20 min/dia um tema que te chama há anos.",
            "Diga não a algo que só te dá status e sim a algo que te dá sentido.",
          ],
          avoid: [
            "Esperar clareza total antes de dar o primeiro passo.",
            "Comparar seu tempo de amadurecimento com o dos outros.",
            "Desistir do propósito toda vez que a rotina apertar.",
          ],
        },
        "Negócios, Carreira e Empreendimentos": {
          tips: [
            "Defina UMA meta principal para os próximos 90 dias e recorte em semanas.",
            "Envie uma proposta ou candidatura que está parada há mais de 15 dias.",
            "Faça 3 conexões novas por semana no LinkedIn ou em eventos.",
            "Revise seu preço/hora com base no valor real que entrega.",
            "Reserve uma tarde só para pensar estratégia, sem responder mensagem.",
          ],
          avoid: [
            "Dizer sim a todo projeto por medo de faltar oportunidade.",
            "Trabalhar no operacional 100% do tempo e nunca no estratégico.",
            "Fechar contrato sem escopo, prazo e condições no papel.",
          ],
        },
        "Família, Raízes e Ancestralidade": {
          tips: [
            "Ligue para um familiar que você não fala há mais de 3 meses.",
            "Escreva uma carta (mesmo sem enviar) para pai, mãe ou avós.",
            "Monte a árvore genealógica com nomes e datas até 3 gerações.",
            "Estabeleça UM limite claro com quem vive te chamando para o caos.",
            "Reserve um almoço mensal só para estar com quem é sua base.",
          ],
          avoid: [
            "Repetir com filhos ou irmãos o que doeu em você quando pequeno.",
            "Cortar vínculo sem antes tentar uma conversa honesta.",
            "Aceitar comentários que te diminuem em nome da paz familiar.",
          ],
        },
        "Espiritualidade e Sagrado": {
          tips: [
            "Comece o dia com 5 minutos de silêncio antes do celular.",
            "Escolha UMA prática espiritual por 21 dias e cumpra.",
            "Escreva 3 agradecimentos concretos toda noite.",
            "Visite um lugar sagrado (natureza, templo, cemitério familiar).",
            "Leia 10 páginas por dia de um livro que alimenta sua alma.",
          ],
          avoid: [
            "Colecionar cursos sem praticar nenhum.",
            "Usar espiritualidade para fugir de responsabilidades práticas.",
            "Terceirizar sua verdade para gurus, mapas ou tarólogos.",
          ],
        },
        "Amizades e Círculos Sociais": {
          tips: [
            "Marque um café com um amigo antigo esta semana.",
            "Envie 3 mensagens só para agradecer presença.",
            "Diga não a um convite que te esvazia e sim a um que te nutre.",
            "Entre em UM grupo (curso, esporte, projeto) alinhado ao que você é hoje.",
            "Celebre a conquista de um amigo publicamente.",
          ],
          avoid: [
            "Manter relação por hábito quando ela já não te faz bem.",
            "Ser o(a) terapeuta gratuito de todo mundo e nunca receber escuta.",
            "Falar mal de terceiros para gerar intimidade.",
          ],
        },
        "Sombras e Padrões a Curar": {
          tips: [
            "Anote 3 situações que te tiram do sério — ali está a sombra.",
            "Procure terapia ou uma prática de autoconhecimento por 3 meses.",
            "Faça um ritual simples de fechamento com o que ficou pendente.",
            "Escreva uma carta para a versão criança de você e leia em voz alta.",
            "Escolha UMA reação automática para substituir por uma consciente.",
          ],
          avoid: [
            "Culpar o passado sem fazer nada no presente.",
            "Repetir o mesmo tipo de vínculo esperando outro final.",
            "Usar cansaço como desculpa para não olhar para dentro.",
          ],
        },
      };
      const genericReading =
        `Esta área é interpretada a partir do desenho do seu mapa: ${chart.summary ?? "a combinação entre seus planetas, signos, ascendente e aspectos principais"}. Observe onde sua energia pede presença e escolhas mais conscientes.`;
      const genericOpp =
        "Há oportunidade concreta de agir com mais clareza, alinhar desejo e responsabilidade e sustentar uma mudança real nos próximos 30 dias.";
      const fallbackArea = (title: string): DeepArea => {
        const preset = FALLBACK_TIPS_BY_AREA[title];
        return {
          title,
          reading: genericReading,
          opportunities: genericOpp,
          tips: preset?.tips ?? [
            "Escolha uma ação simples e mensurável para praticar por sete dias.",
            "Registre no fim do dia onde sentiu expansão ou tensão.",
            "Converse com honestidade antes de decisões importantes.",
          ],
          avoid: preset?.avoid ?? [
            "Tomar decisões por ansiedade ou pressa.",
            "Ignorar sinais recorrentes do corpo e das emoções.",
            "Repetir padrões antigos esperando resultados diferentes.",
          ],
        };
      };
      const forecast: AstroForecast = {
        synthesis:
          typeof rawForecast.synthesis === "string" && rawForecast.synthesis.trim()
            ? rawForecast.synthesis
            : chart.summary ?? "Síntese não disponível nesta versão da previsão.",
        love: rawForecast.love ?? fallbackArea("Amor e Vínculo Afetivo"),
        money: rawForecast.money ?? fallbackArea("Dinheiro, Prosperidade e Abundância"),
        health: rawForecast.health ?? fallbackArea("Saúde, Corpo e Vitalidade"),
        purpose: rawForecast.purpose ?? fallbackArea("Propósito de Vida e Missão da Alma"),
        business: rawForecast.business ?? fallbackArea("Negócios, Carreira e Empreendimentos"),
        family: rawForecast.family ?? fallbackArea("Família, Raízes e Ancestralidade"),
        spirituality: rawForecast.spirituality ?? fallbackArea("Espiritualidade e Sagrado"),
        relationships: rawForecast.relationships ?? fallbackArea("Amizades e Círculos Sociais"),
        shadows: rawForecast.shadows ?? fallbackArea("Sombras e Padrões a Curar"),
        nextDays: coerceForecastText(rawForecast.nextDays, "próximos dias"),
        week: coerceForecastText(rawForecast.week, "semana"),
        month: coerceForecastText(rawForecast.month, "mês"),
        year: coerceForecastText(rawForecast.year, "ano"),
        closing:
          rawForecast.closing ?? "Que este mapa ilumine seus próximos passos.",
        generatedAt: rawForecast.generatedAt ?? new Date().toISOString(),
        antiRepeatVersion: rawForecast.antiRepeatVersion ?? undefined,
      };





      const planets = (chart.planets ?? []) as { name: string; sign: string; degree: number }[];
      const aspects = (chart.aspects ?? []) as { a: string; b: string; aspect: string; orb: number }[];
      const ascSign = chart.ascendant != null ? SIGNS[Math.floor((chart.ascendant as number) / 30)] : "—";
      const mcSign = chart.midheaven != null ? SIGNS[Math.floor((chart.midheaven as number) / 30)] : "—";

      const blocks: SimplePdfBlock[] = [];

      // Resumo do seu céu
      blocks.push({ type: "h2", text: "Resumo do seu céu" });
      const sun = planets.find((p) => p.name === "Sol");
      const moon = planets.find((p) => p.name === "Lua");
      blocks.push({
        type: "p",
        text:
          `${sun ? `Você brilha como ${sun.sign}` : ""}` +
          `${moon ? `, sente o mundo como ${moon.sign}` : ""}` +
          ` e se apresenta com a aura de ${ascSign}. Meio do Céu em ${mcSign}.\n\n` +
          (chart.summary ?? ""),
      });
      blocks.push({
        type: "kv",
        rows: [
          { k: "Ascendente", v: ascSign },
          { k: "Meio do Céu", v: mcSign },
          { k: "Total de aspectos", v: String(aspects.length) },
        ],
      });

      // Mapa visual
      if (data.chartImageB64) {
        blocks.push({ type: "h2", text: "Mapa Astral" });
        blocks.push({ type: "image", pngB64: data.chartImageB64, caption: "Roda zodiacal com posições planetárias e aspectos", maxHeight: 420 });
      }

      // Síntese — trio principal
      blocks.push({ type: "h2", text: "Síntese — Sol, Lua e Ascendente" });
      for (const t of [
        sun && { label: "Sol", sign: sun.sign, role: "Sua essência e propósito" },
        moon && { label: "Lua", sign: moon.sign, role: "Suas emoções e necessidades" },
        { label: "Ascendente", sign: ascSign, role: "Como o mundo te vê" },
      ].filter(Boolean) as { label: string; sign: string; role: string }[]) {
        const g = SIGN_GUIDANCE[t.sign];
        blocks.push({ type: "h3", text: `${t.label} em ${t.sign} — ${t.role}` });
        if (g) {
          blocks.push({
            type: "kv",
            rows: [
              { k: "O que esperar", v: g.expect },
              { k: "Faça agora", v: g.doNow },
              { k: "Evite", v: g.avoid },
              { k: "Sua força", v: g.strength },
            ],
          });
        }
      }

      // Planetas — leitura humanizada por planeta + signo
      blocks.push({ type: "page-break" });
      blocks.push({ type: "h2", text: "Cada planeta no seu mapa", pageBreak: false });
      for (const p of planets) {
        const m = PLANET_MEANING[p.name];
        const reading = planetSignReading(p.name, p.sign, p.degree);
        blocks.push({ type: "h3", text: `${m?.title ?? p.name} em ${p.sign} ${p.degree.toFixed(1)}°` });
        blocks.push({
          type: "p",
          text:
            `${reading.what}\n\n` +
            `${reading.events}\n\n` +
            `${reading.tip}\n\n` +
            `${reading.warn}`,
        });
      }

      // Aspectos principais — leitura contextual planeta + planeta + tipo
      if (aspects.length) {
        blocks.push({ type: "page-break" });
        blocks.push({ type: "h2", text: "Aspectos principais e o que significam", pageBreak: false });
        for (const a of aspects.slice(0, 16)) {
          const r = aspectReading(a);
          blocks.push({ type: "h3", text: `${a.a} ${a.aspect} ${a.b} · orbe ${a.orb}°` });
          blocks.push({
            type: "p",
            text: `${r.narrative}\n\n${r.tip}\n\n${r.warn}`,
          });
        }
      }

      // ============================================================
      // SÍNTESE DE ABERTURA (leitura profunda)
      // ============================================================
      blocks.push({ type: "page-break" });
      blocks.push({ type: "h2", text: "Síntese profunda do seu mapa", pageBreak: false });
      blocks.push({ type: "p", text: forecast.synthesis });


      // ============================================================
      // INTERPRETAÇÃO POR ÁREA DA VIDA
      // ============================================================
      const deepAreas: Array<[string, typeof forecast.love]> = [
        ["Amor", forecast.love],
        ["Dinheiro", forecast.money],
        ["Saúde", forecast.health],
        ["Propósito", forecast.purpose],
        ["Negócios", forecast.business],
        ["Família", forecast.family],
        ["Espiritualidade", forecast.spirituality],
        ["Amizades", forecast.relationships],
        ["Sombras", forecast.shadows],
      ];
      for (const [, area] of deepAreas) {
        if (!area) continue;
        blocks.push({ type: "page-break" });
        blocks.push({ type: "h2", text: area.title, pageBreak: false });
        blocks.push({ type: "p", text: area.reading });
        blocks.push({ type: "h3", text: "Oportunidades que o seu mapa está abrindo" });
        blocks.push({ type: "p", text: area.opportunities });
        if (area.tips?.length) {
          blocks.push({ type: "h3", text: "Faça isto" });
          blocks.push({ type: "kv", rows: area.tips.map((t, i) => ({ k: `${i + 1}.`, v: t })) });
        }
        if (area.avoid?.length) {
          blocks.push({ type: "h3", text: "Evite isto" });
          blocks.push({ type: "kv", rows: area.avoid.map((t, i) => ({ k: `${i + 1}.`, v: t })) });
        }
      }

      // ============================================================
      // PREVISÕES TEMPORAIS
      // ============================================================
      const week = formatWeekRange();
      const monthLabel = formatMonthLabel();
      const yearLabel = formatYearLabel();
      const horoscope = await buildHoroscopeReading({
        sunSign: sun?.sign,
        moonSign: moon?.sign,
        ascSign,
        weekRange: { start: week.start, end: week.end },
        monthLabel,
        userId,
      });
      blocks.push({ type: "page-break" });
      blocks.push({ type: "h2", text: "Leitura horoscópica", pageBreak: false });
      blocks.push({ type: "h3", text: `Semana de ${week.start} a ${week.end}` });
      blocks.push({ type: "p", text: horoscope });

      blocks.push({ type: "page-break" });
      blocks.push({ type: "h2", text: "Previsões para os próximos dias", pageBreak: false });
      blocks.push({ type: "p", text: forecast.nextDays });
      blocks.push({ type: "page-break" });
      blocks.push({ type: "h2", text: "Previsões para a semana", pageBreak: false });
      blocks.push({ type: "h3", text: `${week.start} a ${week.end}` });
      blocks.push({ type: "p", text: forecast.week });
      blocks.push({ type: "page-break" });
      blocks.push({ type: "h2", text: "Previsões para o mês", pageBreak: false });
      blocks.push({ type: "h3", text: monthLabel });
      blocks.push({ type: "p", text: forecast.month });
      blocks.push({ type: "page-break" });
      blocks.push({ type: "h2", text: "Previsões para o ano", pageBreak: false });
      blocks.push({ type: "h3", text: yearLabel });
      blocks.push({ type: "p", text: forecast.year });

      // ============================================================
      // CALENDÁRIO ENERGÉTICO — 30 dias (fase da Lua + número pessoal)
      // ============================================================
      let birthISO: string | null = null;
      if (chart.birth_data_id) {
        const { data: bd } = await supabaseAdmin
          .from("birth_data")
          .select("birth_date")
          .eq("id", chart.birth_data_id)
          .maybeSingle();
        birthISO = (bd?.birth_date as string | null) ?? null;
      }

      blocks.push({ type: "page-break" });
      blocks.push({ type: "h2", text: "Calendário energético dos próximos 30 dias", pageBreak: false });
      blocks.push({
        type: "p",
        text:
          "Este calendário é sua bússola diária para os próximos 30 dias. Cada linha combina a fase da Lua — o clima emocional coletivo que todos sentem — com o seu número pessoal, que é a vibração numerológica específica daquele dia para você. Você não precisa entender astrologia ou numerologia para usá-lo: basta ler o dia de hoje pela manhã e escolher UMA atitude alinhada com a energia do momento.",
      });
      blocks.push({
        type: "p",
        text:
          "Como aproveitar cada orientação: nos dias de Lua Nova e número 1, plante intenções, comece projetos e tome iniciativas — o céu abre porta. Na Lua Crescente e nos números 2, 3 e 6, cultive parcerias, apresente ideias, converse com quem precisa e mostre o que criou. Na Lua Cheia e nos números 5 e 9, colha resultados, feche ciclos, celebre e libere o que já se cumpriu. Na Lua Minguante e nos números 4, 7 e 8, recolha-se, organize, revise contratos, cuide do corpo e reveja estratégias sem tomar decisões precipitadas.",
      });
      blocks.push({
        type: "p",
        text:
          "Dica prática: antes de agendar reuniões importantes, envios de proposta, mudanças, conversas difíceis ou tratamentos de saúde, consulte a linha do dia. Se a energia for de expansão, avance com confiança; se for de recolhimento, adie 24–48 horas quando possível — a diferença de resultado costuma ser real. Marque no seu calendário pessoal os dias mais poderosos do ciclo (Lua Nova, Lua Cheia e números que se repetem para você) e reserve neles as decisões-chave. Aos poucos você vai perceber que fluir com a energia disponível é muito mais leve do que forçar contra ela.",
      });
      const moonRows: { k: string; v: string }[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const angle = Astro.MoonPhase(d);
        let moonLabel = "Lua Nova · intenção";
        if (angle < 45) moonLabel = "Lua Nova · intenção";
        else if (angle < 90) moonLabel = "Crescente · plantar";
        else if (angle < 135) moonLabel = "Quarto Crescente · ação";
        else if (angle < 180) moonLabel = "Gibosa Crescente · ajuste";
        else if (angle < 225) moonLabel = "Lua Cheia · colheita";
        else if (angle < 270) moonLabel = "Gibosa Minguante · gratidão";
        else if (angle < 315) moonLabel = "Quarto Minguante · liberar";
        else moonLabel = "Minguante · descanso";

        const iso = d.toISOString().slice(0, 10);
        const pd = birthISO ? personalDayNumber(iso, birthISO) : null;
        const pdLabel = pd != null ? `nº ${pd} · ${personalDayVibe(pd)}` : "número pessoal indisponível";
        const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", weekday: "short" });
        moonRows.push({ k: dateStr, v: `${moonLabel} · ${pdLabel}` });
      }
      blocks.push({ type: "kv", rows: moonRows });

      // ============================================================
      // FECHAMENTO — bênção final ampliada
      // ============================================================
      blocks.push({ type: "page-break" });
      blocks.push({ type: "h2", text: "Bênção final", pageBreak: false });
      blocks.push({ type: "p", text: forecast.closing });
      blocks.push({
        type: "p",
        text:
          "Que este mapa não fique apenas em palavras. Que ele vire hábito, escolha e coragem no seu dia a dia. Você não precisa mudar tudo de uma vez — basta dar UM passo alinhado com o que leu aqui e o universo se organiza para te sustentar. Cada trânsito passa, cada fase da Lua se renova, e você tem, dentro de si, tudo o que precisa para atravessar os próximos ciclos com mais clareza, presença e alegria.",
      });
      blocks.push({
        type: "quote",
        text:
          "Você é semente e jardineiro do próprio destino. O céu apenas mostra o solo — o que planta e o que floresce é decisão sua, feita todos os dias, com amor e verdade.",
      });

      // ============================================================
      // CROSS-PROMOÇÃO — rotaciona outro serviço nosso
      // ============================================================
      const promo = await pickCrossPromotionForReport("astro_map");
      if (promo) {
        blocks.push({ type: "page-break" });
        blocks.push({ type: "h2", text: "Continue sua jornada com o Código Cósmico", pageBreak: false });
        if (promo.title) blocks.push({ type: "h3", text: promo.title });
        blocks.push({ type: "p", text: promo.body });
      }




      // Branding opcional
      const { data: brandRow } = await supabaseAdmin
        .from("pdf_branding")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      const branding = isBrandingEnabledFor(brandRow, "astrology")
        ? await resolveBrandingPayload(brandRow)
        : undefined;

      const pdfBytes = await buildSimplePdf({
        brand: "Código Cósmico",
        eyebrow: "Astrologia · Mapa Natal",
        title: "Seu Mapa Astral",
        subtitle: chart.summary ?? "Relatório completo do seu céu",
        meta: [`Gerado em ${new Date().toLocaleString("pt-BR")}`],
        blocks,
        accentHex: "#d4af37",
        flowing: true,
        branding,
      });

      const path = `${userId}/astro-${chart.id}.pdf`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("reports")
        .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
      if (upErr) throw new Error(upErr.message);

      await supabaseAdmin
        .from("astro_charts")
        .update({ storage_path: path })
        .eq("id", chart.id);

      const base64 = Buffer.from(pdfBytes).toString("base64");
      return { pdfBase64: base64 };
    } catch (err) {
      if (charged) {
        await refundCredits(userId, action, {
          reason: err instanceof Error ? `Falha no PDF do mapa: ${err.message}`.slice(0, 200) : "Falha no PDF do mapa",
          actorLabel: "system:astro",
          originalReference: `PDF mapa ${chart.id}`,
        }).catch(() => {});
      }
      await logFnError("exportAstroPdf", err, userId, { chartId: chart.id });
      throw err;
    }
  });

/* ============================================================
 * Apagar previsões salvas
 * ============================================================ */
export const deleteAstroForecast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ chartId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("astro_charts")
      .update({ forecast: null, forecast_generated_at: null })
      .eq("id", data.chartId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ============================================================
 * PDF apenas com as previsões (sem custo extra — já foram pagas)
 * ============================================================ */
export const downloadAstroForecastPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ chartId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: chart } = await supabaseAdmin
      .from("astro_charts")
      .select("*")
      .eq("id", data.chartId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!chart) throw new Error("Mapa não encontrado");
    const forecast = chart.forecast as AstroForecast | null;
    if (!forecast) throw new Error("Nenhuma previsão salva para este mapa.");

    const blocks: SimplePdfBlock[] = [];
    const week = formatWeekRange();
    const monthLabel = formatMonthLabel();
    const yearLabel = formatYearLabel();

    // Trio Sol/Lua/Asc para a leitura horoscópica
    const planets = (chart.planets ?? []) as { name: string; sign: string; degree: number }[];
    const sun = planets.find((p) => p.name === "Sol");
    const moon = planets.find((p) => p.name === "Lua");
    const ascSign = chart.ascendant != null ? SIGNS[Math.floor((chart.ascendant as number) / 30)] : undefined;
    const horoscope = await buildHoroscopeReading({
      sunSign: sun?.sign,
      moonSign: moon?.sign,
      ascSign,
      weekRange: { start: week.start, end: week.end },
      monthLabel,
      userId,
    });
    blocks.push({ type: "h2", text: "Leitura horoscópica" });
    blocks.push({ type: "h3", text: `Semana de ${week.start} a ${week.end}` });
    blocks.push({ type: "p", text: horoscope });

    blocks.push({ type: "h2", text: "Previsões para os próximos dias" });
    blocks.push({ type: "p", text: forecast.nextDays });
    blocks.push({ type: "h2", text: "Previsões para a semana" });
    blocks.push({ type: "h3", text: `${week.start} a ${week.end}` });
    blocks.push({ type: "p", text: forecast.week });
    blocks.push({ type: "h2", text: "Previsões para o mês" });
    blocks.push({ type: "h3", text: monthLabel });
    blocks.push({ type: "p", text: forecast.month });
    blocks.push({ type: "h2", text: "Previsões para o ano" });
    blocks.push({ type: "h3", text: yearLabel });
    blocks.push({ type: "p", text: forecast.year });

    const { data: brandRow } = await supabaseAdmin
      .from("pdf_branding")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const branding = isBrandingEnabledFor(brandRow, "astrology")
      ? await resolveBrandingPayload(brandRow)
      : undefined;

    const pdfBytes = await buildSimplePdf({
      brand: "Código Cósmico",
      eyebrow: "Astrologia · Previsões",
      title: "Suas previsões astrais",
      subtitle: chart.summary ?? "Tendências para os próximos dias, semana, mês e ano",
      meta: [`Geradas em ${new Date(forecast.generatedAt).toLocaleString("pt-BR")}`],
      blocks,
      accentHex: "#d4af37",
      flowing: false,
      branding,
    });

    const base64 = Buffer.from(pdfBytes).toString("base64");
    return { pdfBase64: base64 };
  });
