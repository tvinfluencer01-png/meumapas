import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { generateReport, getReportUrl, deleteReport } from "@/lib/reports.functions";
import { toast } from "sonner";
import { showLoader, hideLoader, updateLoader, confirmDialog } from "@/components/system-feedback";
import {
  FileText, Download, Sparkles, Heart, Briefcase, Flame, Loader2, Trash2, ScrollText,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
  head: () => ({ meta: [{ title: "Relatorios Premium — Cosmic AI" }] }),
});

type Kind = "personality" | "love" | "career" | "spiritual";

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
];

function RelatoriosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const generate = useServerFn(generateReport);
  const getUrl = useServerFn(getReportUrl);
  const removeFn = useServerFn(deleteReport);
  const [loadingKind, setLoadingKind] = useState<Kind | null>(null);

  const { data: reports } = useQuery({
    queryKey: ["reports", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function downloadFromUrl(url: string, filename: string) {
    // Baixa via fetch+blob para evitar ERR_BLOCKED_BY_CLIENT (adblockers)
    // que bloqueiam window.open para dominios de storage.
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

  const genMutation = useMutation({
    mutationFn: async (kind: Kind) => {
      setLoadingKind(kind);
      const title = CARDS.find((c) => c.kind === kind)?.title ?? "Relatorio";
      showLoader({
        title: `Gerando ${title}`,
        subtitle: "Oraculo em ação",
        messages: [
          "Lendo seu mapa astral e numerologia...",
          "Consultando o Oráculo Cósmico...",
          "Tecendo capítulos personalizados...",
          "Compondo análise e recomendações...",
          "Diagramando seu PDF cinematográfico...",
        ],
      });
      return await generate({ data: { kind } });
    },
    onSuccess: async (res, kind) => {
      qc.invalidateQueries({ queryKey: ["reports", user?.id] });
      if (res.signedUrl) {
        try {
          updateLoader({ messages: ["Preparando download do PDF..."] });
          await downloadFromUrl(res.signedUrl, `${res.title || kind}.pdf`);
          toast.success("Relatorio pronto. Download iniciado.");
        } catch {
          toast.error("PDF gerado, mas o download falhou. Tente novamente em 'Seus relatorios'.");
        }
      }
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao gerar relatorio"),
    onSettled: () => {
      setLoadingKind(null);
      hideLoader();
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
        toast.error("Nao foi possivel gerar o link");
        return;
      }
      await downloadFromUrl(signedUrl, `${title || "relatorio"}.pdf`);
    } catch {
      toast.error("Erro ao baixar o relatorio");
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
    toast.success("Relatorio apagado");
  }

  return (
    <div className="space-y-10">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Relatorios Premium</p>
        <h1 className="font-serif text-3xl lg:text-5xl mt-2 shimmer-text flex items-center gap-3">
          <ScrollText className="size-8 text-gold" /> Sua Biblioteca Cosmica
        </h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Relatorios PDF gerados sob medida com IA, a partir do seu mapa astral e numerologia.
          Linguagem humanizada, profunda e cinematografica.
        </p>
      </header>

      {/* Generate cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CARDS.map((c) => {
          const isLoading = loadingKind === c.kind;
          return (
            <button
              key={c.kind}
              onClick={() => !isLoading && genMutation.mutate(c.kind)}
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
                <div className="mt-5 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gold">
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
              </div>
            </button>
          );
        })}
      </section>

      {/* Library */}
      <section>
        <h2 className="font-serif text-2xl text-stardust mb-4 flex items-center gap-2">
          <FileText className="size-5 text-gold" /> Seus relatorios
        </h2>

        {!reports || reports.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center text-muted-foreground">
            Voce ainda nao gerou relatorios. Escolha um acima para comecar.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
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
    </div>
  );
}
