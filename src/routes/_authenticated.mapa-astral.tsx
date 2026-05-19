import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { showLoader, hideLoader, updateLoader } from "@/components/system-feedback";
import { Loader2, Sparkles, Wand2, AlertTriangle, FileDown, CalendarClock, Trash2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { computeNatalChart, pingAstro, generateAstroForecast, exportAstroPdf, deleteAstroForecast, downloadAstroForecastPdf } from "@/lib/astrology.functions";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PLANET_MEANING, SIGN_MEANING, ASPECT_MEANING, SIGN_GUIDANCE } from "@/lib/astro-meanings";
import { CreditCostBadge } from "@/components/CreditCostBadge";
import { emitCreditsChanged } from "@/lib/credits-events";

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
  const genForecast = useServerFn(generateAstroForecast);
  const exportPdf = useServerFn(exportAstroPdf);
  const [loading, setLoading] = useState(false);
  const [chart, setChart] = useState<any>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [retryInfo, setRetryInfo] = useState<{ attempt: number; max: number; waitMs: number } | null>(null);
  const [forecast, setForecast] = useState<{ nextDays: string; week: string; month: string; year: string; generatedAt: string } | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const chartSvgRef = useRef<SVGSVGElement | null>(null);

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

  // Carrega previsões já salvas quando o chart muda
  useEffect(() => {
    const f = (chart?.forecast ?? latest?.forecast) as typeof forecast | null;
    if (f && f.nextDays) setForecast(f);
    else setForecast(null);
  }, [chart, latest]);

  const currentChartId: string | null = chart?.id ?? latest?.id ?? null;

  async function captureChartPng(): Promise<string | null> {
    const svg = chartSvgRef.current;
    if (!svg) return null;
    try {
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("viewBox", "0 0 560 560");
      clone.setAttribute("width", "1120");
      clone.setAttribute("height", "1120");
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const xml = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const png = await new Promise<string | null>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 1120; canvas.height = 1120;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          ctx.fillStyle = "#03060f";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL("image/png").split(",")[1] ?? null);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
      });
      return png;
    } catch (e) {
      console.error("[mapa-astral] captureChartPng failed", e);
      return null;
    }
  }

  async function handleGenerateForecast() {
    if (!currentChartId) return;
    setForecastLoading(true);
    showLoader({ title: "Lendo o céu dos próximos dias", subtitle: "IA astrológica" });
    try {
      const f = await genForecast({ data: { chartId: currentChartId } });
      setForecast(f);
      toast.success("Previsões reveladas.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar previsões.");
    } finally {
      setForecastLoading(false);
      hideLoader();
      emitCreditsChanged();
    }
  }

  async function handleExportPdf() {
    if (!currentChartId) { toast.error("Gere o mapa primeiro."); return; }
    setPdfLoading(true);
    showLoader({ title: "Montando seu relatório", subtitle: "PDF completo do mapa" });
    try {
      const chartImageB64 = await captureChartPng();
      const r = await exportPdf({ data: { chartId: currentChartId, chartImageB64: chartImageB64 ?? undefined } });
      const bytes = Uint8Array.from(atob(r.pdfBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mapa-astral-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF gerado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar PDF.");
    } finally {
      setPdfLoading(false);
      hideLoader();
      emitCreditsChanged();
    }
  }

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
      // Recarrega saldo/custos após sucesso, erro ou estorno automático
      emitCreditsChanged();
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
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Button
              onClick={handleGenerate}
              disabled={loading || !birth || backendDown || health.isLoading}
              className="bg-gold text-primary-foreground hover:bg-gold-glow"
            >
              {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Wand2 className="size-4 mr-2" />}
              {backendDown ? "Indisponível" : current ? "Recalcular" : "Gerar mapa"}
            </Button>
            <Button
              onClick={handleExportPdf}
              disabled={pdfLoading || !currentChartId || backendDown}
              variant="outline"
              className="border-gold/40 text-gold hover:bg-gold/10"
            >
              {pdfLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : <FileDown className="size-4 mr-2" />}
              Exportar PDF
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 justify-end">
            <CreditCostBadge action="astro_chart" label="Mapa" />
            <CreditCostBadge action="astro_pdf" label="PDF" />
          </div>
        </div>
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

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 mt-6 lg:items-stretch">
            <div className="flex flex-col gap-4 lg:min-h-0">
              <ChartWheel chart={current} userId={user?.id} svgRefProp={chartSvgRef} compact />

              {/* Previsões logo abaixo do mapa, na mesma coluna — altura espelha a coluna ao lado */}
              <div className="glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col lg:flex-1 lg:min-h-0">
                <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="size-4 text-gold" />
                    <h3 className="font-serif text-lg text-gold">Previsões para os próximos dias</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCostBadge action="astro_forecast" label="Previsões" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateForecast}
                      disabled={forecastLoading || !currentChartId}
                      className="border-gold/40 text-gold hover:bg-gold/10"
                    >
                      {forecastLoading ? <Loader2 className="size-3 animate-spin mr-2" /> : <Sparkles className="size-3 mr-2" />}
                      {forecast ? "Atualizar" : "Gerar previsões"}
                    </Button>
                  </div>
                </div>

                {!forecast && !forecastLoading && (
                  <p className="mt-4 text-sm text-muted-foreground shrink-0">
                    Leitura prática para os próximos dias, semana, mês e ano com base no seu mapa natal.
                  </p>
                )}

                {forecast && (
                  <div className="mt-5 space-y-3 lg:flex-1 lg:min-h-0 lg:overflow-y-auto pr-2 -mr-2 [scrollbar-gutter:stable]">
                    {[
                      { label: "Próximos dias", text: forecast.nextDays },
                      { label: "Esta semana", text: forecast.week },
                      { label: "Este mês", text: forecast.month },
                      { label: "Este ano", text: forecast.year },
                    ].map((f) => (
                      <div key={f.label} className="rounded-xl bg-secondary/30 border border-gold/15 p-4">
                        <div className="text-[10px] uppercase tracking-widest text-gold mb-2">{f.label}</div>
                        <p className="text-sm text-stardust whitespace-pre-wrap leading-relaxed">{f.text}</p>
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground/70 text-right">
                      Geradas em {new Date(forecast.generatedAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                )}
              </div>
            </div>
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

const ELEMENT_OF: Record<string, "fire" | "earth" | "air" | "water"> = {
  "Áries": "fire", "Leão": "fire", "Sagitário": "fire",
  "Touro": "earth", "Virgem": "earth", "Capricórnio": "earth",
  "Gêmeos": "air", "Libra": "air", "Aquário": "air",
  "Câncer": "water", "Escorpião": "water", "Peixes": "water",
};
const ELEMENT_COLOR: Record<string, string> = {
  fire: "hsl(14 80% 60% / 0.18)",
  earth: "hsl(120 30% 45% / 0.16)",
  air: "hsl(200 70% 60% / 0.16)",
  water: "hsl(220 70% 60% / 0.18)",
};
const ASPECT_COLOR: Record<string, string> = {
  "Conjunção": "hsl(45 90% 65%)",
  "Oposição": "hsl(0 75% 60%)",
  "Quadratura": "hsl(15 80% 60%)",
  "Trígono": "hsl(150 60% 55%)",
  "Sextil": "hsl(200 70% 60%)",
};
const ASPECT_PRACTICAL: Record<string, string> = {
  "Conjunção": "Energias coladas — agem juntas. Use uma para alimentar a outra.",
  "Oposição": "Polos que se puxam. Equilibre os dois lados em vez de escolher um.",
  "Quadratura": "Atrito que gera ação. Use a tensão como combustível, não como muro.",
  "Trígono": "Talento natural fluindo. Ative de propósito — não basta esperar.",
  "Sextil": "Porta aberta. Só funciona se você der o primeiro passo.",
};
const MODALITY_OF: Record<string, "Cardinal" | "Fixo" | "Mutável"> = {
  "Áries": "Cardinal", "Câncer": "Cardinal", "Libra": "Cardinal", "Capricórnio": "Cardinal",
  "Touro": "Fixo", "Leão": "Fixo", "Escorpião": "Fixo", "Aquário": "Fixo",
  "Gêmeos": "Mutável", "Virgem": "Mutável", "Sagitário": "Mutável", "Peixes": "Mutável",
};
const ELEMENT_LABEL: Record<string, string> = { fire: "Fogo", earth: "Terra", air: "Ar", water: "Água" };
const HOUSE_MEANING: { title: string; short: string; doNow: string }[] = [
  { title: "Casa 1 — Identidade",       short: "Como você chega, seu corpo e primeira impressão.",        doNow: "Cuide da sua imagem e iniciativa pessoal." },
  { title: "Casa 2 — Recursos",          short: "Dinheiro, valores e o que é seu de verdade.",            doNow: "Revise finanças e o que te dá segurança." },
  { title: "Casa 3 — Comunicação",       short: "Mente, rotina próxima, irmãos e estudos curtos.",        doNow: "Escreva, pergunte, conecte ideias." },
  { title: "Casa 4 — Raízes",            short: "Casa, família, origem e mundo íntimo.",                  doNow: "Cuide do lar e da sua base emocional." },
  { title: "Casa 5 — Criação",           short: "Criatividade, romance, prazer e filhos.",                doNow: "Faça algo só pelo gosto. Brinque, crie, namore." },
  { title: "Casa 6 — Rotina & Saúde",    short: "Trabalho diário, hábitos e corpo.",                      doNow: "Ajuste rotina, sono e cuidados práticos." },
  { title: "Casa 7 — Parcerias",         short: "Relações 1:1, casamento e sócios.",                      doNow: "Alinhe expectativas com quem é seu par." },
  { title: "Casa 8 — Transformação",     short: "Intimidade profunda, crise e recursos do outro.",        doNow: "Encare o tabu. Solte o que já morreu." },
  { title: "Casa 9 — Expansão",          short: "Filosofia, viagens, estudos longos e fé.",               doNow: "Estude, viaje, abra horizonte." },
  { title: "Casa 10 — Vocação",          short: "Carreira, reputação e papel público.",                   doNow: "Mostre seu trabalho e assuma autoridade." },
  { title: "Casa 11 — Comunidade",       short: "Grupos, amigos, causas e visão de futuro.",              doNow: "Conecte-se a quem caminha com você." },
  { title: "Casa 12 — Interior",         short: "Subconsciente, retiro, espiritualidade e cura.",         doNow: "Reserve silêncio, sonho e prática espiritual." },
];

type HoverInfo = {
  x: number;
  y: number;
  title: string;
  subtitle?: string;
  lines?: { label: string; value: string }[];
  body?: string;
  accent?: string;
};


function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
}

// Anti-collision: spread planets that are too close angularly
function spreadAngles(items: { angle: number }[], minGap = 7) {
  const sorted = items
    .map((it, i) => ({ ...it, i, display: it.angle }))
    .sort((a, b) => a.angle - b.angle);
  for (let pass = 0; pass < 6; pass++) {
    let moved = false;
    for (let k = 0; k < sorted.length; k++) {
      const a = sorted[k];
      const b = sorted[(k + 1) % sorted.length];
      let diff = b.display - a.display;
      if (diff < 0) diff += 360;
      if (diff < minGap) {
        const push = (minGap - diff) / 2;
        a.display -= push;
        b.display += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const out: number[] = new Array(items.length);
  sorted.forEach((s) => (out[s.i] = s.display));
  return out;
}

function ChartWheel({ chart, userId, svgRefProp, compact }: { chart: any; userId?: string; svgRefProp?: React.RefObject<SVGSVGElement | null>; compact?: boolean }) {
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const size = 560;
  const cx = size / 2, cy = size / 2;
  const rOuter = 258, rZodiac = 222, rInner = 188, rHouseNum = 158, rPlanet = 138, rAspect = 118;
  const ascLon = chart.ascendant?.longitude ?? 0;
  // Map a celestial longitude to screen angle so Ascendant sits at 180° (left)
  const toAngle = (lon: number) => (lon - ascLon + 180 + 360) % 360;

  const planetAngles = chart.planets.map((p: any) => toAngle(p.longitude));
  const display = spreadAngles(planetAngles.map((angle: number) => ({ angle })), 8);

  // Pan & zoom via viewBox manipulation
  const localSvgRef = useRef<SVGSVGElement | null>(null);
  const svgRef = svgRefProp ?? localSvgRef;
  // Persistência por usuário: zoom + posição são restaurados ao voltar à página.
  const storageKey = userId ? `cosmic-ai:chart-view:${userId}` : "cosmic-ai:chart-view:anon";
  const readStoredView = () => {
    if (typeof window === "undefined") return { x: 0, y: 0, w: size, h: size };
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return { x: 0, y: 0, w: size, h: size };
      const parsed = JSON.parse(raw);
      if (
        parsed && typeof parsed === "object" &&
        ["x", "y", "w", "h"].every((k) => typeof parsed[k] === "number" && Number.isFinite(parsed[k]))
      ) {
        return parsed as { x: number; y: number; w: number; h: number };
      }
    } catch {}
    return { x: 0, y: 0, w: size, h: size };
  };
  const [view, setView] = useState(readStoredView);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  // Locked zoom range: 1x (sem zoom out, evita áreas vazias) até 5x.
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 5;
  const MIN_W = size / MAX_ZOOM;
  const MAX_W = size / MIN_ZOOM;
  const zoomLevel = size / view.w;

  // Mantém o viewBox dentro do mapa para não distorcer com pan fora dos limites.
  const clampView = (v: { x: number; y: number; w: number; h: number }) => {
    const maxX = size - v.w;
    const maxY = size - v.h;
    return {
      ...v,
      x: Math.min(Math.max(v.x, 0), Math.max(0, maxX)),
      y: Math.min(Math.max(v.y, 0), Math.max(0, maxY)),
    };
  };

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const focalX = view.x + ((e.clientX - rect.left) / rect.width) * view.w;
    const focalY = view.y + ((e.clientY - rect.top) / rect.height) * view.h;
    const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    const newW = Math.min(MAX_W, Math.max(MIN_W, view.w * factor));
    if (newW === view.w) return;
    const k = newW / view.w;
    setView(clampView({ x: focalX - (focalX - view.x) * k, y: focalY - (focalY - view.y) * k, w: newW, h: newW }));
  };
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    setHover(null);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = ((e.clientX - drag.current.x) / rect.width) * view.w;
    const dy = ((e.clientY - drag.current.y) / rect.height) * view.h;
    setView((v) => clampView({ ...v, x: drag.current!.vx - dx, y: drag.current!.vy - dy }));
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    drag.current = null;
    try { (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId); } catch {}
  };
  const resetView = () => setView({ x: 0, y: 0, w: size, h: size });
  const zoomBy = (factor: number) => {
    const newW = Math.min(MAX_W, Math.max(MIN_W, view.w * factor));
    if (newW === view.w) return;
    const cxv = view.x + view.w / 2, cyv = view.y + view.h / 2;
    setView(clampView({ x: cxv - newW / 2, y: cyv - newW / 2, w: newW, h: newW }));
  };
  const isZoomed = view.w !== size || view.x !== 0 || view.y !== 0;
  const atMaxZoom = view.w <= MIN_W + 0.001;
  const atMinZoom = view.w >= MAX_W - 0.001;

  // Re-restaura quando troca o usuário (login/logout entre contas no mesmo browser).
  useEffect(() => {
    setView(readStoredView());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persiste zoom + posição com debounce; remove a entrada quando volta ao padrão.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.setTimeout(() => {
      try {
        if (!isZoomed) {
          window.localStorage.removeItem(storageKey);
        } else {
          window.localStorage.setItem(storageKey, JSON.stringify(view));
        }
      } catch {}
    }, 250);
    return () => window.clearTimeout(t);
  }, [view, isZoomed, storageKey]);

  return (
    <div className="glass-card rounded-2xl p-4 relative">
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
        <span
          className="h-7 px-2 rounded-md border border-gold/30 bg-background/70 text-gold text-[10px] font-mono inline-flex items-center tabular-nums"
          title={`Zoom travado entre ${MIN_ZOOM}× e ${MAX_ZOOM}×`}
        >
          {zoomLevel.toFixed(2)}×
        </span>
        <button type="button" onClick={() => zoomBy(1 / 1.3)} disabled={atMaxZoom} className="size-7 rounded-md border border-gold/30 bg-background/70 text-gold text-sm hover:bg-gold/10 disabled:opacity-40" aria-label="Aproximar">+</button>
        <button type="button" onClick={() => zoomBy(1.3)} disabled={atMinZoom} className="size-7 rounded-md border border-gold/30 bg-background/70 text-gold text-sm hover:bg-gold/10 disabled:opacity-40" aria-label="Afastar">−</button>
        <button type="button" onClick={resetView} disabled={!isZoomed} className="h-7 px-2 rounded-md border border-gold/30 bg-background/70 text-gold text-[10px] hover:bg-gold/10 disabled:opacity-40">Reset</button>
      </div>
      <p className="absolute bottom-1 left-2 text-[9px] text-muted-foreground/60 pointer-events-none">Arraste · scroll p/ zoom</p>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className={`w-full ${compact ? "max-w-[340px]" : "max-w-[560px]"} block mx-auto touch-none select-none`}
        style={{ cursor: drag.current ? "grabbing" : "grab" }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <defs>
          <radialGradient id="cw-nebula" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(255 60% 25%)" stopOpacity="0.45" />
            <stop offset="60%" stopColor="hsl(255 50% 12%)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="cw-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(45 80% 55%)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="cw-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Background */}
        <circle cx={cx} cy={cy} r={rOuter} fill="url(#cw-nebula)" />
        <circle cx={cx} cy={cy} r={rAspect + 30} fill="url(#cw-core)" />

        {/* Element-colored sign sectors */}
        {Array.from({ length: 12 }).map((_, i) => {
          const startDeg = toAngle(i * 30);
          const endDeg = startDeg + 30;
          const p1 = polar(cx, cy, rOuter, startDeg);
          const p2 = polar(cx, cy, rOuter, endDeg);
          const p3 = polar(cx, cy, rInner, endDeg);
          const p4 = polar(cx, cy, rInner, startDeg);
          const d = `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 0 0 ${p4.x} ${p4.y} Z`;
          const el = ELEMENT_OF[SIGNS[i]];
          const mid = polar(cx, cy, (rOuter + rInner) / 2, startDeg + 15);
          const meaning = SIGN_MEANING[SIGNS[i]];
          return (
            <g key={`sec-${i}`}
              onMouseEnter={(e) => {
                const g = SIGN_GUIDANCE[SIGNS[i]];
                setHover({
                  x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY,
                  title: `${meaning?.glyph} ${SIGNS[i]}`,
                  subtitle: `${ELEMENT_LABEL[el]} · ${MODALITY_OF[SIGNS[i]]}`,
                  body: meaning?.short,
                  lines: g ? [{ label: "Faça agora", value: g.doNow }, { label: "Evite", value: g.avoid }] : undefined,
                  accent: "signo",
                });
              }}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "help" }}>
              <path d={d} fill={ELEMENT_COLOR[el]} stroke="hsl(45 70% 50% / 0.25)" />
              <text x={mid.x} y={mid.y} fontSize="22" fill="hsl(45 85% 72%)" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: "none" }}>
                {SIGN_GLYPHS[i]}
              </text>
            </g>
          );
        })}

        {/* Degree ticks */}
        {Array.from({ length: 72 }).map((_, i) => {
          const deg = i * 5;
          const a = polar(cx, cy, rInner, deg);
          const b = polar(cx, cy, rInner - (i % 6 === 0 ? 8 : i % 2 === 0 ? 5 : 2.5), deg);
          return <line key={`tick-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="hsl(45 70% 60% / 0.35)" strokeWidth={i % 6 === 0 ? 1 : 0.5} />;
        })}

        {/* House sectors (invisible hover pies) + spokes + numbers */}
        {Array.from({ length: 12 }).map((_, i) => {
          const startDeg = (180 + i * 30) % 360;
          const endDeg = startDeg + 30;
          const p1 = polar(cx, cy, rInner, startDeg);
          const p2 = polar(cx, cy, rInner, endDeg);
          const p3 = polar(cx, cy, rAspect, endDeg);
          const p4 = polar(cx, cy, rAspect, startDeg);
          const d = `M ${p1.x} ${p1.y} A ${rInner} ${rInner} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rAspect} ${rAspect} 0 0 0 ${p4.x} ${p4.y} Z`;
          const a = polar(cx, cy, rAspect, startDeg);
          const b = polar(cx, cy, rInner, startDeg);
          const numPos = polar(cx, cy, rHouseNum, startDeg + 15);
          const h = HOUSE_MEANING[i];
          return (
            <g key={`house-${i}`}>
              <path d={d} fill="transparent" style={{ cursor: "help" }}
                onMouseEnter={(e) => setHover({
                  x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY,
                  title: h.title,
                  subtitle: "Setor de vida",
                  body: h.short,
                  lines: [{ label: "Faça agora", value: h.doNow }],
                })}
                onMouseLeave={() => setHover(null)}
              />
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="hsl(45 70% 50% / 0.2)" style={{ pointerEvents: "none" }} />
              <text x={numPos.x} y={numPos.y} fontSize="10" fill="hsl(45 60% 65% / 0.6)" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: "none" }}>
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* Aspect lines (traçado entre planetas) */}
        {(chart.aspects ?? []).map((asp: any, i: number) => {
          const pa = chart.planets.find((x: any) => x.name === asp.a);
          const pb = chart.planets.find((x: any) => x.name === asp.b);
          if (!pa || !pb) return null;
          const ai = chart.planets.indexOf(pa), bi = chart.planets.indexOf(pb);
          const A = polar(cx, cy, rAspect, display[ai]);
          const B = polar(cx, cy, rAspect, display[bi]);
          const color = ASPECT_COLOR[asp.aspect] ?? "hsl(45 70% 60%)";
          const dashed = asp.aspect === "Quadratura" || asp.aspect === "Oposição";
          return (
            <line key={`asp-${i}`} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
              stroke={color} strokeOpacity={0.55} strokeWidth={1.2}
              strokeDasharray={dashed ? "3 3" : undefined}
              onMouseEnter={(e) => setHover({
                x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY,
                title: `${asp.a} ${asp.aspect} ${asp.b}`,
                subtitle: `Orbe ${asp.orb}°`,
                body: ASPECT_MEANING[asp.aspect],
                lines: [{ label: "Como usar", value: ASPECT_PRACTICAL[asp.aspect] ?? "Observe como essas duas energias se misturam em você." }],
                accent: "aspecto",
              })}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "help" }}
            />
          );
        })}
        <circle cx={cx} cy={cy} r={rAspect} fill="none" stroke="hsl(45 70% 50% / 0.25)" />
        <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="hsl(45 70% 50% / 0.35)" />
        <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="hsl(45 70% 50% / 0.45)" />

        {/* Planets */}
        {chart.planets.map((p: any, i: number) => {
          const real = polar(cx, cy, rAspect, planetAngles[i]);
          const dot = polar(cx, cy, rPlanet, display[i]);
          const m = PLANET_MEANING[p.name];
          const s = SIGN_MEANING[p.sign];
          return (
            <g key={`pl-${i}`}
              onMouseEnter={(e) => {
                const g = SIGN_GUIDANCE[p.sign];
                const el = ELEMENT_OF[p.sign];
                const planetAspects = (chart.aspects ?? []).filter((a: any) => a.a === p.name || a.b === p.name);
                const aspLines = planetAspects.slice(0, 3).map((a: any) => ({
                  label: a.aspect,
                  value: `${a.a === p.name ? a.b : a.a} · orbe ${a.orb}°`,
                }));
                setHover({
                  x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY,
                  title: `${m?.title ?? p.name} em ${s?.glyph ?? ""} ${p.sign}`,
                  subtitle: `${p.degree.toFixed(2)}° · ${ELEMENT_LABEL[el]} ${MODALITY_OF[p.sign]}`,
                  body: m?.short,
                  lines: [
                    ...(g ? [{ label: "Faça agora", value: g.doNow }] : []),
                    ...aspLines,
                  ],
                  accent: "planeta",
                });
              }}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "help" }}>
              <line x1={real.x} y1={real.y} x2={dot.x} y2={dot.y} stroke="hsl(45 80% 60% / 0.45)" strokeWidth={0.8} />
              <circle cx={real.x} cy={real.y} r={2} fill="hsl(45 90% 70%)" />
              <circle cx={dot.x} cy={dot.y} r={16} fill="hsl(255 35% 12%)" stroke="hsl(45 85% 62%)" strokeWidth={1.2} filter="url(#cw-glow)" />
              <text x={dot.x} y={dot.y} fontSize="15" fill="hsl(45 95% 78%)" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: "none" }}>
                {PLANET_GLYPH[p.name]}
              </text>
            </g>
          );
        })}

        {/* ASC / MC markers */}
        <g>
          <line x1={cx - rOuter - 10} y1={cy} x2={cx - rInner + 4} y2={cy} stroke="hsl(45 95% 72%)" strokeWidth={2} />
          <text x={cx - rOuter - 14} y={cy} fontSize="11" fill="hsl(45 95% 75%)" textAnchor="end" dominantBaseline="middle">ASC</text>
        </g>
        {chart.midheaven?.longitude != null && (() => {
          const ang = toAngle(chart.midheaven.longitude);
          const a = polar(cx, cy, rOuter + 10, ang);
          const b = polar(cx, cy, rInner - 4, ang);
          const lbl = polar(cx, cy, rOuter + 18, ang);
          return (
            <g>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="hsl(45 95% 72%)" strokeWidth={2} />
              <text x={lbl.x} y={lbl.y} fontSize="11" fill="hsl(45 95% 75%)" textAnchor="middle" dominantBaseline="middle">MC</text>
            </g>
          );
        })()}
      </svg>

      {/* HTML hover tooltip */}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-gold/30 bg-background/95 backdrop-blur px-3 py-2 shadow-xl w-[260px]"
          style={{ left: Math.min(hover.x + 14, 360), top: Math.max(hover.y - 8, 8) }}
        >
          <p className="font-serif text-gold text-sm leading-tight">{hover.title}</p>
          {hover.subtitle && (
            <p className="text-[10px] uppercase tracking-wider text-gold/70 mt-0.5">{hover.subtitle}</p>
          )}
          {hover.body && <p className="text-[11px] text-stardust mt-1.5 leading-snug">{hover.body}</p>}
          {hover.lines && hover.lines.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {hover.lines.map((ln, k) => (
                <li key={k} className="text-[11px] leading-snug">
                  <span className="text-gold/80 uppercase tracking-wider text-[9px] block">{ln.label}</span>
                  <span className="text-muted-foreground">{ln.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        {Object.entries(ASPECT_COLOR).map(([k, c]) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className="inline-block w-4 h-[2px]" style={{ background: c }} />
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChartSummary({ chart }: { chart: any }) {
  const sun = chart.planets.find((p: any) => p.name === "Sol");
  const moon = chart.planets.find((p: any) => p.name === "Lua");
  const ascSign = chart.ascendant?.sign;

  const trio = [
    sun && { label: "Sol", role: "Sua essência e propósito", sign: sun.sign },
    moon && { label: "Lua", role: "Suas emoções e necessidades", sign: moon.sign },
    ascSign && { label: "Ascendente", role: "Como o mundo te vê", sign: ascSign },
  ].filter(Boolean) as { label: string; role: string; sign: string }[];

  return (
    <div className="glass-card gold-glow rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute inset-0 nebula-bg opacity-50 pointer-events-none" />
      <div className="relative space-y-5">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold">
            <Sparkles className="size-3.5" /> Resumo do seu céu — direção prática
          </div>
          <p className="mt-3 text-stardust font-serif text-lg leading-relaxed">
            {sun && <>Você brilha como <span className="text-gold">{sun.sign}</span></>}
            {moon && <>, sente o mundo como <span className="text-gold">{moon.sign}</span></>}
            {ascSign && <> e se apresenta com a aura de <span className="text-gold">{ascSign}</span></>}.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Abaixo, o que esperar de cada uma dessas forças e o que fazer agora para usá-las a seu favor.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {trio.map((t) => {
            const g = SIGN_GUIDANCE[t.sign];
            return (
              <div key={t.label} className="rounded-xl bg-secondary/30 border border-gold/15 p-4 space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{t.label}</div>
                  <div className="font-serif text-lg text-stardust mt-0.5">
                    {SIGN_MEANING[t.sign]?.glyph} {t.sign}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{t.role}</div>
                </div>
                {g && (
                  <ul className="space-y-2 text-xs">
                    <li>
                      <span className="text-gold uppercase tracking-wider text-[10px]">O que esperar</span>
                      <p className="text-stardust mt-0.5">{g.expect}</p>
                    </li>
                    <li>
                      <span className="text-gold uppercase tracking-wider text-[10px]">Faça agora</span>
                      <p className="text-stardust mt-0.5">{g.doNow}</p>
                    </li>
                    <li>
                      <span className="text-gold uppercase tracking-wider text-[10px]">Evite</span>
                      <p className="text-stardust mt-0.5">{g.avoid}</p>
                    </li>
                    <li>
                      <span className="text-gold uppercase tracking-wider text-[10px]">Sua força</span>
                      <p className="text-stardust mt-0.5">{g.strength}</p>
                    </li>
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
