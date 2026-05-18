/**
 * As 10 Sefirot da Árvore da Vida cabalística, com palavras-chave
 * e elementos para guiar meditações personalizadas.
 */
export type Sefirah = {
  id: string;
  number: number;
  name: string; // hebraico transliterado
  translation: string;
  pillar: "Misericórdia" | "Rigor" | "Equilíbrio";
  body: string; // parte do corpo associada
  planet: string;
  keywords: string[];
  prayer: string; // frase-semente de contemplação
};

export const SEFIROT: Sefirah[] = [
  { id: "keter",     number: 1, name: "Kéter",     translation: "Coroa",        pillar: "Equilíbrio", body: "topo da cabeça",      planet: "Primum Mobile", keywords: ["unidade", "vontade divina", "origem"],            prayer: "Eu sou recipiente da Luz Una." },
  { id: "chokhmah",  number: 2, name: "Chokhmá",   translation: "Sabedoria",    pillar: "Misericórdia", body: "hemisfério direito do cérebro", planet: "Zodíaco", keywords: ["intuição relâmpago", "pai arquetípico", "ideia pura"], prayer: "A sabedoria flui através de mim sem esforço." },
  { id: "binah",     number: 3, name: "Biná",      translation: "Entendimento", pillar: "Rigor",      body: "hemisfério esquerdo do cérebro", planet: "Saturno", keywords: ["mãe cósmica", "forma", "compreensão profunda"],   prayer: "Eu compreendo o sentido oculto das coisas." },
  { id: "chesed",    number: 4, name: "Chéssed",   translation: "Misericórdia", pillar: "Misericórdia", body: "braço direito",     planet: "Júpiter", keywords: ["graça", "expansão", "generosidade"],              prayer: "Recebo e doo abundância com gratidão." },
  { id: "gevurah",   number: 5, name: "Gevurá",    translation: "Severidade",   pillar: "Rigor",      body: "braço esquerdo",      planet: "Marte",   keywords: ["limite saudável", "força", "coragem"],            prayer: "Eu honro meus limites como atos de amor." },
  { id: "tiferet",   number: 6, name: "Tiféret",   translation: "Beleza",       pillar: "Equilíbrio", body: "coração",             planet: "Sol",     keywords: ["harmonia", "verdade", "centro do Eu"],            prayer: "Em meu coração, opostos se reconciliam." },
  { id: "netzach",   number: 7, name: "Nétzach",   translation: "Vitória",      pillar: "Misericórdia", body: "quadril direito",   planet: "Vênus",   keywords: ["arte", "emoção", "persistência amorosa"],         prayer: "Persisto com beleza no que amo." },
  { id: "hod",       number: 8, name: "Hod",       translation: "Glória",       pillar: "Rigor",      body: "quadril esquerdo",    planet: "Mercúrio", keywords: ["intelecto", "comunicação", "ritual"],            prayer: "Minha mente serve à verdade com clareza." },
  { id: "yesod",     number: 9, name: "Yessod",    translation: "Fundamento",   pillar: "Equilíbrio", body: "ventre / sacro",      planet: "Lua",     keywords: ["sonho", "subconsciente", "sexualidade sagrada"],  prayer: "Meu mundo interior alinha-se com a Luz." },
  { id: "malkuth",   number: 10, name: "Malkút",   translation: "Reino",        pillar: "Equilíbrio", body: "pés / terra",         planet: "Terra",   keywords: ["manifestação", "corpo", "presença"],              prayer: "Eu manifesto o céu na terra do meu corpo." },
];

export function findSefirah(id: string): Sefirah | undefined {
  return SEFIROT.find((s) => s.id === id);
}
