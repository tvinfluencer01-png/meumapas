import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { computeNumerology, NUMBER_MEANINGS } from "@/lib/numerology";
import { Sparkles, Sun, Moon, Star, Heart, Flame, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnergyCalendar } from "@/components/EnergyCalendar";
import { WeeklyReading } from "@/components/WeeklyReading";
import { FavoritesSummary } from "@/components/FavoritesSummary";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Cosmic AI" }] }),
});

const SIGNS = ["Áries","Touro","Gêmeos","Câncer","Leão","Virgem","Libra","Escorpião","Sagitário","Capricórnio","Aquário","Peixes"];
function sunSignFromDate(d: string) {
  const [, m, day] = d.split("-").map(Number);
  const cutoffs: [number, number, string][] = [
    [1,20,"Capricórnio"],[2,19,"Aquário"],[3,21,"Peixes"],[4,20,"Áries"],
    [5,21,"Touro"],[6,21,"Gêmeos"],[7,23,"Câncer"],[8,23,"Leão"],
    [9,23,"Virgem"],[10,23,"Libra"],[11,22,"Escorpião"],[12,22,"Sagitário"],
  ];
  for (const [mm, dd, sign] of cutoffs) {
    if (m < mm || (m === mm && day <= dd)) return sign;
  }
  return "Capricórnio";
}

function Dashboard() {
  const { user } = useAuth();

  const { data: birth } = useQuery({
    queryKey: ["birth", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("birth_data")
        .select("*").eq("user_id", user!.id).eq("is_primary", true).maybeSingle();
      return data;
    },
  });

  const num = birth ? computeNumerology(birth.full_name, birth.birth_date) : null;
  const sunSign = birth ? sunSignFromDate(birth.birth_date) : null;

  const day = new Date();
  const dayNum = (() => {
    const s = `${day.getFullYear()}${String(day.getMonth()+1).padStart(2,"0")}${String(day.getDate()).padStart(2,"0")}`;
    let n = s.split("").reduce((a,b)=>a+Number(b),0);
    while (n > 9 && n !== 11 && n !== 22) n = String(n).split("").reduce((a,b)=>a+Number(b),0);
    return n;
  })();
  const dayMeaning = NUMBER_MEANINGS[dayNum];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-gold">
          {day.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
        <h1 className="font-serif text-3xl lg:text-5xl mt-2 shimmer-text">
          Bem-vindo, {birth?.full_name?.split(" ")[0] ?? "viajante"}
        </h1>
        <p className="mt-2 text-muted-foreground">A energia do dia te observa. Veja o que ela revela.</p>
      </header>

      {/* Energy of the day */}
      <section className="glass-card rounded-2xl p-6 lg:p-8 gold-glow">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-gold/10 p-3"><Flame className="size-6 text-gold" /></div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Vibração do dia</p>
            <h2 className="font-serif text-2xl text-stardust mt-1">
              {dayNum} — {dayMeaning?.title}
            </h2>
            <p className="mt-2 text-muted-foreground">{dayMeaning?.essence}</p>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Sun} label="Sol em" value={sunSign ?? "—"}
          hint="Sua identidade essencial" />
        <StatCard icon={Star} label="Caminho de vida" value={num?.life_path?.toString() ?? "—"}
          hint={num ? NUMBER_MEANINGS[num.life_path]?.title : "—"} />
        <StatCard icon={Heart} label="Alma (desejo)" value={num?.soul_urge?.toString() ?? "—"}
          hint={num ? NUMBER_MEANINGS[num.soul_urge]?.title : "—"} />
      </section>

      {/* Weekly AI Reading */}
      <WeeklyReading />

      {/* Energy Calendar */}
      <EnergyCalendar />

      {/* Favorites summary */}
      <FavoritesSummary />

      {/* CTAs */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActionCard
          to="/mapa-astral" title="Gerar Mapa Astral"
          desc="Veja planetas, casas, aspectos e ascendente — calculados com precisão astronômica."
          icon={Moon}
        />
        <ActionCard
          to="/numerologia" title="Ler Numerologia Completa"
          desc="Caminho de vida, expressão, alma e missão decifrados em linguagem humana."
          icon={Sparkles}
        />
      </section>

      {!birth && (
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm text-stardust">
          Você ainda não tem dados de nascimento.{" "}
          <Link to="/onboarding" className="text-gold underline">Completar agora</Link>.
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint }: any) {
  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Icon className="size-3.5 text-gold" /> {label}
      </div>
      <div className="font-serif text-3xl text-stardust mt-2">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function ActionCard({ to, title, desc, icon: Icon }: any) {
  return (
    <Link to={to} className="group glass-card rounded-2xl p-6 hover:gold-glow transition-all">
      <div className="flex items-start justify-between">
        <Icon className="size-7 text-gold" />
        <ChevronRight className="size-5 text-muted-foreground group-hover:text-gold transition-colors" />
      </div>
      <h3 className="font-serif text-xl text-stardust mt-4">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2">{desc}</p>
    </Link>
  );
}
