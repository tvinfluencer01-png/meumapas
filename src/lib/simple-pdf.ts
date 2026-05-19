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

export type SimplePdfBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; items: string[] }
  | { type: "kv"; rows: { k: string; v: string }[] }
  | { type: "hebrew-hero"; letter: string; name: string; transliteration: string; meaning: string }
  | { type: "hebrew-row"; letter: string; name: string; value: number | string; meaning: string }
  | { type: "hebrew-name"; latinName: string; hebrewWords: string[]; caption?: string };

export type SimplePdfData = {
  brand: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  consultantName?: string;
  meta?: string[];
  blocks: SimplePdfBlock[];
  accentHex?: string; // mantido por compatibilidade; ignorado em favor do dourado do template
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

// Hifenização leve PT-BR (mesmo critério de reports-pdf)
function hyphenPoints(word: string): number[] {
  // Regras silábicas PT-BR: V|CV, VC|CV, mantendo encontros consonantais
  // inseparáveis (br, cl, pr, tr, etc.) e dígrafos (ch, lh, nh, qu, gu) juntos.
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

export async function buildSimplePdf(data: SimplePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(safe(data.title));
  doc.setAuthor("Cosmic AI");
  doc.setSubject(safe(data.subtitle ?? data.eyebrow));
  doc.setCreator("Cosmic AI - Oraculo");

  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await doc.embedFont(StandardFonts.Helvetica);

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

  // -------- CAPA --------
  const cover = doc.addPage(PageSizes.A4);
  cover.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: NIGHT });
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

  const topLabel = safe(`${data.brand.toUpperCase()}  -  ${data.eyebrow.toUpperCase()}`);
  const topLabelW = sans.widthOfTextAtSize(topLabel, 9);
  cover.drawText(topLabel, {
    x: (PAGE_W - topLabelW) / 2, y: PAGE_H - 100,
    size: 9, font: sans, color: GOLD,
  });

  // Título (quebra se necessário)
  const titleSize = 38;
  const titleLines = wrapPlain(safe(data.title), serifBold, titleSize, CONTENT_W - 40);
  let ty = PAGE_H / 2 + 60 + (titleLines.length - 1) * (titleSize * 0.5);
  for (const line of titleLines) {
    const w = serifBold.widthOfTextAtSize(line, titleSize);
    cover.drawText(line, {
      x: (PAGE_W - w) / 2, y: ty, size: titleSize, font: serifBold, color: GOLD,
    });
    ty -= titleSize * 1.05;
  }

  if (data.subtitle) {
    const subSize = 14;
    const subLines = wrapPlain(safe(data.subtitle), serifItalic, subSize, CONTENT_W - 60);
    let sy = PAGE_H / 2 + 20;
    for (const line of subLines.slice(0, 3)) {
      const w = serifItalic.widthOfTextAtSize(line, subSize);
      cover.drawText(line, {
        x: (PAGE_W - w) / 2, y: sy, size: subSize, font: serifItalic, color: PARCHMENT,
      });
      sy -= subSize * 1.4;
    }
  }

  cover.drawLine({
    start: { x: PAGE_W / 2 - 40, y: PAGE_H / 2 - 30 },
    end: { x: PAGE_W / 2 + 40, y: PAGE_H / 2 - 30 },
    color: GOLD, thickness: 0.8,
  });

  const coverBlocks: { label: string; value: string }[] = [];
  if (data.consultantName) coverBlocks.push({ label: "PARA", value: data.consultantName });
  for (const m of data.meta ?? []) {
    // tenta separar "Rótulo: valor" -> label uppercase + valor; senão, só valor
    const match = m.match(/^([^:]{1,40}):\s*(.+)$/);
    if (match) coverBlocks.push({ label: match[1].toUpperCase(), value: match[2] });
    else coverBlocks.push({ label: "", value: m });
  }
  let by = PAGE_H / 2 - 70;
  for (const b of coverBlocks) {
    if (b.label) {
      const lab = safe(b.label);
      const lw = sans.widthOfTextAtSize(lab, 8);
      cover.drawText(lab, { x: (PAGE_W - lw) / 2, y: by, size: 8, font: sans, color: GOLD });
      by -= 14;
    }
    const val = safe(b.value);
    const vw = serif.widthOfTextAtSize(val, 12);
    cover.drawText(val, { x: (PAGE_W - vw) / 2, y: by, size: 12, font: serif, color: PARCHMENT });
    by -= 26;
  }

  const dateStr = safe(new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }));
  const dw = sans.widthOfTextAtSize(dateStr, 9);
  cover.drawText(dateStr, {
    x: (PAGE_W - dw) / 2, y: 70, size: 9, font: sans, color: GOLD,
  });

  // -------- PÁGINAS DE CONTEÚDO --------
  type Cursor = { page: PDFPage; y: number; pageNumber: number };
  const headerText = safe(data.title.toUpperCase());
  const footerText = safe(`${data.brand} - Inteligencia espiritual personalizada`);

  function newPage(num: number): Cursor {
    const page = doc.addPage(PageSizes.A4);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PARCHMENT });
    page.drawLine({
      start: { x: MARGIN, y: PAGE_H - MARGIN + 24 },
      end: { x: PAGE_W - MARGIN, y: PAGE_H - MARGIN + 24 },
      color: GOLD, thickness: 0.5,
    });
    page.drawText(headerText, {
      x: MARGIN, y: PAGE_H - MARGIN + 30, size: 8, font: sans, color: GOLD,
    });
    const numTxt = String(num);
    const nw = sans.widthOfTextAtSize(numTxt, 8);
    page.drawText(numTxt, {
      x: PAGE_W - MARGIN - nw, y: PAGE_H - MARGIN + 30, size: 8, font: sans, color: GOLD,
    });
    const fw = sans.widthOfTextAtSize(footerText, 8);
    page.drawText(footerText, {
      x: (PAGE_W - fw) / 2, y: MARGIN - 24, size: 8, font: sans, color: MUTED,
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

  function drawSubHeading(text: string) {
    const size = 15;
    ensureSpace(size + 16);
    cursor.page.drawText(safe(text), {
      x: MARGIN, y: cursor.y - size, size, font: serifBold, color: NIGHT,
    });
    cursor.y -= size + 12;
  }

  function drawParagraph(text: string, opts?: { italic?: boolean; size?: number; color?: ReturnType<typeof rgb>; justify?: boolean }) {
    const size = opts?.size ?? 12.5;
    const font = opts?.italic ? serifItalic : serif;
    const color = opts?.color ?? INK;
    const justify = opts?.justify ?? true;
    const lineHeight = size * 1.45;
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
  for (const block of data.blocks) {
    if (block.type === "h2") drawHeading(block.text, 22, { newPage: true });
    else if (block.type === "h3") drawSubHeading(block.text);
    else if (block.type === "p") drawParagraph(block.text);
    else if (block.type === "quote") drawQuote(block.text);
    else if (block.type === "list") drawBulletList(block.items);
    else if (block.type === "kv") drawKv(block.rows);
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
