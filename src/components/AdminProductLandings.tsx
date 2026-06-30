import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Trash2, Loader2, ExternalLink, Copy, Upload, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { showFeedback, confirmDialog } from "@/components/system-feedback";
import {
  listAdminLandings,
  upsertLanding,
  deleteLanding,
  uploadLandingHeroImage,
  generateLandingHeroImage,
  REPORT_TYPES,
  AVAILABLE_FIELDS,
} from "@/lib/product-landings.functions";


type Landing = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  hero_image_url: string | null;
  price_cents: number;
  report_type: string;
  required_fields: string[];
  benefits: string[];
  cta_text: string;
  delivery_email_subject: string | null;
  delivery_email_template: string | null;
  delivery_whatsapp_template: string | null;
  seo_title: string | null;
  seo_description: string | null;
  active: boolean;
};

const EMPTY: Landing = {
  id: "",
  slug: "",
  title: "",
  subtitle: "",
  description: "",
  hero_image_url: "",
  price_cents: 4990,
  report_type: "mapa_astral",
  required_fields: ["full_name", "email", "birth_date"],
  benefits: [],
  cta_text: "Quero meu relatório",
  delivery_email_subject: "Seu relatório está pronto",
  delivery_email_template: "Olá {{full_name}},\n\nSeu relatório foi gerado. Acesse pelo link abaixo:\n\n{{access_link}}",
  delivery_whatsapp_template: "Olá {{full_name}}! Seu relatório está pronto: {{access_link}}",
  seo_title: "",
  seo_description: "",
  active: true,
};

export function AdminProductLandings() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminLandings);
  const saveFn = useServerFn(upsertLanding);
  const delFn = useServerFn(deleteLanding);

  const { data: landings, isLoading } = useQuery({
    queryKey: ["admin-product-landings"],
    queryFn: () => listFn(),
  });

  const [editing, setEditing] = useState<Landing | null>(null);

  const saveMutation = useMutation({
    mutationFn: (l: Landing) =>
      saveFn({
        data: {
          ...(l.id ? { id: l.id } : {}),
          slug: l.slug,
          title: l.title,
          subtitle: l.subtitle || null,
          description: l.description || null,
          hero_image_url: l.hero_image_url || null,
          price_cents: l.price_cents,
          report_type: l.report_type,
          required_fields: l.required_fields,
          benefits: l.benefits,
          cta_text: l.cta_text,
          delivery_email_subject: l.delivery_email_subject || null,
          delivery_email_template: l.delivery_email_template || null,
          delivery_whatsapp_template: l.delivery_whatsapp_template || null,
          seo_title: l.seo_title || null,
          seo_description: l.seo_description || null,
          active: l.active,
        },
      }),
    onSuccess: () => {
      showFeedback({ title: "Landing salva", description: "As alterações foram aplicadas.", type: "success" });
      qc.invalidateQueries({ queryKey: ["admin-product-landings"] });
      setEditing(null);
    },
    onError: (e: Error) => showFeedback({ title: "Erro ao salvar", description: e.message, type: "error" }),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      showFeedback({ title: "Landing excluída", type: "success" });
      qc.invalidateQueries({ queryKey: ["admin-product-landings"] });
    },
    onError: (e: Error) => showFeedback({ title: "Erro", description: e.message, type: "error" }),
  });

  async function handleDelete(id: string, title: string) {
    const ok = await confirmDialog({
      title: "Excluir landing?",
      description: `Esta ação removerá "${title}" e impedirá novas compras. Pedidos existentes permanecem.`,
      confirmText: "Excluir",
      type: "warning",
    });
    if (ok) delMutation.mutate(id);
  }

  return (
    <Card className="border-gold/30">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="font-serif shimmer-text">Landing Pages de Produtos</CardTitle>
          <CardDescription>
            Crie páginas independentes para vender relatórios avulsos (Mapa Astral, Numerologia, etc.).
          </CardDescription>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })} className="gap-2">
          <Plus className="size-4" /> Nova landing
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Carregando…</div>
        ) : !landings?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma landing cadastrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {landings.map((l: any) => (
              <div key={l.id} className="flex flex-col gap-2 rounded-lg border border-gold/20 bg-secondary/30 p-3 sm:flex-row sm:items-center">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif text-gold truncate">{l.title}</h4>
                    {l.active ? (
                      <Badge className="bg-green-600 text-white text-[10px]">Ativa</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Inativa</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                    <span>/p/{l.slug}</span>
                    <span>R$ {(l.price_cents / 100).toFixed(2)}</span>
                    <span>{REPORT_TYPES.find((r) => r.value === l.report_type)?.label ?? l.report_type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const url = `${window.location.origin}/p/${l.slug}`;
                      navigator.clipboard.writeText(url);
                      showFeedback({ title: "Link copiado", description: url, type: "success" });
                    }}
                    title="Copiar link"
                  >
                    <Copy className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" asChild title="Abrir landing">
                    <a href={`/p/${l.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing({ ...EMPTY, ...l, benefits: l.benefits ?? [], required_fields: l.required_fields ?? [] })}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(l.id, l.title)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-gold/30">
          <DialogHeader>
            <DialogTitle className="font-serif shimmer-text">
              {editing?.id ? "Editar landing" : "Nova landing"}
            </DialogTitle>
            <DialogDescription>Configure todos os detalhes da página de vendas.</DialogDescription>
          </DialogHeader>
          {editing && (
            <LandingForm
              landing={editing}
              onChange={setEditing}
              onSave={() => saveMutation.mutate(editing)}
              saving={saveMutation.isPending}
            />
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => editing && saveMutation.mutate(editing)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function LandingForm({
  landing,
  onChange,
  onSave,
  saving: _saving,
}: {
  landing: Landing;
  onChange: (l: Landing) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const upd = (patch: Partial<Landing>) => onChange({ ...landing, ...patch });
  const uploadFn = useServerFn(uploadLandingHeroImage);
  const genFn = useServerFn(generateLandingHeroImage);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const handleFile = async (file: File) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      showFeedback({ title: "Formato inválido", description: "Use PNG, JPG ou WebP.", type: "error" });
      return;
    }
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const base64 = btoa(bin);
      const { url } = await uploadFn({ data: { base64, mime: file.type as "image/png" | "image/jpeg" | "image/webp" } });
      upd({ hero_image_url: url });
      showFeedback({ title: "Imagem enviada", type: "success" });
    } catch (e: any) {
      showFeedback({ title: "Falha no upload", description: e.message, type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) {
      showFeedback({ title: "Descreva a imagem", description: "Escreva o prompt para gerar.", type: "error" });
      return;
    }
    setGenerating(true);
    try {
      const { url } = await genFn({ data: { prompt: aiPrompt.trim() } });
      upd({ hero_image_url: url });
      showFeedback({ title: "Imagem gerada", type: "success" });
    } catch (e: any) {
      showFeedback({ title: "Falha ao gerar", description: e.message, type: "error" });
    } finally {
      setGenerating(false);
    }
  };

  return (

    <div className="space-y-4 py-2">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Slug (URL)</Label>
          <Input value={landing.slug} onChange={(e) => upd({ slug: e.target.value })} placeholder="mapa-personalidade" />
          <p className="text-xs text-muted-foreground mt-1">URL final: /p/{landing.slug || "..."}</p>
        </div>
        <div>
          <Label>Preço (R$)</Label>
          <Input
            type="number"
            step="0.01"
            value={(landing.price_cents / 100).toFixed(2)}
            onChange={(e) => upd({ price_cents: Math.round(parseFloat(e.target.value || "0") * 100) })}
          />
        </div>
      </div>

      <div>
        <Label>Título</Label>
        <Input value={landing.title} onChange={(e) => upd({ title: e.target.value })} />
      </div>
      <div>
        <Label>Subtítulo</Label>
        <Input value={landing.subtitle ?? ""} onChange={(e) => upd({ subtitle: e.target.value })} />
      </div>
      <div>
        <Label>Descrição (HTML/Markdown simples)</Label>
        <Textarea rows={5} value={landing.description ?? ""} onChange={(e) => upd({ description: e.target.value })} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Tipo de relatório</Label>
          <Select value={landing.report_type} onValueChange={(v) => upd({ report_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Texto do botão (CTA)</Label>
          <Input value={landing.cta_text} onChange={(e) => upd({ cta_text: e.target.value })} />
        </div>
      </div>

      <div>
        <Label>Imagem de capa (URL)</Label>
        <Input value={landing.hero_image_url ?? ""} onChange={(e) => upd({ hero_image_url: e.target.value })} placeholder="https://..." />
      </div>

      <div>
        <Label>Campos a coletar do cliente</Label>
        <div className="grid sm:grid-cols-2 gap-1 mt-2 rounded-lg border border-gold/20 p-3">
          {AVAILABLE_FIELDS.map((f) => {
            const checked = landing.required_fields.includes(f.key);
            return (
              <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) =>
                    upd({
                      required_fields: v
                        ? [...landing.required_fields, f.key]
                        : landing.required_fields.filter((k) => k !== f.key),
                    })
                  }
                />
                {f.label}
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <Label>Benefícios (um por linha)</Label>
        <Textarea
          rows={4}
          value={(landing.benefits ?? []).join("\n")}
          onChange={(e) => upd({ benefits: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
          placeholder="Análise completa do seu mapa&#10;Entrega em até 24h&#10;PDF personalizado"
        />
      </div>

      <div className="space-y-3 rounded-lg border border-gold/20 p-3">
        <h5 className="font-serif text-gold">Entrega do relatório</h5>
        <div>
          <Label>Assunto do email</Label>
          <Input value={landing.delivery_email_subject ?? ""} onChange={(e) => upd({ delivery_email_subject: e.target.value })} />
        </div>
        <div>
          <Label>Mensagem do email</Label>
          <Textarea rows={4} value={landing.delivery_email_template ?? ""} onChange={(e) => upd({ delivery_email_template: e.target.value })} />
          <p className="text-xs text-muted-foreground mt-1">Variáveis: {"{{full_name}}, {{access_link}}"}</p>
        </div>
        <div>
          <Label>Mensagem do WhatsApp</Label>
          <Textarea rows={3} value={landing.delivery_whatsapp_template ?? ""} onChange={(e) => upd({ delivery_whatsapp_template: e.target.value })} />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-gold/20 p-3">
        <h5 className="font-serif text-gold">SEO</h5>
        <div>
          <Label>SEO title</Label>
          <Input value={landing.seo_title ?? ""} onChange={(e) => upd({ seo_title: e.target.value })} />
        </div>
        <div>
          <Label>SEO description</Label>
          <Textarea rows={2} value={landing.seo_description ?? ""} onChange={(e) => upd({ seo_description: e.target.value })} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={landing.active} onCheckedChange={(v) => upd({ active: v })} />
        <Label className="cursor-pointer">Landing ativa</Label>
      </div>
    </div>
  );
}
