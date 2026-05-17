import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { showLoader, hideLoader, updateLoader } from "@/components/system-feedback";
import { Loader2, Sparkles, Wand2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { computeNatalChart, pingAstro } from "@/lib/astrology.functions";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PLANET_MEANING, SIGN_MEANING, ASPECT_MEANING } from "@/lib/astro-meanings";

export const Route = createFileRoute("/_authenticated/mapa-astral")({
  component: MapaAstral,
  head: () => ({ meta: [{ title: "Mapa Astral — Cosmic AI" }] }),
});

const SIGNS = ["Áries","Touro","Gêmeos","Câncer","Leão","Virgem","Libra","Escorpião","Sagitário","Capricórnio","Aquário","Peixes"];
const SIGN_GLYPHS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const PLANET_GLYPH: Record<string,string> = {
  Sol:"☉", Lua:"☽", Mercúrio:"☿", Vênus:"♀", Marte:"♂",
  Júpiter:"♃", Saturno:"♄", Urano:"♅", Netuno:"♆", Plutão:"♇",
};

function MapaAstral() {
  const { user } = useAuth();
  const compute = useServerFn(computeNatalChart);
  const ping = useServerFn(pingAstro);
  const [loading, setLoading] = useState(false);
  const [chart, setChart] = useState<any>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [retryInfo, setRetryInfo] = useState<{ attempt: number; max: number; waitMs: number } | null>(null);

  // Health probe: confirms the astrology serverFn is deployed/reachable.
  const health = useQuery({
    queryKey: ["astro-health"],
    queryFn: async () => {
      const r = await ping();
      if (!r || (r as any).ok !== true) throw new Error("unhealthy");
      return r;
    },
    retry: 1,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const backendDown = health.isError;

  const { data: birth } = useQuery({
    queryKey: ["birth", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("birth_data")
        .select("*").eq("user_id", user!.id).eq("is_primary", true).maybeSingle();
      return data;
    },
  });

  const { data: latest } = useQuery({
    queryKey: ["latest-chart", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("astro_charts")
        .select("*").eq("user_id", user!.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
      return data;
    },
  });

  async function handleGenerate() {
    if (!birth) {
      toast.error("Complete seus dados de nascimento primeiro.");
      return;
    }
    // Backend health gate — re-probe right before computing to avoid
    // sending a request the server can't handle.
    try {
      const probe = await ping();
      if (!probe || (probe as any).ok !== true) throw new Error("unhealthy");
    } catch {
      const msg = "Serviço astrológico indisponível. Tente novamente em instantes.";
      setGenError(msg);
      toast.error(msg);
      health.refetch();
      return;
    }
    setLoading(true);
    setGenError(null);
    setRetryInfo(null);
    showLoader({
      title: "Calculando seu Mapa Astral",
      subtitle: "Swiss Ephemeris",
      messages: [
        "Posicionando os planetas no céu do seu nascimento...",
        "Traçando casas astrológicas e ângulos...",
        "Calculando aspectos entre os astros...",
        "Revelando o desenho da sua alma...",
      ],
    });

    const offset = -new Date().getTimezoneOffset() / 60;
    const payload = {
      birthDataId: birth.id,
      fullName: birth.full_name,
      birthDate: birth.birth_date,
      birthTime: birth.birth_time ?? undefined,
      timeUnknown: birth.time_unknown,
      latitude: Number(birth.latitude),
      longitude: Number(birth.longitude),
      timezoneOffset: offset,
    };

    // Treat as retriable: 5xx, network/fetch failures, or "server function info not found" (deploy lag)
    const isRetriable = (msg: string) =>
      /status code 5\d\d|HTTPError|server function info not found|failed to fetch|networkerror|timeout|ECONNRESET/i.test(msg);

    const MAX_ATTEMPTS = 4;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    let lastError: unknown = null;
    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const result = await compute({ data: payload });
          if (!result || typeof result !== "object" || !Array.isArray((result as any).planets)) {
            throw new Error("Resposta inválida do servidor.");
          }
          setChart(result);
          setRetryInfo(null);
          toast.success(attempt > 1 ? `Mapa astral revelado (tentativa ${attempt}).` : "Mapa astral revelado.");
          return;
        } catch (e) {
          lastError = e;
          const msg = e instanceof Error ? e.message : String(e ?? "");
          if (attempt >= MAX_ATTEMPTS || !isRetriable(msg)) throw e;
          // Exponential backoff with jitter: 1s, 2s, 4s (+ up to 400ms)
          const waitMs = Math.round(1000 * Math.pow(2, attempt - 1) + Math.random() * 400);
          setRetryInfo({ attempt, max: MAX_ATTEMPTS, waitMs });
          updateLoader({
            messages: [`Tentativa ${attempt + 1} de ${MAX_ATTEMPTS} em instantes...`],
          });
          await sleep(waitMs);
        }
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e ?? lastError ?? "");
      const friendly = isRetriable(raw)
        ? `Não foi possível gerar o mapa após ${MAX_ATTEMPTS} tentativas. O serviço astrológico está temporariamente indisponível — tente novamente em instantes.`
        : (raw || "Erro ao calcular o mapa.");
      setGenError(friendly);
      toast.error(friendly);
    } finally {
      setRetryInfo(null);
      setLoading(false);
      hideLoader();
    }
  }

  const current = chart ?? (latest ? {
    planets: latest.planets, houses: latest.houses, aspects: latest.aspects,
    ascendant: { sign: SIGNS[Math.floor((latest.ascendant ?? 0)/30)], longitude: latest.ascendant },
    midheaven: { sign: SIGNS[Math.floor((latest.midheaven ?? 0)/30)], longitude: latest.midheaven },
    summary: latest.summary,
  } : null);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Astrologia</p>
          <h1 className="font-serif text-3xl lg:text-5xl mt-2 shimmer-text">Seu Mapa Astral</h1>
          <p className="text-muted-foreground mt-2">
            Cálculo via Swiss Ephemeris (pure-JS) — preciso e gratuito.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={loading || !birth || backendDown || health.isLoading}
          className="bg-gold text-primary-foreground hover:bg-gold-glow"
        >
          {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Wand2 className="size-4 mr-2" />}
          {backendDown ? "Indisponível" : current ? "Recalcular" : "Gerar mapa"}
        </Button>
      </header>

      {retryInfo && (
        <div className="glass-card rounded-2xl border border-gold/30 bg-gold/5 p-4 flex items-center gap-3">
          <Loader2 className="size-4 text-gold animate-spin" />
          <p className="text-sm text-stardust">
            Tentando novamente em {Math.ceil(retryInfo.waitMs / 1000)}s
            <span className="text-muted-foreground"> · tentativa {retryInfo.attempt} de {retryInfo.max - 1}</span>
          </p>
        </div>
      )}

      {backendDown && (
        <div className="glass-card rounded-2xl border border-destructive/40 bg-destructive/5 p-5 flex items-start gap-3">
          <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-destructive font-medium">Serviço astrológico indisponível</p>
            <p className="text-xs text-muted-foreground mt-1">
              Não conseguimos confirmar a saúde do backend de cálculo. A geração está bloqueada até o serviço responder.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => health.refetch()}
            disabled={health.isFetching}
            className="border-gold/40 text-gold hover:bg-gold/10"
          >
            {health.isFetching ? <Loader2 className="size-3 animate-spin" /> : "Revalidar"}
          </Button>
        </div>
      )}

      {genError && (
        <div className="glass-card rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{genError}</p>
          <Button onClick={handleGenerate} disabled={loading} variant="outline"
            className="mt-4 border-gold/40 text-gold hover:bg-gold/10">
            {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Tentar novamente
          </Button>
        </div>
      )}

      {!current && !genError && (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Sparkles className="size-10 text-gold mx-auto mb-3" />
          <p className="text-muted-foreground">Clique em <span className="text-gold">Gerar mapa</span> para revelar sua arquitetura celeste.</p>
        </div>
      )}

      {current && (
        <TooltipProvider delayDuration={150}>
          <ChartSummary chart={current} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <ChartWheel chart={current} />
            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-serif text-xl text-gold">Síntese</h3>
                <p className="mt-2 text-stardust">{current.summary}</p>
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div className="rounded-lg bg-secondary/40 p-3">
                    <div className="text-xs text-muted-foreground">Ascendente</div>
                    <div className="font-serif text-lg text-stardust">{current.ascendant.sign}</div>
                  </div>
                  <div className="rounded-lg bg-secondary/40 p-3">
                    <div className="text-xs text-muted-foreground">Meio do Céu</div>
                    <div className="font-serif text-lg text-stardust">{current.midheaven.sign}</div>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-serif text-xl text-gold mb-3">Planetas</h3>
                <p className="text-xs text-muted-foreground mb-3">Passe o mouse sobre cada ícone para ver o significado.</p>
                <ul className="space-y-2">
                  {current.planets.map((p: any) => {
                    const m = PLANET_MEANING[p.name];
                    const s = SIGN_MEANING[p.sign];
                    return (
                      <li key={p.name} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-stardust">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-gold w-5 cursor-help">{PLANET_GLYPH[p.name]}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="font-serif text-gold">{m?.title ?? p.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">{m?.short}</p>
                            </TooltipContent>
                          </Tooltip>
                          {p.name}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help">
                              {p.sign} {p.degree.toFixed(1)}°
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="font-serif text-gold">{s?.glyph} {p.sign}</p>
                            <p className="text-xs text-muted-foreground mt-1">{s?.short}</p>
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {current.aspects?.length > 0 && (
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="font-serif text-xl text-gold mb-3">Aspectos principais</h3>
                  <ul className="space-y-1.5 text-sm">
                    {current.aspects.slice(0, 12).map((a: any, i: number) => (
                      <li key={i} className="flex justify-between text-stardust">
                        <span>{a.a} <span className="text-muted-foreground">↔</span> {a.b}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-gold cursor-help">{a.aspect} <span className="text-muted-foreground">({a.orb}°)</span></span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-xs text-muted-foreground">{ASPECT_MEANING[a.aspect] ?? "Relação angular entre os astros."}</p>
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}

function ChartWheel({ chart }: { chart: any }) {
  const size = 520;
  const cx = size / 2, cy = size / 2;
  const rOuter = 240, rSign = 210, rInner = 170, rPlanet = 145;

  return (
    <div className="glass-card rounded-2xl p-4 flex items-center justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[520px]">
        <defs>
          <radialGradient id="nebula" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(45 70% 50%)" stopOpacity="0.12"/>
            <stop offset="100%" stopColor="transparent"/>
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={rOuter} fill="url(#nebula)" />
        <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="hsl(45 70% 50% / 0.35)" />
        <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="hsl(45 70% 50% / 0.2)" />

        {/* Sign sectors */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a1 = ((i * 30 - 90 - (chart.ascendant?.longitude ?? 0)) * Math.PI) / 180;
          const a2 = (((i + 1) * 30 - 90 - (chart.ascendant?.longitude ?? 0)) * Math.PI) / 180;
          const x1 = cx + Math.cos(a1) * rOuter, y1 = cy + Math.sin(a1) * rOuter;
          const x2 = cx + Math.cos(a2) * rSign, y2 = cy + Math.sin(a2) * rSign;
          const mid = (a1 + a2) / 2;
          const tx = cx + Math.cos(mid) * ((rOuter + rInner) / 2);
          const ty = cy + Math.sin(mid) * ((rOuter + rInner) / 2);
          return (
            <g key={i}>
              <line x1={cx + Math.cos(a1)*rInner} y1={cy + Math.sin(a1)*rInner}
                    x2={x1} y2={y1} stroke="hsl(45 70% 50% / 0.3)" />
              <text x={tx} y={ty} fontSize="20" fill="hsl(45 80% 70%)" textAnchor="middle" dominantBaseline="middle">
                {SIGN_GLYPHS[i]}
              </text>
            </g>
          );
        })}

        {/* Houses (12 spokes from Asc) */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = ((i * 30 - 90 - 0) * Math.PI) / 180; // Asc placed at left (180°)
          // Use house-from-Asc representation
          const angle = ((i * 30 + 180) * Math.PI) / 180;
          const x1 = cx + Math.cos(angle) * 60, y1 = cy + Math.sin(angle) * 60;
          const x2 = cx + Math.cos(angle) * rInner, y2 = cy + Math.sin(angle) * rInner;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(45 70% 50% / 0.15)" />;
        })}

        {/* Planets */}
        {chart.planets.map((p: any, i: number) => {
          const rel = p.longitude - (chart.ascendant?.longitude ?? 0);
          const angle = ((rel + 180) * Math.PI) / 180;
          const x = cx + Math.cos(angle) * rPlanet;
          const y = cy + Math.sin(angle) * rPlanet;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="14" fill="hsl(255 30% 15%)" stroke="hsl(45 80% 60%)" />
              <text x={x} y={y} fontSize="14" fill="hsl(45 90% 75%)" textAnchor="middle" dominantBaseline="middle">
                {PLANET_GLYPH[p.name]}
              </text>
            </g>
          );
        })}

        {/* Ascendant marker */}
        <line x1={cx - rOuter - 6} y1={cy} x2={cx - rInner + 6} y2={cy}
              stroke="hsl(45 90% 70%)" strokeWidth="2" />
        <text x={cx - rOuter - 18} y={cy} fontSize="11" fill="hsl(45 90% 70%)" textAnchor="end" dominantBaseline="middle">
          ASC
        </text>
      </svg>
    </div>
  );
}
