import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useActiveSubject } from "@/hooks/use-active-subject";
import { computeNumerology, NUMBER_MEANINGS, numLabel, numTitle } from "@/lib/numerology";
import {
  Sparkles, Sun, Moon, Star, Heart, Flame, ChevronRight,
  Coins, Home, HeartPulse, Users, Loader2, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnergyCalendar } from "@/components/EnergyCalendar";
import { WeeklyReading } from "@/components/WeeklyReading";
import { FavoritesSummary } from "@/components/FavoritesSummary";
import { FavoritesImpact } from "@/components/FavoritesImpact";
import { AIInsights } from "@/components/AIInsights";
import { generateReport } from "@/lib/reports.functions";
import { emitCreditsChanged } from "@/lib/credits-events";
import { showLoader, hideLoader, updateLoader } from "@/components/system-feedback";
import { toast } from "sonner";
import { CreditCostBadge } from "@/components/CreditCostBadge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Cosmic AI" }] }),
});

const SIGNS = ["Áries","Touro","Gêmeos","Câncer","Leão","Virgem","Libra","Escorpião","Sagitário","Capricórnio","Aquário","Peixes"];
function sunSignFromDate(d: string | null | undefined) {
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(d)) return null;
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
  const { data: birth } = useActiveSubject();

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
        <StatCard icon={Star} label="Caminho de vida" value={numLabel(num?.life_path)}
          hint={numTitle(num?.life_path)} />
        <StatCard icon={Heart} label="Alma (desejo)" value={numLabel(num?.soul_urge)}
          hint={numTitle(num?.soul_urge)} />
      </section>

      {/* AI Insights — aplica resumo prático ao agora */}
      <AIInsights />

      {/* Weekly AI Reading */}
      <WeeklyReading />

      {/* Energy Calendar */}
      <EnergyCalendar />

      {/* Favorites impact + summary */}
      <FavoritesImpact />
      <FavoritesSummary />

      {/* Quick report shortcuts */}
      <QuickReports hasBirth={!!birth} />

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

type QuickKind = "finance" | "family" | "health" | "friendships";

const QUICK_REPORTS: { kind: QuickKind; title: string; desc: string; icon: typeof Sparkles; gradient: string }[] = [
  {
    kind: "finance",
    title: "Questões Financeiras",
    desc: "Prosperidade, bloqueios e direções monetárias.",
    icon: Coins,
    gradient: "from-yellow-500/30 via-amber-400/10 to-transparent",
  },
  {
    kind: "family",
    title: "Vida Familiar",
    desc: "Dinâmicas do lar e padrões ancestrais.",
    icon: Home,
    gradient: "from-orange-500/30 via-amber-400/10 to-transparent",
  },
  {
    kind: "health",
    title: "Saúde",
    desc: "Vitalidade corpo, mente e espírito.",
    icon: HeartPulse,
    gradient: "from-red-500/30 via-rose-400/10 to-transparent",
  },
  {
    kind: "friendships",
    title: "Amizades",
    desc: "Vínculos sociais e círculos verdadeiros.",
    icon: Users,
    gradient: "from-sky-500/30 via-cyan-400/10 to-transparent",
  },
];

function QuickReports({ hasBirth }: { hasBirth: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const generate = useServerFn(generateReport);
  const [loadingKind, setLoadingKind] = useState<QuickKind | null>(null);

  async function downloadFromUrl(url: string, filename: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Falha ao baixar o arquivo");
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
  }

  const gen = useMutation({
    mutationFn: async (kind: QuickKind) => {
      setLoadingKind(kind);
      const title = QUICK_REPORTS.find((r) => r.kind === kind)?.title ?? "Relatório";
      showLoader({
        title: `Gerando ${title}`,
        subtitle: "Oráculo em ação",
        messages: ["Iniciando a leitura cósmica..."],
        progress: 0,
        step: "Iniciando a leitura cósmica...",
      });
      const stream = await generate({ data: { kind } });
      let result: { signedUrl: string | null; title: string; id: string | null } | null = null;
      for await (const evt of stream) {
        if (evt.type === "progress") {
          updateLoader({ progress: evt.progress, step: evt.step });
        } else if (evt.type === "done") {
          updateLoader({ progress: evt.progress, step: evt.step });
          result = evt.result;
        }
      }
      if (!result) throw new Error("Geração interrompida.");
      return result;
    },
    onSuccess: async (res, kind) => {
      qc.invalidateQueries({ queryKey: ["reports", user?.id] });
      if (res.signedUrl) {
        try {
          updateLoader({ step: "Preparando download do PDF...", progress: 100 });
          await downloadFromUrl(res.signedUrl, `${res.title || kind}.pdf`);
          toast.success("Relatório pronto. Download iniciado.");
        } catch {
          toast.error("PDF gerado, mas o download falhou. Veja em /relatorios.");
        }
      }
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao gerar relatório"),
    onSettled: () => {
      setLoadingKind(null);
      hideLoader();
      emitCreditsChanged();
    },
  });

  return (
    <section>
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Atalhos de relatórios</p>
          <h2 className="font-serif text-xl text-stardust mt-1">Gere e baixe com 1 clique</h2>
        </div>
        <Link to="/relatorios" className="text-xs text-muted-foreground hover:text-gold transition">
          Ver todos
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {QUICK_REPORTS.map((c) => {
          const isLoading = loadingKind === c.kind;
          const disabled = !hasBirth || isLoading || !!loadingKind;
          return (
            <button
              key={c.kind}
              onClick={() => !disabled && gen.mutate(c.kind)}
              disabled={disabled}
              title={!hasBirth ? "Complete seus dados de nascimento" : undefined}
              className="group relative text-left glass-card rounded-2xl p-5 overflow-hidden hover:gold-glow transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-50 pointer-events-none`} />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-night/40 border border-gold/30 grid place-items-center">
                    <c.icon className="size-5 text-gold" />
                  </div>
                  <h3 className="font-serif text-base text-stardust">{c.title}</h3>
                </div>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-gold">
                    {isLoading ? (
                      <><Loader2 className="size-3 animate-spin" /> Gerando...</>
                    ) : (
                      <><Download className="size-3" /> Gerar e baixar</>
                    )}
                  </div>
                  <CreditCostBadge action={`report_${c.kind}`} showBalance={false} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
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
