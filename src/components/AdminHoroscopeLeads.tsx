import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users, Gift, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminListHoroscopePaidLeads } from "@/lib/horoscope-plans.functions";
import { LeadsBlock, useNewLeadsCount } from "@/components/AdminHoroscopeLanding";

const PAID_SEEN_KEY = "admin-horoscope-paid-leads-seen";

function PaidLeadsBlock() {
  const leadsFn = useServerFn(adminListHoroscopePaidLeads);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-horoscope-paid-leads"],
    queryFn: () => leadsFn(),
    refetchInterval: 30_000,
  });
  const leads: any[] = (data as any)?.leads ?? [];

  const [seenAt] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = Number(window.localStorage.getItem(PAID_SEEN_KEY) ?? 0);
    window.localStorage.setItem(PAID_SEEN_KEY, String(Date.now()));
    return v;
  });

  const newCount = useMemo(
    () => leads.filter((l) => new Date(l.created_at).getTime() > seenAt).length,
    [leads, seenAt],
  );

  const statusLabel = (s: string) =>
    s === "active" ? "Ativa" : s === "pending" ? "Pendente" : s === "canceled" ? "Cancelada" : s;
  const statusVariant = (s: string): "default" | "secondary" | "outline" | "destructive" =>
    s === "active" ? "default" : s === "pending" ? "secondary" : s === "canceled" ? "outline" : "outline";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-5 text-gold" /> Assinaturas pagas
          {newCount > 0 && (
            <Badge className="ml-2 bg-gold text-background">{newCount} novo(s)</Badge>
          )}
        </CardTitle>
        <CardDescription>Assinantes capturados pelos planos pagos do horóscopo.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="size-5 animate-spin text-gold" /></div>
        ) : leads.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum lead capturado ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Próx. cobrança</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-sm">{l.email ?? "—"}</TableCell>
                    <TableCell className="text-sm">{l.phone_e164 ?? "—"}</TableCell>
                    <TableCell className="text-sm">{l.plan?.name ?? "—"}</TableCell>
                    <TableCell><Badge variant={statusVariant(l.status)}>{statusLabel(l.status)}</Badge></TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {l.current_period_end ? new Date(l.current_period_end).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminHoroscopeLeads() {
  const { count: newFree, markSeen } = useNewLeadsCount();
  const [tab, setTab] = useState("free");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="size-5 text-gold" />
        <h2 className="text-lg font-semibold">Horóscopo Leads</h2>
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          if (v === "free") markSeen();
        }}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="free" className="gap-2 relative">
            <Gift className="size-4" /> Grátis (Landing)
            {newFree > 0 && (
              <span className="relative ml-1 inline-flex items-center justify-center">
                <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-[10px] font-semibold text-white">
                  {newFree > 99 ? "99+" : newFree}
                </span>
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="paid" className="gap-2">
            <CreditCard className="size-4" /> Planos pagos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="free"><LeadsBlock /></TabsContent>
        <TabsContent value="paid"><PaidLeadsBlock /></TabsContent>
      </Tabs>
    </div>
  );
}
