import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Megaphone, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { confirmDialog } from "@/components/system-feedback";
import {
  listMarketingMessages,
  upsertMarketingMessage,
  deleteMarketingMessage,
  type MarketingMessage,
} from "@/lib/marketing.functions";
import { MARKETING_SERVICES, MARKETING_SIGNATURE } from "@/lib/marketing.catalog";

type FormState = {
  id: string | null;
  title: string;
  body: string;
  services: string[];
  enabled: boolean;
  weight: number;
};

const EMPTY: FormState = {
  id: null,
  title: "",
  body: "",
  services: [],
  enabled: true,
  weight: 1,
};

export function AdminMarketing() {
  const listFn = useServerFn(listMarketingMessages);
  const upsertFn = useServerFn(upsertMarketingMessage);
  const deleteFn = useServerFn(deleteMarketingMessage);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["marketing-messages"],
    queryFn: () => listFn(),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const openCreate = () => {
    setForm(EMPTY);
    setOpen(true);
  };
  const openEdit = (m: MarketingMessage) => {
    setForm({
      id: m.id,
      title: m.title,
      body: m.body,
      services: m.services ?? [],
      enabled: m.enabled,
      weight: m.weight,
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: () => upsertFn({ data: form }),
    onSuccess: () => {
      toast.success("Mensagem salva!");
      qc.invalidateQueries({ queryKey: ["marketing-messages"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Mensagem removida.");
      qc.invalidateQueries({ queryKey: ["marketing-messages"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao remover"),
  });

  const toggleService = (key: string) => {
    setForm((f) =>
      f.services.includes(key)
        ? { ...f, services: f.services.filter((s) => s !== key) }
        : { ...f, services: [...f.services, key] },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-gold">
            <Megaphone className="size-5" /> Marketing — mensagens rotativas
          </CardTitle>
          <CardDescription>
            Mensagens curtas que aparecem ao final dos envios (WhatsApp, e-mail, SMS) antes
            da assinatura <strong>{MARKETING_SIGNATURE}</strong>. Selecione em quais serviços
            cada mensagem deve circular — o sistema sorteia uma por envio (ponderado por peso).
          </CardDescription>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" /> Nova mensagem
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Carregando…
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma mensagem cadastrada. Clique em <em>Nova mensagem</em> para começar.
          </p>
        ) : (
          <div className="space-y-3">
            {data.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-border/60 bg-secondary/30 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gold">{m.title}</span>
                      {!m.enabled && (
                        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          desativada
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">peso {m.weight}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {m.body}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(m.services ?? []).map((s) => {
                        const label =
                          MARKETING_SERVICES.find((x) => x.key === s)?.label ?? s;
                        return (
                          <span
                            key={s}
                            className="text-xs px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/30"
                          >
                            {label}
                          </span>
                        );
                      })}
                      {(m.services ?? []).length === 0 && (
                        <span className="text-xs text-destructive">
                          nenhum serviço selecionado
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(m)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: "Remover mensagem?",
                          description: `"${m.title}" será excluída.`,
                          confirmText: "Remover",
                          destructive: true,
                        });
                        if (ok) remove.mutate(m.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Editar mensagem" : "Nova mensagem de marketing"}
            </DialogTitle>
            <DialogDescription>
              Será anexada ao final do envio, antes de <strong>— {MARKETING_SIGNATURE}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título interno</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex.: Promo Mapa Astral abril"
              />
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                rows={4}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Ex.: ✨ Conheça seu Mapa Astral completo com 30% off em codigocosmico.com"
              />
              <p className="text-xs text-muted-foreground">
                Dica: até 2 linhas. Pode incluir emoji, link curto e CTA.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Serviços onde aparece</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MARKETING_SERVICES.map((s) => (
                  <label
                    key={s.key}
                    className="flex items-center gap-2 rounded border border-border/60 px-3 py-2 cursor-pointer hover:bg-secondary/40"
                  >
                    <Checkbox
                      checked={form.services.includes(s.key)}
                      onCheckedChange={() => toggleService(s.key)}
                    />
                    <span className="text-sm">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label>Ativa</Label>
                <p className="text-xs text-muted-foreground">
                  Desligue para parar de incluir esta mensagem nos envios.
                </p>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => setForm({ ...form, enabled: v })}
              />
            </div>

            <div className="space-y-2">
              <Label>Peso (1–100)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.weight}
                onChange={(e) =>
                  setForm({ ...form, weight: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Mensagens com peso maior aparecem com mais frequência no rodízio.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
