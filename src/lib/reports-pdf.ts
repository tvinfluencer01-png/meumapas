import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";

export type SectionPlan = {
  improve: string[]; // 7 itens (um por dia)
  avoid: string[];   // 7 itens
  follow: string[];  // 7 itens
};
export type ReportSection = { title: string; body: string; plan?: SectionPlan };
export type ReportSwot = {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
};
export type ReportRecommendations = {
  improve: string[];
  avoid: string[];
  follow: string[];
};
export type ReportSuggestion = { name: string; why: string };
export type ReportSuggestions = {
  heading: string;       // ex: "Profissoes sugeridas"
  intro?: string;        // 1 frase contextualizando
  items: ReportSuggestion[];
};
export type ReportBranding = {
  enabled: boolean;
  logoBytes?: Uint8Array;
  logoMime?: "image/png" | "image/jpeg";
  logoWidth?: number;
  logoHeight?: number;
  displayName?: string | null;
  footerEnabled?: boolean;
  footerName?: string | null;
  footerSite?: string | null;
  footerPhone?: string | null;
};
export type ReportData = {
  kind: "personality" | "love" | "career" | "spiritual" | "finance" | "family" | "health" | "friendships";
  title: string;
  subtitle: string;
  consultantName: string;
  birthLine: string;
  signLine: string;
  numerologyLine: string;
  intro: string;
  sections: ReportSection[];
  closing: string;
  swot: ReportSwot;
  recommendations: ReportRecommendations;
  suggestions: ReportSuggestions;
  summary: string;
  branding?: ReportBranding;
};

const GOLD = rgb(0.831, 0.686, 0.216); // #d4af37
const NIGHT = rgb(0.012, 0.027, 0.067); // deep night
const PARCHMENT = rgb(0.96, 0.94, 0.89);
const INK = rgb(0.15, 0.13, 0.1);
const MUTED = rgb(0.45, 0.42, 0.36);

const MARGIN = 56;
const PAGE_W = PageSizes.A4[0];
const PAGE_H = PageSizes.A4[1];
const CONTENT_W = PAGE_W - MARGIN * 2;

// Strip characters WinAnsi (used by Standard fonts) cannot encode.
function safe(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2026]/g, "...")
    .replace(/[\u00A0]/g, " ")
    // remove emojis & anything outside basic Latin-1 supplement
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A1-\u017F]/g, "");
}

function wrap(text: string, font: import("pdf-lib").PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  const paragraphs = text.split(/\n+/);
  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
      const candidate = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
        if (line) out.push(line);
        line = w;
      } else {
        line = candidate;
      }
    }
    if (line) out.push(line);
    out.push(""); // paragraph break
  }
  if (out.length && out[out.length - 1] === "") out.pop();
  return out;
}

export async function buildReportPdf(data: ReportData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(safe(data.title));
  pdf.setAuthor("Cosmic AI");
  pdf.setSubject(safe(data.subtitle));
  pdf.setCreator("Cosmic AI — Oraculo");
  pdf.setProducer("Cosmic AI");

  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);

  // -------- COVER --------
  const cover = pdf.addPage(PageSizes.A4);
  cover.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: NIGHT });

  // gold ornamental frame
  const inset = 28;
  cover.drawRectangle({
    x: inset, y: inset,
    width: PAGE_W - inset * 2, height: PAGE_H - inset * 2,
    borderColor: GOLD, borderWidth: 0.8,
  });
  cover.drawRectangle({
    x: inset + 6, y: inset + 6,
    width: PAGE_W - inset * 2 - 12, height: PAGE_H - inset * 2 - 12,
    borderColor: GOLD, borderWidth: 0.3,
  });

  // Branding (add-on): logo image OR custom display name replaces "COSMIC AI"
  const branding = data.branding?.enabled ? data.branding : null;
  let topLabel = "COSMIC AI  -  RELATORIO PREMIUM";
  if (branding?.displayName && !branding.logoBytes) {
    topLabel = branding.displayName.toUpperCase();
  }

  if (branding?.logoBytes && branding.logoMime) {
    try {
      const img =
        branding.logoMime === "image/png"
          ? await pdf.embedPng(branding.logoBytes)
          : await pdf.embedJpg(branding.logoBytes);
      const lw = Math.max(40, Math.min(240, branding.logoWidth ?? 120));
      const lh = Math.max(20, Math.min(160, branding.logoHeight ?? 60));
      cover.drawImage(img, {
        x: (PAGE_W - lw) / 2,
        y: PAGE_H - 90 - lh,
        width: lw,
        height: lh,
      });
    } catch (e) {
      console.error("[reports-pdf] failed to embed logo", e);
    }
  } else {
    const label = safe(topLabel);
    const labelW = sans.widthOfTextAtSize(label, 9);
    cover.drawText(label, {
      x: (PAGE_W - labelW) / 2, y: PAGE_H - 100,
      size: 9, font: sans, color: GOLD,
    });
  }

  // title
  const titleSize = 38;
  const titleText = safe(data.title);
  const titleW = serifBold.widthOfTextAtSize(titleText, titleSize);
  cover.drawText(titleText, {
    x: (PAGE_W - titleW) / 2, y: PAGE_H / 2 + 60,
    size: titleSize, font: serifBold, color: GOLD,
  });

  // subtitle
  const subSize = 14;
  const subLines = wrap(safe(data.subtitle), serifItalic, subSize, CONTENT_W - 60);
  let sy = PAGE_H / 2 + 20;
  for (const line of subLines.slice(0, 3)) {
    const w = serifItalic.widthOfTextAtSize(line, subSize);
    cover.drawText(line, {
      x: (PAGE_W - w) / 2, y: sy, size: subSize, font: serifItalic, color: PARCHMENT,
    });
    sy -= subSize * 1.4;
  }

  // divider
  cover.drawLine({
    start: { x: PAGE_W / 2 - 40, y: PAGE_H / 2 - 30 },
    end: { x: PAGE_W / 2 + 40, y: PAGE_H / 2 - 30 },
    color: GOLD, thickness: 0.8,
  });

  // consultant block
  const blocks = [
    { label: "PARA", value: data.consultantName },
    { label: "NASCIMENTO", value: data.birthLine },
    { label: "ASSINATURA CELESTE", value: data.signLine },
    { label: "VIBRACAO NUMERICA", value: data.numerologyLine },
  ];
  let by = PAGE_H / 2 - 70;
  for (const b of blocks) {
    const lab = safe(b.label);
    const lw = sans.widthOfTextAtSize(lab, 8);
    cover.drawText(lab, { x: (PAGE_W - lw) / 2, y: by, size: 8, font: sans, color: GOLD });
    by -= 14;
    const val = safe(b.value);
    const vw = serif.widthOfTextAtSize(val, 12);
    cover.drawText(val, { x: (PAGE_W - vw) / 2, y: by, size: 12, font: serif, color: PARCHMENT });
    by -= 26;
  }

  // footer
  const dateStr = safe(new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }));
  const dw = sans.widthOfTextAtSize(dateStr, 9);
  cover.drawText(dateStr, {
    x: (PAGE_W - dw) / 2, y: 70, size: 9, font: sans, color: GOLD,
  });

  // -------- CONTENT PAGES --------
  type Cursor = { page: import("pdf-lib").PDFPage; y: number; pageNumber: number };
  let currentChapter = "Abertura";

  function newPage(doc: PDFDocument, num: number): Cursor {
    const page = doc.addPage(PageSizes.A4);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PARCHMENT });
    // top gold rule
    page.drawLine({
      start: { x: MARGIN, y: PAGE_H - MARGIN + 24 },
      end: { x: PAGE_W - MARGIN, y: PAGE_H - MARGIN + 24 },
      color: GOLD, thickness: 0.5,
    });
    const header = safe(data.title.toUpperCase());
    page.drawText(header, {
      x: MARGIN, y: PAGE_H - MARGIN + 30, size: 8, font: sans, color: GOLD,
    });
    const numTxt = String(num);
    const nw = sans.widthOfTextAtSize(numTxt, 8);
    page.drawText(numTxt, {
      x: PAGE_W - MARGIN - nw, y: PAGE_H - MARGIN + 30, size: 8, font: sans, color: GOLD,
    });
    // footer (branding add-on overrides when enabled + footerEnabled + any field)
    let footerText = "Cosmic AI - Inteligencia espiritual personalizada";
    if (branding && branding.footerEnabled !== false) {
      const parts = [branding.footerName, branding.footerSite, branding.footerPhone]
        .map((s) => (s ?? "").trim())
        .filter(Boolean);
      if (parts.length) footerText = parts.join("  -  ");
    }
    const footer = safe(footerText);
    const fw = sans.widthOfTextAtSize(footer, 8);
    page.drawText(footer, {
      x: (PAGE_W - fw) / 2, y: MARGIN - 24, size: 8, font: sans, color: MUTED,
    });
    return { page, y: PAGE_H - MARGIN, pageNumber: num };
  }

  function drawChapterTitleAt(c: Cursor) {
    const titleSize = 14;
    c.page.drawText(safe(currentChapter), {
      x: MARGIN, y: c.y - titleSize, size: titleSize, font: serifBold, color: NIGHT,
    });
    c.y -= titleSize + 6;
    c.page.drawLine({
      start: { x: MARGIN, y: c.y },
      end: { x: MARGIN + 36, y: c.y },
      color: GOLD, thickness: 0.8,
    });
    c.y -= 16;
  }

  let cursor: Cursor = newPage(pdf, 1);

  function ensureSpace(needed: number) {
    if (cursor.y - needed < MARGIN) {
      cursor = newPage(pdf, cursor.pageNumber + 1);
    }
  }

  function setChapter(title: string) {
    currentChapter = title;
  }
  // referenciado para evitar warning de variavel nao usada
  void drawChapterTitleAt;

  let isFirstHeading = true;
  function drawHeading(text: string, size = 20) {
    // Regra: todo titulo de capitulo inicia em uma nova pagina limpa,
    // sem repetir o titulo do capitulo no topo (evita duplicidade).
    if (!isFirstHeading) {
      cursor = newPage(pdf, cursor.pageNumber + 1);
    }
    isFirstHeading = false;
    cursor.y -= 10;
    cursor.page.drawText(safe(text), {
      x: MARGIN, y: cursor.y - size, size, font: serifBold, color: NIGHT,
    });
    cursor.y -= size + 6;
    cursor.page.drawLine({
      start: { x: MARGIN, y: cursor.y },
      end: { x: MARGIN + 48, y: cursor.y },
      color: GOLD, thickness: 1.2,
    });
    cursor.y -= 18;
  }

  function drawParagraph(text: string, opts?: { italic?: boolean; size?: number; color?: ReturnType<typeof rgb> }) {
    const size = opts?.size ?? 11;
    const font = opts?.italic ? serifItalic : serif;
    const color = opts?.color ?? INK;
    const lines = wrap(safe(text), font, size, CONTENT_W);
    const lineHeight = size * 1.55;
    for (const line of lines) {
      ensureSpace(lineHeight);
      if (line) {
        cursor.page.drawText(line, {
          x: MARGIN, y: cursor.y - size, size, font, color,
        });
      }
      cursor.y -= lineHeight;
    }
    cursor.y -= 4;
  }

  function drawBulletList(items: string[]) {
    const size = 11;
    const lineHeight = size * 1.5;
    for (const item of items) {
      const lines = wrap(safe("- " + item), serif, size, CONTENT_W - 12);
      for (let i = 0; i < lines.length; i++) {
        ensureSpace(lineHeight);
        cursor.page.drawText(lines[i], {
          x: MARGIN + (i === 0 ? 0 : 12),
          y: cursor.y - size,
          size, font: serif, color: INK,
        });
        cursor.y -= lineHeight;
      }
      cursor.y -= 2;
    }
    cursor.y -= 4;
  }

  function drawSubHeading(text: string, color = NIGHT) {
    const size = 13;
    ensureSpace(size + 14);
    cursor.page.drawText(safe(text), {
      x: MARGIN, y: cursor.y - size, size, font: serifBold, color,
    });
    cursor.y -= size + 10;
  }

  // Intro chapter
  setChapter("Abertura");
  drawHeading("Abertura", 26);
  drawParagraph(data.intro, { italic: true, size: 12, color: rgb(0.25, 0.22, 0.18) });

  // Sections
  for (const section of data.sections) {
    setChapter(section.title);
    drawHeading(section.title, 18);
    drawParagraph(section.body);
  }

  // Closing
  setChapter("Selo final");
  drawHeading("Selo final", 18);
  drawParagraph(data.closing, { italic: true, color: rgb(0.3, 0.25, 0.2) });

  // Analise
  setChapter("Analise");
  drawHeading("Analise", 20);
  drawParagraph(
    "Sintese das forcas, fraquezas, oportunidades e ameacas reveladas pelo seu mapa.",
    { italic: true, size: 11, color: MUTED },
  );
  drawSubHeading("Forcas (Strengths)", rgb(0.15, 0.4, 0.2));
  drawBulletList(data.swot.strengths);
  drawSubHeading("Fraquezas (Weaknesses)", rgb(0.55, 0.25, 0.15));
  drawBulletList(data.swot.weaknesses);
  drawSubHeading("Oportunidades (Opportunities)", rgb(0.2, 0.35, 0.55));
  drawBulletList(data.swot.opportunities);
  drawSubHeading("Ameacas (Threats)", rgb(0.5, 0.15, 0.25));
  drawBulletList(data.swot.threats);

  // Recomendacoes
  setChapter("Recomendacoes finais");
  drawHeading("Recomendacoes finais", 20);
  drawSubHeading("O que MELHORAR", rgb(0.15, 0.4, 0.2));
  drawBulletList(data.recommendations.improve);
  drawSubHeading("O que EVITAR", rgb(0.55, 0.15, 0.2));
  drawBulletList(data.recommendations.avoid);
  drawSubHeading("O que SEGUIR", rgb(0.65, 0.5, 0.1));
  drawBulletList(data.recommendations.follow);

  // Sugestoes (personalizadas por tema)
  if (data.suggestions?.items?.length) {
    setChapter(data.suggestions.heading);
    drawHeading(data.suggestions.heading, 20);
    if (data.suggestions.intro) {
      drawParagraph(data.suggestions.intro, { italic: true, size: 11, color: MUTED });
    }
    const nameSize = 12;
    const whySize = 11;
    const lineH = whySize * 1.5;
    for (const item of data.suggestions.items) {
      // Nome em negrito
      ensureSpace(nameSize + 6);
      cursor.page.drawText(safe("- " + item.name), {
        x: MARGIN, y: cursor.y - nameSize,
        size: nameSize, font: serifBold, color: NIGHT,
      });
      cursor.y -= nameSize + 4;
      // Justificativa em texto corrido com indent
      const whyLines = wrap(safe(item.why), serif, whySize, CONTENT_W - 14);
      for (const wl of whyLines) {
        ensureSpace(lineH);
        if (wl) {
          cursor.page.drawText(wl, {
            x: MARGIN + 14, y: cursor.y - whySize,
            size: whySize, font: serif, color: INK,
          });
        }
        cursor.y -= lineH;
      }
      cursor.y -= 4;
    }
  }

  // Resumo
  setChapter("Resumo");
  drawHeading("Resumo", 20);
  drawParagraph(data.summary);

  // Signature line
  ensureSpace(60);
  cursor.y -= 18;
  cursor.page.drawLine({
    start: { x: MARGIN, y: cursor.y },
    end: { x: MARGIN + 160, y: cursor.y },
    color: GOLD, thickness: 0.6,
  });
  cursor.y -= 14;
  cursor.page.drawText(safe("Oraculo Cosmic AI"), {
    x: MARGIN, y: cursor.y - 9, size: 9, font: sans, color: MUTED,
  });

  return await pdf.save();
}

