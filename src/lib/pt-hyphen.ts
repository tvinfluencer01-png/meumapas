/**
 * Hifenização pt-BR para o gerador de PDF (pdf-lib).
 *
 * Usa o pacote `hyphen` (padrões TeX de Frank Liang) via `hyphen/pt`, que
 * devolve a palavra pontuada com Soft Hyphen (U+00AD) em cada sílaba
 * separável. Convertemos essas posições em offsets numéricos que o
 * renderer usa para tentar cortar linhas em pontos silábicos corretos.
 *
 * Fallback determinístico: heurística V|CV / VC|CV com dígrafos
 * inseparáveis, caso o pacote não carregue por qualquer razão em runtime.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let syncHyphenator: ((w: string) => string) | null = null;
try {
  // hyphen/pt exporta hyphenateSync; roda 100% em memória.
  // Evitamos await para manter a assinatura síncrona esperada pelo pdf-lib.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("hyphen/pt") as { hyphenateSync?: (w: string) => string };
  if (typeof mod.hyphenateSync === "function") {
    syncHyphenator = mod.hyphenateSync;
  }
} catch {
  syncHyphenator = null;
}

const SOFT_HYPHEN = "\u00AD";

const CACHE = new Map<string, number[]>();
const CACHE_MAX = 4096;

function fallbackPoints(word: string): number[] {
  const vowels = /[aeiouáéíóúâêôãõàüyAEIOUÁÉÍÓÚÂÊÔÃÕÀÜY]/;
  const inseparable = new Set([
    "bl","br","cl","cr","dl","dr","fl","fr","gl","gr","pl","pr","tl","tr","vl","vr",
    "ch","lh","nh","qu","gu",
  ]);
  const pts: number[] = [];
  const w = word.toLowerCase();
  const isV = (ch: string) => vowels.test(ch);
  let i = 0;
  while (i < w.length - 2) {
    if (isV(w[i])) {
      let j = i + 1;
      while (j < w.length && !isV(w[j])) j++;
      if (j >= w.length) break;
      const consCount = j - (i + 1);
      let breakAt = -1;
      if (consCount === 0) breakAt = i + 1;
      else if (consCount === 1) breakAt = i + 1;
      else {
        const lastPair = w[j - 2] + w[j - 1];
        if (inseparable.has(lastPair)) breakAt = j - 2;
        else breakAt = j - 1;
      }
      if (breakAt >= 2 && breakAt <= w.length - 2) pts.push(breakAt);
      i = j;
    } else {
      i++;
    }
  }
  return pts;
}

/**
 * Devolve offsets (dentro da palavra original) onde é seguro quebrar a
 * palavra, garantindo pelo menos 2 caracteres de cada lado.
 */
export function hyphenPointsPt(word: string): number[] {
  if (!word || word.length < 6) return [];
  const cached = CACHE.get(word);
  if (cached) return cached;

  let pts: number[] = [];
  if (syncHyphenator) {
    try {
      const marked = syncHyphenator(word);
      let raw = 0; // índice na palavra original
      const out: number[] = [];
      for (let i = 0; i < marked.length; i++) {
        const ch = marked[i];
        if (ch === SOFT_HYPHEN) {
          if (raw >= 2 && raw <= word.length - 2) out.push(raw);
        } else {
          raw++;
        }
      }
      pts = out;
    } catch {
      pts = fallbackPoints(word);
    }
  } else {
    pts = fallbackPoints(word);
  }

  if (CACHE.size >= CACHE_MAX) {
    const firstKey = CACHE.keys().next().value;
    if (firstKey !== undefined) CACHE.delete(firstKey);
  }
  CACHE.set(word, pts);
  return pts;
}
