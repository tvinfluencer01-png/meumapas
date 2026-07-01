import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AffiliateShell } from "@/modules/affiliate/ui/AffiliateShell";
import { listNotifications, markNotificationRead } from "@/modules/affiliate/panel.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";

export const Route = createFileRoute("/affiliate/notifications")({
  component: Page,
  head: () => ({ meta: [{ title: "Notificações — Affiliate Center" }] }),
});

function Page() { return <AffiliateShell><Content /></AffiliateShell>; }

function Content() {
  const qc = useQueryClient();
  const fn = useServerFn(listNotifications);
  const markFn = useServerFn(markNotificationRead);
  const { data } = useQuery({ queryKey: ["affiliate-notifs"], queryFn: () => fn(), refetchInterval: 15000 });
  const mut = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } as any }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["affiliate-notifs"] }),
  });

  const items = (data ?? []) as any[];

  const requestPush = async () => {
    if ("Notification" in window) await Notification.requestPermission();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif shimmer-text flex items-center gap-2"><Bell className="size-6 text-gold" /> Notificações</h1>
          <p className="text-sm text-muted-foreground">Alertas em tempo real do sistema.</p>
        </div>
        <Button variant="outline" size="sm" onClick={requestPush}>Ativar Push</Button>
      </header>

      {items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Sem notificações.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={n.read_at ? "opacity-70" : "border-gold/40"}>
              <CardContent className="pt-4 flex items-start gap-3">
                <Bell className={`size-4 shrink-0 mt-0.5 ${n.read_at ? "text-muted-foreground" : "text-gold"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{n.title}</div>
                  {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("pt-BR")}</div>
                </div>
                {!n.read_at && (
                  <Button size="sm" variant="ghost" onClick={() => mut.mutate(n.id)}>
                    <CheckCheck className="size-3" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
