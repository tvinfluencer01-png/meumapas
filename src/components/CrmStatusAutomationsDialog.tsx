import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { showFeedback } from "@/components/system-feedback";
import {
  listCrmStatusAutomations,
  saveCrmStatusAutomation,
  type CrmStatusAutomation,
  type StatusKey,
} from "@/lib/crm-status-automations.functions";

const TABS: { key: StatusKey; label: string }[] = [
  { key: "contacted", label: "Contatado" },
  { key: "negotiating", label: "Negociando" },
  { key: "converted", label: "Convertido" },
];

export function CrmStatusAutomationsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const listFn = useServerFn(listCrmStatusAutomations);
  const saveFn = useServerFn(saveCrmStatusAutomation);
  const { data, isLoading } = useQuery({
    queryKey: ["crm-status-automations"],
    queryFn: () => listFn(),
    enabled: open,
  });
  const [draft, setDraft] = useState<Record<StatusKey, CrmStatusAutomation> | null>(null);

  useEffect(() => {
    if (!data) return;
    const map: any = {};
    for (const row of data) map[row.status] = { ...row };
    setDraft(map);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async (row: CrmStatusAutomation) => saveFn({ data: row }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-status-automations"] });
      showFeedback({ title: "Automação salva", description: "As configurações foram atualizadas." });
    },
    onError: (e: any) =>
      showFeedback({ title: "Erro ao salvar", description: e?.message ?? String(e), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-serif shimmer-text">Automações por status</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Quando o lead muda para cada status, o sistema dispara automaticamente e-mail e/ou WhatsApp.
            Use <code>{"{{nome}}"}</code>, <code>{"{{produto}}"}</code> e <code>{"{{email}}"}</code> nos modelos.
          </p>
        </DialogHeader>
        {isLoading || !draft ? (
          <div className="py-12 text-center"><Loader2 className="size-5 animate-spin inline" /></div>
        ) : (
          <Tabs defaultValue="contacted">
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
            {TABS.map((t) => {
              const row = draft[t.key];
              if (!row) return null;
              const update = (patch: Partial<CrmStatusAutomation>) =>
                setDraft((prev) => prev ? { ...prev, [t.key]: { ...prev[t.key], ...patch } } : prev);
              return (
                <TabsContent key={t.key} value={t.key} className="space-y-4">
                  <div className="border border-gold/20 rounded p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold">📧 E-mail</Label>
                      <Switch
                        checked={row.email_enabled}
                        onCheckedChange={(v) => update({ email_enabled: v })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Assunto</Label>
                      <Input
                        value={row.email_subject}
                        onChange={(e) => update({ email_subject: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Corpo</Label>
                      <Textarea
                        value={row.email_body}
                        onChange={(e) => update({ email_body: e.target.value })}
                        rows={6}
                      />
                    </div>
                  </div>

                  <div className="border border-gold/20 rounded p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold">💬 WhatsApp</Label>
                      <Switch
                        checked={row.whatsapp_enabled}
                        onCheckedChange={(v) => update({ whatsapp_enabled: v })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Mensagem</Label>
                      <Textarea
                        value={row.whatsapp_message}
                        onChange={(e) => update({ whatsapp_message: e.target.value })}
                        rows={4}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button onClick={() => saveMut.mutate(row)} disabled={saveMut.isPending}>
                      {saveMut.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
                      Salvar
                    </Button>
                  </DialogFooter>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
