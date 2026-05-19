import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Palette, Check, Lock, Sparkles, FileDown, Loader2, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPdfBranding, savePdfBranding, generateSampleBrandingPdf } from "@/lib/pdf-branding.functions";
import { getAddonsOverview } from "@/lib/addons.functions";
import { PDF_CSS_TEMPLATES, type PdfCssTemplate } from "@/lib/pdf-css-templates";

export const Route = createFileRoute("/_authenticated/pdf-css")({
  head: () => ({
    meta: [
      { title: "PDF CSS Avançado — Cosmic AI" },
      { name: "description", content: "Templates e personalização visual para seus relatórios PDF." },
    ],
  }),
  component: PdfCssPage,
});

function PdfCssPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getPdfBranding);
  const saveFn = useServerFn(savePdfBranding);
  const samplePdfFn = useServerFn(generateSampleBrandingPdf);
  const addonsFn = useServerFn(getAddonsOverview);

  const { data: brandingData, isLoading } = useQuery({
    queryKey: ["pdf-branding"],
    queryFn: () => getFn(),
  });
  const { data: addons } = useQuery({
    queryKey: ["addons-overview"],
    queryFn: () => addonsFn(),
  });

  const pdfCssActive = !!addons?.subscriptions.some(
    (s) => s.addon_id === "sub_pdf_css" && s.status === "active",
  );
  const brandingActive = !!addons?.subscriptions.some(
    (s) => s.addon_id === "sub_branding_pdf" && s.status === "active",
  );

  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const currentTemplateId = detectTemplate(brandingData?.branding as Record<string, unknown> | null);

  const applyMutation = useMutation({
    mutationFn: async (tpl: PdfCssTemplate) => {
      const b = (brandingData?.branding ?? {}) as Record<string, unknown>;
      // Mantém toggles, logo, rodapé etc. e sobrescreve apenas os campos visuais.
      return saveFn({
        data: {
          enabled: (b.enabled as boolean) ?? true,
          logo_width: (b.logo_width as number) ?? 120,
          logo_height: (b.logo_height as number) ?? 60,
          display_name: (b.display_name as string) ?? "",
          footer_enabled: (b.footer_enabled as boolean) ?? true,
          footer_name: (b.footer_name as string) ?? "",
          footer_site: (b.footer_site as string) ?? "",
          footer_phone: (b.footer_phone as string) ?? "",
          enabled_personality: (b.enabled_personality as boolean) ?? true,
          enabled_love: (b.enabled_love as boolean) ?? true,
          enabled_career: (b.enabled_career as boolean) ?? true,
          enabled_spiritual: (b.enabled_spiritual as boolean) ?? true,
          enabled_tarot: (b.enabled_tarot as boolean) ?? true,
          enabled_kabbalah: (b.enabled_kabbalah as boolean) ?? true,
          enabled_numerology: (b.enabled_numerology as boolean) ?? true,
          enabled_astrology: (b.enabled_astrology as boolean) ?? true,
          enabled_kabbalah_numerology: (b.enabled_kabbalah_numerology as boolean) ?? true,
          enabled_energy_calendar: (b.enabled_energy_calendar as boolean) ?? true,
          enabled_weekly: (b.enabled_weekly as boolean) ?? true,
          ...tpl.values,
        },
      });
    },
    onSuccess: (_d, tpl) => {
      toast.success(`Template "${tpl.name}" aplicado.`);
      qc.invalidateQueries({ queryKey: ["pdf-branding"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setApplyingId(null),
  });

  async function handlePreview() {
    setPreviewing(true);
    try {
      const r = await samplePdfFn();
      const bin = atob(r.pdfBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-stardust flex items-center gap-2">
            <Palette className="size-7 text-gold" /> PDF CSS Avançado
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Escolha um template pronto para definir cores de página, tipografia, moldura e mais.
            Você pode refinar qualquer detalhe depois em <span className="text-gold">Configurações → Personalização de PDF</span>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/configuracoes">
              <SettingsIcon className="size-4 mr-2" /> Personalizar em detalhe
            </Link>
          </Button>
          <Button onClick={handlePreview} disabled={previewing || !brandingActive} size="sm">
            {previewing ? <Loader2 className="size-4 animate-spin mr-2" /> : <FileDown className="size-4 mr-2" />}
            Visualizar PDF
          </Button>
        </div>
      </header>

      {!pdfCssActive && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <Lock className="size-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-100">Assinatura "PDF CSS Avançado" necessária</p>
            <p className="text-xs text-amber-200/80 mt-1">
              Você pode aplicar e salvar templates aqui, mas a personalização avançada (fundo,
              marca d'água, tipografia, moldura) só será renderizada nos PDFs enquanto a
              assinatura estiver ativa. As cores de capa e cabeçalho/rodapé já funcionam com o
              Branding PDF Pro.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link to="/addons">Assinar PDF CSS Avançado</Link>
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PDF_CSS_TEMPLATES.map((tpl) => {
            const isCurrent = currentTemplateId === tpl.id;
            const isApplying = applyingId === tpl.id;
            return (
              <article
                key={tpl.id}
                className={`glass-card rounded-2xl overflow-hidden border ${
                  isCurrent ? "border-gold/60 ring-1 ring-gold/40" : "border-border"
                } flex flex-col`}
              >
                <TemplatePreview tpl={tpl} />
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-lg text-stardust">{tpl.name}</h3>
                    {isCurrent && (
                      <span className="text-[10px] uppercase tracking-widest text-gold flex items-center gap-1 shrink-0">
                        <Check className="size-3" /> Atual
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex-1">{tpl.description}</p>
                  <div className="flex items-center justify-between gap-2">
                    <Swatches tpl={tpl} />
                    <Button
                      size="sm"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isApplying || applyMutation.isPending}
                      onClick={() => {
                        setApplyingId(tpl.id);
                        applyMutation.mutate(tpl);
                      }}
                      className="gap-2"
                    >
                      {isApplying ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                      {isCurrent ? "Reaplicar" : "Aplicar"}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function detectTemplate(branding: Record<string, unknown> | null | undefined): string | null {
  if (!branding) return null;
  for (const tpl of PDF_CSS_TEMPLATES) {
    const v = tpl.values;
    if (
      branding.page_bg_color === v.page_bg_color &&
      branding.body_text_color === v.body_text_color &&
      branding.heading_text_color === v.heading_text_color &&
      branding.frame_style === v.frame_style &&
      branding.font_family === v.font_family
    ) {
      return tpl.id;
    }
  }
  return null;
}

function TemplatePreview({ tpl }: { tpl: PdfCssTemplate }) {
  const { preview } = tpl;
  return (
    <div className="aspect-[4/3] relative" style={{ background: preview.page }}>
      {/* Faixa superior simulando cabeçalho */}
      <div className="absolute top-0 left-0 right-0 h-6 flex items-center px-3"
        style={{ background: tpl.values.header_bg_color, color: tpl.values.header_text_color }}>
        <span className="text-[8px] uppercase tracking-widest">Cabeçalho</span>
      </div>
      {/* Moldura visual */}
      {tpl.values.frame_style !== "none" && (
        <div
          className="absolute inset-3 mt-7 pointer-events-none"
          style={{
            borderColor: preview.accent,
            borderStyle: tpl.values.frame_style === "double" ? "double" : "solid",
            borderWidth: tpl.values.frame_style === "ornamental" ? 2 : 1,
            borderRadius: tpl.values.frame_style === "ornamental" ? 4 : 0,
          }}
        />
      )}
      {/* Conteúdo */}
      <div className="absolute inset-0 mt-10 px-6 flex flex-col gap-2">
        <div
          className="font-serif text-base leading-none"
          style={{
            color: preview.heading,
            fontFamily:
              tpl.values.font_family === "sans"
                ? "ui-sans-serif, system-ui"
                : tpl.values.font_family === "display"
                ? "Georgia, serif"
                : "ui-serif, Georgia",
          }}
        >
          Título do Relatório
        </div>
        <div className="space-y-1">
          {[0.95, 0.9, 0.85, 0.7].map((w, i) => (
            <div
              key={i}
              className="h-1 rounded-full"
              style={{ background: preview.body, opacity: 0.5, width: `${w * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Swatches({ tpl }: { tpl: PdfCssTemplate }) {
  const colors = [tpl.preview.page, tpl.preview.heading, tpl.preview.body, tpl.preview.accent];
  return (
    <div className="flex items-center gap-1">
      {colors.map((c, i) => (
        <span
          key={i}
          className="size-4 rounded-full border border-border"
          style={{ background: c }}
          title={c}
        />
      ))}
    </div>
  );
}
