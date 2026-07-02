// Paleta unificada de degradês suaves usada em KPIs e relatórios.
// Mantida como strings literais para o Tailwind v4 conseguir extrair as classes.

export const KPI_TONES = {
  sky: {
    card: "from-sky-500/15 via-sky-400/10 to-transparent border-sky-500/20",
    row: "bg-sky-500/[0.05] border-l-sky-500",
    dot: "bg-sky-500",
  },
  indigo: {
    card: "from-indigo-500/15 via-indigo-400/10 to-transparent border-indigo-500/20",
    row: "bg-indigo-500/[0.05] border-l-indigo-500",
    dot: "bg-indigo-500",
  },
  violet: {
    card: "from-violet-500/15 via-violet-400/10 to-transparent border-violet-500/20",
    row: "bg-violet-500/[0.05] border-l-violet-500",
    dot: "bg-violet-500",
  },
  fuchsia: {
    card: "from-fuchsia-500/15 via-fuchsia-400/10 to-transparent border-fuchsia-500/20",
    row: "bg-fuchsia-500/[0.05] border-l-fuchsia-500",
    dot: "bg-fuchsia-500",
  },
  rose: {
    card: "from-rose-500/15 via-rose-400/10 to-transparent border-rose-500/20",
    row: "bg-rose-500/[0.05] border-l-rose-500",
    dot: "bg-rose-500",
  },
  amber: {
    card: "from-amber-500/15 via-amber-400/10 to-transparent border-amber-500/20",
    row: "bg-amber-500/[0.05] border-l-amber-500",
    dot: "bg-amber-500",
  },
  emerald: {
    card: "from-emerald-500/15 via-emerald-400/10 to-transparent border-emerald-500/20",
    row: "bg-emerald-500/[0.05] border-l-emerald-500",
    dot: "bg-emerald-500",
  },
  teal: {
    card: "from-teal-500/15 via-teal-400/10 to-transparent border-teal-500/20",
    row: "bg-teal-500/[0.05] border-l-teal-500",
    dot: "bg-teal-500",
  },
} as const;

export type ToneName = keyof typeof KPI_TONES;

export const TONE_ORDER: ToneName[] = [
  "sky",
  "indigo",
  "violet",
  "fuchsia",
  "rose",
  "amber",
  "emerald",
  "teal",
];

export function toneByIndex(i: number): ToneName {
  return TONE_ORDER[((i % TONE_ORDER.length) + TONE_ORDER.length) % TONE_ORDER.length];
}

export function toneCard(tone?: ToneName | string) {
  const t = (tone && (KPI_TONES as any)[tone]) as (typeof KPI_TONES)[ToneName] | undefined;
  return t?.card ?? "from-muted/40 via-muted/20 to-transparent border-border";
}

export function toneRow(tone?: ToneName | string) {
  const t = (tone && (KPI_TONES as any)[tone]) as (typeof KPI_TONES)[ToneName] | undefined;
  return t?.row ?? "border-l-border";
}
