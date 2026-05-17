import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Image as ImageIcon, Upload, Trash2, Save, Sparkles, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  getPdfBranding,
  savePdfBranding,
  uploadPdfLogo,
  removePdfLogo,
} from "@/lib/pdf-branding.functions";

type FormState = {
  enabled: boolean;
  logo_width: number;
  logo_height: number;
  display_name: string;
  footer_enabled: boolean;
  footer_name: string;
  footer_site: string;
  footer_phone: string;
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
};

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
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["pdf-branding"],
    queryFn: () => getFn(),
  });

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    if (data?.branding) {
      setForm({
        enabled: data.branding.enabled,
        logo_width: data.branding.logo_width,
        logo_height: data.branding.logo_height,
        display_name: data.branding.display_name ?? "",
        footer_enabled: data.branding.footer_enabled,
        footer_name: data.branding.footer_name ?? "",
        footer_site: data.branding.footer_site ?? "",
        footer_phone: data.branding.footer_phone ?? "",
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          enabled: form.enabled,
          logo_width: form.logo_width,
          logo_height: form.logo_height,
          display_name: form.display_name,
          footer_enabled: form.footer_enabled,
          footer_name: form.footer_name,
          footer_site: form.footer_site,
          footer_phone: form.footer_phone,
        },
      }),
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

      {!form.enabled && (
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
              // eslint-disable-next-line @next/next/no-img-element
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
