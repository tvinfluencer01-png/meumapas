import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useActiveSubject } from "@/hooks/use-active-subject";
import { generateReport, getReportUrl, deleteReport } from "@/lib/reports.functions";
import { emitCreditsChanged } from "@/lib/credits-events";
import { showFeedback, showLoader, hideLoader, updateLoader, confirmDialog } from "@/components/system-feedback";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText, Download, Sparkles, Heart, Briefcase, Flame, Loader2, Trash2, ScrollText,
  Coins, Home, HeartPulse, Users, Search, CalendarDays, X, Users2, TrendingUp, TreePine,
} from "lucide-react";
import { SectionLamp } from "@/components/SectionLamp";
import { CreditCostBadge } from "@/components/CreditCostBadge";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
  head: () => ({ meta: [{ title: "Relatorios Premium — Código Cósmico" }] }),
});

type Kind =
  | "personality" | "love" | "career" | "spiritual"
  | "finance" | "family" | "health" | "friendships"
  | "synastry" | "couple_numerology" | "annual_forecast" | "personal_kabbalah";

const KINDS_NEED_PARTNER = new Set<Kind>(["synastry", "couple_numerology"]);
const KINDS_NEED_YEAR = new Set<Kind>(["annual_forecast"]);

const CARDS: { kind: Kind; title: string; desc: string; icon: typeof Sparkles; gradient: string }[] = [
  {
    kind: "personality",
    title: "Mapa da Personalidade",
    desc: "Uma leitura profunda dos seus dons, sombras e a essencia que voce veio expressar.",
    icon: Sparkles,
    gradient: "from-amber-500/30 via-yellow-400/10 to-transparent",
  },
  {
    kind: "love",
    title: "Amor & Relacionamento",
    desc: "Como voce ama, o que atrai e o caminho para construir vinculos verdadeiros.",
    icon: Heart,
    gradient: "from-rose-500/30 via-pink-400/10 to-transparent",
  },
  {
    kind: "career",
    title: "Vocacao & Proposito",
    desc: "O chamado profissional inscrito no seu mapa e suas zonas de abundancia.",
    icon: Briefcase,
    gradient: "from-emerald-500/30 via-teal-400/10 to-transparent",
  },
  {
    kind: "spiritual",
    title: "Jornada Espiritual",
    desc: "Karma, missao da alma e os portais que estao se abrindo no seu caminho.",
    icon: Flame,
    gradient: "from-violet-500/30 via-indigo-400/10 to-transparent",
  },
  {
    kind: "finance",
    title: "Questões Financeiras",
    desc: "Padrões de prosperidade, bloqueios financeiros e direções para abundância — segundo o seu mapa e numerologia.",
    icon: Coins,
    gradient: "from-yellow-500/30 via-amber-400/10 to-transparent",
  },
  {
    kind: "family",
    title: "Vida Familiar",
    desc: "Dinâmicas do lar, padrões ancestrais e caminhos de harmonização com pais, filhos e irmãos.",
    icon: Home,
    gradient: "from-orange-500/30 via-amber-400/10 to-transparent",
  },
  {
    kind: "health",
    title: "Saúde",
    desc: "Vitalidade do corpo, mente e espírito com práticas integrativas alinhadas ao seu mapa.",
    icon: HeartPulse,
    gradient: "from-red-500/30 via-rose-400/10 to-transparent",
  },
  {
    kind: "friendships",
    title: "Amizades",
    desc: "Padrões sociais, perfis de amigos que te complementam e como cultivar círculos verdadeiros.",
    icon: Users,
    gradient: "from-sky-500/30 via-cyan-400/10 to-transparent",
  },
  {
    kind: "synastry",
    title: "Sinastria Amorosa",
    desc: "Compatibilidade entre dois mapas: atrações, tensões e caminhos concretos de harmonização do casal.",
    icon: Users2,
    gradient: "from-pink-500/30 via-rose-400/10 to-transparent",
  },
  {
    kind: "couple_numerology",
    title: "Numerologia do Casal",
    desc: "A vibração numérica que une (e desafia) esta parceria — missão conjunta e ciclos comuns.",
    icon: Heart,
    gradient: "from-fuchsia-500/30 via-pink-400/10 to-transparent",
  },
  {
    kind: "annual_forecast",
    title: "Previsão Anual",
    desc: "Trânsitos, ano pessoal e ciclos numerológicos projetados para os próximos 12 meses.",
    icon: TrendingUp,
    gradient: "from-cyan-500/30 via-sky-400/10 to-transparent",
  },
  {
    kind: "personal_kabbalah",
    title: "Cabala Pessoal",
    desc: "Sua Árvore da Vida individual — Sephirot, letras hebraicas e caminho iniciático inscrito no nome.",
    icon: TreePine,
    gradient: "from-purple-500/30 via-violet-400/10 to-transparent",
  },
];

function RelatoriosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const generate = useServerFn(generateReport);
  const getUrl = useServerFn(getReportUrl);
  const removeFn = useServerFn(deleteReport);
  const [loadingKind, setLoadingKind] = useState<Kind | null>(null);
  const { data: activeSubject } = useActiveSubject();
  const hasActiveClient = activeSubject?.kind === "client";
  const [scope, setScope] = useState<"self" | "client">(() => {
    try {
      const saved = localStorage.getItem("reports-scope");
      if (saved === "self" || saved === "client") return saved;
    } catch { /* noop */ }
    return "client";
  });
  const effectiveScope: "self" | "client" = hasActiveClient ? scope : "self";

  // Persist scope selection
  useEffect(() => {
    try {
      localStorage.setItem("reports-scope", scope);
    } catch { /* noop */ }
  }, [scope]);
  const [existingPrompt, setExistingPrompt] = useState<{
    kind: Kind;
    report: { id: string; title: string; created_at: string };
  } | null>(null);
  const [extraPrompt, setExtraPrompt] = useState<{
    kind: Kind;
    partnerName: string;
    partnerDate: string;
    year: string;
  } | null>(null);

  // Search & period filters
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "7d" | "30d" | "90d" | "year">("all");

  function findExistingReport(kind: Kind) {
    if (!reports) return null;
    return reports.find((r) => r.kind === kind) ?? null;
  }

  function handleGenerateClick(kind: Kind) {
    if (loadingKind) return;
    const existing = findExistingReport(kind);
    if (existing) {
      setExistingPrompt({ kind, report: existing });
      return;
    }
    if (KINDS_NEED_PARTNER.has(kind) || KINDS_NEED_YEAR.has(kind)) {
      setExtraPrompt({
        kind,
        partnerName: "",
        partnerDate: "",
        year: String(new Date().getFullYear()),
      });
      return;
    }
    genMutation.mutate({ kind });
  }

  const activeClientId = activeSubject?.client_profile_id ?? null;
  const queryClientId = effectiveScope === "client" ? activeClientId : null;
  const { data: reports } = useQuery({
    queryKey: ["reports", user?.id, queryClientId, effectiveScope],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      q = queryClientId
        ? q.eq("client_profile_id", queryClientId)
        : q.is("client_profile_id", null);
      const { data } = await q;
      return data ?? [];
    },
  });

  // Counts for scope toggle badges
  const { data: selfCount = 0 } = useQuery({
    queryKey: ["reports-count", user?.id, "self"],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("reports")
        .select("*", { head: true, count: "exact" })
        .is("client_profile_id", null);
      return count ?? 0;
    },
  });

  const { data: clientCount = 0 } = useQuery({
    queryKey: ["reports-count", user?.id, "client", activeClientId],
    enabled: !!user && !!activeClientId,
    queryFn: async () => {
      const { count } = await supabase
        .from("reports")
        .select("*", { head: true, count: "exact" })
        .eq("client_profile_id", activeClientId!);
      return count ?? 0;
    },
  });

  const filteredReports = useMemo(() => {
    if (!reports) return [];
    let result = reports;

    // Title search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) => r.title.toLowerCase().includes(q));
    }

    // Period filter
    if (periodFilter !== "all") {
      const now = new Date();
      const cutoff = new Date();
      if (periodFilter === "7d") {
        cutoff.setDate(now.getDate() - 7);
      } else if (periodFilter === "30d") {
        cutoff.setDate(now.getDate() - 30);
      } else if (periodFilter === "90d") {
        cutoff.setDate(now.getDate() - 90);
      } else if (periodFilter === "year") {
        cutoff.setMonth(0, 1);
        cutoff.setHours(0, 0, 0, 0);
      }
      result = result.filter((r) => new Date(r.created_at) >= cutoff);
    }

    return result;
  }, [reports, searchQuery, periodFilter]);

  function fallbackDownload(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function downloadFromUrl(url: string, filename: string) {
    try {
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
    } catch (err) {
      // Fallback: abre o link assinado diretamente (CORS/adblock no fetch)
      console.warn("[download] fetch failed, fallback to direct link", err);
      fallbackDownload(url, filename);
    }
  }

  type GenPayload = {
    kind: Kind;
    partner?: { full_name: string; birth_date: string };
    year?: number;
  };

  const genMutation = useMutation({
    mutationFn: async (payload: GenPayload) => {
      const { kind, partner, year } = payload;
      setLoadingKind(kind);
      const title = CARDS.find((c) => c.kind === kind)?.title ?? "Relatorio";
      showLoader({
        title: `Gerando ${title}`,
        subtitle:
          effectiveScope === "client" && activeSubject?.kind === "client"
            ? `Para ${activeSubject.full_name}`
            : "Oraculo em ação",
        messages: ["Iniciando a leitura cósmica..."],
        progress: 0,
        step: "Iniciando a leitura cósmica...",
      });
      const stream = await generate({
        data: { kind, scope: effectiveScope, partner, year },
      });
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
    onSuccess: async (res, payload) => {
      qc.invalidateQueries({ queryKey: ["reports", user?.id] });
      if (res.signedUrl) {
        try {
          updateLoader({ step: "Preparando download do PDF...", progress: 100 });
          await downloadFromUrl(res.signedUrl, `${res.title || payload.kind}.pdf`);
          showFeedback({ title: "Relatório pronto", description: "Download iniciado com sucesso.", type: "success" });
        } catch {
          showFeedback({ title: "Erro no download", description: "PDF gerado, mas o download falhou. Tente novamente em 'Seus relatórios'.", type: "error" });
        }
      }
    },
    onError: (e: Error) => showFeedback({ title: "Erro ao gerar", description: e.message || "Falha ao gerar relatório", type: "error" }),
    onSettled: () => {
      setLoadingKind(null);
      hideLoader();
      // Atualiza saldo/custos imediatamente após sucesso, erro ou estorno automático
      emitCreditsChanged();
    },
  });

  async function openReport(id: string, title: string) {
    showLoader({
      title: "Preparando seu relatorio",
      subtitle: "Biblioteca Cosmica",
      messages: ["Gerando link seguro...", "Baixando seu PDF..."],
    });
    try {
      const { signedUrl } = await getUrl({ data: { id } });
      if (!signedUrl) {
        showFeedback({ title: "Erro no link", description: "Não foi possível gerar o link de download.", type: "error" });
        return;
      }
      await downloadFromUrl(signedUrl, `${title || "relatorio"}.pdf`);
    } catch {
      showFeedback({ title: "Erro ao baixar", description: "Falha na comunicação com o servidor.", type: "error" });
    } finally {
      hideLoader();
    }
  }

  async function removeReport(id: string) {
    const ok = await confirmDialog({
      title: "Apagar relatorio?",
      description: "Esta ação remove o PDF da sua Biblioteca Cosmica e não pode ser desfeita.",
      confirmText: "Apagar",
      destructive: true,
    });
    if (!ok) return;
    await removeFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["reports", user?.id] });
    showFeedback({ title: "Relatório apagado", type: "success" });
  }

  return (
    <div className="space-y-10">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Relatorios Premium</p>
        <h1 className="font-serif text-3xl lg:text-5xl mt-2 shimmer-text flex items-center gap-3 flex-wrap">
          <ScrollText className="size-8 text-gold" /> Sua Biblioteca Cosmica
          <SectionLamp
              sectionKey="relatorios"
            title="Relatórios Premium"
            why="Relatórios reúnem em PDF o que sua leitura tem de mais importante — pensado para guardar, imprimir e reler com calma."
            how="Escolha o tipo de relatório (amor, carreira, ciclo, etc.), gere com IA, baixe e arquive. Cada relatório fica salvo na sua biblioteca."
            purpose="Transformar leituras profundas em material concreto, em linguagem humanizada e formato cinematográfico."
          />
        </h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Relatorios PDF gerados sob medida com IA, a partir do seu mapa astral e numerologia.
          Linguagem humanizada, profunda e cinematografica.
        </p>
      </header>

      {/* Generation target indicator + scope toggle */}
      {hasActiveClient && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 -mt-4">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-gold" />
            Será salvo em:{" "}
            <span className="text-stardust font-medium">
              {effectiveScope === "client"
                ? `Relatórios de ${activeSubject?.full_name ?? "cliente"}`
                : "Meus relatórios"}
            </span>
          </div>
          <div
            role="tablist"
            aria-label="Escopo da geração"
            className="inline-flex rounded-xl border border-gold/30 bg-night/40 p-1 text-xs self-start sm:self-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={scope === "self"}
              onClick={() => setScope("self")}
              disabled={!!loadingKind}
              className={`px-3 py-1.5 rounded-lg transition disabled:opacity-50 inline-flex items-center gap-1.5 ${
                scope === "self"
                  ? "bg-gold/15 text-gold"
                  : "text-muted-foreground hover:text-stardust"
              }`}
            >
              Meus relatórios
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${scope === "self" ? "bg-gold/25 text-gold" : "bg-muted text-muted-foreground"}`}>
                {selfCount}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={scope === "client"}
              onClick={() => setScope("client")}
              disabled={!!loadingKind}
              className={`px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5 disabled:opacity-50 ${
                scope === "client"
                  ? "bg-gold/15 text-gold"
                  : "text-muted-foreground hover:text-stardust"
              }`}
            >
              <Users className="size-3.5" />
              {activeSubject?.full_name?.split(" ")[0] ?? "Cliente ativo"}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${scope === "client" ? "bg-gold/25 text-gold" : "bg-muted text-muted-foreground"}`}>
                {clientCount}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Generate cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {CARDS.map((c) => {
          const isLoading = loadingKind === c.kind;
          return (
            <button
              key={c.kind}
              onClick={() => handleGenerateClick(c.kind)}
              disabled={isLoading || !!loadingKind}
              className="group relative text-left glass-card rounded-2xl p-6 overflow-hidden hover:gold-glow transition-all disabled:opacity-60 disabled:cursor-wait"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-50 pointer-events-none`} />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-xl bg-night/40 border border-gold/30 grid place-items-center">
                    <c.icon className="size-5 text-gold" />
                  </div>
                  <h3 className="font-serif text-xl text-stardust">{c.title}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                <div className="mt-5 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gold">
                    {isLoading ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" /> Gerando PDF...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-3.5" /> Gerar relatorio
                      </>
                    )}
                  </div>
                  <CreditCostBadge action={`report_${c.kind}`} showBalance={false} />
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {/* Library */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="font-serif text-2xl text-stardust flex items-center gap-2">
            <FileText className="size-5 text-gold" />
            {effectiveScope === "client" && hasActiveClient
              ? `Relatórios de ${activeSubject?.full_name ?? "cliente"}`
              : "Meus relatórios"}
          </h2>

          {hasActiveClient && (
            <div
              role="tablist"
              aria-label="Filtrar relatórios"
              className="inline-flex rounded-xl border border-gold/30 bg-night/40 p-1 text-xs"
            >
              <button
                type="button"
                role="tab"
                aria-selected={scope === "self"}
                onClick={() => setScope("self")}
                className={`px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5 ${
                  scope === "self"
                    ? "bg-gold/15 text-gold"
                    : "text-muted-foreground hover:text-stardust"
                }`}
              >
                Meus relatórios
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${scope === "self" ? "bg-gold/25 text-gold" : "bg-muted text-muted-foreground"}`}>
                  {selfCount}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={scope === "client"}
                onClick={() => setScope("client")}
                className={`px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5 ${
                  scope === "client"
                    ? "bg-gold/15 text-gold"
                    : "text-muted-foreground hover:text-stardust"
                }`}
              >
                <Users className="size-3.5" />
                {activeSubject?.full_name?.split(" ")[0] ?? "Cliente ativo"}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${scope === "client" ? "bg-gold/25 text-gold" : "bg-muted text-muted-foreground"}`}>
                  {clientCount}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por título..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 rounded-xl border border-gold/20 bg-night/40 text-sm text-stardust placeholder:text-muted-foreground focus:outline-none focus:border-gold/50 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-stardust transition"
                aria-label="Limpar busca"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="inline-flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            <div className="inline-flex rounded-xl border border-gold/20 bg-night/40 p-1 text-xs">
              {[
                { key: "all" as const, label: "Todos" },
                { key: "7d" as const, label: "7 dias" },
                { key: "30d" as const, label: "30 dias" },
                { key: "90d" as const, label: "90 dias" },
                { key: "year" as const, label: "Este ano" },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriodFilter(p.key)}
                  className={`px-2.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                    periodFilter === p.key
                      ? "bg-gold/15 text-gold"
                      : "text-muted-foreground hover:text-stardust"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!reports || reports.length === 0 ? (
          scope === "client" && !hasActiveClient ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <Users className="size-10 text-muted-foreground mx-auto mb-4" />
              <p className="font-serif text-lg text-stardust">Nenhum cliente ativo</p>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Você não tem um cliente selecionado no momento. Vá até a lista de clientes para escolher um perfil ativo.
              </p>
            </div>
          ) : scope === "client" && hasActiveClient ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <FileText className="size-10 text-muted-foreground mx-auto mb-4" />
              <p className="font-serif text-lg text-stardust">Nenhum relatório encontrado</p>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Não há relatórios gerados para {activeSubject?.full_name ?? "este cliente"}.
              </p>
            </div>
          ) : !activeSubject ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <Sparkles className="size-10 text-muted-foreground mx-auto mb-4" />
              <p className="font-serif text-lg text-stardust">Dados de nascimento não encontrados</p>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Complete seu perfil com data de nascimento para poder gerar relatórios.
              </p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-10 text-center">
              <FileText className="size-10 text-muted-foreground mx-auto mb-4" />
              <p className="font-serif text-lg text-stardust">Biblioteca vazia</p>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Você ainda não gerou relatórios. Escolha um tema acima para começar.
              </p>
            </div>
          )
        ) : filteredReports.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <Search className="size-10 text-muted-foreground mx-auto mb-4" />
            <p className="font-serif text-lg text-stardust">Nenhum resultado</p>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Não encontramos relatórios para "{searchQuery}" no período selecionado.
            </p>
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setPeriodFilter("all"); }}
              className="mt-4 px-4 py-2 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition text-sm inline-flex items-center gap-2"
            >
              <X className="size-4" /> Limpar filtros
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((r) => (
              <div
                key={r.id}
                className="glass-card rounded-xl p-4 flex items-center gap-4 hover:border-gold/40 transition"
              >
                <div className="size-10 rounded-lg bg-night/40 border border-gold/30 grid place-items-center shrink-0">
                  <FileText className="size-4 text-gold" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-serif text-stardust truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <button
                  onClick={() => openReport(r.id, r.title)}
                  className="size-9 rounded-lg border border-gold/30 text-gold grid place-items-center hover:bg-gold/10 transition"
                  aria-label="Baixar"
                >
                  <Download className="size-4" />
                </button>
                <button
                  onClick={() => removeReport(r.id)}
                  className="size-9 rounded-lg border border-border text-muted-foreground grid place-items-center hover:text-destructive hover:border-destructive/40 transition"
                  aria-label="Apagar"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Existing report prompt */}
      <Dialog
        open={!!existingPrompt}
        onOpenChange={(o) => { if (!o) setExistingPrompt(null); }}
      >
        <DialogContent className="glass-card gold-glow border-gold/30">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-stardust flex items-center gap-2">
              <FileText className="size-5 text-gold" /> Você já tem este relatório
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {existingPrompt && (
                <>
                  Já existe um PDF de{" "}
                  <span className="text-stardust font-medium">
                    “{CARDS.find((c) => c.kind === existingPrompt.kind)?.title}”
                  </span>{" "}
                  gerado em{" "}
                  {new Date(existingPrompt.report.created_at).toLocaleString("pt-BR")}
                  {activeSubject?.kind === "client" && (
                    <> para <span className="text-stardust">{activeSubject.full_name}</span></>
                  )}
                  . Deseja baixar o existente ou gerar um novo (consome créditos)?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setExistingPrompt(null)}
              className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-stardust hover:border-gold/40 transition text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!existingPrompt) return;
                const r = existingPrompt.report;
                setExistingPrompt(null);
                await openReport(r.id, r.title);
              }}
              className="px-4 py-2 rounded-lg border border-gold/40 text-gold hover:bg-gold/10 transition text-sm inline-flex items-center gap-2"
            >
              <Download className="size-4" /> Baixar existente
            </button>
            <button
              type="button"
              onClick={() => {
                if (!existingPrompt) return;
                const kind = existingPrompt.kind;
                setExistingPrompt(null);
                if (KINDS_NEED_PARTNER.has(kind) || KINDS_NEED_YEAR.has(kind)) {
                  setExtraPrompt({
                    kind,
                    partnerName: "",
                    partnerDate: "",
                    year: String(new Date().getFullYear()),
                  });
                } else {
                  genMutation.mutate({ kind });
                }
              }}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-gold/80 to-gold-glow text-night font-medium hover:opacity-90 transition text-sm inline-flex items-center gap-2"
            >
              <Sparkles className="size-4" /> Gerar novo
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
