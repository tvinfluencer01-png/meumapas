import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { TreePine, Loader2, FileDown, Trash2, History, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CreditCostBadge } from "@/components/CreditCostBadge";
import { emitCreditsChanged } from "@/lib/credits-events";
import { SEFIROT, findSefirah } from "@/lib/kabbalah.tree";
import {
  generateKabbalahMeditation,
  exportKabbalahPdf,
  listKabbalahMeditations,
  deleteKabbalahMeditation,
} from "@/lib/kabbalah.functions";

export const Route = createFileRoute("/_authenticated/meditacao")({
  component: MeditacaoPage,
  head: () => ({ meta: [{ title: "Meditação Cabalística — Cosmic AI" }] }),
});

function MeditacaoPage() {
  const [sefirah, setSefirah] = useState<string>("tiferet");
  const [intention, setIntention] = useState("");
  const [duration, setDuration] = useState(10);
  const [current, setCurrent] = useState<Awaited<
    ReturnType<typeof generateKabbalahMeditation>
  > | null>(null);

  const qc = useQueryClient();
  const generateFn = useServerFn(generateKabbalahMeditation);
  const exportFn = useServerFn(exportKabbalahPdf);
  const listFn = useServerFn(listKabbalahMeditations);
  const deleteFn = useServerFn(deleteKabbalahMeditation);

  const history = useQuery({
    queryKey: ["kab-meditations"],
    queryFn: () => listFn(),
  });

  const genMut = useMutation({
    mutationFn: () =>
      generateFn({
        data: {
          sefirah,
          intention: intention.trim() || null,
          duration_min: duration,
        },
      }),
    onSuccess: (res) => {
      setCurrent(res);
      toast.success("Roteiro de meditação gerado.");
      qc.invalidateQueries({ queryKey: ["kab-meditations"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => emitCreditsChanged(),
  });

  const pdfMut = useMutation({
    mutationFn: (id: string) => exportFn({ data: { id } }),
    onSuccess: (res) => {
      if (res.pdfBase64) {
        const bin = atob(res.pdfBase64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `meditacao-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        toast.success(res.cached ? "PDF aberto." : "PDF gerado.");
      }
      qc.invalidateQueries({ queryKey: ["kab-meditations"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => emitCreditsChanged(),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Meditação removida.");
      qc.invalidateQueries({ queryKey: ["kab-meditations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selected = findSefirah(sefirah);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Cabala</p>
        <h1 className="font-serif text-3xl lg:text-5xl shimmer-text flex items-center gap-3">
          <TreePine className="size-7 text-gold" /> Meditação Cabalística
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Sessões guiadas baseadas nas 10 Sefirot da Árvore da Vida. Escolha a
          sefirá, defina sua intenção e receba um roteiro completo gerado por IA.
        </p>
      </header>

      {/* Sefirot selector */}
      <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {SEFIROT.map((s) => {
          const active = sefirah === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSefirah(s.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                active
                  ? "border-gold bg-gold/10"
                  : "border-border bg-card/40 hover:border-gold/40"
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {s.number}. {s.pillar}
              </div>
              <div className="font-serif text-base text-gold mt-1">{s.name}</div>
              <div className="text-xs text-stardust">{s.translation}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{s.planet}</div>
            </button>
          );
        })}
      </section>

      {/* Composer */}
      <section className="glass-card rounded-2xl p-5 lg:p-6 space-y-4">
        {selected && (
          <div className="rounded-lg border border-gold/20 bg-gold/5 p-3 text-sm text-stardust">
            <strong className="text-gold">{selected.name}</strong> ({selected.translation}) —{" "}
            <em className="text-muted-foreground">{selected.prayer}</em>
          </div>
        )}
        <div className="grid sm:grid-cols-[1fr_180px] gap-4">
          <div className="space-y-2">
            <Label htmlFor="int">Intenção (opcional)</Label>
            <Textarea
              id="int"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              placeholder="Ex: Quero acessar mais coragem para impor limites saudáveis."
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dur">Duração (min)</Label>
            <Input
              id="dur"
              type="number"
              min={5}
              max={45}
              value={duration}
              onChange={(e) =>
                setDuration(
                  Math.max(5, Math.min(45, parseInt(e.target.value || "10", 10))),
                )
              }
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => genMut.mutate()}
            disabled={genMut.isPending}
            className="bg-gradient-to-r from-gold to-amber-400 text-background hover:opacity-90"
          >
            {genMut.isPending ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="size-4 mr-2" />
            )}
            Gerar roteiro de meditação
          </Button>
          <CreditCostBadge action="kabbalah_meditation" />
        </div>
      </section>

      {/* Result */}
      {current && (
        <section className="space-y-4">
          <article className="prose prose-invert prose-sm max-w-none glass-card rounded-2xl p-5 lg:p-6">
            <h2 className="font-serif text-gold">
              {current.sefirah.name} — {current.sefirah.translation}
            </h2>
            <p className="text-xs text-muted-foreground">
              {current.duration_min} min · Pilar da {current.sefirah.pillar} ·{" "}
              {current.sefirah.planet}
            </p>
            <h3 className="font-serif text-gold">Abertura</h3>
            <p>{current.script.opening}</p>
            {current.script.phases.map((ph, i) => (
              <div key={i}>
                <h3 className="font-serif text-gold">
                  {ph.title} <span className="text-xs text-muted-foreground">(~{ph.duration_min} min)</span>
                </h3>
                <p>{ph.guidance}</p>
              </div>
            ))}
            <h3 className="font-serif text-gold">Fechamento</h3>
            <p>{current.script.closing}</p>
            <h3 className="font-serif text-gold">Mantra</h3>
            <blockquote className="border-l-2 border-gold pl-3 italic">
              {current.script.mantra}
            </blockquote>
            <h3 className="font-serif text-gold">Integração</h3>
            <ul>
              {current.script.integration.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          </article>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => pdfMut.mutate(current.id)}
              disabled={pdfMut.isPending}
            >
              {pdfMut.isPending ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="size-4 mr-2" />
              )}
              Exportar PDF
            </Button>
            <CreditCostBadge action="kabbalah_pdf" />
          </div>
        </section>
      )}

      {/* History */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl text-stardust flex items-center gap-2">
          <History className="size-5 text-gold" /> Suas meditações
        </h2>
        {history.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !history.data?.length ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma meditação ainda. Gere a primeira acima.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {history.data.map((r) => {
              const sef = findSefirah(r.sefirah);
              return (
                <Card key={r.id} className="bg-card/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-serif text-gold">
                      {sef?.name ?? r.sefirah} — {sef?.translation ?? ""}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {new Date(r.created_at).toLocaleString("pt-BR")} ·{" "}
                      {r.duration_min} min
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {r.intention && (
                      <p className="text-xs text-muted-foreground italic line-clamp-2">
                        “{r.intention}”
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => pdfMut.mutate(r.id)}
                        disabled={pdfMut.isPending}
                      >
                        <FileDown className="size-3 mr-1" /> PDF
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={delMut.isPending}
                          >
                            <Trash2 className="size-3 mr-1" /> Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir esta meditação?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação é permanente. O roteiro e o PDF
                              relacionado serão removidos do seu histórico.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => delMut.mutate(r.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
