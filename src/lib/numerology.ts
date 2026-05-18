// Numerologia Cabalística / Pitagórica simplificada (PT-BR)
// Use as base para soul/destiny/expression/personality/life path.

const PYTHAGOREAN: Record<string, number> = {
  A: 1, J: 1, S: 1,
  B: 2, K: 2, T: 2,
  C: 3, L: 3, U: 3,
  D: 4, M: 4, V: 4,
  E: 5, N: 5, W: 5,
  F: 6, O: 6, X: 6,
  G: 7, P: 7, Y: 7,
  H: 8, Q: 8, Z: 8,
  I: 9, R: 9,
};

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

const stripDiacritics = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

const reduce = (n: number): number => {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split("").reduce((a, b) => a + Number(b), 0);
  }
  return n;
};

const sumLetters = (name: string, filter: (ch: string) => boolean) => {
  const clean = stripDiacritics(name).replace(/[^A-Z]/g, "");
  let total = 0;
  for (const ch of clean) if (filter(ch) && PYTHAGOREAN[ch]) total += PYTHAGOREAN[ch];
  return total;
};

// Numerologia tradicional não usa o número 0: quando a soma de letras
// resultar em 0 (nome ausente, vazio ou sem letras latinas após normalização),
// o cálculo daquele campo é indefinido e deve aparecer como "—" na UI,
// nunca como 0.
const reduceName = (sum: number): number | null => (sum > 0 ? reduce(sum) : null);

export function computeNumerology(fullName: string | null | undefined, birthDate: string | null | undefined) {
  // Defensive: birth_data columns may be null/empty.
  const safeName = typeof fullName === "string" ? fullName.trim() : "";
  const safeDate = typeof birthDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(birthDate)
    ? birthDate
    : "2000-01-01";
  const [y, m, d] = safeDate.split("-").map(Number);

  const lifePath = reduce(reduce(y) + reduce(m) + reduce(d));
  const birthday = reduce(d);

  const expression = reduceName(sumLetters(safeName, () => true));
  const soulUrge = reduceName(sumLetters(safeName, (c) => VOWELS.has(c)));
  const personality = reduceName(sumLetters(safeName, (c) => !VOWELS.has(c)));
  const destiny = expression; // alias popular

  return {
    life_path: lifePath,
    destiny,
    soul_urge: soulUrge,
    personality,
    birthday,
    expression,
  };
}

/**
 * Formata uma data ISO (YYYY-MM-DD) no padrão pt-BR (DD/MM/YYYY)
 * sem aplicar conversão de fuso horário — evita que datas armazenadas
 * como "2011-09-06" apareçam como "05/09/2011" em fusos negativos (UTC-3).
 */
export function formatBirthDateBR(birthDate: string | null | undefined): string {
  if (typeof birthDate !== "string") return "";
  const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return birthDate;
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
}

export const NUMBER_MEANINGS: Record<number, { title: string; essence: string }> = {
  1: { title: "Pioneiro", essence: "Liderança, originalidade e coragem para abrir caminhos." },
  2: { title: "Diplomata", essence: "Sensibilidade, parceria e equilíbrio entre opostos." },
  3: { title: "Comunicador", essence: "Expressão criativa, alegria e magnetismo." },
  4: { title: "Construtor", essence: "Estabilidade, método e edificação de bases sólidas." },
  5: { title: "Aventureiro", essence: "Liberdade, mudança e expansão sensorial." },
  6: { title: "Cuidador", essence: "Amor, responsabilidade e harmonia familiar." },
  7: { title: "Místico", essence: "Introspecção, sabedoria e busca espiritual." },
  8: { title: "Realizador", essence: "Poder material, justiça e abundância." },
  9: { title: "Humanitário", essence: "Compaixão universal, arte e desapego." },
  11: { title: "Mestre Intuitivo", essence: "Iluminação, inspiração e canal espiritual." },
  22: { title: "Mestre Construtor", essence: "Manifestação prática de visões elevadas." },
  33: { title: "Mestre Curador", essence: "Amor incondicional e serviço à humanidade." },
};
