import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminListHoroscopePaidLeads } from "@/lib/horoscope-plans.functions";

const SEEN_KEY = "admin-horoscope-paid-leads-seen";

export function AdminHoroscopeLeads() {
  const leadsFn = useServerFn(adminListHoroscopePaidLeads);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-horoscope-paid-leads"],
    queryFn: () => leadsFn(),
    refetchInterval: 30_000,
  });
  const leads: any[] = (data as any)?.leads ?? [];

  const [seenAt] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = Number(window.localStorage.getItem(SEEN_KEY) ?? 0);
    // marca como visto ao abrir o menu
    window.localStorage.setItem(SEEN_KEY, String(Date.now()));
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
          <Users className="size-5 text-gold" /> Horóscopo Leads
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
