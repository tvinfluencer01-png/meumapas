import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Image as ImageIcon, Upload, Trash2, Save, Sparkles, Info, Lock, Wand2, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  getPdfBranding,
  savePdfBranding,
  uploadPdfLogo,
  removePdfLogo,
  uploadCoverImage,
  removeCoverImage,
  generateCoverImage,
  generateSampleBrandingPdf,
  uploadPageBgImage,
  removePageBgImage,
  uploadWatermarkImage,
  removeWatermarkImage,
} from "@/lib/pdf-branding.functions";
import { getAddonsOverview } from "@/lib/addons.functions";

type FormState = {
  enabled: boolean;
  logo_width: number;
  logo_height: number;
  display_name: string;
  footer_enabled: boolean;
  footer_name: string;
  footer_site: string;
  footer_phone: string;
  enabled_personality: boolean;
  enabled_love: boolean;
  enabled_career: boolean;
  enabled_spiritual: boolean;
  enabled_tarot: boolean;
  enabled_kabbalah: boolean;
  enabled_numerology: boolean;
  enabled_astrology: boolean;
  enabled_kabbalah_numerology: boolean;
  enabled_energy_calendar: boolean;
  enabled_weekly: boolean;
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

const DEFAULT_FORM: FormState = {
  enabled: false,
  logo_width: 120,
  logo_height: 60,
  display_name: "",
  footer_enabled: true,
  footer_name: "",
  footer_site: "",
  footer_phone: "",
  enabled_personality: true,
  enabled_love: true,
  enabled_career: true,
  enabled_spiritual: true,
  enabled_tarot: true,
  enabled_kabbalah: true,
  enabled_numerology: true,
  enabled_astrology: true,
  enabled_kabbalah_numerology: true,
  enabled_energy_calendar: true,
  enabled_weekly: true,
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
};

const KIND_TOGGLES: Array<{ key: keyof FormState; label: string; hint: string }> = [
  { key: "enabled_personality", label: "Personalidade", hint: "Mapa da Personalidade" },
  { key: "enabled_love", label: "Amor", hint: "Amor e Relacionamento" },
  { key: "enabled_career", label: "Carreira", hint: "Vocação e Propósito" },
  { key: "enabled_spiritual", label: "Espiritualidade", hint: "Jornada Espiritual" },
  { key: "enabled_tarot", label: "Tarot", hint: "Tarot dos Arcanos" },
  { key: "enabled_kabbalah", label: "Meditação Cabalística", hint: "Meditações guiadas" },
  { key: "enabled_numerology", label: "Numerologia", hint: "Mapa numerológico" },
  { key: "enabled_astrology", label: "Mapa Astral", hint: "Astrologia natal" },
  { key: "enabled_kabbalah_numerology", label: "Numerologia Cabalística", hint: "Análise por gematria" },
  { key: "enabled_energy_calendar", label: "Calendário Energético", hint: "Energias do mês" },
  { key: "enabled_weekly", label: "Leitura Semanal", hint: "Previsão da semana" },
];

function fileToBase64(file: File): Promise<{ base64: string; mime: "image/png" | "image/jpeg" }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      const base64 = result.split(",")[1] ?? "";
      const mime =
        file.type === "image/png" ? "image/png" : ("image/jpeg" as const);
      resolve({ base64, mime });
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function PdfBrandingForm() {
  const qc = useQueryClient();
  const getFn = useServerFn(getPdfBranding);
  const saveFn = useServerFn(savePdfBranding);
  const uploadFn = useServerFn(uploadPdfLogo);
  const removeFn = useServerFn(removePdfLogo);
  const uploadCoverFn = useServerFn(uploadCoverImage);
  const removeCoverFn = useServerFn(removeCoverImage);
  const generateCoverFn = useServerFn(generateCoverImage);
  const samplePdfFn = useServerFn(generateSampleBrandingPdf);
  const uploadPageBgFn = useServerFn(uploadPageBgImage);
  const removePageBgFn = useServerFn(removePageBgImage);
  const uploadWatermarkFn = useServerFn(uploadWatermarkImage);
  const removeWatermarkFn = useServerFn(removeWatermarkImage);
  const inputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const pageBgInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const [coverPrompt, setCoverPrompt] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["pdf-branding"],
    queryFn: () => getFn(),
  });

  const addonsFn = useServerFn(getAddonsOverview);
  const { data: addons } = useQuery({
    queryKey: ["addons-overview"],
    queryFn: () => addonsFn(),
  });
  const subscriptionActive = !!addons?.subscriptions.some(
    (s) => s.addon_id === "sub_branding_pdf" && s.status === "active",
  );
  const pdfCssActive = !!addons?.subscriptions.some(
    (s) => s.addon_id === "sub_pdf_css" && s.status === "active",
  );

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    if (data?.branding) {
      const b = data.branding as Record<string, unknown>;
      setForm({
        enabled: data.branding.enabled,
        logo_width: data.branding.logo_width,
        logo_height: data.branding.logo_height,
        display_name: data.branding.display_name ?? "",
        footer_enabled: data.branding.footer_enabled,
        footer_name: data.branding.footer_name ?? "",
        footer_site: data.branding.footer_site ?? "",
        footer_phone: data.branding.footer_phone ?? "",
        enabled_personality: (b.enabled_personality as boolean | undefined) ?? true,
        enabled_love: (b.enabled_love as boolean | undefined) ?? true,
        enabled_career: (b.enabled_career as boolean | undefined) ?? true,
        enabled_spiritual: (b.enabled_spiritual as boolean | undefined) ?? true,
        enabled_tarot: (b.enabled_tarot as boolean | undefined) ?? true,
        enabled_kabbalah: (b.enabled_kabbalah as boolean | undefined) ?? true,
        enabled_numerology: (b.enabled_numerology as boolean | undefined) ?? true,
        enabled_astrology: (b.enabled_astrology as boolean | undefined) ?? true,
        enabled_kabbalah_numerology: (b.enabled_kabbalah_numerology as boolean | undefined) ?? true,
        enabled_energy_calendar: (b.enabled_energy_calendar as boolean | undefined) ?? true,
        enabled_weekly: (b.enabled_weekly as boolean | undefined) ?? true,
        cover_bg_color: (b.cover_bg_color as string | undefined) ?? DEFAULT_FORM.cover_bg_color,
        cover_accent_color: (b.cover_accent_color as string | undefined) ?? DEFAULT_FORM.cover_accent_color,
        cover_title_position: ((b.cover_title_position as FormState["cover_title_position"] | undefined) ?? DEFAULT_FORM.cover_title_position),
        font_family: ((b.font_family as FormState["font_family"] | undefined) ?? DEFAULT_FORM.font_family),
        header_bg_color: (b.header_bg_color as string | undefined) ?? DEFAULT_FORM.header_bg_color,
        footer_bg_color: (b.footer_bg_color as string | undefined) ?? DEFAULT_FORM.footer_bg_color,
        header_text_color: (b.header_text_color as string | undefined) ?? DEFAULT_FORM.header_text_color,
        page_bg_color: (b.page_bg_color as string | undefined) ?? DEFAULT_FORM.page_bg_color,
        body_text_color: (b.body_text_color as string | undefined) ?? DEFAULT_FORM.body_text_color,
        heading_text_color: (b.heading_text_color as string | undefined) ?? DEFAULT_FORM.heading_text_color,
        body_font_size: Number(b.body_font_size ?? DEFAULT_FORM.body_font_size),
        line_height: Number(b.line_height ?? DEFAULT_FORM.line_height),
        frame_style: ((b.frame_style as FormState["frame_style"] | undefined) ?? DEFAULT_FORM.frame_style),
        watermark_opacity: Number(b.watermark_opacity ?? DEFAULT_FORM.watermark_opacity),
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => saveFn({ data: { ...form } }),
    onSuccess: () => {
      toast.success("Personalização salva. Será aplicada nos próximos PDFs.");
      qc.invalidateQueries({ queryKey: ["pdf-branding"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { base64, mime } = await fileToBase64(file);
      return uploadFn({ data: { base64, mime } });
    },
    onSuccess: () => {
      toast.success("Logo enviado.");
      qc.invalidateQueries({ queryKey: ["pdf-branding"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: () => removeFn(),
    onSuccess: () => {
      toast.success("Logo removido.");
      qc.invalidateQueries({ queryKey: ["pdf-branding"] });
    },
  });

  const uploadCoverMutation = useMutation({
    mutationFn: async (file: File) => {
      const { base64, mime } = await fileToBase64(file);
      return uploadCoverFn({ data: { base64, mime } });
    },
    onSuccess: () => {
      toast.success("Imagem de capa enviada.");
      qc.invalidateQueries({ queryKey: ["pdf-branding"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeCoverMutation = useMutation({
    mutationFn: () => removeCoverFn(),
    onSuccess: () => {
      toast.success("Imagem de capa removida.");
      qc.invalidateQueries({ queryKey: ["pdf-branding"] });
    },
  });
  const generateCoverMutation = useMutation({
    mutationFn: () => generateCoverFn({ data: { prompt: coverPrompt.trim() || "capa mística com estrelas douradas e nebulosa profunda" } }),
    onSuccess: () => {
      toast.success("Capa gerada por IA.");
      qc.invalidateQueries({ queryKey: ["pdf-branding"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const uploadPageBgMutation = useMutation({
    mutationFn: async (file: File) => {
      const { base64, mime } = await fileToBase64(file);
      return uploadPageBgFn({ data: { base64, mime } });
    },
    onSuccess: () => {
      toast.success("Fundo de página enviado.");
      qc.invalidateQueries({ queryKey: ["pdf-branding"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const removePageBgMutation = useMutation({
    mutationFn: () => removePageBgFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pdf-branding"] });
    },
  });
  const uploadWatermarkMutation = useMutation({
    mutationFn: async (file: File) => {
      const { base64, mime } = await fileToBase64(file);
      return uploadWatermarkFn({ data: { base64, mime } });
    },
    onSuccess: () => {
      toast.success("Marca d'água enviada.");
      qc.invalidateQueries({ queryKey: ["pdf-branding"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeWatermarkMutation = useMutation({
    mutationFn: () => removeWatermarkFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pdf-branding"] });
    },
  });

  async function handlePreview() {
    setPreviewing(true);
    try {
      await saveMutation.mutateAsync();
      const r = await samplePdfFn();
      const bin = atob(r.pdfBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      toast.success("PDF gerado — prévia visual aberta.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPreviewing(false);
    }
  }


  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  function downloadPreview() {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = "preview-branding.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }


  function handleAssetFile(
    e: React.ChangeEvent<HTMLInputElement>,
    mutation: { mutate: (f: File) => void },
    maxKB: number,
    inputRefToReset: React.RefObject<HTMLInputElement | null>,
  ) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > maxKB * 1024) { toast.error(`Arquivo maior que ${maxKB}KB.`); return; }
    if (!["image/png", "image/jpeg"].includes(f.type)) { toast.error("Use PNG ou JPG."); return; }
    mutation.mutate(f);
    if (inputRefToReset.current) inputRefToReset.current.value = "";
  }


  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 500 * 1024) {
      toast.error("Arquivo maior que 500KB.");
      return;
    }
    if (!["image/png", "image/jpeg"].includes(f.type)) {
      toast.error("Use PNG ou JPG.");
      return;
    }
    uploadMutation.mutate(f);
    if (inputRef.current) inputRef.current.value = "";
  }

  const hasLogo = !!data?.signedLogoUrl;

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Carregando…</div>;
  }

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-stardust flex items-center gap-2">
            <Sparkles className="size-5 text-gold" /> Personalização de PDF
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Add-on opcional para personalizar a marca dos seus relatórios. Quando
            desativado, mantemos o branding padrão do sistema.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Label htmlFor="brand-enabled" className="text-sm">
            Ativo
          </Label>
          <Switch
            id="brand-enabled"
            checked={form.enabled}
            onCheckedChange={(v) => setForm((p) => ({ ...p, enabled: v }))}
          />
        </div>
      </header>

      {!subscriptionActive && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <Lock className="size-4 shrink-0 mt-0.5 text-amber-400" />
          <div className="flex-1">
            <p className="font-medium text-amber-100">
              Assinatura "Branding PDF Pro" necessária
            </p>
            <p className="text-xs text-amber-200/80 mt-0.5">
              Você pode configurar tudo aqui, mas a personalização só será aplicada
              nos PDFs enquanto a assinatura estiver ativa. Sem ela, os relatórios
              mantêm o branding padrão do Código Cósmico.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link to="/addons">Assinar Branding PDF Pro</Link>
            </Button>
          </div>
        </div>
      )}

      {subscriptionActive && !form.enabled && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground border border-border rounded-lg p-3">
          <Info className="size-4 shrink-0 mt-0.5 text-gold" />
          Add-on desativado. Seus relatórios continuam com o branding padrão do Código Cósmico.
        </div>
      )}

      {/* Logo */}
      <section className="space-y-3">
        <h3 className="text-sm uppercase tracking-widest text-gold">Logo</h3>
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="w-44 h-28 border border-border rounded-lg grid place-items-center bg-night/30 shrink-0 overflow-hidden">
            {hasLogo ? (
              <img
                src={data!.signedLogoUrl!}
                alt="Logo"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-muted-foreground text-xs text-center px-2">
                <ImageIcon className="size-6 mx-auto mb-1 opacity-50" />
                Nenhum logo enviado
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleFile}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                <Upload className="size-4 mr-2" />
                {uploadMutation.isPending ? "Enviando…" : "Enviar logo"}
              </Button>
              {hasLogo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeMutation.mutate()}
                  disabled={removeMutation.isPending}
                >
                  <Trash2 className="size-4 mr-2" /> Remover
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              PNG ou JPG, até 500KB. Sem logo, usamos o nome de exibição abaixo.
            </p>
          </div>
        </div>

        {/* Sliders */}
        <div className="grid md:grid-cols-2 gap-5 pt-2">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <Label>Largura do logo</Label>
              <span className="text-gold tabular-nums">{form.logo_width}px</span>
            </div>
            <Slider
              min={40}
              max={240}
              step={1}
              value={[form.logo_width]}
              onValueChange={([v]) => setForm((p) => ({ ...p, logo_width: v }))}
            />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <Label>Altura do logo</Label>
              <span className="text-gold tabular-nums">{form.logo_height}px</span>
            </div>
            <Slider
              min={20}
              max={160}
              step={1}
              value={[form.logo_height]}
              onValueChange={([v]) => setForm((p) => ({ ...p, logo_height: v }))}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="display_name">Nome de exibição (sem logo)</Label>
          <Input
            id="display_name"
            value={form.display_name}
            maxLength={80}
            placeholder="Ex: Studio Aurora — Astrologia"
            onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Usado no topo da capa quando não houver logo configurado.
          </p>
        </div>
      </section>

      {/* Footer */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm uppercase tracking-widest text-gold">Rodapé personalizado</h3>
          <div className="flex items-center gap-2">
            <Label htmlFor="footer-enabled" className="text-xs">Ativar</Label>
            <Switch
              id="footer-enabled"
              checked={form.footer_enabled}
              onCheckedChange={(v) => setForm((p) => ({ ...p, footer_enabled: v }))}
            />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="f_name">Nome</Label>
            <Input
              id="f_name"
              value={form.footer_name}
              maxLength={80}
              placeholder="Maria Astróloga"
              onChange={(e) => setForm((p) => ({ ...p, footer_name: e.target.value }))}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div>
            <Label htmlFor="f_site">Site</Label>
            <Input
              id="f_site"
              value={form.footer_site}
              maxLength={120}
              placeholder="www.seusite.com"
              onChange={(e) => setForm((p) => ({ ...p, footer_site: e.target.value }))}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div>
            <Label htmlFor="f_phone">Telefone</Label>
            <Input
              id="f_phone"
              value={form.footer_phone}
              maxLength={40}
              placeholder="+55 11 99999-9999"
              onChange={(e) => setForm((p) => ({ ...p, footer_phone: e.target.value }))}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </section>

      {/* Per-kind toggles */}
      <section className="space-y-3">
        <h3 className="text-sm uppercase tracking-widest text-gold">Aplicar em quais relatórios</h3>
        <p className="text-xs text-muted-foreground">
          Escolha as categorias que devem usar seu branding. As desativadas continuam com o branding padrão do Cosmic AI, mesmo com o add-on ativo.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {KIND_TOGGLES.map((k) => {
            const checked = form[k.key] as boolean;
            return (
              <div
                key={k.key}
                className="flex items-center justify-between gap-3 border border-border rounded-lg p-3 bg-night/20"
              >
                <div className="min-w-0">
                  <Label htmlFor={`toggle-${k.key}`} className="text-sm block">
                    {k.label}
                  </Label>
                  <p className="text-xs text-muted-foreground truncate">{k.hint}</p>
                </div>
                <Switch
                  id={`toggle-${k.key}`}
                  checked={checked}
                  disabled={!form.enabled}
                  onCheckedChange={(v) =>
                    setForm((p) => ({ ...p, [k.key]: v } as FormState))
                  }
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Capa: cores, fontes, imagem */}
      <section className="space-y-4">
        <h3 className="text-sm uppercase tracking-widest text-gold">Capa do relatório</h3>

        <div className="grid md:grid-cols-3 gap-4">
          <ColorField label="Fundo da capa" value={form.cover_bg_color}
            onChange={(v) => setForm((p) => ({ ...p, cover_bg_color: v }))} />
          <ColorField label="Cor de destaque" value={form.cover_accent_color}
            onChange={(v) => setForm((p) => ({ ...p, cover_accent_color: v }))} />
          <div>
            <Label>Posição do título</Label>
            <select
              className="w-full bg-night/30 border border-border rounded-md px-3 py-2 text-sm"
              value={form.cover_title_position}
              onChange={(e) => setForm((p) => ({ ...p, cover_title_position: e.target.value as FormState["cover_title_position"] }))}
            >
              <option value="top">Topo</option>
              <option value="center">Centro</option>
              <option value="bottom">Inferior</option>
            </select>
          </div>
        </div>

        <div>
          <Label>Família tipográfica</Label>
          <select
            className="w-full bg-night/30 border border-border rounded-md px-3 py-2 text-sm"
            value={form.font_family}
            onChange={(e) => setForm((p) => ({ ...p, font_family: e.target.value as FormState["font_family"] }))}
          >
            <option value="serif">Serif (clássica)</option>
            <option value="sans">Sans (moderna)</option>
            <option value="display">Display (alto impacto)</option>
          </select>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="w-44 h-28 border border-border rounded-lg grid place-items-center bg-night/30 shrink-0 overflow-hidden">
            {data?.signedCoverUrl ? (
              <img src={data.signedCoverUrl} alt="Capa" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="text-muted-foreground text-xs text-center px-2">
                <ImageIcon className="size-6 mx-auto mb-1 opacity-50" />
                Sem imagem de capa
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input ref={coverInputRef} type="file" accept="image/png,image/jpeg" className="hidden"
              onChange={(e) => handleAssetFile(e, uploadCoverMutation, 3072, coverInputRef)} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadCoverMutation.isPending}>
                <Upload className="size-4 mr-2" />
                {uploadCoverMutation.isPending ? "Enviando…" : "Enviar imagem"}
              </Button>
              {data?.signedCoverUrl && (
                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                  onClick={() => removeCoverMutation.mutate()}>
                  <Trash2 className="size-4 mr-2" /> Remover
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={coverPrompt}
                placeholder="Descreva uma capa (ex: nebulosa púrpura com runas douradas)"
                onChange={(e) => setCoverPrompt(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <Button type="button" variant="outline" size="sm"
                onClick={() => generateCoverMutation.mutate()}
                disabled={generateCoverMutation.isPending}>
                {generateCoverMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Wand2 className="size-4 mr-2" />}
                Gerar com IA
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">PNG/JPG até 3MB.</p>
          </div>
        </div>
      </section>

      {/* Cabeçalho/Rodapé cores */}
      <section className="space-y-3">
        <h3 className="text-sm uppercase tracking-widest text-gold">Cores de cabeçalho e rodapé</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <ColorField label="Fundo do cabeçalho" value={form.header_bg_color}
            onChange={(v) => setForm((p) => ({ ...p, header_bg_color: v }))} />
          <ColorField label="Texto do cabeçalho" value={form.header_text_color}
            onChange={(v) => setForm((p) => ({ ...p, header_text_color: v }))} />
          <ColorField label="Fundo do rodapé" value={form.footer_bg_color}
            onChange={(v) => setForm((p) => ({ ...p, footer_bg_color: v }))} />
        </div>
      </section>

      {/* PDF CSS Avançado */}
      <section className="space-y-4 border border-gold/20 rounded-xl p-4 bg-night/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm uppercase tracking-widest text-gold">PDF CSS Avançado</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Personalize fundo da página, marca d'água, tipografia, cores de texto e molduras.
            </p>
          </div>
          {!pdfCssActive && (
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link to="/addons">Assinar add-on</Link>
            </Button>
          )}
        </div>

        {!pdfCssActive && (
          <div className="flex items-start gap-2 text-xs text-amber-200/80 border border-amber-500/30 bg-amber-500/10 rounded-lg p-2">
            <Lock className="size-4 shrink-0 mt-0.5 text-amber-400" />
            Sem o add-on "PDF CSS Avançado" ativo, estas configurações ficam salvas mas não são aplicadas nos PDFs.
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          <ColorField label="Fundo da página" value={form.page_bg_color}
            onChange={(v) => setForm((p) => ({ ...p, page_bg_color: v }))} />
          <ColorField label="Cor do texto" value={form.body_text_color}
            onChange={(v) => setForm((p) => ({ ...p, body_text_color: v }))} />
          <ColorField label="Cor dos títulos" value={form.heading_text_color}
            onChange={(v) => setForm((p) => ({ ...p, heading_text_color: v }))} />
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <Label>Tamanho do texto</Label>
              <span className="text-gold tabular-nums">{form.body_font_size.toFixed(1)}pt</span>
            </div>
            <Slider min={8} max={20} step={0.5} value={[form.body_font_size]}
              onValueChange={([v]) => setForm((p) => ({ ...p, body_font_size: v }))} />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <Label>Entrelinha</Label>
              <span className="text-gold tabular-nums">{form.line_height.toFixed(2)}</span>
            </div>
            <Slider min={1} max={2.2} step={0.05} value={[form.line_height]}
              onValueChange={([v]) => setForm((p) => ({ ...p, line_height: v }))} />
          </div>
        </div>

        <div>
          <Label>Moldura da capa</Label>
          <select
            className="w-full bg-night/30 border border-border rounded-md px-3 py-2 text-sm"
            value={form.frame_style}
            onChange={(e) => setForm((p) => ({ ...p, frame_style: e.target.value as FormState["frame_style"] }))}
          >
            <option value="none">Sem moldura</option>
            <option value="simple">Simples</option>
            <option value="double">Dupla</option>
            <option value="ornamental">Ornamental</option>
          </select>
        </div>

        {/* Fundo de página (imagem) */}
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="w-44 h-28 border border-border rounded-lg grid place-items-center bg-night/30 shrink-0 overflow-hidden">
            {data?.signedPageBgUrl ? (
              <img src={data.signedPageBgUrl} alt="Fundo" className="max-w-full max-h-full object-cover" />
            ) : (
              <div className="text-muted-foreground text-xs text-center px-2">
                <ImageIcon className="size-6 mx-auto mb-1 opacity-50" />
                Sem imagem de fundo
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <Label className="text-sm">Imagem de fundo das páginas</Label>
            <input ref={pageBgInputRef} type="file" accept="image/png,image/jpeg" className="hidden"
              onChange={(e) => handleAssetFile(e, uploadPageBgMutation, 3072, pageBgInputRef)} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => pageBgInputRef.current?.click()}
                disabled={uploadPageBgMutation.isPending}>
                <Upload className="size-4 mr-2" />
                {uploadPageBgMutation.isPending ? "Enviando…" : "Enviar imagem"}
              </Button>
              {data?.signedPageBgUrl && (
                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                  onClick={() => removePageBgMutation.mutate()}>
                  <Trash2 className="size-4 mr-2" /> Remover
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG/JPG até 3MB. Aplicada como fundo de todas as páginas.</p>
          </div>
        </div>

        {/* Marca d'água */}
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="w-44 h-28 border border-border rounded-lg grid place-items-center bg-night/30 shrink-0 overflow-hidden">
            {data?.signedWatermarkUrl ? (
              <img src={data.signedWatermarkUrl} alt="Marca d'água" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="text-muted-foreground text-xs text-center px-2">
                <ImageIcon className="size-6 mx-auto mb-1 opacity-50" />
                Sem marca d'água
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <Label className="text-sm">Marca d'água</Label>
            <input ref={watermarkInputRef} type="file" accept="image/png,image/jpeg" className="hidden"
              onChange={(e) => handleAssetFile(e, uploadWatermarkMutation, 1024, watermarkInputRef)} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => watermarkInputRef.current?.click()}
                disabled={uploadWatermarkMutation.isPending}>
                <Upload className="size-4 mr-2" />
                {uploadWatermarkMutation.isPending ? "Enviando…" : "Enviar marca d'água"}
              </Button>
              {data?.signedWatermarkUrl && (
                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                  onClick={() => removeWatermarkMutation.mutate()}>
                  <Trash2 className="size-4 mr-2" /> Remover
                </Button>
              )}
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <Label>Opacidade</Label>
                <span className="text-gold tabular-nums">{Math.round(form.watermark_opacity * 100)}%</span>
              </div>
              <Slider min={0} max={1} step={0.01} value={[form.watermark_opacity]}
                onValueChange={([v]) => setForm((p) => ({ ...p, watermark_opacity: v }))} />
            </div>
            <p className="text-xs text-muted-foreground">PNG transparente recomendado, até 1MB.</p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handlePreview}
          disabled={previewing || saveMutation.isPending}
          className="gap-2"
        >
          {previewing ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
          {previewing ? "Gerando preview…" : "Salvar e visualizar PDF"}
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          <Save className="size-4" />
          {saveMutation.isPending ? "Salvando…" : "Salvar personalização"}
        </Button>
      </div>

      <Dialog open={!!previewUrl} onOpenChange={(o) => { if (!o) closePreview(); }}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Pré-visualização do PDF</DialogTitle>
            <DialogDescription>
              Amostra visual renderizada na própria página para evitar bloqueios do Chrome. Use “Baixar PDF” para abrir o arquivo real.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted p-4 md:p-6">
            <PdfVisualPreview
              form={form}
              logoUrl={data?.signedLogoUrl ?? null}
              coverUrl={data?.signedCoverUrl ?? null}
              pageBgUrl={data?.signedPageBgUrl ?? null}
              watermarkUrl={data?.signedWatermarkUrl ?? null}
            />
          </div>
          <DialogFooter className="p-3 border-t">
            <Button type="button" variant="outline" onClick={downloadPreview} className="gap-2">
              <FileDown className="size-4" /> Baixar PDF
            </Button>
            <Button type="button" onClick={closePreview}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PdfVisualPreview({
  form,
  logoUrl,
  coverUrl,
  pageBgUrl,
  watermarkUrl,
}: {
  form: FormState;
  logoUrl: string | null;
  coverUrl: string | null;
  pageBgUrl: string | null;
  watermarkUrl: string | null;
}) {
  const fontFamily =
    form.font_family === "sans"
      ? "Inter, ui-sans-serif, system-ui, sans-serif"
      : form.font_family === "display"
        ? "Georgia, 'Times New Roman', serif"
        : "Georgia, 'Times New Roman', serif";
  const coverTitleAlign =
    form.cover_title_position === "top"
      ? "items-start pt-16"
      : form.cover_title_position === "bottom"
        ? "items-end pb-16"
        : "items-center";

  const pageStyle: CSSProperties = {
    backgroundColor: form.page_bg_color,
    color: form.body_text_color,
    fontFamily,
    fontSize: `${form.body_font_size}px`,
    lineHeight: form.line_height,
    backgroundImage: pageBgUrl ? `url(${pageBgUrl})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
      <div
        className={`relative flex aspect-[3/4] min-h-[420px] overflow-hidden rounded-lg border border-border p-8 shadow-2xl ${coverTitleAlign}`}
        style={{ backgroundColor: form.cover_bg_color, color: form.cover_accent_color, fontFamily }}
      >
        {coverUrl && <img src={coverUrl} alt="Imagem de capa" className="absolute inset-0 size-full object-cover opacity-45" />}
        <div className="absolute inset-5 rounded-md" style={{ border: form.frame_style === "none" ? "0" : form.frame_style === "double" ? `3px double ${form.cover_accent_color}` : `1px solid ${form.cover_accent_color}` }} />
        <div className="relative z-10 w-full text-center">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="mx-auto mb-6 max-h-20 max-w-48 object-contain" />
          ) : (
            <p className="mb-6 text-sm uppercase tracking-widest">{form.display_name || "Sua marca"}</p>
          )}
          <h3 className="text-3xl font-semibold leading-tight">Mapa de Exemplo</h3>
          <p className="mt-3 text-sm opacity-80">Prévia da capa personalizada</p>
        </div>
      </div>

      <div className="relative aspect-[3/4] min-h-[420px] overflow-hidden rounded-lg border border-border p-0 shadow-2xl" style={pageStyle}>
        {watermarkUrl && (
          <img
            src={watermarkUrl}
            alt="Marca d'água"
            className="pointer-events-none absolute left-1/2 top-1/2 max-h-52 max-w-52 -translate-x-1/2 -translate-y-1/2 object-contain"
            style={{ opacity: form.watermark_opacity }}
          />
        )}
        <div className="relative z-10 flex min-h-full flex-col">
          <header className="px-7 py-4 text-sm font-medium" style={{ backgroundColor: form.header_bg_color, color: form.header_text_color }}>
            {form.display_name || "Relatório personalizado"}
          </header>
          <main className="flex-1 space-y-4 px-7 py-6">
            <h4 className="text-2xl font-semibold" style={{ color: form.heading_text_color }}>Conteúdo do relatório</h4>
            <p>
              Esta prévia mostra como as cores, fontes, cabeçalho, rodapé, fundo e marca d'água serão aplicados aos próximos PDFs gerados.
            </p>
            <div className="rounded-md border border-border/60 p-4">
              <p className="font-medium" style={{ color: form.heading_text_color }}>Seção de exemplo</p>
              <p className="mt-2 text-sm opacity-85">O arquivo PDF real pode ser baixado pelo botão abaixo.</p>
            </div>
          </main>
          {form.footer_enabled && (
            <footer className="px-7 py-3 text-xs" style={{ backgroundColor: form.footer_bg_color }}>
              {[form.footer_name, form.footer_site, form.footer_phone].filter(Boolean).join(" • ") || "Rodapé personalizado"}
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded border border-border bg-transparent cursor-pointer"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} maxLength={9} className="font-mono text-xs" />
      </div>
    </div>
  );
}
