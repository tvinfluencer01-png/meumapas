import { useEffect, useRef, useState } from "react";
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
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPreviewing(false);
    }
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
              mantêm o branding padrão do Cosmic AI.
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
          Add-on desativado. Seus relatórios continuam com o branding padrão do Cosmic AI.
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

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          <Save className="size-4" />
          {saveMutation.isPending ? "Salvando…" : "Salvar personalização"}
        </Button>
      </div>
    </div>
  );
}
