/**
 * Templates pré-prontos para o PDF CSS Avançado.
 * Cada template define apenas os campos do bloco "PDF CSS Avançado"
 * (cores de página/texto/títulos, tipografia, moldura, opacidade da marca d'água),
 * além das cores da capa e cabeçalho/rodapé para coerência visual.
 */

export type PdfCssTemplate = {
  id: string;
  name: string;
  description: string;
  preview: {
    page: string;
    heading: string;
    body: string;
    accent: string;
  };
  values: {
    cover_bg_color: string;
    cover_accent_color: string;
    cover_title_position: "top" | "center" | "bottom";
    font_family: "serif" | "sans" | "display";
    header_bg_color: string;
    footer_bg_color: string;
    header_text_color: string;
    page_bg_color: string;
    body_text_color: string;
    heading_text_color: string;
    body_font_size: number;
    line_height: number;
    frame_style: "none" | "simple" | "double" | "ornamental";
    watermark_opacity: number;
  };
};

export const PDF_CSS_TEMPLATES: PdfCssTemplate[] = [
  {
    id: "celestial-gold",
    name: "Celestial Gold",
    description: "Fundo creme com tipografia serif clássica e detalhes em dourado.",
    preview: { page: "#f5f1e6", heading: "#03060f", body: "#262218", accent: "#d4af37" },
    values: {
      cover_bg_color: "#03060f",
      cover_accent_color: "#d4af37",
      cover_title_position: "center",
      font_family: "serif",
      header_bg_color: "#f5f1e6",
      footer_bg_color: "#f5f1e6",
      header_text_color: "#d4af37",
      page_bg_color: "#f5f1e6",
      body_text_color: "#262218",
      heading_text_color: "#03060f",
      body_font_size: 12.5,
      line_height: 1.45,
      frame_style: "double",
      watermark_opacity: 0.08,
    },
  },
  {
    id: "midnight-noir",
    name: "Midnight Noir",
    description: "Página escura com texto em creme e destaques dourados — alto contraste.",
    preview: { page: "#0b0e1a", heading: "#f5e6b8", body: "#e6e2d3", accent: "#d4af37" },
    values: {
      cover_bg_color: "#02030a",
      cover_accent_color: "#f5e6b8",
      cover_title_position: "center",
      font_family: "display",
      header_bg_color: "#0b0e1a",
      footer_bg_color: "#0b0e1a",
      header_text_color: "#d4af37",
      page_bg_color: "#0b0e1a",
      body_text_color: "#e6e2d3",
      heading_text_color: "#f5e6b8",
      body_font_size: 12,
      line_height: 1.55,
      frame_style: "ornamental",
      watermark_opacity: 0.12,
    },
  },
  {
    id: "minimal-paper",
    name: "Minimal Paper",
    description: "Branco editorial, tipografia sans moderna e sem moldura — leitura limpa.",
    preview: { page: "#ffffff", heading: "#111418", body: "#3a3f47", accent: "#1f2937" },
    values: {
      cover_bg_color: "#ffffff",
      cover_accent_color: "#1f2937",
      cover_title_position: "top",
      font_family: "sans",
      header_bg_color: "#ffffff",
      footer_bg_color: "#ffffff",
      header_text_color: "#1f2937",
      page_bg_color: "#ffffff",
      body_text_color: "#3a3f47",
      heading_text_color: "#111418",
      body_font_size: 11.5,
      line_height: 1.55,
      frame_style: "none",
      watermark_opacity: 0.05,
    },
  },
  {
    id: "rose-mystic",
    name: "Rose Mystic",
    description: "Papel rosado quente com títulos em vinho — feminino e místico.",
    preview: { page: "#fbeee6", heading: "#5a1a2b", body: "#3d2128", accent: "#b85677" },
    values: {
      cover_bg_color: "#2a0e1a",
      cover_accent_color: "#f5c7d4",
      cover_title_position: "center",
      font_family: "serif",
      header_bg_color: "#fbeee6",
      footer_bg_color: "#fbeee6",
      header_text_color: "#b85677",
      page_bg_color: "#fbeee6",
      body_text_color: "#3d2128",
      heading_text_color: "#5a1a2b",
      body_font_size: 12.5,
      line_height: 1.5,
      frame_style: "simple",
      watermark_opacity: 0.1,
    },
  },
  {
    id: "forest-sage",
    name: "Forest Sage",
    description: "Verde sálvia suave com tipografia serif — energia da terra.",
    preview: { page: "#eef1e8", heading: "#1f3325", body: "#2e3a30", accent: "#4f7a52" },
    values: {
      cover_bg_color: "#0f1c14",
      cover_accent_color: "#c9d8a8",
      cover_title_position: "bottom",
      font_family: "serif",
      header_bg_color: "#eef1e8",
      footer_bg_color: "#eef1e8",
      header_text_color: "#4f7a52",
      page_bg_color: "#eef1e8",
      body_text_color: "#2e3a30",
      heading_text_color: "#1f3325",
      body_font_size: 12.5,
      line_height: 1.5,
      frame_style: "double",
      watermark_opacity: 0.08,
    },
  },
  {
    id: "deep-ocean",
    name: "Deep Ocean",
    description: "Tons profundos de azul-marinho com acentos prateados.",
    preview: { page: "#eaf0f5", heading: "#0c2340", body: "#1f3a5a", accent: "#3b6fa0" },
    values: {
      cover_bg_color: "#0c2340",
      cover_accent_color: "#cfd8e3",
      cover_title_position: "center",
      font_family: "sans",
      header_bg_color: "#eaf0f5",
      footer_bg_color: "#eaf0f5",
      header_text_color: "#3b6fa0",
      page_bg_color: "#eaf0f5",
      body_text_color: "#1f3a5a",
      heading_text_color: "#0c2340",
      body_font_size: 12,
      line_height: 1.5,
      frame_style: "simple",
      watermark_opacity: 0.07,
    },
  },
];
