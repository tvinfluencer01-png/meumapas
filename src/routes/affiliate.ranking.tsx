import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AffiliateShell } from "@/modules/affiliate/ui/AffiliateShell";
import { getRanking, getGoalsAndMedals } from "@/modules/affiliate/panel.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, Medal } from "lucide-react";

export const Route = createFileRoute("/affiliate/ranking")({
  component: Page,
  head: () => ({ meta: [{ title: "Ranking & Metas — Affiliate Center" }] }),
});

const brl = (c: number) => `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

function Page() { return <AffiliateShell><Content /></AffiliateShell>; }

function Content() {
  const rankFn = useServerFn(getRanking);
  const goalsFn = useServerFn(getGoalsAndMedals);
  const { data: rank } = useQuery({ queryKey: ["aff-ranking"], queryFn: () => rankFn() });
  const { data: gm } = useQuery({ queryKey: ["aff-goals-medals"], queryFn: () => goalsFn() });

  const top = (rank?.top ?? []) as any[];
  const me = rank?.me;
  const goals = (gm?.goals ?? []) as any[];
  const medals = (gm?.medals ?? []) as any[];
  const awarded = new Set((gm?.awarded ?? []).map((a: any) => a.medal_id));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-serif shimmer-text flex items-center gap-2"><Trophy className="size-6 text-gold" /> Ranking, Metas & Medalhas</h1>
        <p className="text-sm text-muted-foreground">Suba no ranking, bata metas e conquiste medalhas.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Top Afiliados — este mês</CardTitle><CardDescription>Ordenado por receita gerada</CardDescription></CardHeader>
        <CardContent>
          {top.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">Ainda sem vendas neste mês.</div>
          ) : (
            <div className="divide-y">
              {top.map((row: any) => {
                const isMe = row.affiliate_id === me;
                const medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : `#${row.rank}`;
                return (
                  <div key={row.affiliate_id} className={`py-3 flex items-center gap-3 ${isMe ? "bg-gold/10 -mx-4 px-4 rounded-md" : ""}`}>
                    <div className="w-8 text-center text-lg">{medal}</div>
                    <Avatar className="size-9">
                      {row.profile?.avatar_url && <AvatarImage src={row.profile.avatar_url} />}
                      <AvatarFallback>{row.profile?.full_name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{row.profile?.full_name ?? "Afiliado"}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{row.profile?.affiliate_code}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-serif">{brl(row.revenue_cents)}</div>
                      <div className="text-[10px] text-muted-foreground">{row.sales} vendas</div>
                    </div>
                    {isMe && <Badge className="bg-gold text-white">Você</Badge>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Target className="size-5 text-gold" /> Metas ativas</CardTitle></CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">Nenhuma meta ativa no momento.</div>
          ) : (
            <div className="space-y-4">
              {goals.map((g) => (
                <div key={g.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{g.title}</span>
                    <span className="text-xs text-muted-foreground">{g.period_start} → {g.period_end}</span>
                  </div>
                  {g.target_cents && <div className="text-xs text-muted-foreground">Meta: {brl(g.target_cents)}</div>}
                  {g.target_conversions && <div className="text-xs text-muted-foreground">Meta: {g.target_conversions} conversões</div>}
                  {g.reward && <div className="text-xs text-gold">🎁 Recompensa: {g.reward}</div>}
                  <Progress value={0} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Medal className="size-5 text-gold" /> Medalhas</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {medals.map((m) => {
              const has = awarded.has(m.id);
              return (
                <div key={m.id} className={`border rounded-lg p-4 text-center ${has ? "border-gold/60 bg-gold/5" : "opacity-40"}`}>
                  <div className="text-4xl mb-2">{m.icon}</div>
                  <div className="text-sm font-medium">{m.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{m.description}</div>
                  <Badge variant="outline" className="mt-2 text-[10px] capitalize">{m.tier}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
