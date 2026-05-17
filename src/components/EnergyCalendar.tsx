import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getEnergyCalendar } from "@/lib/energy-calendar.functions";
import { listFavorites, toggleFavorite } from "@/lib/favorites.functions";
import { ChevronLeft, ChevronRight, Sparkles, Moon, Heart, Compass, AlertTriangle, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const INTENSITY_STYLES: Record<string, string> = {
  calm: "bg-primary/5 text-stardust/70",
  balanced: "bg-primary/15 text-stardust",
  intense: "bg-gold/20 text-gold",
  peak: "bg-gold/40 text-gold shadow-[0_0_18px_-2px_hsl(var(--gold)/0.6)]",
};

function MoonGlyph({ icon }: { icon: string }) {
  // simple SVG moon phase based on shadow offset
  const offset: Record<string, number> = {
    "new": 0, "waxing-crescent": -0.6, "first-quarter": -0.3,
    "waxing-gibbous": -0.1, "full": 1, "waning-gibbous": 0.1,
    "last-quarter": 0.3, "waning-crescent": 0.6,
  };
  const o = offset[icon] ?? 0;
  if (icon === "full") {
    return <circle cx="6" cy="6" r="4" className="fill-gold" />;
  }
  if (icon === "new") {
    return <circle cx="6" cy="6" r="4" className="fill-none stroke-gold/50" strokeWidth="0.6" />;
  }
  return (
    <g>
      <circle cx="6" cy="6" r="4" className="fill-gold/80" />
      <circle cx={6 + o * 5} cy="6" r="4" className="fill-background" />
    </g>
  );
}

export function EnergyCalendar() {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const [favOnly, setFavOnly] = useState(false);

  const fetchCal = useServerFn(getEnergyCalendar);
  const fetchFavs = useServerFn(listFavorites);
  const toggleFav = useServerFn(toggleFavorite);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["energy-calendar", cursor.year, cursor.month],
    queryFn: () => fetchCal({ data: cursor }),
    staleTime: 1000 * 60 * 30,
  });
  const { data: favorites } = useQuery({
    queryKey: ["calendar-favorites"],
    queryFn: () => fetchFavs({ data: undefined }),
    staleTime: 1000 * 60 * 5,
  });
  const favSet = useMemo(() => new Set((favorites ?? []).map((f) => f.date)), [favorites]);

  const toggleMutation = useMutation({
    mutationFn: (date: string) => toggleFav({ data: { date } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-favorites"] });
    },
  });

  const firstWeekday = useMemo(() => {
    return new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).getUTCDay();
  }, [cursor]);

  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const selectedDay = data?.days.find((d) => d.date === selected);
  const insight = selected ? data?.insights[selected] : undefined;

  const goPrev = () => setCursor((c) => {
    const m = c.month - 1;
    return m < 1 ? { year: c.year - 1, month: 12 } : { year: c.year, month: m };
  });
  const goNext = () => setCursor((c) => {
    const m = c.month + 1;
    return m > 12 ? { year: c.year + 1, month: 1 } : { year: c.year, month: m };
  });

  return (
    <section className="glass-card rounded-2xl p-6 lg:p-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold flex items-center gap-2">
            <Sparkles className="size-3.5" /> Calendário Energético
          </p>
          <h2 className="font-serif text-2xl text-stardust mt-1">
            {MONTHS[cursor.month - 1]} {cursor.year}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFavOnly((v) => !v)}
            aria-pressed={favOnly}
            title={favOnly ? "Mostrar todos os dias" : "Mostrar só favoritos"}
            className={cn(
              "mr-1 flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full border transition-colors",
              favOnly
                ? "border-gold/60 bg-gold/15 text-gold"
                : "border-stardust/15 text-muted-foreground hover:border-gold/40 hover:text-gold",
            )}
          >
            <Star className={cn("size-3", favOnly && "fill-gold")} />
            {favOnly ? "Só favoritos" : "Filtrar favoritos"}
          </button>
          <button onClick={goPrev} aria-label="Mês anterior"
            className="p-2 rounded-full hover:bg-gold/10 text-stardust transition-colors">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={goNext} aria-label="Próximo mês"
            className="p-2 rounded-full hover:bg-gold/10 text-stardust transition-colors">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-1 mb-2 text-[10px] uppercase tracking-widest text-muted-foreground text-center">
        {WEEKDAYS.map((w, i) => <div key={i}>{w}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: firstWeekday }).map((_, i) => <div key={`pad-${i}`} />)}
        {(data?.days ?? Array.from({ length: 30 }, (_, i) => ({
          date: "", day: i + 1, personal_day: null, intensity: "calm" as const,
          moon: { icon: "new", label: "", angle: 0 }, weekday: 0,
        }))).map((d) => {
          const isToday = d.date === todayISO;
          const isSelected = d.date === selected;
          const isFav = favSet.has(d.date);
          return (
            <button
              key={d.day}
              onClick={() => d.date && setSelected(d.date)}
              disabled={!d.date}
              className={cn(
                "relative aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all",
                "border border-transparent hover:border-gold/40",
                INTENSITY_STYLES[d.intensity],
                isToday && "ring-1 ring-gold",
                isSelected && "ring-2 ring-gold scale-105",
                isFav && "border-gold/60",
                isLoading && "animate-pulse",
              )}
            >
              <span className="font-serif text-sm leading-none">{d.day}</span>
              {d.personal_day !== null && (
                <span className="text-[9px] opacity-70 mt-0.5">{d.personal_day}</span>
              )}
              {d.date && (
                <svg viewBox="0 0 12 12" className="absolute top-1 right-1 size-2.5">
                  <MoonGlyph icon={d.moon.icon} />
                </svg>
              )}
              {isFav && (
                <Star className="absolute bottom-0.5 left-0.5 size-2.5 text-gold fill-gold" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day insight */}
      <div className="mt-6 min-h-[88px] rounded-xl border border-gold/20 bg-background/40 p-4">
        {selectedDay ? (
          <div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="font-serif text-lg text-stardust">
                {new Date(selectedDay.date + "T12:00:00Z").toLocaleDateString("pt-BR", {
                  weekday: "long", day: "2-digit", month: "long",
                })}
              </span>
              <span className="flex items-center gap-1 text-gold">
                <Moon className="size-3.5" /> {selectedDay.moon.label}
              </span>
              {selectedDay.personal_day !== null && (
                <span className="text-gold">Dia pessoal {selectedDay.personal_day}</span>
              )}
              <button
                onClick={() => toggleMutation.mutate(selectedDay.date)}
                disabled={toggleMutation.isPending}
                className={cn(
                  "ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-all",
                  favSet.has(selectedDay.date)
                    ? "border-gold/60 bg-gold/15 text-gold"
                    : "border-stardust/20 text-stardust hover:border-gold/40 hover:text-gold",
                )}
              >
                <Star className={cn("size-3.5", favSet.has(selectedDay.date) && "fill-gold")} />
                {favSet.has(selectedDay.date) ? "Favorito" : "Marcar como importante"}
              </button>
            </div>
            {insight && typeof insight === "object" ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <InsightCard
                  tone="emotions"
                  label="Emoções"
                  text={insight.emotions}
                />
                <InsightCard
                  tone="actions"
                  label="Ações recomendadas"
                  text={insight.actions}
                />
                <InsightCard
                  tone="alert"
                  label="Alerta"
                  text={insight.alert}
                />
              </div>
            ) : (
              <p className="mt-2 text-sm text-stardust/90 leading-relaxed">
                {data?.hasBirth
                  ? "A IA está canalizando este dia..."
                  : "Complete seus dados de nascimento para receber insights personalizados."}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Toque em um dia para ver a leitura energética e o insight da IA.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <Legend swatch="bg-primary/5" label="Calmo" />
        <Legend swatch="bg-primary/15" label="Equilibrado" />
        <Legend swatch="bg-gold/20" label="Intenso" />
        <Legend swatch="bg-gold/40" label="Pico (mestre)" />
      </div>
    </section>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("size-3 rounded", swatch)} /> {label}
    </div>
  );
}

const INSIGHT_STYLES = {
  emotions: { icon: Heart, ring: "border-primary/30 bg-primary/5", iconColor: "text-primary" },
  actions: { icon: Compass, ring: "border-gold/30 bg-gold/5", iconColor: "text-gold" },
  alert: { icon: AlertTriangle, ring: "border-amber-500/30 bg-amber-500/5", iconColor: "text-amber-400" },
} as const;

function InsightCard({ tone, label, text }: { tone: keyof typeof INSIGHT_STYLES; label: string; text?: string }) {
  const s = INSIGHT_STYLES[tone];
  const Icon = s.icon;
  return (
    <div className={cn("rounded-xl border p-3", s.ring)}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className={cn("size-3.5", s.iconColor)} /> {label}
      </div>
      <p className="mt-1.5 text-sm text-stardust/90 leading-relaxed">
        {text ?? "—"}
      </p>
    </div>
  );
}

