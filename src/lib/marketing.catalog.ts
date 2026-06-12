/** Serviços onde a assinatura de marketing pode aparecer ao final da mensagem. */
export const MARKETING_SERVICES = [
  { key: "horoscope_daily", label: "Horóscopo Diário (WhatsApp/Email)" },
  
  { key: "oracle", label: "Oráculo" },
  { key: "weekly_reading", label: "Leitura Semanal" },
  { key: "tarot", label: "Tarot" },
  { key: "numerology", label: "Numerologia" },
  { key: "astro_map", label: "Mapa Astral" },
] as const;

export type MarketingServiceKey = (typeof MARKETING_SERVICES)[number]["key"];

export const MARKETING_SIGNATURE = "Código Cósmico";
