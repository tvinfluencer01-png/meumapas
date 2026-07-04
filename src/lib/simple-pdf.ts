/**
 * Helper de PDF para módulos leves (Tarot, Meditação Cabalística).
 *
 * Visualmente alinhado ao template premium (`buildReportPdf`):
 * - Capa em fundo escuro com moldura dourada e título serifado
 * - Páginas internas em pergaminho com cabeçalho dourado + rodapé
 * - Tipografia serifada (Times) com parágrafos justificados
 * - Títulos com sublinhado dourado e quebra de página automática
 *
 * Mantém a API pública (`SimplePdfBlock`, `SimplePdfData`, `buildSimplePdf`)
 * para que tarot.functions.ts e kabbalah.functions.ts continuem funcionando
 * sem alterações.
 */
import { PDFDocument, StandardFonts, rgb, PageSizes, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { hyphenPointsPt } from "./pt-hyphen";


export type SimplePdfBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; items: string[] }
  | { type: "kv"; rows: { k: string; v: string }[] }
  | { type: "image"; pngB64: string; caption?: string; maxHeight?: number }
  | { type: "hebrew-hero"; letter: string; name: string; transliteration: string; meaning: string }
  | { type: "hebrew-row"; letter: string; name: string; value: number | string; meaning: string }
  | { type: "hebrew-name"; latinName: string; hebrewWords: string[]; caption?: string };

export type SimplePdfBranding = {
  coverImageBytes?: Uint8Array;
  coverImageMime?: "image/png" | "image/jpeg";
  logoBytes?: Uint8Array;
  logoMime?: "image/png" | "image/jpeg";
  logoWidth?: number;
  logoHeight?: number;
  displayName?: string;
  footerEnabled?: boolean;
  footerName?: string;
  footerSite?: string;
  footerPhone?: string;
  coverBgColor?: string; // #RRGGBB
  coverAccentColor?: string; // #RRGGBB
  coverTitlePosition?: "top" | "center" | "bottom";
  fontFamily?: "serif" | "sans" | "display";
  headerBgColor?: string;
  footerBgColor?: string;
  headerTextColor?: string;
  // ---- PDF CSS Avançado ----
  pageBgColor?: string;
  pageBgImageBytes?: Uint8Array;
  pageBgImageMime?: "image/png" | "image/jpeg";
  watermarkImageBytes?: Uint8Array;
  watermarkImageMime?: "image/png" | "image/jpeg";
  watermarkOpacity?: number; // 0..1
  bodyTextColor?: string;
  headingTextColor?: string;
  bodyFontSize?: number; // default 12.5
  lineHeight?: number; // multiplier (default 1.45)
  frameStyle?: "none" | "simple" | "double" | "ornamental";
};

export type SimplePdfData = {
  brand: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  consultantName?: string;
  meta?: string[];
  blocks: SimplePdfBlock[];
  accentHex?: string; // mantido por compatibilidade; ignorado em favor do dourado do template
  /**
   * Quando true, os títulos `h2` não forçam quebra de página — o conteúdo
   * flui um abaixo do outro. Usado pela Meditação Cabalística.
   */
  flowing?: boolean;
  /**
   * Personalização opcional do branding (capa, cores, fonte, faixas).
   * Quando ausente ou indefinido, mantém o template dourado padrão.
   */
  branding?: SimplePdfBranding;
};

// ---------- Paleta do template ----------
const GOLD = rgb(0.831, 0.686, 0.216);
const NIGHT = rgb(0.012, 0.027, 0.067);
const PARCHMENT = rgb(0.96, 0.94, 0.89);
const INK = rgb(0.15, 0.13, 0.1);
const MUTED = rgb(0.45, 0.42, 0.36);

const MARGIN = 56;
const [PAGE_W, PAGE_H] = PageSizes.A4;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Sanitiza para WinAnsi. Preserva hebraico (será desenhado com fonte própria
// quando disponível) — para isso, usamos `sanitize` apenas em strings que
// vão para as Standard fonts (Times/Helvetica).
function safe(s: string): string {
  return s
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A1-\u017F]/g, "");
}

// Cache de medição para acelerar justificação.
const WIDTH_CACHE = new WeakMap<PDFFont, Map<string, number>>();
function measure(font: PDFFont, size: number, text: string): number {
  let c = WIDTH_CACHE.get(font);
  if (!c) {
    c = new Map();
    WIDTH_CACHE.set(font, c);
  }
  const k = `${size}:${text}`;
  const hit = c.get(k);
  if (hit != null) return hit;
  const w = font.widthOfTextAtSize(text, size);
  c.set(k, w);
  return w;
}

// Hifenização pt-BR compartilhada (padrões TeX via pacote `hyphen`).
function hyphenPoints(word: string): number[] {
  return hyphenPointsPt(word);
}


function hexToRgb(hex: string): ReturnType<typeof rgb> {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return GOLD;
  const v = parseInt(m[1], 16);
  return rgb(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255);
}

export async function buildSimplePdf(data: SimplePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(safe(data.title));
  doc.setAuthor("Código Cósmico");
  doc.setSubject(safe(data.subtitle ?? data.eyebrow));
  doc.setCreator("Código Cósmico - Oraculo");

  // Famílias possíveis para o branding
  const timesRegular = await doc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const helvRegular = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helvOblique = await doc.embedFont(StandardFonts.HelveticaOblique);
  const courierRegular = await doc.embedFont(StandardFonts.Courier);
  const courierBold = await doc.embedFont(StandardFonts.CourierBold);
  const courierOblique = await doc.embedFont(StandardFonts.CourierOblique);

  const fontChoice = data.branding?.fontFamily ?? "serif";
  const serif =
    fontChoice === "sans" ? helvRegular : fontChoice === "display" ? courierRegular : timesRegular;
  const serifBold =
    fontChoice === "sans" ? helvBold : fontChoice === "display" ? courierBold : timesBold;
  const serifItalic =
    fontChoice === "sans" ? helvOblique : fontChoice === "display" ? courierOblique : timesItalic;
  // sans permanece para labels pequenos sempre legíveis
  const sans = helvRegular;

  // Fonte hebraica opcional
  let fontHebrew: PDFFont | null = null;
  try {
    const res = await fetch("/fonts/NotoSansHebrew-Regular.ttf");
    if (res.ok) {
      const bytes = await res.arrayBuffer();
      fontHebrew = await doc.embedFont(bytes, { subset: true });
    }
  } catch {
    fontHebrew = null;
  }

  // Branding colors with fallbacks
  const b = data.branding;
  const coverBg = b?.coverBgColor ? hexToRgb(b.coverBgColor) : NIGHT;
  const accent = b?.coverAccentColor ? hexToRgb(b.coverAccentColor) : GOLD;
  const headerBg = b?.headerBgColor ? hexToRgb(b.headerBgColor) : PARCHMENT;
  const footerBg = b?.footerBgColor ? hexToRgb(b.footerBgColor) : PARCHMENT;
  const headerText = b?.headerTextColor ? hexToRgb(b.headerTextColor) : GOLD;
  const titlePos = b?.coverTitlePosition ?? "center";
  // ---- PDF CSS Avançado ----
  const pageBg = b?.pageBgColor ? hexToRgb(b.pageBgColor) : PARCHMENT;
  const bodyTextC = b?.bodyTextColor ? hexToRgb(b.bodyTextColor) : INK;
  const headingTextC = b?.headingTextColor ? hexToRgb(b.headingTextColor) : NIGHT;
  const bodySize = typeof b?.bodyFontSize === "number" ? b.bodyFontSize : 12.5;
  const lineMul = typeof b?.lineHeight === "number" ? b.lineHeight : 1.45;
  const frame = b?.frameStyle ?? "double";
  const wmOpacity = typeof b?.watermarkOpacity === "number" ? Math.max(0, Math.min(1, b.watermarkOpacity)) : 0.08;

  // Embed page bg image and watermark once (used by every newPage call)
  let pageBgImage: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  if (b?.pageBgImageBytes && b.pageBgImageMime) {
    try {
      pageBgImage =
        b.pageBgImageMime === "image/png"
          ? await doc.embedPng(b.pageBgImageBytes)
          : await doc.embedJpg(b.pageBgImageBytes);
    } catch { pageBgImage = null; }
  }
  let watermarkImage: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  if (b?.watermarkImageBytes && b.watermarkImageMime) {
    try {
      watermarkImage =
        b.watermarkImageMime === "image/png"
          ? await doc.embedPng(b.watermarkImageBytes)
          : await doc.embedJpg(b.watermarkImageBytes);
    } catch { watermarkImage = null; }
  }

  // -------- CAPA --------
  const cover = doc.addPage(PageSizes.A4);
  // fundo sólido
  cover.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: coverBg });
  // imagem de capa opcional (cobre toda a página)
  if (b?.coverImageBytes && b.coverImageMime) {
    try {
      const img =
        b.coverImageMime === "image/png"
          ? await doc.embedPng(b.coverImageBytes)
          : await doc.embedJpg(b.coverImageBytes);
      // cover, mantendo proporção
      const ratio = Math.max(PAGE_W / img.width, PAGE_H / img.height);
      const drawW = img.width * ratio;
      const drawH = img.height * ratio;
      cover.drawImage(img, {
        x: (PAGE_W - drawW) / 2,
        y: (PAGE_H - drawH) / 2,
        width: drawW,
        height: drawH,
        opacity: 0.85,
      });
      // overlay escuro suave para legibilidade
      cover.drawRectangle({
        x: 0,
        y: 0,
        width: PAGE_W,
        height: PAGE_H,
        color: coverBg,
        opacity: 0.45,
      });
    } catch {
      /* ignora imagem inválida */
    }
  }

  // Moldura da capa (estilo configurável)
  const inset = 28;
  if (frame !== "none") {
    cover.drawRectangle({
      x: inset, y: inset,
      width: PAGE_W - inset * 2, height: PAGE_H - inset * 2,
      borderColor: accent, borderWidth: frame === "ornamental" ? 1.2 : 0.8,
    });
    if (frame === "double" || frame === "ornamental") {
      cover.drawRectangle({
        x: inset + 6, y: inset + 6,
        width: PAGE_W - inset * 2 - 12, height: PAGE_H - inset * 2 - 12,
        borderColor: accent, borderWidth: 0.3,
      });
    }
    if (frame === "ornamental") {
      // pequenos cantos decorativos
      const corners: Array<[number, number]> = [
        [inset + 14, inset + 14],
        [PAGE_W - inset - 14, inset + 14],
        [inset + 14, PAGE_H - inset - 14],
        [PAGE_W - inset - 14, PAGE_H - inset - 14],
      ];
      for (const [cx, cy] of corners) {
        cover.drawCircle({ x: cx, y: cy, size: 3, color: accent });
      }
    }
  }

  const topLabel = safe(`${data.brand.toUpperCase()}  -  ${data.eyebrow.toUpperCase()}`);
  const topLabelW = sans.widthOfTextAtSize(topLabel, 9);
  cover.drawText(topLabel, {
    x: (PAGE_W - topLabelW) / 2, y: PAGE_H - 100,
    size: 9, font: sans, color: accent,
  });

  // Logo personalizado no topo da capa
  if (b?.logoBytes && b.logoMime) {
    try {
      const logoImg =
        b.logoMime === "image/png"
          ? await doc.embedPng(b.logoBytes)
          : await doc.embedJpg(b.logoBytes);
      const lw = b.logoWidth ?? 120;
      const lh = b.logoHeight ?? 60;
      cover.drawImage(logoImg, {
        x: (PAGE_W - lw) / 2,
        y: PAGE_H - 100 - lh - 12,
        width: lw,
        height: lh,
      });
    } catch {
      /* ignora logo inválido */
    }
  } else if (b?.displayName) {
    const dn = safe(b.displayName);
    const dw0 = serifBold.widthOfTextAtSize(dn, 16);
    cover.drawText(dn, {
      x: (PAGE_W - dw0) / 2,
      y: PAGE_H - 130,
      size: 16,
      font: serifBold,
      color: accent,
    });
  }

  // Título (quebra se necessário). Posição vertical depende de titlePos.
  const titleSize = 38;
  const titleLines = wrapPlain(safe(data.title), serifBold, titleSize, CONTENT_W - 40);
  const titleBlockH = titleLines.length * titleSize * 1.05;
  let titleAnchorY: number;
  if (titlePos === "top") {
    titleAnchorY = PAGE_H - 180;
  } else if (titlePos === "bottom") {
    titleAnchorY = 220 + titleBlockH;
  } else {
    titleAnchorY = PAGE_H / 2 + 60 + (titleLines.length - 1) * (titleSize * 0.5);
  }
  let ty = titleAnchorY;
  for (const line of titleLines) {
    const w = serifBold.widthOfTextAtSize(line, titleSize);
    cover.drawText(line, {
      x: (PAGE_W - w) / 2, y: ty, size: titleSize, font: serifBold, color: accent,
    });
    ty -= titleSize * 1.05;
  }

  if (data.subtitle) {
    const subSize = 14;
    const subLines = wrapPlain(safe(data.subtitle), serifItalic, subSize, CONTENT_W - 60);
    let sy = ty - 16;
    for (const line of subLines.slice(0, 3)) {
      const w = serifItalic.widthOfTextAtSize(line, subSize);
      cover.drawText(line, {
        x: (PAGE_W - w) / 2, y: sy, size: subSize, font: serifItalic, color: PARCHMENT,
      });
      sy -= subSize * 1.4;
    }
  }

  cover.drawLine({
    start: { x: PAGE_W / 2 - 40, y: Math.max(120, ty - 60) },
    end: { x: PAGE_W / 2 + 40, y: Math.max(120, ty - 60) },
    color: accent, thickness: 0.8,
  });

  const coverBlocks: { label: string; value: string }[] = [];
  if (data.consultantName) coverBlocks.push({ label: "PARA", value: data.consultantName });
  for (const m of data.meta ?? []) {
    const match = m.match(/^([^:]{1,40}):\s*(.+)$/);
    if (match) coverBlocks.push({ label: match[1].toUpperCase(), value: match[2] });
    else coverBlocks.push({ label: "", value: m });
  }
  let by = Math.max(110, ty - 90);
  for (const bb of coverBlocks) {
    if (bb.label) {
      const lab = safe(bb.label);
      const lw = sans.widthOfTextAtSize(lab, 8);
      cover.drawText(lab, { x: (PAGE_W - lw) / 2, y: by, size: 8, font: sans, color: accent });
      by -= 14;
    }
    const val = safe(bb.value);
    const vw = serif.widthOfTextAtSize(val, 12);
    cover.drawText(val, { x: (PAGE_W - vw) / 2, y: by, size: 12, font: serif, color: PARCHMENT });
    by -= 26;
  }

  const dateStr = safe(new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }));
  const dw = sans.widthOfTextAtSize(dateStr, 9);
  cover.drawText(dateStr, {
    x: (PAGE_W - dw) / 2, y: 70, size: 9, font: sans, color: accent,
  });

  // -------- PÁGINAS DE CONTEÚDO --------
  type Cursor = { page: PDFPage; y: number; pageNumber: number };
  const headerLabel = safe(data.title.toUpperCase());
  const customFooter =
    b?.footerEnabled !== false
      ? [b?.footerName, b?.footerSite, b?.footerPhone].filter(Boolean).join("  ·  ")
      : "";
  const footerTextStr = customFooter
    ? safe(customFooter)
    : safe(`${data.brand} - Inteligencia espiritual personalizada`);

  function newPage(num: number): Cursor {
    const page = doc.addPage(PageSizes.A4);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: pageBg });
    // imagem de fundo da página (cover, respeitando proporção)
    if (pageBgImage) {
      const ratio = Math.max(PAGE_W / pageBgImage.width, PAGE_H / pageBgImage.height);
      const dw = pageBgImage.width * ratio;
      const dh = pageBgImage.height * ratio;
      page.drawImage(pageBgImage, {
        x: (PAGE_W - dw) / 2, y: (PAGE_H - dh) / 2,
        width: dw, height: dh, opacity: 0.85,
      });
    }
    // marca d'água (centralizada, opacidade configurável)
    if (watermarkImage) {
      const maxW = PAGE_W * 0.55;
      const ratio = watermarkImage.height / watermarkImage.width;
      const ww = maxW;
      const wh = ww * ratio;
      page.drawImage(watermarkImage, {
        x: (PAGE_W - ww) / 2, y: (PAGE_H - wh) / 2,
        width: ww, height: wh, opacity: wmOpacity,
      });
    }
    // faixa de topo
    page.drawRectangle({
      x: 0, y: PAGE_H - MARGIN + 16,
      width: PAGE_W, height: MARGIN - 16,
      color: headerBg,
    });
    // faixa de rodapé
    page.drawRectangle({
      x: 0, y: 0,
      width: PAGE_W, height: MARGIN - 16,
      color: footerBg,
    });
    page.drawLine({
      start: { x: MARGIN, y: PAGE_H - MARGIN + 24 },
      end: { x: PAGE_W - MARGIN, y: PAGE_H - MARGIN + 24 },
      color: accent, thickness: 0.5,
    });
    page.drawText(headerLabel, {
      x: MARGIN, y: PAGE_H - MARGIN + 30, size: 8, font: sans, color: headerText,
    });
    const numTxt = String(num);
    const nw = sans.widthOfTextAtSize(numTxt, 8);
    page.drawText(numTxt, {
      x: PAGE_W - MARGIN - nw, y: PAGE_H - MARGIN + 30, size: 8, font: sans, color: headerText,
    });
    const fw = sans.widthOfTextAtSize(footerTextStr, 8);
    page.drawText(footerTextStr, {
      x: (PAGE_W - fw) / 2, y: MARGIN - 24, size: 8, font: sans, color: headerText,
    });
    return { page, y: PAGE_H - MARGIN, pageNumber: num };
  }

  let cursor: Cursor = newPage(1);

  function ensureSpace(needed: number) {
    if (cursor.y - needed < MARGIN) {
      cursor = newPage(cursor.pageNumber + 1);
    }
  }

  function wrapPlain(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const out: string[] = [];
    for (const para of text.split(/\n+/)) {
      const words = para.split(/\s+/);
      let line = "";
      for (const w of words) {
        const cand = line ? line + " " + w : w;
        if (measure(font, size, cand) > maxWidth) {
          if (line) out.push(line);
          line = w;
        } else {
          line = cand;
        }
      }
      if (line) out.push(line);
    }
    return out.length ? out : [""];
  }

  let isFirstHeading = true;
  function drawHeading(text: string, size = 24, opts?: { newPage?: boolean }) {
    if (!isFirstHeading) {
      if (opts?.newPage) {
        cursor = newPage(cursor.pageNumber + 1);
      } else {
        const need = size + 20 + size * 1.4 * 3;
        if (cursor.y - need < MARGIN) cursor = newPage(cursor.pageNumber + 1);
        else cursor.y -= 20;
      }
    }
    isFirstHeading = false;
    cursor.y -= 8;
    const lines = wrapPlain(safe(text), serifBold, size, CONTENT_W);
    for (const ln of lines) {
      cursor.page.drawText(ln, {
        x: MARGIN, y: cursor.y - size, size, font: serifBold, color: headingTextC,
      });
      cursor.y -= size + 4;
    }
    cursor.y -= 3;
    cursor.page.drawLine({
      start: { x: MARGIN, y: cursor.y },
      end: { x: MARGIN + 56, y: cursor.y },
      color: accent, thickness: 1.2,
    });
    cursor.y -= 14;
  }

  function drawSubHeading(text: string) {
    const size = 15;
    ensureSpace(size + 16);
    cursor.page.drawText(safe(text), {
      x: MARGIN, y: cursor.y - size, size, font: serifBold, color: headingTextC,
    });
    cursor.y -= size + 12;
  }

  function drawParagraph(text: string, opts?: { italic?: boolean; size?: number; color?: ReturnType<typeof rgb>; justify?: boolean }) {
    const size = opts?.size ?? bodySize;
    const font = opts?.italic ? serifItalic : serif;
    const color = opts?.color ?? bodyTextC;
    const justify = opts?.justify ?? true;
    const lineHeight = size * lineMul;
    const spaceW = measure(font, size, " ");
    const cleaned = safe(text).trim();
    if (!cleaned) return;

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

    function tryHyphenate(word: string, availableWidth: number): [string, string] | null {
      if (word.length < 6) return null;
      const points = hyphenPoints(word);
      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        const head = word.slice(0, p) + "-";
        if (measure(font, size, head) <= availableWidth) {
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
        const wWidth = measure(font, size, w);
        if (current.length === 0) {
          if (wWidth > CONTENT_W) {
            const split = tryHyphenate(w, CONTENT_W);
            if (split) {
              lines.push([split[0]]);
              queue.unshift(split[1]);
              continue;
            }
          }
          current = [w];
          currentWidth = wWidth;
        } else {
          const tentative = currentWidth + spaceW + wWidth;
          if (tentative > CONTENT_W) {
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

      for (let li = 0; li < lines.length; li++) {
        ensureSpace(lineHeight);
        const lineWords = lines[li];
        const isLast = li === lines.length - 1;
        if (justify && !isLast && lineWords.length > 1) {
          const wordsWidth = lineWords.reduce((s, w) => s + measure(font, size, w), 0);
          const gaps = lineWords.length - 1;
          const gap = Math.min((CONTENT_W - wordsWidth) / gaps, spaceW * 4);
          let x = MARGIN;
          for (const w of lineWords) {
            cursor.page.drawText(w, { x, y: cursor.y - size, size, font, color });
            x += measure(font, size, w) + gap;
          }
        } else {
          cursor.page.drawText(lineWords.join(" "), {
            x: MARGIN, y: cursor.y - size, size, font, color,
          });
        }
        cursor.y -= lineHeight;
      }
      const paraGap = Math.round(lineHeight * 0.55);
      if (cursor.y < PAGE_H - MARGIN - paraGap) cursor.y -= paraGap;
    }
  }

  function drawBulletList(items: string[]) {
    const size = 11;
    const lineHeight = size * 1.5;
    for (const item of items) {
      const lines = wrapPlain(safe("- " + item), serif, size, CONTENT_W - 12);
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

  function drawKv(rows: { k: string; v: string }[]) {
    const labelW = 110;
    const size = 11;
    const lh = size * 1.4;
    for (const r of rows) {
      ensureSpace(lh + 4);
      cursor.page.drawText(safe(r.k), {
        x: MARGIN, y: cursor.y - size, size: 10, font: serifBold, color: MUTED,
      });
      const lines = wrapPlain(safe(r.v), serif, size, CONTENT_W - labelW);
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          ensureSpace(lh);
          cursor.y -= lh;
        }
        cursor.page.drawText(lines[i], {
          x: MARGIN + labelW, y: cursor.y - size, size, font: serif, color: INK,
        });
      }
      cursor.y -= lh + 4;
    }
    cursor.y -= 2;
  }

  function drawQuote(text: string) {
    drawParagraph(text, { italic: true, color: rgb(0.3, 0.25, 0.2), size: 13 });
  }

  function drawHebrewHero(b: { letter: string; name: string; transliteration: string; meaning: string }) {
    ensureSpace(96);
    const boxH = 86;
    cursor.page.drawRectangle({
      x: MARGIN, y: cursor.y - boxH, width: CONTENT_W, height: boxH,
      color: rgb(0.98, 0.96, 0.88), borderColor: GOLD, borderWidth: 0.8,
    });
    if (fontHebrew) {
      const hSize = 56;
      const w = fontHebrew.widthOfTextAtSize(b.letter, hSize);
      cursor.page.drawText(b.letter, {
        x: MARGIN + CONTENT_W - w - 18, y: cursor.y - boxH + 16,
        size: hSize, font: fontHebrew, color: GOLD,
      });
    }
    cursor.page.drawText(safe(b.name.toUpperCase()), {
      x: MARGIN + 16, y: cursor.y - 20, size: 10, font: sans, color: GOLD,
    });
    cursor.page.drawText(safe(b.transliteration), {
      x: MARGIN + 16, y: cursor.y - 40, size: 16, font: serifBold, color: NIGHT,
    });
    const mLines = wrapPlain(safe(b.meaning), serifItalic, 10, CONTENT_W - 110);
    let my = cursor.y - 58;
    for (const ln of mLines.slice(0, 2)) {
      cursor.page.drawText(ln, { x: MARGIN + 16, y: my, size: 10, font: serifItalic, color: MUTED });
      my -= 12;
    }
    cursor.y -= boxH + 12;
  }

  function drawHebrewRow(b: { letter: string; name: string; value: number | string; meaning: string }) {
    const meaningLines = wrapPlain(safe(b.meaning), serif, 10, CONTENT_W - 160);
    const rowH = Math.max(24, meaningLines.length * 12 + 6);
    ensureSpace(rowH);
    if (fontHebrew) {
      cursor.page.drawText(b.letter, {
        x: MARGIN, y: cursor.y - 16, size: 18, font: fontHebrew, color: GOLD,
      });
    }
    cursor.page.drawText(safe(b.name), {
      x: MARGIN + 34, y: cursor.y - 12, size: 11, font: serifBold, color: NIGHT,
    });
    cursor.page.drawText(safe(String(b.value)), {
      x: MARGIN + 118, y: cursor.y - 12, size: 11, font: serifBold, color: GOLD,
    });
    let my = cursor.y - 12;
    for (const ln of meaningLines.slice(0, 2)) {
      cursor.page.drawText(ln, { x: MARGIN + 160, y: my, size: 10, font: serif, color: INK });
      my -= 12;
    }
    cursor.y -= rowH;
  }

  function drawHebrewName(b: { latinName: string; hebrewWords: string[]; caption?: string }) {
    ensureSpace(118);
    const boxH = 108;
    cursor.page.drawRectangle({
      x: MARGIN, y: cursor.y - boxH, width: CONTENT_W, height: boxH,
      color: rgb(0.98, 0.96, 0.88), borderColor: GOLD, borderWidth: 0.8,
    });
    cursor.page.drawText(safe("SEU NOME EM HEBRAICO"), {
      x: MARGIN + 16, y: cursor.y - 20, size: 10, font: sans, color: GOLD,
    });
    cursor.page.drawText(safe(b.latinName), {
      x: MARGIN + 16, y: cursor.y - 38, size: 12, font: serifBold, color: NIGHT,
    });
    if (fontHebrew) {
      const hSize = 30;
      const gap = 18;
      const reversed = b.hebrewWords.map((w) => w.split("").reverse().join(""));
      const widths = reversed.map((w) => fontHebrew!.widthOfTextAtSize(w, hSize));
      const totalW = widths.reduce((a, b2) => a + b2, 0) + gap * Math.max(0, reversed.length - 1);
      let drawX = MARGIN + (CONTENT_W - totalW) / 2;
      for (let i = 0; i < reversed.length; i++) {
        cursor.page.drawText(reversed[i], {
          x: drawX, y: cursor.y - 82, size: hSize, font: fontHebrew, color: GOLD,
        });
        drawX += widths[i] + gap;
      }
    } else {
      cursor.page.drawText(safe("(fonte hebraica indisponivel)"), {
        x: MARGIN + 16, y: cursor.y - 74, size: 11, font: serifItalic, color: MUTED,
      });
    }
    if (b.caption) {
      const cLines = wrapPlain(safe(b.caption), serifItalic, 9, CONTENT_W - 28);
      cursor.page.drawText(cLines[0] ?? "", {
        x: MARGIN + 16, y: cursor.y - boxH + 12, size: 9, font: serifItalic, color: MUTED,
      });
    }
    cursor.y -= boxH + 12;
  }

  // -------- RENDER BLOCKS --------
  async function drawImage(b: { pngB64: string; caption?: string; maxHeight?: number }) {
    try {
      const bytes = Uint8Array.from(Buffer.from(b.pngB64, "base64"));
      const img = await doc.embedPng(bytes);
      const maxH = b.maxHeight ?? 360;
      const ratio = img.height / img.width;
      let w = CONTENT_W;
      let h = w * ratio;
      if (h > maxH) { h = maxH; w = h / ratio; }
      ensureSpace(h + (b.caption ? 18 : 8));
      const x = MARGIN + (CONTENT_W - w) / 2;
      cursor.page.drawImage(img, { x, y: cursor.y - h, width: w, height: h });
      cursor.y -= h + 6;
      if (b.caption) {
        const cap = safe(b.caption);
        const cw = serifItalic.widthOfTextAtSize(cap, 9);
        cursor.page.drawText(cap, {
          x: MARGIN + (CONTENT_W - cw) / 2, y: cursor.y - 10,
          size: 9, font: serifItalic, color: MUTED,
        });
        cursor.y -= 16;
      }
      cursor.y -= 6;
    } catch (e) {
      console.error("[simple-pdf] image embed failed", e);
    }
  }

  for (const block of data.blocks) {
    if (block.type === "h2") drawHeading(block.text, 22, { newPage: !data.flowing });
    else if (block.type === "h3") drawSubHeading(block.text);
    else if (block.type === "p") drawParagraph(block.text);
    else if (block.type === "quote") drawQuote(block.text);
    else if (block.type === "list") drawBulletList(block.items);
    else if (block.type === "kv") drawKv(block.rows);
    else if (block.type === "image") await drawImage(block);
    else if (block.type === "hebrew-hero") drawHebrewHero(block);
    else if (block.type === "hebrew-row") drawHebrewRow(block);
    else if (block.type === "hebrew-name") drawHebrewName(block);
  }

  // assinatura final
  ensureSpace(60);
  cursor.y -= 18;
  cursor.page.drawLine({
    start: { x: MARGIN, y: cursor.y },
    end: { x: MARGIN + 160, y: cursor.y },
    color: GOLD, thickness: 0.6,
  });
  cursor.y -= 14;
  cursor.page.drawText(safe(`Oraculo ${data.brand}`), {
    x: MARGIN, y: cursor.y - 9, size: 9, font: sans, color: MUTED,
  });

  return await doc.save();
}
