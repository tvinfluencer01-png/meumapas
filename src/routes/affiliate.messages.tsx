import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AffiliateShell } from "@/modules/affiliate/ui/AffiliateShell";
import { listMessages, sendMessage } from "@/modules/affiliate/panel.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/affiliate/messages")({
  component: Page,
  head: () => ({ meta: [{ title: "Mensagens — Affiliate Center" }] }),
});

function Page() { return <AffiliateShell><Content /></AffiliateShell>; }

function Content() {
  const qc = useQueryClient();
  const fn = useServerFn(listMessages);
  const sendFn = useServerFn(sendMessage);
  const { data } = useQuery({ queryKey: ["aff-messages"], queryFn: () => fn() });
  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [data]);

  useEffect(() => {
    const channel = supabase.channel("aff-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "affiliate_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["aff-messages"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const mut = useMutation({
    mutationFn: () => sendFn({ data: { body } as any }),
    onSuccess: () => { setBody(""); qc.invalidateQueries({ queryKey: ["aff-messages"] }); },
  });

  const items = (data ?? []) as any[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-serif shimmer-text">Mensagens</h1>
        <p className="text-sm text-muted-foreground">Fale direto com a equipe.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Chat com o admin</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div ref={scrollRef} className="h-96 overflow-y-auto border rounded-md p-3 bg-muted/20 space-y-2">
            {items.length === 0 && <div className="text-center text-muted-foreground text-sm py-10">Nenhuma mensagem ainda</div>}
            {items.map((m) => (
              <div key={m.id} className={`flex ${m.from_admin ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[75%] rounded-lg p-3 text-sm ${m.from_admin ? "bg-card border" : "bg-gold text-white"}`}>
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  <div className={`text-[10px] mt-1 ${m.from_admin ? "text-muted-foreground" : "text-white/70"}`}>
                    {new Date(m.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea rows={2} placeholder="Digite sua mensagem..." value={body} onChange={(e) => setBody(e.target.value)} />
            <Button disabled={!body.trim() || mut.isPending} onClick={() => mut.mutate()}>
              <Send className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
