import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getWeeklyReading } from "@/lib/weekly-reading.functions";
import { Sparkles, TrendingUp, Moon, ArrowUpRight, Wind, Anchor, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionLamp } from "@/components/SectionLamp";
import { InsufficientCreditsNotice } from "@/components/InsufficientCreditsNotice";


const TONE_STYLES = {
  rise: { bg: "from-gold/30 to-gold/5", icon: ArrowUpRight, ring: "ring-gold/40" },
  flow: { bg: "from-primary/30 to-primary/5", icon: Wind, ring: "ring-primary/40" },
  release: { bg: "from-stardust/20 to-stardust/5", icon: Anchor, ring: "ring-stardust/30" },
  peak: { bg: "from-gold/60 to-gold/10", icon: Star, ring: "ring-gold shadow-[0_0_24px_-4px_hsl(var(--gold)/0.7)]" },
} as const;

export function WeeklyReading() {
  const fetchWeek = useServerFn(getWeeklyReading);
  const { data, isLoading } = useQuery({
    queryKey: ["weekly-reading"],
    queryFn: () => fetchWeek({ data: undefined }),
    staleTime: 1000 * 60 * 60 * 3,
  });

  return (
    <section className="glass-card rounded-2xl p-6 lg:p-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold flex items-center gap-2">
            <TrendingUp className="size-3.5" /> Leitura da Semana
            <SectionLamp
              sectionKey="weekly-reading"
              title="Leitura da Semana"
              why="A energia muda dia a dia conforme a Lua, os trânsitos e seu dia pessoal numerológico. Visualizar a semana inteira ajuda a planejar com consciência."
              how="Leia o resumo no topo, observe a tira de 7 dias (o dia destacado é hoje) e desça para ver os detalhes de cada dia: tendência, fase da Lua e dia pessoal."
              purpose="Antecipar os melhores dias para agir, descansar, decidir ou recolher — e atravessar a semana em sintonia com o céu."
            />
          </p>
          <h2 className="font-serif text-2xl text-stardust mt-1">Próximos 7 dias</h2>
        </div>
        <Sparkles className="size-5 text-gold animate-pulse" />
      </header>

      {/* AI summary */}
      <div className="rounded-xl border border-gold/20 bg-gradient-to-br from-gold/5 to-transparent p-5 mb-6 min-h-[120px]">
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-stardust/10 rounded w-5/6" />
            <div className="h-3 bg-stardust/10 rounded w-full" />
            <div className="h-3 bg-stardust/10 rounded w-4/6" />
          </div>
        ) : data?.summary ? (
          <p className="text-sm lg:text-base text-stardust/90 leading-relaxed italic font-serif">
            "{data.summary}"
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {data?.hasBirth
              ? "Não foi possível canalizar a leitura agora. Tente novamente em instantes."
              : "Complete seus dados de nascimento para receber uma leitura personalizada."}
          </p>
        )}
      </div>

      {/* 7-day strip */}
      <div className="grid grid-cols-7 gap-2">
        {(data?.days ?? Array.from({ length: 7 }, (_, i) => ({
          date: "", weekday: "—", day: i + 1, personal_day: null,
          moon: { angle: 0, label: "" }, trend: { label: "", tone: "flow" as const },
        }))).map((d, i) => {
          const tone = TONE_STYLES[d.trend.tone];
          const Icon = tone.icon;
          const isToday = i === 0;
          return (
            <div
              key={i}
              className={cn(
                "relative rounded-xl p-2.5 bg-gradient-to-b text-center transition-all",
                tone.bg,
                isToday && "ring-2", isToday && tone.ring,
                isLoading && "animate-pulse",
              )}
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {d.weekday.replace(".", "")}
              </div>
              <div className="font-serif text-xl text-stardust mt-0.5">{d.day}</div>
              <Icon className="size-3.5 mx-auto mt-1 text-gold" />
              {d.personal_day !== null && (
                <div className="text-[10px] text-gold/80 mt-1">{d.personal_day}</div>
              )}
              {isToday && (
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[8px] uppercase tracking-widest text-gold bg-background px-1.5 rounded">
                  Hoje
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail list */}
      <div className="mt-5 space-y-2">
        {data?.days.slice(0, 7).map((d, i) => {
          const Icon = TONE_STYLES[d.trend.tone].icon;
          return (
            <div key={i} className="flex items-center gap-3 text-xs lg:text-sm border-b border-stardust/5 last:border-0 pb-2 last:pb-0">
              <span className="w-20 text-muted-foreground capitalize">
                {d.weekday.replace(".", "")}, {d.day}
              </span>
              <Icon className="size-3.5 text-gold shrink-0" />
              <span className="text-stardust flex-1 truncate">{d.trend.label}</span>
              <span className="flex items-center gap-1 text-muted-foreground text-[11px]">
                <Moon className="size-3" /> {d.moon.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
