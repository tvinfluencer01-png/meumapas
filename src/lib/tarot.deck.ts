/**
 * Catálogo dos 22 Arcanos Maiores do Tarot com palavras-chave (PT-BR).
 * Apenas Arcanos Maiores — versão "completa" no sentido espiritual sem ruído
 * dos Menores. Cada carta tem upright + reversed para enriquecer a leitura IA.
 */
export type TarotCard = {
  id: number;
  name: string;
  upright: string[];
  reversed: string[];
};

export const TAROT_MAJORS: TarotCard[] = [
  { id: 0,  name: "O Louco",         upright: ["início", "fé", "liberdade", "espontaneidade"], reversed: ["impulsividade", "imprudência", "medo do novo"] },
  { id: 1,  name: "O Mago",          upright: ["manifestação", "vontade", "habilidade", "criação"], reversed: ["manipulação", "ilusão", "talentos não usados"] },
  { id: 2,  name: "A Sacerdotisa",   upright: ["intuição", "mistério", "sabedoria interior"], reversed: ["segredos guardados", "desconexão da intuição"] },
  { id: 3,  name: "A Imperatriz",    upright: ["abundância", "fertilidade", "cuidado", "terra"], reversed: ["bloqueio criativo", "excesso de controle materno"] },
  { id: 4,  name: "O Imperador",     upright: ["estrutura", "autoridade", "ordem", "disciplina"], reversed: ["rigidez", "controle excessivo", "tirania"] },
  { id: 5,  name: "O Hierofante",    upright: ["tradição", "ensinamento", "espiritualidade institucional"], reversed: ["dogma", "rebeldia consciente", "busca por caminho próprio"] },
  { id: 6,  name: "Os Enamorados",   upright: ["escolha", "união", "amor verdadeiro", "valores"], reversed: ["desalinhamento", "escolha adiada", "tentação"] },
  { id: 7,  name: "O Carro",         upright: ["determinação", "vitória", "foco", "movimento"], reversed: ["dispersão", "falta de direção", "rendição forçada"] },
  { id: 8,  name: "A Força",         upright: ["coragem", "domínio interior", "compaixão"], reversed: ["insegurança", "raiva mal direcionada"] },
  { id: 9,  name: "O Eremita",       upright: ["introspecção", "busca interior", "guia"], reversed: ["isolamento", "fuga do mundo"] },
  { id: 10, name: "A Roda da Fortuna", upright: ["ciclos", "destino", "virada", "sorte"], reversed: ["resistência ao ciclo", "retorno cármico"] },
  { id: 11, name: "A Justiça",       upright: ["equilíbrio", "verdade", "responsabilidade", "lei"], reversed: ["injustiça", "fuga de consequências"] },
  { id: 12, name: "O Enforcado",     upright: ["pausa", "rendição", "nova perspectiva", "sacrifício consciente"], reversed: ["resistência", "estagnação", "vítima"] },
  { id: 13, name: "A Morte",         upright: ["transformação", "fim necessário", "renascimento"], reversed: ["medo de mudar", "ciclo travado"] },
  { id: 14, name: "A Temperança",    upright: ["equilíbrio", "integração", "paciência", "alquimia"], reversed: ["desequilíbrio", "excessos", "impaciência"] },
  { id: 15, name: "O Diabo",         upright: ["sombra", "vícios", "materialismo", "vínculos"], reversed: ["libertação", "consciência da prisão"] },
  { id: 16, name: "A Torre",         upright: ["ruptura", "revelação súbita", "queda do falso"], reversed: ["adiamento da queda", "medo do colapso necessário"] },
  { id: 17, name: "A Estrela",       upright: ["esperança", "fé", "inspiração", "cura"], reversed: ["desânimo", "fé abalada"] },
  { id: 18, name: "A Lua",           upright: ["intuição profunda", "ilusão", "subconsciente"], reversed: ["confusão dissipando", "verdade revelada"] },
  { id: 19, name: "O Sol",           upright: ["alegria", "sucesso", "vitalidade", "clareza"], reversed: ["otimismo forçado", "sucesso atrasado"] },
  { id: 20, name: "O Julgamento",    upright: ["despertar", "chamado", "renascimento espiritual"], reversed: ["dúvida do chamado", "autojulgamento"] },
  { id: 21, name: "O Mundo",         upright: ["completude", "realização", "integração", "fim de ciclo"], reversed: ["ciclo inacabado", "falta de fechamento"] },
];

export const SPREADS = {
  card_day:  { id: "card_day",  label: "Carta do Dia",          count: 1,  positions: ["Mensagem do Dia"] },
  three:     { id: "three",     label: "Passado · Presente · Futuro", count: 3,  positions: ["Passado", "Presente", "Futuro"] },
  celtic:    { id: "celtic",    label: "Cruz Celta",            count: 10, positions: ["Situação", "Desafio", "Raiz", "Passado recente", "Coroa", "Futuro próximo", "Você agora", "Ambiente", "Esperanças e medos", "Resultado"] },
} as const;

export type SpreadId = keyof typeof SPREADS;

export function drawSpread(spreadId: SpreadId) {
  const spread = SPREADS[spreadId];
  const deck = [...TAROT_MAJORS];
  const cards: { position: string; card: TarotCard; reversed: boolean }[] = [];
  for (let i = 0; i < spread.count; i++) {
    const idx = Math.floor(Math.random() * deck.length);
    const card = deck.splice(idx, 1)[0];
    cards.push({
      position: spread.positions[i],
      card,
      reversed: Math.random() < 0.3,
    });
  }
  return cards;
}
