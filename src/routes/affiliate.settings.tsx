import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AffiliateShell } from "@/modules/affiliate/ui/AffiliateShell";
import { getMyAffiliate } from "@/modules/affiliate/affiliate.functions";
import { updateAccount } from "@/modules/affiliate/panel.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/affiliate/settings")({
  component: Page,
  head: () => ({ meta: [{ title: "Configurações — Affiliate Center" }] }),
});

function Page() { return <AffiliateShell><Content /></AffiliateShell>; }

function Content() {
  const qc = useQueryClient();
  const meFn = useServerFn(getMyAffiliate);
  const upFn = useServerFn(updateAccount);
  const { data: me } = useQuery({ queryKey: ["my-affiliate"], queryFn: () => meFn() });
  const p = (me as any)?.profile;

  const mut = useMutation({
    mutationFn: (patch: any) => upFn({ data: patch }),
    onSuccess: () => { toast.success("Preferências atualizadas!"); qc.invalidateQueries({ queryKey: ["my-affiliate"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!p) return <div>Carregando…</div>;

  const requestPush = async () => {
    if (!("Notification" in window)) { toast.error("Push não suportado neste navegador."); return; }
    const perm = await Notification.requestPermission();
    if (perm === "granted") { mut.mutate({ notify_push: true }); toast.success("Push ativado!"); }
    else toast.error("Permissão negada.");
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-serif shimmer-text">Configurações</h1>
        <p className="text-sm text-muted-foreground">Notificações e preferências.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Aparência</CardTitle><CardDescription>Escolha entre tema claro ou escuro.</CardDescription></CardHeader>
        <CardContent className="flex items-center justify-between">
          <Label>Tema claro</Label>
          <Switch checked={p.theme === "light"} onCheckedChange={(v) => mut.mutate({ theme: v ? "light" : "dark" })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notificações</CardTitle><CardDescription>Como você quer ser avisado.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Row label="Toast no navegador" checked={p.notify_toast !== false} onChange={(v) => mut.mutate({ notify_toast: v })} />
          <Row label="Push (browser)" checked={p.notify_push !== false} onChange={(v) => v ? requestPush() : mut.mutate({ notify_push: false })} />
          <Row label="E-mail" checked={p.notify_email !== false} onChange={(v) => mut.mutate({ notify_email: v })} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
