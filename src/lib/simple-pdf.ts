/**
 * Pequeno helper de PDF para módulos mais leves (Tarot, Meditação Cabalística).
 * Gera um PDF A4 vertical com capa, blocos e texto corrido.
 *
 * Para os relatórios premium (personalidade, amor, carreira, espiritual) use
 * `buildReportPdf` em src/lib/reports-pdf.ts — esta versão é simplificada.
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
  brand: string; // ex: "Cosmic AI"
  eyebrow: string; // ex: "Tarot · Cruz Celta"
  title: string;
  subtitle?: string;
  consultantName?: string;
  meta?: string[]; // linhas curtas (data, pergunta, etc.)
  blocks: SimplePdfBlock[];
  accentHex?: string; // ex: "#d4af37"
};

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

// Sanitiza para WinAnsi (StandardFonts não suporta Unicode amplo).
function sanitize(s: string): string {
  return s
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00b7/g, "·")
    // remove glyphs fora do WinAnsi básico
    .replace(/[^\x00-\xff]/g, "?");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  // Sanitiza ANTES de medir — font.widthOfTextAtSize lança erro para glyphs
  // fora do WinAnsi (ex.: letras hebraicas) com fontes Standard como Helvetica.
  const paragraphs = sanitize(text).split(/\n+/);
  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth) {
        if (line) out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
    out.push(""); // espaço entre parágrafos
  }
  if (out.at(-1) === "") out.pop();
  return out;
}

export async function buildSimplePdf(data: SimplePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Tenta carregar fonte hebraica (Noto Sans Hebrew). Se falhar, o PDF segue
  // com as letras hebraicas substituídas por "?" via sanitize().
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

  const accent = hexToRgb(data.accentHex ?? "#d4af37");
  const ink = rgb(0.07, 0.08, 0.12);
  const muted = rgb(0.45, 0.45, 0.5);

  const [W, H] = PageSizes.A4;
  const margin = 56;
  const contentW = W - margin * 2;

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - margin;

  const drawHeader = (p: PDFPage) => {
    p.drawRectangle({ x: 0, y: H - 18, width: W, height: 18, color: accent });
    p.drawText(sanitize(data.brand), {
      x: margin, y: H - 13, size: 9, font: fontBold, color: rgb(1, 1, 1),
    });
  };
  const drawFooter = (p: PDFPage, n: number, total: number) => {
    p.drawText(sanitize(`${data.brand} · pág. ${n}/${total}`), {
      x: margin, y: 22, size: 8, font, color: muted,
    });
  };

  drawHeader(page);
  y = H - margin - 20;

  // Eyebrow
  page.drawText(sanitize(data.eyebrow.toUpperCase()), {
    x: margin, y, size: 9, font: fontBold, color: accent,
  });
  y -= 22;

  // Title
  const titleLines = wrap(data.title, fontBold, 26, contentW);
  for (const ln of titleLines) {
    if (!ln) { y -= 8; continue; }
    page.drawText(sanitize(ln), { x: margin, y, size: 26, font: fontBold, color: ink });
    y -= 30;
  }

  if (data.subtitle) {
    const subLines = wrap(data.subtitle, fontItalic, 13, contentW);
    for (const ln of subLines) {
      if (!ln) { y -= 4; continue; }
      page.drawText(sanitize(ln), { x: margin, y, size: 13, font: fontItalic, color: muted });
      y -= 16;
    }
  }

  y -= 6;
  page.drawLine({
    start: { x: margin, y }, end: { x: margin + 80, y },
    thickness: 1.5, color: accent,
  });
  y -= 18;

  if (data.consultantName) {
    page.drawText(sanitize(`Para: ${data.consultantName}`), {
      x: margin, y, size: 11, font: fontBold, color: ink,
    });
    y -= 16;
  }
  for (const m of data.meta ?? []) {
    page.drawText(sanitize(m), { x: margin, y, size: 10, font, color: muted });
    y -= 14;
  }
  y -= 10;

  const ensureSpace = (need: number) => {
    if (y - need < margin + 30) {
      page = doc.addPage([W, H]);
      drawHeader(page);
      y = H - margin - 10;
    }
  };

  for (const block of data.blocks) {
    if (block.type === "h2") {
      ensureSpace(40);
      y -= 10;
      page.drawText(sanitize(block.text), {
        x: margin, y, size: 14, font: fontBold, color: accent,
      });
      y -= 8;
      page.drawLine({
        start: { x: margin, y }, end: { x: margin + contentW, y },
        thickness: 0.5, color: accent,
      });
      y -= 14;
    } else if (block.type === "h3") {
      ensureSpace(28);
      y -= 6;
      page.drawText(sanitize(block.text), {
        x: margin, y, size: 12, font: fontBold, color: ink,
      });
      y -= 16;
    } else if (block.type === "hebrew-hero") {
      // Bloco grande: letra hebraica + nome + transliteração + significado
      ensureSpace(80);
      const boxH = 70;
      page.drawRectangle({
        x: margin, y: y - boxH, width: contentW, height: boxH,
        color: rgb(0.98, 0.96, 0.88), borderColor: accent, borderWidth: 1,
      });
      // Letra hebraica grande à direita
      if (fontHebrew) {
        const hSize = 56;
        const w = fontHebrew.widthOfTextAtSize(block.letter, hSize);
        page.drawText(block.letter, {
          x: margin + contentW - w - 16, y: y - boxH + 14,
          size: hSize, font: fontHebrew, color: accent,
        });
      }
      page.drawText(sanitize(block.name.toUpperCase()), {
        x: margin + 14, y: y - 18, size: 10, font: fontBold, color: accent,
      });
      page.drawText(sanitize(block.transliteration), {
        x: margin + 14, y: y - 36, size: 16, font: fontBold, color: ink,
      });
      const mLines = wrap(block.meaning, fontItalic, 10, contentW - 100);
      let my = y - 52;
      for (const ln of mLines.slice(0, 2)) {
        page.drawText(sanitize(ln), { x: margin + 14, y: my, size: 10, font: fontItalic, color: muted });
        my -= 12;
      }
      y -= boxH + 12;
    } else if (block.type === "hebrew-row") {
      // Linha da tabela do alfabeto: letra | nome | valor | significado
      ensureSpace(28);
      // Letra hebraica
      if (fontHebrew) {
        page.drawText(block.letter, {
          x: margin, y: y - 4, size: 18, font: fontHebrew, color: accent,
        });
      }
      page.drawText(sanitize(block.name), {
        x: margin + 32, y, size: 11, font: fontBold, color: ink,
      });
      page.drawText(sanitize(String(block.value)), {
        x: margin + 110, y, size: 11, font: fontBold, color: accent,
      });
      const mLines = wrap(block.meaning, font, 10, contentW - 150);
      let my = y;
      for (const ln of mLines.slice(0, 2)) {
        page.drawText(sanitize(ln), { x: margin + 150, y: my, size: 10, font, color: ink });
        my -= 12;
      }
      y -= Math.max(22, mLines.length * 12 + 4);
    } else if (block.type === "hebrew-name") {
      // Bloco com o nome do consulente transliterado em hebraico (RTL)
      ensureSpace(110);
      const boxH = 100;
      page.drawRectangle({
        x: margin, y: y - boxH, width: contentW, height: boxH,
        color: rgb(0.98, 0.96, 0.88), borderColor: accent, borderWidth: 1,
      });
      page.drawText(sanitize("SEU NOME EM HEBRAICO"), {
        x: margin + 14, y: y - 18, size: 10, font: fontBold, color: accent,
      });
      page.drawText(sanitize(block.latinName), {
        x: margin + 14, y: y - 34, size: 12, font: fontBold, color: ink,
      });
      // Linha das palavras em hebraico — desenhamos da direita para a esquerda
      if (fontHebrew) {
        const hSize = 30;
        const gap = 18;
        // Inverte cada palavra para leitura visual RTL ao desenhar LTR
        const reversedWords = block.hebrewWords.map((w) => w.split("").reverse().join(""));
        // Mede largura total
        const widths = reversedWords.map((w) => fontHebrew!.widthOfTextAtSize(w, hSize));
        const totalW = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, reversedWords.length - 1);
        // Começa pelo lado direito; ordem visual: palavras na mesma ordem do nome latino,
        // mas dispostas da direita para a esquerda.
        let xCursor = margin + contentW - 16 - (contentW - 28 - totalW) / 2;
        // Mais simples: centralizar bloco e desenhar palavras invertendo ordem
        let drawX = margin + (contentW - totalW) / 2;
        for (let i = 0; i < reversedWords.length; i++) {
          page.drawText(reversedWords[i], {
            x: drawX, y: y - 78, size: hSize, font: fontHebrew, color: accent,
          });
          drawX += widths[i] + gap;
        }
        void xCursor;
      } else {
        page.drawText(sanitize("(fonte hebraica indisponível)"), {
          x: margin + 14, y: y - 70, size: 11, font: fontItalic, color: muted,
        });
      }
      if (block.caption) {
        const cLines = wrap(block.caption, fontItalic, 9, contentW - 28);
        page.drawText(sanitize(cLines[0] ?? ""), {
          x: margin + 14, y: y - boxH + 10, size: 9, font: fontItalic, color: muted,
        });
      }
      y -= boxH + 12;
    } else if (block.type === "p") {
      const lines = wrap(block.text, font, 11, contentW);
      for (const ln of lines) {
        ensureSpace(16);
        if (!ln) { y -= 6; continue; }
        page.drawText(sanitize(ln), { x: margin, y, size: 11, font, color: ink });
        y -= 15;
      }
      y -= 4;
    } else if (block.type === "quote") {
      const lines = wrap(block.text, fontItalic, 11, contentW - 16);
      for (const ln of lines) {
        ensureSpace(16);
        page.drawLine({
          start: { x: margin, y: y + 11 }, end: { x: margin, y: y - 2 },
          thickness: 2, color: accent,
        });
        page.drawText(sanitize(ln), {
          x: margin + 12, y, size: 11, font: fontItalic, color: muted,
        });
        y -= 15;
      }
      y -= 4;
    } else if (block.type === "list") {
      for (const item of block.items) {
        const lines = wrap(item, font, 11, contentW - 14);
        let first = true;
        for (const ln of lines) {
          ensureSpace(16);
          if (first) {
            page.drawText("•", {
              x: margin, y, size: 12, font: fontBold, color: accent,
            });
            first = false;
          }
          page.drawText(sanitize(ln), {
            x: margin + 14, y, size: 11, font, color: ink,
          });
          y -= 15;
        }
      }
      y -= 4;
    } else if (block.type === "kv") {
      const labelW = 110;
      for (const r of block.rows) {
        ensureSpace(18);
        page.drawText(sanitize(r.k), {
          x: margin, y, size: 10, font: fontBold, color: muted,
        });
        const lines = wrap(r.v, font, 11, contentW - labelW);
        for (let i = 0; i < lines.length; i++) {
          ensureSpace(16);
          if (i > 0) y -= 0;
          page.drawText(sanitize(lines[i]), {
            x: margin + labelW, y, size: 11, font, color: ink,
          });
          if (i < lines.length - 1) y -= 14;
        }
        y -= 18;
      }
    }
  }

  // Render footers with total page count
  const pages = doc.getPages();
  pages.forEach((p, idx) => drawFooter(p, idx + 1, pages.length));

  return await doc.save();
}
