import jsPDF from "jspdf";

export type FavRecord = { date: string; note: string | null; created_at: string };

function fmtDate(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC",
  });
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportFavoritesCSV(favs: FavRecord[]) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [
    ["Data", "Dia da semana", "Nota", "Marcado em"].map(escape).join(","),
    ...favs.map((f) => {
      const d = new Date(f.date + "T12:00:00Z");
      return [
        f.date,
        d.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" }),
        f.note ?? "",
        new Date(f.created_at).toLocaleString("pt-BR"),
      ].map(escape).join(",");
    }),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + rows], { type: "text/csv;charset=utf-8" });
  download(blob, `favoritos-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportFavoritesPDF(favs: FavRecord[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(40, 30, 10);
  doc.text("Dias Favoritos", margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 110, 90);
  doc.text(
    `Cosmic AI · Exportado em ${new Date().toLocaleDateString("pt-BR")} · ${favs.length} ${favs.length === 1 ? "dia" : "dias"}`,
    margin, y,
  );
  y += 18;

  doc.setDrawColor(200, 170, 90);
  doc.setLineWidth(0.8);
  doc.line(margin, y, W - margin, y);
  y += 20;

  if (favs.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(12);
    doc.setTextColor(120, 110, 90);
    doc.text("Nenhum dia favorito marcado ainda.", margin, y);
  } else {
    for (const f of favs) {
      if (y > H - margin - 60) { doc.addPage(); y = margin; }

      doc.setFont("times", "bold");
      doc.setFontSize(13);
      doc.setTextColor(150, 110, 30);
      doc.text(fmtDate(f.date), margin, y);
      y += 16;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(45, 40, 30);
      const noteText = f.note?.trim() || "Sem nota.";
      const lines = doc.splitTextToSize(noteText, W - margin * 2);
      for (const line of lines) {
        if (y > H - margin - 20) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += 14;
      }
      y += 10;
      doc.setDrawColor(230, 220, 200);
      doc.setLineWidth(0.4);
      doc.line(margin, y, W - margin, y);
      y += 16;
    }
  }

  doc.save(`favoritos-${new Date().toISOString().slice(0, 10)}.pdf`);
}
