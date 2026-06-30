import { computeNumerology, NUMBER_MEANINGS, formatBirthDateBR, numLabel, numTitle } from "@/lib/numerology";
import type { SimplePdfBlock } from "@/lib/simple-pdf";

type Profile = {
  strengths: string[];
  shadows: string[];
  practices: string[];
  arena: { love: string; career: string; spiritual: string };
};

const NUMBER_PROFILE: Record<number, Profile> = {
  1: {
    strengths: ["Iniciativa e coragem para abrir caminhos", "Foco, autonomia e originalidade", "Capacidade de liderança natural"],
    shadows: ["Tendência ao isolamento e impaciência", "Autoritarismo e dificuldade de delegar", "Orgulho que afasta colaboração"],
    practices: ["Defina uma meta semanal e revise resultados toda sexta-feira", "Pratique escuta ativa antes de propor soluções", "Comece o dia com 10 minutos de respiração consciente"],
    arena: { love: "Busca parceiros que respeitem sua independência sem competir por espaço.", career: "Brilha como fundador, empreendedor, líder de projeto ou criador de produtos.", spiritual: "Caminho de autoafirmação: aprender a liderar sem dominar." },
  },
  2: {
    strengths: ["Sensibilidade refinada e empatia", "Talento para mediação e parcerias", "Intuição apurada em ambientes coletivos"],
    shadows: ["Hipersensibilidade e dependência emocional", "Dificuldade de decidir e impor limites", "Tendência a se anular pelo outro"],
    practices: ["Reserve um momento diário só seu, sem demandas alheias", "Pratique dizer 'não' uma vez por semana sem culpa", "Use journaling para separar suas emoções das alheias"],
    arena: { love: "Floresce em vínculos profundos, recíprocos e de cuidado mútuo.", career: "Excelente em diplomacia, terapias, mediação, design colaborativo e gestão de pessoas.", spiritual: "Caminho do equilíbrio: integrar polaridades sem se perder no outro." },
  },
  3: {
    strengths: ["Expressão criativa, comunicação magnética", "Otimismo e leveza contagiantes", "Senso estético e artístico"],
    shadows: ["Dispersão, superficialidade e procrastinação", "Crítica destrutiva (consigo e com os outros)", "Fuga emocional por humor ou drama"],
    practices: ["Termine um projeto criativo por mês, do começo ao fim", "Pratique escrita livre 15 minutos por dia", "Filtre redes sociais para alimentar inspiração, não comparação"],
    arena: { love: "Conquista pela palavra e brilho social; precisa de presença real para sustentar.", career: "Comunicação, artes, ensino, marketing, conteúdo, performance e curadoria.", spiritual: "Caminho da expressão: tornar a alegria um ato de presença, não de fuga." },
  },
  4: {
    strengths: ["Disciplina, método e confiabilidade", "Capacidade de construir bases sólidas", "Lealdade e ética de trabalho"],
    shadows: ["Rigidez, teimosia e medo de mudança", "Excesso de controle e perfeccionismo", "Dificuldade de relaxar e fluir"],
    practices: ["Inclua uma atividade lúdica não-produtiva por semana", "Revise sua rotina a cada 90 dias com olhar de aprendiz", "Pratique respiração 4-7-8 antes de decisões importantes"],
    arena: { love: "Constrói amor sólido com presença, palavra dada e cuidado prático.", career: "Engenharia, gestão, finanças, arquitetura, operações e qualquer área que peça método.", spiritual: "Caminho da maturidade: transformar limites em estrutura sagrada." },
  },
  5: {
    strengths: ["Adaptabilidade, curiosidade e magnetismo", "Coragem para mudanças e novos territórios", "Comunicação versátil e mente rápida"],
    shadows: ["Instabilidade, dispersão e excesso de estímulos", "Vícios sensoriais e fuga do compromisso", "Impulsividade que sabota planos longos"],
    practices: ["Defina um único projeto-âncora por trimestre", "Pratique meditação ou caminhada solo 3x por semana", "Limite consumo de notícias e redes a horários fixos"],
    arena: { love: "Floresce com parceiros que oferecem segurança sem aprisionar.", career: "Vendas, viagens, jornalismo, comércio internacional, eventos e mídia.", spiritual: "Caminho da liberdade verdadeira: escolher com presença em vez de fugir." },
  },
  6: {
    strengths: ["Coração devotado ao cuidado e à harmonia", "Senso de responsabilidade e justiça", "Talento estético, afetivo e familiar"],
    shadows: ["Tendência a controlar pelo cuidado", "Sacrifício excessivo e martírio", "Carregar fardos que não são seus"],
    practices: ["Pergunte antes de cuidar: a pessoa pediu ajuda?", "Reserve um ritual de prazer só para você semanalmente", "Faça terapia familiar ou constelação se houver feridas antigas"],
    arena: { love: "Construtor de lares e vínculos profundos; cuidado com codependência.", career: "Saúde, educação, decoração, gastronomia, aconselhamento e negócios familiares.", spiritual: "Caminho do amor maduro: servir sem se anular." },
  },
  7: {
    strengths: ["Profundidade intelectual e espiritual", "Intuição refinada e mente analítica", "Capacidade de pesquisa, estudo e introspecção"],
    shadows: ["Isolamento, frieza emocional e ceticismo", "Dificuldade em confiar e se entregar", "Tendência à melancolia e ruminação"],
    practices: ["Reserve tempo diário para silêncio, leitura ou meditação", "Compartilhe descobertas com um círculo confiável", "Pratique terapia corporal para sair do excesso mental"],
    arena: { love: "Precisa de parceiros que respeitem solitude e conversem com profundidade.", career: "Ciência, pesquisa, filosofia, espiritualidade, terapia, tecnologia e investigação.", spiritual: "Caminho do conhecimento: integrar mente e mistério." },
  },
  8: {
    strengths: ["Poder de realização material e organização", "Senso de justiça, autoridade e estratégia", "Talento para gestão, negócios e finanças"],
    shadows: ["Workaholismo e materialismo", "Autoritarismo e dificuldade de vulnerabilidade", "Crises financeiras cíclicas quando há desalinhamento ético"],
    practices: ["Reveja seu orçamento e propósito do dinheiro mensalmente", "Inclua atividades de prazer não-produtivas na agenda", "Estude liderança consciente e ética corporativa"],
    arena: { love: "Atrai parcerias maduras; cuidado com transformar afeto em transação.", career: "Direito, finanças, alta gestão, empreendedorismo, política e poder institucional.", spiritual: "Caminho da abundância integrada: usar poder a serviço do bem maior." },
  },
  9: {
    strengths: ["Compaixão universal e visão ampla", "Talento artístico e humanitário", "Capacidade de inspirar e curar"],
    shadows: ["Dificuldade de soltar o passado e perdoar", "Mártir, salvador ou vítima de causas alheias", "Confusão entre desapego e fuga"],
    practices: ["Faça um ritual mensal de finalização e gratidão", "Engaje em causa social com limites claros de energia", "Trabalhe linhagem ancestral com terapia ou constelação"],
    arena: { love: "Ama profundamente; precisa aprender a receber tanto quanto oferece.", career: "Arte, ONGs, ensino, espiritualidade, saúde integrativa e justiça social.", spiritual: "Caminho da entrega: finalizar ciclos para abrir o novo." },
  },
  11: {
    strengths: ["Intuição elevada, visão inspirada", "Magnetismo espiritual e capacidade de canal", "Idealismo a serviço da coletividade"],
    shadows: ["Hipersensibilidade nervosa e ansiedade", "Idealização que afasta da realidade", "Procrastinação por medo da missão"],
    practices: ["Pratique aterramento (caminhada descalço, alimentação densa)", "Tenha mentor ou terapeuta espiritual de confiança", "Materialize a inspiração com pequenos passos concretos"],
    arena: { love: "Vínculos com forte simbologia espiritual; cuidado com idealização.", career: "Ensino, arte, espiritualidade, cura, mentoria e propósito coletivo.", spiritual: "Caminho do iluminado: descer a visão ao chão da vida." },
  },
  22: {
    strengths: ["Capacidade rara de manifestar visões grandiosas", "Combina visão espiritual com pragmatismo", "Liderança construtora de legados"],
    shadows: ["Peso da missão e auto-cobrança extrema", "Medo de assumir o tamanho do próprio poder", "Tendência ao colapso por sobrecarga"],
    practices: ["Construa equipe sólida; o 22 não realiza sozinho", "Cuide do corpo como templo (sono, alimentação, descanso)", "Tenha plano de longo prazo (10+ anos) e revise anualmente"],
    arena: { love: "Precisa de parcerias que sustentem missão e ofereçam refúgio.", career: "Grandes projetos, infraestrutura, fundações, instituições e legados.", spiritual: "Caminho do mestre construtor: tornar o invisível tangível." },
  },
  33: {
    strengths: ["Amor incondicional e capacidade de cura", "Serviço à humanidade como vocação central", "Sabedoria afetiva e espiritual"],
    shadows: ["Risco de salvar todo mundo e adoecer", "Negar a própria sombra em nome do bem", "Sobrecarga emocional crônica"],
    practices: ["Terapia de longo prazo é essencial", "Aprenda a receber cuidado, não só ofertar", "Tenha rituais de limpeza e descanso semanais"],
    arena: { love: "Amor que cura, mas precisa de reciprocidade real para sustentar.", career: "Cura, ensino superior, liderança espiritual, arte transformadora e serviço.", spiritual: "Caminho do mestre curador: amar sem se perder." },
  },
};

const POSITION_LABEL: Record<string, { label: string; intro: string }> = {
  life_path: {
    label: "Caminho de Vida",
    intro: "É o número mais importante do seu mapa numerológico. Indica a missão, as lições centrais e o ritmo que sua alma escolheu para esta encarnação.",
  },
  destiny: {
    label: "Destino / Expressão",
    intro: "Calculado a partir do seu nome completo de batismo. Revela o que você veio expressar no mundo, seus talentos naturais e a forma como o universo te reconhece.",
  },
  soul_urge: {
    label: "Motivação da Alma",
    intro: "Vem das vogais do seu nome. Mostra o que move você por dentro: seus desejos profundos, aquilo que dá sentido à sua vida íntima.",
  },
  personality: {
    label: "Personalidade Externa",
    intro: "Vem das consoantes do seu nome. Descreve a primeira impressão que você causa, sua máscara social e como o mundo te enxerga antes de te conhecer.",
  },
  birthday: {
    label: "Número do Dia",
    intro: "Calculado a partir do dia em que você nasceu. Aponta um talento específico, um dom natural que você traz desde a infância.",
  },
};

function detail(n: number | null | undefined): Profile | null {
  if (typeof n !== "number" || n <= 0) return null;
  return NUMBER_PROFILE[n] ?? null;
}

export function buildPersonalityNumerologyBlocks(
  fullName: string,
  birthDate: string,
): { blocks: SimplePdfBlock[]; headline: string } {
  const num = computeNumerology(fullName, birthDate);
  const firstName = (fullName || "").trim().split(/\s+/)[0] || "Você";
  const blocks: SimplePdfBlock[] = [];

  blocks.push({ type: "h2", text: "Apresentação" });
  blocks.push({
    type: "p",
    text:
      `${firstName}, este é o seu Mapa de Personalidade Numerológico, calculado a partir do seu nome completo (${fullName}) e da sua data de nascimento (${formatBirthDateBR(birthDate)}). ` +
      `A numerologia é uma linguagem simbólica antiga que traduz o som do seu nome e a vibração do seu nascimento em arquétipos. Cada número revela uma camada específica de quem você é, como age, o que deseja e a missão que sua alma escolheu para esta encarnação.`,
  });
  blocks.push({
    type: "p",
    text:
      "Leia este relatório com calma. Marque o que ressoa, anote o que provoca incômodo (porque ali costuma estar a chave do crescimento) e volte às seções práticas sempre que precisar de direção concreta.",
  });

  // Resumo numerológico
  blocks.push({ type: "h2", text: "Seu mapa em uma página" });
  blocks.push({
    type: "kv",
    rows: [
      { k: "Caminho de Vida", v: `${numLabel(num.life_path)} — ${numTitle(num.life_path)}` },
      { k: "Destino / Expressão", v: `${numLabel(num.destiny)} — ${numTitle(num.destiny)}` },
      { k: "Motivação da Alma", v: `${numLabel(num.soul_urge)} — ${numTitle(num.soul_urge)}` },
      { k: "Personalidade Externa", v: `${numLabel(num.personality)} — ${numTitle(num.personality)}` },
      { k: "Número do Dia", v: `${numLabel(num.birthday)} — ${numTitle(num.birthday)}` },
    ],
  });

  // Cada posição como capítulo
  const positions: Array<keyof typeof POSITION_LABEL> = [
    "life_path",
    "destiny",
    "soul_urge",
    "personality",
    "birthday",
  ];
  for (const key of positions) {
    const value = (num as any)[key] as number | null;
    const label = POSITION_LABEL[key];
    const meaning = typeof value === "number" ? NUMBER_MEANINGS[value] : undefined;
    const prof = detail(value);

    blocks.push({ type: "h2", text: `${label.label} — ${numLabel(value)} (${numTitle(value)})` });
    blocks.push({ type: "p", text: label.intro });

    if (meaning) {
      blocks.push({ type: "quote", text: `${meaning.title}: ${meaning.essence}` });
    }
    if (prof) {
      blocks.push({ type: "h3", text: "Forças naturais" });
      blocks.push({ type: "list", items: prof.strengths });

      blocks.push({ type: "h3", text: "Sombras a integrar" });
      blocks.push({ type: "list", items: prof.shadows });

      blocks.push({ type: "h3", text: "Práticas recomendadas" });
      blocks.push({ type: "list", items: prof.practices });

      blocks.push({ type: "h3", text: "Como esse número aparece nas áreas da vida" });
      blocks.push({
        type: "kv",
        rows: [
          { k: "Amor", v: prof.arena.love },
          { k: "Carreira", v: prof.arena.career },
          { k: "Espiritualidade", v: prof.arena.spiritual },
        ],
      });
    } else {
      blocks.push({
        type: "p",
        text: "Não foi possível calcular este número com os dados fornecidos. Verifique se o nome completo de batismo foi informado corretamente.",
      });
    }
  }

  // Síntese final
  blocks.push({ type: "h2", text: "Síntese: o eixo da sua personalidade" });
  const lp = detail(num.life_path);
  const sl = detail(num.soul_urge);
  const ps = detail(num.personality);
  const lines: string[] = [];
  if (lp) lines.push(`Seu Caminho de Vida ${numLabel(num.life_path)} pede que você desenvolva ${lp.strengths[0]?.toLowerCase() ?? "seus dons naturais"}.`);
  if (sl) lines.push(`Sua alma deseja viver ${sl.arena.spiritual.toLowerCase()}`);
  if (ps) lines.push(`O mundo te enxerga, à primeira vista, como alguém com ${ps.strengths[0]?.toLowerCase() ?? "presença marcante"}.`);
  lines.push(
    `A grande tarefa é alinhar o que você mostra (${numTitle(num.personality)}), o que sente por dentro (${numTitle(num.soul_urge)}) e o caminho que veio percorrer (${numTitle(num.life_path)}). Quando essas três vozes se reconhecem, ${firstName} vive de forma coerente, magnética e profundamente realizada.`,
  );
  for (const l of lines) blocks.push({ type: "p", text: l });

  // Plano de 7 passos
  blocks.push({ type: "h2", text: "Plano prático de 7 passos" });
  const allPractices = [
    ...(lp?.practices ?? []),
    ...(sl?.practices ?? []),
    ...(ps?.practices ?? []),
  ];
  const sevenSteps: string[] = [];
  for (let i = 0; i < 7; i++) {
    const pick = allPractices[i % Math.max(1, allPractices.length)] ?? "Reserve 10 minutos diários para autoconhecimento.";
    sevenSteps.push(`Dia ${i + 1}: ${pick}`);
  }
  blocks.push({ type: "list", items: sevenSteps });

  blocks.push({ type: "h2", text: "Palavra final" });
  blocks.push({
    type: "p",
    text:
      `${firstName}, este mapa não é um destino fixo, é um espelho. Os números mostram o tom da sua música, mas você é quem rege a orquestra. ` +
      `Volte a este relatório nos próximos meses e observe quais trechos passam a fazer mais sentido — a numerologia se revela em camadas, conforme a vida nos amadurece.`,
  });

  const headline =
    `Caminho ${numLabel(num.life_path)} · Destino ${numLabel(num.destiny)} · Alma ${numLabel(num.soul_urge)} · Personalidade ${numLabel(num.personality)}`;
  return { blocks, headline };
}
