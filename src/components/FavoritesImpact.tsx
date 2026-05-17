import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { listFavorites } from "@/lib/favorites.functions";
import * as Astro from "astronomy-engine";
import { Sparkles, Moon, Flame, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

function reduce(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split("").reduce((a, b) => a + Number(b), 0);
  }
  return n;
}
function personalDay(dateISO: string, birthISO: string) {
  const [, bm, bd] = birthISO.split("-").map(Number);
  const [y, m, d] = dateISO.split("-").map(Number);
  const py = reduce(reduce(bm) + reduce(bd) + reduce(y));
  const pm = reduce(py + reduce(m));
  return reduce(pm + reduce(d));
}
function moonLabel(date: Date) {
  const a = Astro.MoonPhase(date);
  if (a < 22.5 || a >= 337.5) return { label: "Lua Nova", key: "new" as const };
  if (a >= 157.5 && a < 202.5) return { label: "Lua Cheia", key: "full" as const };
  if (a < 157.5) return { label: "Crescente", key: "wax" as const };
  return { label: "Minguante", key: "wan" as const };
}

export function FavoritesImpact() {
  const { user } = useAuth();
  const fetchFavs = useServerFn(listFavorites);

  const { data: favorites } = useQuery({
    queryKey: ["calendar-favorites"],
    queryFn: () => fetchFavs({ data: undefined }),
    staleTime: 1000 * 60 * 5,
  });

  const { data: birth } = useQuery({
    queryKey: ["birth", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("birth_data")
        .select("birth_date").eq("user_id", user!.id).eq("is_primary", true).maybeSingle();
      return data;
    },
  });

  const stats = useMemo(() => {
    const todayISO = new Date().toISOString().slice(0, 10);
    const upcoming = (favorites ?? []).filter((f) => f.date >= todayISO);
    let masters = 0, peaks = 0, fullMoons = 0, newMoons = 0;
    const sample: Array<{ date: string; tag: string }> = [];

    for (const f of upcoming) {
      const dt = new Date(f.date + "T12:00:00Z");
      const pd = birth ? personalDay(f.date, birth.birth_date) : null;
      const moon = moonLabel(dt);
      const tags: string[] = [];
      if (pd === 11 || pd === 22 || pd === 33) { masters++; tags.push(`Mestre ${pd}`); }
      else if (pd === 1 || pd === 8 || pd === 9) { peaks++; tags.push(`Pico ${pd}`); }
      if (moon.key === "full") { fullMoons++; tags.push("Lua Cheia"); }
      if (moon.key === "new") { newMoons++; tags.push("Lua Nova"); }
      if (tags.length && sample.length < 3) sample.push({ date: f.date, tag: tags.join(" · ") });
    }

    const total = upcoming.length;
    const charged = masters + peaks + fullMoons + newMoons;
    const intensity = total === 0 ? 0 : Math.min(100, Math.round((charged / total) * 100));

    let summary = "";
    if (total === 0) summary = "Marque dias importantes no calendário para ver o impacto energético aqui.";
    else if (charged === 0) summary = "Período de equilíbrio. Seus favoritos pedem presença e constância.";
    else if (intensity >= 70) summary = "Período altamente carregado. Reserve energia para os dias-chave.";
    else if (intensity >= 40) summary = "Período significativo, com janelas energéticas notáveis.";
    else summary = "Período suave, pontuado por momentos de força.";

    return { total, masters, peaks, fullMoons, newMoons, intensity, sample, summary };
  }, [favorites, birth]);

  return (
    <section className="glass-card rounded-2xl p-6 lg:p-8">
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold flex items-center gap-2">
            <TrendingUp className="size-3.5" /> Impacto Energético
          </p>
          <h2 className="font-serif text-2xl text-stardust mt-1">Seus favoritos no horizonte</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {stats.total} {stats.total === 1 ? "dia" : "dias"} à frente
        </span>
      </header>

      <p className="text-sm text-stardust/90 mb-5">{stats.summary}</p>

      <div className="mb-5">
        <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
          <span>Intensidade do período</span>
          <span className="text-gold">{stats.intensity}%</span>
        </div>
        <div className="h-2 rounded-full bg-stardust/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold/60 via-gold to-gold/80 transition-all duration-700"
            style={{ width: `${stats.intensity}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        <Stat icon={<Sparkles className="size-3.5" />} label="Mestres" value={stats.masters} highlight={stats.masters > 0} />
        <Stat icon={<Flame className="size-3.5" />} label="Picos" value={stats.peaks} highlight={stats.peaks > 0} />
        <Stat icon={<Moon className="size-3.5" />} label="Lua Cheia" value={stats.fullMoons} highlight={stats.fullMoons > 0} />
        <Stat icon={<Star className="size-3.5" />} label="Lua Nova" value={stats.newMoons} highlight={stats.newMoons > 0} />
      </div>

      {stats.sample.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gold/80 mb-2">Destaques</p>
          <ul className="space-y-1.5">
            {stats.sample.map((s) => {
              const d = new Date(s.date + "T12:00:00Z");
              return (
                <li key={s.date} className="flex items-center justify-between text-sm">
                  <span className="text-stardust/90">
                    {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).replace(".", "")}
                  </span>
                  <span className="text-xs text-gold/90">{s.tag}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number; highlight: boolean }) {
  return (
    <div className={cn(
      "rounded-xl border p-3 transition-colors",
      highlight ? "border-gold/40 bg-gold/5" : "border-stardust/10 bg-background/40",
    )}>
      <div className={cn("flex items-center gap-1.5 text-[10px] uppercase tracking-widest", highlight ? "text-gold" : "text-muted-foreground")}>
        {icon}{label}
      </div>
      <div className={cn("font-serif text-2xl mt-1", highlight ? "text-gold" : "text-stardust/70")}>{value}</div>
    </div>
  );
}
