import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AffiliateShell } from "@/modules/affiliate/ui/AffiliateShell";
import { getMyGamification, getLeaderboard } from "@/modules/affiliate/gamification.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Target, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/affiliate/gamification")({
  component: Page,
  head: () => ({ meta: [{ title: "Gamificação — Affiliate Center" }] }),
});

const brl = (c: number) => `R$ ${((c ?? 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

function Page() { return <AffiliateShell><Content /></AffiliateShell>; }

function Content() {
  const gFn = useServerFn(getMyGamification);
  const lbFn = useServerFn(getLeaderboard);
  const { data, isLoading } = useQuery({ queryKey: ["my-gam"], queryFn: () => gFn() });
  const { data: lb } = useQuery({ queryKey: ["lb-monthly-rev"], queryFn: () => lbFn({ data: { period: "monthly", metric: "revenue" } }) });

  if (isLoading) return <div className="p-6"><Loader2 className="animate-spin" /></div>;
  if (!data) return <div className="p-6 text-sm text-muted-foreground">Cadastre-se como afiliado para acessar.</div>;

  const points = data.points?.points ?? 0;
  const level = data.points?.level;
  const levels = data.levels ?? [];
  const nextLevel = levels.find((l: any) => l.min_points > points);
  const progressToNext = nextLevel
    ? Math.min(100, Math.round(((points - (level?.min_points ?? 0)) / (nextLevel.min_points - (level?.min_points ?? 0))) * 100))
    : 100;

  const ownedBadgeIds = new Set((data.badges ?? []).map((b: any) => b.badge_id));
  const rankings = (lb?.rankings ?? []) as any[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-serif shimmer-text flex items-center gap-2"><Trophy className="size-6 text-gold" /> Gamificação</h1>
        <p className="text-sm text-muted-foreground">Pontos, nível, badges, missões e ranking em tempo real.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Nível atual</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full" style={{ background: level?.color ?? "#D4AF37" }} />
              <div>
                <div className="font-serif text-xl">{level?.name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">+{((level?.commission_bonus_bps ?? 0) / 100).toFixed(2)}% de bônus</div>
              </div>
            </div>
            {nextLevel && (
              <div className="mt-3">
                <div className="text-xs text-muted-foreground mb-1">Próximo: {nextLevel.name} ({nextLevel.min_points} pts)</div>
                <Progress value={progressToNext} />
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pontos</CardTitle></CardHeader>
          <CardContent><div className="text-4xl font-bold text-gold">{points}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Badges conquistadas</CardTitle></CardHeader>
          <CardContent><div className="text-4xl font-bold">{data.badges?.length ?? 0} <span className="text-sm text-muted-foreground">/ {data.allBadges?.length ?? 0}</span></div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Target className="size-5 text-gold" /> Missões ativas</CardTitle></CardHeader>
        <CardContent>
          {(data.missions ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Sem missões ativas.</div>
          ) : (
            <div className="space-y-3">
              {data.missions.map((m: any) => {
                const p = (data.progress ?? []).find((x: any) => x.mission_id === m.id);
                const val = Number(p?.current_value ?? 0);
                const pct = Math.min(100, Math.round((val / Number(m.goal_value)) * 100));
                return (
                  <div key={m.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{m.title}</span>
                      <span className="text-xs text-muted-foreground">{val} / {m.goal_value} {m.goal_metric}</span>
                    </div>
                    <div className="text-xs text-gold">🎁 +{m.points_reward} pts {m.bonus_cents > 0 && `• ${brl(m.bonus_cents)}`}</div>
                    <Progress value={pct} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Medal className="size-5 text-gold" /> Badges</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {(data.allBadges ?? []).map((b: any) => {
              const owned = ownedBadgeIds.has(b.id);
              return (
                <div key={b.id} className={`border rounded-lg p-3 text-center ${owned ? "border-gold/60 bg-gold/5" : "opacity-40"}`}>
                  <div className="w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white mb-2" style={{ background: b.color ?? "#D4AF37" }}>
                    <Sparkles className="size-5" />
                  </div>
                  <div className="text-sm font-medium">{b.name}</div>
                  <div className="text-[10px] text-muted-foreground">{b.description}</div>
                  <Badge variant="outline" className="mt-1 text-[10px] capitalize">{b.rarity}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="size-5 text-gold" /> Ranking do mês</CardTitle><CardDescription>Por receita gerada</CardDescription></CardHeader>
        <CardContent>
          {rankings.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Sem dados ainda.</div>
          ) : (
            <div className="divide-y">
              {rankings.slice(0, 10).map((r) => (
                <div key={r.affiliate_id} className="flex items-center gap-3 py-2">
                  <div className="w-8 text-center">{r.position === 1 ? "🥇" : r.position === 2 ? "🥈" : r.position === 3 ? "🥉" : `#${r.position}`}</div>
                  <div className="flex-1 text-sm">{r.display_name}</div>
                  <div className="font-mono text-sm">{brl(r.value)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
