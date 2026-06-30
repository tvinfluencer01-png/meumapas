import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminListAffiliates,
  adminSetAffiliateStatus,
  adminGetSettings,
  adminUpdateSettings,
} from "../affiliate.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CheckCircle2, XCircle, Settings as SettingsIcon, PauseCircle } from "lucide-react";
import { toast } from "sonner";

export function AdminAffiliatePanel() {
  return (
    <Tabs defaultValue="list" className="space-y-4">
      <TabsList>
        <TabsTrigger value="list" className="gap-2"><Users className="size-4" /> Afiliados</TabsTrigger>
        <TabsTrigger value="settings" className="gap-2"><SettingsIcon className="size-4" /> Configurações</TabsTrigger>
      </TabsList>
      <TabsContent value="list"><AffiliateList /></TabsContent>
      <TabsContent value="settings"><AffiliateSettingsForm /></TabsContent>
    </Tabs>
  );
}

function AffiliateList() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListAffiliates);
  const setStatusFn = useServerFn(adminSetAffiliateStatus);
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState("");

  const { data: rows, isLoading } = useQuery({
    queryKey: ["aff-admin-list", status, q],
    queryFn: () => listFn({ data: { status: status || undefined, q: q || undefined } }),
  });

  const mut = useMutation({
    mutationFn: (vars: { id: string; status: "approved" | "rejected" | "suspended" | "pending"; reason?: string }) =>
      setStatusFn({ data: { affiliateId: vars.id, status: vars.status, reason: vars.reason } }),
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["aff-admin-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Afiliados Cadastrados</CardTitle>
        <CardDescription>Aprove, rejeite ou suspenda cadastros.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Buscar por nome…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-background border rounded-md px-3 text-sm"
          >
            <option value="">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="approved">Aprovado</option>
            <option value="rejected">Rejeitado</option>
            <option value="suspended">Suspenso</option>
          </select>
        </div>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : !rows?.length ? (
          <div className="text-sm text-muted-foreground p-6 text-center border rounded-md">
            Nenhum afiliado encontrado.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r: any) => (
              <div key={r.id} className="border rounded-md p-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-medium">{r.full_name}</div>
                  <div className="text-xs text-muted-foreground">{r.email} · {r.whatsapp}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">CPF: {r.cpf} · Cód: {r.affiliate_code}</div>
                </div>
                <StatusBadge status={r.status} />
                <div className="flex gap-1">
                  {r.status !== "approved" && (
                    <Button size="sm" variant="outline" onClick={() => mut.mutate({ id: r.id, status: "approved" })}>
                      <CheckCircle2 className="size-4 mr-1" /> Aprovar
                    </Button>
                  )}
                  {r.status !== "rejected" && (
                    <Button size="sm" variant="outline" onClick={() => mut.mutate({ id: r.id, status: "rejected" })}>
                      <XCircle className="size-4 mr-1" /> Rejeitar
                    </Button>
                  )}
                  {r.status !== "suspended" && (
                    <Button size="sm" variant="outline" onClick={() => mut.mutate({ id: r.id, status: "suspended" })}>
                      <PauseCircle className="size-4 mr-1" /> Suspender
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/40",
    approved: "bg-green-500/20 text-green-500 border-green-500/40",
    rejected: "bg-red-500/20 text-red-500 border-red-500/40",
    suspended: "bg-gray-500/20 text-gray-400 border-gray-500/40",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
}

function AffiliateSettingsForm() {
  const qc = useQueryClient();
  const getFn = useServerFn(adminGetSettings);
  const updateFn = useServerFn(adminUpdateSettings);
  const { data: s } = useQuery({ queryKey: ["aff-settings"], queryFn: () => getFn() });

  const [autoApprove, setAutoApprove] = useState<boolean>(false);
  const [rate, setRate] = useState<string>("20");
  const [cookieDays, setCookieDays] = useState<string>("30");
  const [minW, setMinW] = useState<string>("50");

  // Initialize when loaded.
  useState(() => {
    if (s) {
      setAutoApprove(!!(s as any).auto_approve);
      setRate(String((s as any).default_commission_rate ?? 20));
      setCookieDays(String((s as any).cookie_window_days ?? 30));
      setMinW(String(((s as any).min_withdraw_cents ?? 5000) / 100));
    }
  });

  const mut = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          auto_approve: autoApprove,
          default_commission_rate: parseFloat(rate || "0"),
          cookie_window_days: parseInt(cookieDays || "30", 10),
          min_withdraw_cents: Math.round(parseFloat(minW || "0") * 100),
        },
      }),
    onSuccess: () => {
      toast.success("Configurações salvas.");
      qc.invalidateQueries({ queryKey: ["aff-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações Globais</CardTitle>
        <CardDescription>Aprovação, comissão, cookie e saque mínimo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch id="aa" checked={autoApprove} onCheckedChange={setAutoApprove} />
          <Label htmlFor="aa">Aprovação automática de novos afiliados</Label>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Comissão padrão (%)</Label>
            <Input value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          <div>
            <Label>Cookie (dias)</Label>
            <Input value={cookieDays} onChange={(e) => setCookieDays(e.target.value)} />
          </div>
          <div>
            <Label>Saque mínimo (R$)</Label>
            <Input value={minW} onChange={(e) => setMinW(e.target.value)} />
          </div>
        </div>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </CardContent>
    </Card>
  );
}
