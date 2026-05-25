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
  coverImageBytes?: Uint8Array;
  coverImageMime?: "image/png" | "image/jpeg";
  coverBgColor?: string | null;
  coverAccentColor?: string | null;
  coverTitlePosition?: "top" | "center" | "bottom" | null;
  frameStyle?: "none" | "simple" | "double" | "ornamental" | null;
};
export type ReportData = {
  kind: "personality" | "love" | "career" | "spiritual" | "finance" | "family" | "health" | "friendships" | "business";
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
  finalPlan?: SectionPlan;
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

function hexToRgb(hex: string | null | undefined, fallback: ReturnType<typeof rgb>) {
  if (!hex) return fallback;
  const m = hex.trim().replace(/^#/, "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return fallback;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

type PdfFontRef = import("pdf-lib").PDFFont;
const TEXT_WIDTH_CACHE = new WeakMap<PdfFontRef, Map<string, number>>();

function measureText(font: PdfFontRef, size: number, text: string): number {
  let cache = TEXT_WIDTH_CACHE.get(font);
  if (!cache) {
    cache = new Map<string, number>();
    TEXT_WIDTH_CACHE.set(font, cache);
  }
  const key = `${size}:${text}`;
  const cached = cache.get(key);
  if (cached != null) return cached;
  const width = font.widthOfTextAtSize(text, size);
  cache.set(key, width);
  return width;
}

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

function wrap(text: string, font: PdfFontRef, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  const paragraphs = text.split(/\n+/);
  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
      const candidate = line ? line + " " + w : w;
      if (measureText(font, size, candidate) > maxWidth) {
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
  const brandingForCover = data.branding?.enabled ? data.branding : null;
  const coverBg = hexToRgb(brandingForCover?.coverBgColor ?? null, NIGHT);
  const accent = hexToRgb(brandingForCover?.coverAccentColor ?? null, GOLD);

  // Background: solid color, then optional full-bleed image overlay
  cover.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: coverBg });
  if (brandingForCover?.coverImageBytes && brandingForCover.coverImageMime) {
    try {
      const bgImg =
        brandingForCover.coverImageMime === "image/png"
          ? await pdf.embedPng(brandingForCover.coverImageBytes)
          : await pdf.embedJpg(brandingForCover.coverImageBytes);
      // cover-fit: scale to fill A4 keeping aspect ratio
      const ir = bgImg.width / bgImg.height;
      const pr = PAGE_W / PAGE_H;
      let dw: number, dh: number;
      if (ir > pr) { dh = PAGE_H; dw = dh * ir; }
      else { dw = PAGE_W; dh = dw / ir; }
      cover.drawImage(bgImg, {
        x: (PAGE_W - dw) / 2,
        y: (PAGE_H - dh) / 2,
        width: dw,
        height: dh,
      });
    } catch (e) {
      console.error("[reports-pdf] failed to embed cover image", e);
    }
  }

  // Decorative frame
  const frameStyle = brandingForCover?.frameStyle ?? "double";
  const inset = 28;
  if (frameStyle !== "none") {
    cover.drawRectangle({
      x: inset, y: inset,
      width: PAGE_W - inset * 2, height: PAGE_H - inset * 2,
      borderColor: accent, borderWidth: frameStyle === "ornamental" ? 1.2 : 0.8,
    });
    if (frameStyle === "double" || frameStyle === "ornamental") {
      cover.drawRectangle({
        x: inset + 6, y: inset + 6,
        width: PAGE_W - inset * 2 - 12, height: PAGE_H - inset * 2 - 12,
        borderColor: accent, borderWidth: 0.3,
      });
    }
  }

  // Branding (add-on): logo image OR custom display name replaces "COSMIC AI"
  const branding = brandingForCover;
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
      size: 9, font: sans, color: accent,
    });
  }

  // Title position: top / center / bottom
  const titlePos = branding?.coverTitlePosition ?? "center";
  const titleBaseY =
    titlePos === "top" ? PAGE_H - 180 :
    titlePos === "bottom" ? 280 :
    PAGE_H / 2 + 60;

  // title
  const titleSize = 38;
  const titleText = safe(data.title);
  const titleW = serifBold.widthOfTextAtSize(titleText, titleSize);
  cover.drawText(titleText, {
    x: (PAGE_W - titleW) / 2, y: titleBaseY,
    size: titleSize, font: serifBold, color: accent,
  });

  // subtitle
  const subSize = 14;
  const subLines = wrap(safe(data.subtitle), serifItalic, subSize, CONTENT_W - 60);
  let sy = titleBaseY - 40;
  for (const line of subLines.slice(0, 3)) {
    const w = serifItalic.widthOfTextAtSize(line, subSize);
    cover.drawText(line, {
      x: (PAGE_W - w) / 2, y: sy, size: subSize, font: serifItalic, color: PARCHMENT,
    });
    sy -= subSize * 1.4;
  }

  // divider
  cover.drawLine({
    start: { x: PAGE_W / 2 - 40, y: sy - 10 },
    end: { x: PAGE_W / 2 + 40, y: sy - 10 },
    color: accent, thickness: 0.8,
  });

  // consultant block
  const blocks = [
    { label: "PARA", value: data.consultantName },
    { label: "NASCIMENTO", value: data.birthLine },
    { label: "ASSINATURA CELESTE", value: data.signLine },
    { label: "VIBRACAO NUMERICA", value: data.numerologyLine },
  ];
  let by = sy - 50;
  for (const b of blocks) {
    const lab = safe(b.label);
    const lw = sans.widthOfTextAtSize(lab, 8);
    cover.drawText(lab, { x: (PAGE_W - lw) / 2, y: by, size: 8, font: sans, color: accent });
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
    const titleSize = 16;
    c.page.drawText(safe(currentChapter), {
      x: MARGIN, y: c.y - titleSize, size: titleSize, font: serifBold, color: NIGHT,
    });
    c.y -= titleSize + 7;
    c.page.drawLine({
      start: { x: MARGIN, y: c.y },
      end: { x: MARGIN + 40, y: c.y },
      color: GOLD, thickness: 0.8,
    });
    c.y -= 18;
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
  function drawHeading(text: string, size = 24, opts?: { startOnNewPage?: boolean }) {
    const headingLines = wrap(safe(text), serifBold, size, CONTENT_W).filter((l) => l !== "");
    const neededHeight = 12 + headingLines.length * (size + 4) + 2 + 20 + size * 1.4 * 3;
    if (!isFirstHeading && opts?.startOnNewPage) {
      cursor = newPage(pdf, cursor.pageNumber + 1);
    } else if (!isFirstHeading && cursor.y - neededHeight < MARGIN) {
      cursor = newPage(pdf, cursor.pageNumber + 1);
    } else if (!isFirstHeading) {
      cursor.y -= 20;
    }
    isFirstHeading = false;
    cursor.y -= 8;
    for (const line of headingLines) {
      cursor.page.drawText(line, {
        x: MARGIN, y: cursor.y - size, size, font: serifBold, color: NIGHT,
      });
      cursor.y -= size + 4;
    }
    cursor.y -= 3;
    cursor.page.drawLine({
      start: { x: MARGIN, y: cursor.y },
      end: { x: MARGIN + 56, y: cursor.y },
      color: GOLD, thickness: 1.2,
    });
    cursor.y -= 14;
  }


  // Quebra silábica simples (PT-BR friendly): retorna posições de corte
  // válidas dentro da palavra, deixando pelo menos 2 chars de cada lado.
  function hyphenPoints(word: string): number[] {
    // Regras silábicas PT-BR simplificadas:
    // V-CV (te-la), VC-CV (tem-po, con-for-me), mantendo encontros
    // consonantais inseparáveis juntos (so[m]-[br]as, a-[pl]au-so),
    // e dígrafos ch/lh/nh/qu/gu também inseparáveis.
    const pts: number[] = [];
    const vowels = /[aeiouáéíóúâêôãõàüyAEIOUÁÉÍÓÚÂÊÔÃÕÀÜY]/;
    const inseparable = new Set([
      "bl","br","cl","cr","dl","dr","fl","fr","gl","gr","pl","pr","tl","tr","vl","vr",
      "ch","lh","nh","qu","gu",
    ]);
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
        if (consCount === 0) {
          breakAt = i + 1; // hiato V|V
        } else if (consCount === 1) {
          breakAt = i + 1; // V|CV
        } else {
          // mais de uma consoante: mantém cluster inseparável junto à próxima vogal
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

  function drawParagraph(text: string, opts?: { italic?: boolean; size?: number; color?: ReturnType<typeof rgb>; justify?: boolean }) {
    const size = opts?.size ?? 12.5;
    const font = opts?.italic ? serifItalic : serif;
    const color = opts?.color ?? INK;
    const justify = opts?.justify ?? true;
    const lineHeight = size * 1.45;
    const spaceW = measureText(font, size, " ");
    const cleaned = safe(text).trim();
    // Split em paragrafos: respeita quebras de linha explicitas; quando o
    // texto vem como bloco unico, agrupa em paragrafos de ~3 frases para
    // garantir espacamento visivel.
    let paragraphs: string[];
    if (/\n/.test(cleaned)) {
      paragraphs = cleaned.split(/\n+/);
    } else {
      const sentences = cleaned.match(/[^.!?]+[.!?]+(?:\s|$)/g) ?? [cleaned];
      paragraphs = [];
      for (let i = 0; i < sentences.length; i += 3) {
        paragraphs.push(sentences.slice(i, i + 3).join(" ").trim());
      }
    }

    // Tenta dividir uma palavra em (prefixo + "-", restante) de modo que o
    // prefixo caiba em `availableWidth`. Devolve null se não houver corte viável.
    function tryHyphenate(word: string, availableWidth: number): [string, string] | null {
      if (word.length < 6) return null;
      const points = hyphenPoints(word);
      // Procura do maior corte que ainda caiba
      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        const head = word.slice(0, p) + "-";
        if (measureText(font, size, head) <= availableWidth) {
          return [head, word.slice(p)];
        }
      }
      return null;
    }

    for (const paraRaw of paragraphs) {
      const para = paraRaw.trim();
      if (!para) {
        cursor.y -= lineHeight * 0.5;
        continue;
      }
      const queue = para.split(/\s+/);
      const lines: string[][] = [];
      let current: string[] = [];
      let currentWidth = 0;

      while (queue.length > 0) {
        const w = queue.shift()!;
        const wWidth = measureText(font, size, w);
        if (current.length === 0) {
          // Palavra única; se for maior que a linha inteira, força hifenização
          if (wWidth > CONTENT_W) {
            const split = tryHyphenate(w, CONTENT_W);
            if (split) {
              current = [split[0]];
              currentWidth = measureText(font, size, split[0]);
              queue.unshift(split[1]);
              lines.push(current);
              current = [];
              currentWidth = 0;
              continue;
            }
          }
          current = [w];
          currentWidth = wWidth;
        } else {
          const tentative = currentWidth + spaceW + wWidth;
          if (tentative > CONTENT_W) {
            // Tenta hifenizar para encaixar parte da palavra nesta linha
            const remaining = CONTENT_W - currentWidth - spaceW;
            const split = tryHyphenate(w, remaining);
            if (split) {
              current.push(split[0]);
              lines.push(current);
              current = [];
              currentWidth = 0;
              queue.unshift(split[1]);
            } else {
              lines.push(current);
              current = [w];
              currentWidth = wWidth;
            }
          } else {
            current.push(w);
            currentWidth = tentative;
          }
        }
      }
      if (current.length) lines.push(current);

      // Controle de orfas/viuvas (relaxado para nao desperdicar paginas):
      // - so move o paragrafo todo se nao houver espaco nem para 1 linha.
      // - se sobraria 1 unica linha para a proxima pagina (viuva) e o
      //   paragrafo tem >=3 linhas, antecipa a quebra para levar 2 juntas.
      const linesAvailable = Math.max(0, Math.floor((cursor.y - MARGIN) / lineHeight));
      let breakAt = lines.length;
      if (linesAvailable < 1 && lines.length >= 1) {
        cursor = newPage(pdf, cursor.pageNumber + 1);
        breakAt = lines.length;
      } else if (lines.length > linesAvailable && lines.length - linesAvailable === 1 && linesAvailable >= 3) {
        breakAt = linesAvailable - 1;
      } else if (lines.length > linesAvailable) {
        breakAt = linesAvailable;
      }

      for (let li = 0; li < lines.length; li++) {
        if (li === breakAt) {
          cursor = newPage(pdf, cursor.pageNumber + 1);
          const rem = lines.length - li;
          const avail = Math.max(0, Math.floor((cursor.y - MARGIN) / lineHeight));
          if (rem > avail) breakAt = li + (rem - avail === 1 && avail >= 3 ? avail - 1 : avail);
          else breakAt = lines.length;
        }
        const lineWords = lines[li];
        const isLast = li === lines.length - 1;
        if (justify && !isLast && lineWords.length > 1) {
          const wordsWidth = lineWords.reduce((s, w) => s + measureText(font, size, w), 0);
          const gaps = lineWords.length - 1;
          const gap = Math.min((CONTENT_W - wordsWidth) / gaps, spaceW * 4);
          let x = MARGIN;
          for (const w of lineWords) {
            cursor.page.drawText(w, { x, y: cursor.y - size, size, font, color });
            x += measureText(font, size, w) + gap;
          }
        } else {
          cursor.page.drawText(lineWords.join(" "), {
            x: MARGIN, y: cursor.y - size, size, font, color,
          });
        }
        cursor.y -= lineHeight;
      }
      // Espaco visivel entre paragrafos (~meia linha); suprime se acabamos de virar a pagina
      const paraGap = Math.round(lineHeight * 0.55);
      if (cursor.y < PAGE_H - MARGIN - paraGap) cursor.y -= paraGap;
    }
  }





  function drawBulletList(items: string[]) {
    const size = 12.5;
    const lineHeight = size * 1.5;
    for (const item of items) {
      const lines = wrap(safe("- " + item), serif, size, CONTENT_W - 14);
      for (let i = 0; i < lines.length; i++) {
        ensureSpace(lineHeight);
        cursor.page.drawText(lines[i], {
          x: MARGIN + (i === 0 ? 0 : 14),
          y: cursor.y - size,
          size, font: serif, color: INK,
        });
        cursor.y -= lineHeight;
      }
      cursor.y -= 3;
    }
    cursor.y -= 6;
  }

  function drawSubHeading(text: string, color = NIGHT) {
    const size = 15;
    ensureSpace(size + 16);
    cursor.page.drawText(safe(text), {
      x: MARGIN, y: cursor.y - size, size, font: serifBold, color,
    });
    cursor.y -= size + 12;
  }

  // Intro chapter
  setChapter("Abertura");
  drawHeading("Abertura", 30);
  drawParagraph(data.intro, { italic: true, size: 14, color: rgb(0.25, 0.22, 0.18) });

  // Sections
  for (const section of data.sections) {
    setChapter(section.title);
    drawHeading(section.title, 22, { startOnNewPage: true });
    drawParagraph(section.body);
  }

  // Closing
  setChapter("Selo final");
  drawHeading("Selo final", 22, { startOnNewPage: true });
  drawParagraph(data.closing, { italic: true, color: rgb(0.3, 0.25, 0.2) });

  // Analise
  setChapter("Analise");
  drawHeading("Analise", 24, { startOnNewPage: true });
  drawParagraph(
    "Sintese das forcas, fraquezas, oportunidades e ameacas reveladas pelo seu mapa.",
    { italic: true, size: 14, color: MUTED },
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
  drawHeading("Recomendacoes finais", 24, { startOnNewPage: true });
  drawSubHeading("O que MELHORAR", rgb(0.15, 0.4, 0.2));
  drawBulletList(data.recommendations.improve);
  drawSubHeading("O que EVITAR", rgb(0.55, 0.15, 0.2));
  drawBulletList(data.recommendations.avoid);
  drawSubHeading("O que SEGUIR", rgb(0.65, 0.5, 0.1));
  drawBulletList(data.recommendations.follow);

  // Sugestoes (personalizadas por tema)
  if (data.suggestions?.items?.length) {
    setChapter(data.suggestions.heading);
    drawHeading(data.suggestions.heading, 24, { startOnNewPage: true });
    if (data.suggestions.intro) {
      drawParagraph(data.suggestions.intro, { italic: true, size: 14, color: MUTED });
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
  drawHeading("Resumo", 24, { startOnNewPage: true });
  drawParagraph(data.summary);

  // Plano de 7 dias (único, ao final, baseado no resumo)
  if (data.finalPlan) {
    setChapter("Plano de 7 dias");
    drawHeading("Plano de 7 dias", 24, { startOnNewPage: true });
    drawParagraph(
      "Pequenos passos diários, em linguagem simples, baseados no resumo deste relatório.",
      { italic: true, size: 14, color: MUTED },
    );
    const labelDays = (arr: string[]) =>
      arr.slice(0, 7).map((it, i) => (/^dia\s+\d+:/i.test(it) ? it : `Dia ${i + 1}: ${it}`));
    drawSubHeading("Melhorar", rgb(0.15, 0.4, 0.2));
    drawBulletList(labelDays(data.finalPlan.improve));
    drawSubHeading("Evitar", rgb(0.55, 0.15, 0.2));
    drawBulletList(labelDays(data.finalPlan.avoid));
    drawSubHeading("Seguir", rgb(0.65, 0.5, 0.1));
    drawBulletList(labelDays(data.finalPlan.follow));
  }

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

