import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ShoppingCart } from "lucide-react";
import { getMyCreditsOverview } from "@/lib/credits.functions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Wand2, Loader2, FileDown, Trash2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCostBadge } from "@/components/CreditCostBadge";
import { emitCreditsChanged } from "@/lib/credits-events";
import { SPREADS, type SpreadId } from "@/lib/tarot.deck";
import {
  generateTarotReading,
  exportTarotPdf,
  listTarotReadings,
  deleteTarotReading,
} from "@/lib/tarot.functions";

export const Route = createFileRoute("/_authenticated/tarot")({
  component: TarotPage,
  head: () => ({ meta: [{ title: "Tarot — Cosmic AI" }] }),
});

const COST_BY_SPREAD: Record<SpreadId, string> = {
  card_day: "tarot_card_day",
  three: "tarot_three",
  celtic: "tarot_celtic",
};

function TarotPage() {
  const [spread, setSpread] = useState<SpreadId>("three");
  const [question, setQuestion] = useState("");
  const [current, setCurrent] = useState<Awaited<
    ReturnType<typeof generateTarotReading>
  > | null>(null);

  const qc = useQueryClient();
  const generateFn = useServerFn(generateTarotReading);
  const exportFn = useServerFn(exportTarotPdf);
  const listFn = useServerFn(listTarotReadings);
  const deleteFn = useServerFn(deleteTarotReading);
  const overviewFn = useServerFn(getMyCreditsOverview);

  const overview = useQuery({
    queryKey: ["my-credits-overview"],
    queryFn: () => overviewFn(),
  });

  const balance = overview.data?.balance ?? 0;
  const costAction = COST_BY_SPREAD[spread];
  const cost = overview.data?.costs?.[costAction]?.amount ?? 0;
  const insufficient = !overview.isLoading && cost > 0 && balance < cost;

  const history = useQuery({
    queryKey: ["tarot-readings"],
    queryFn: () => listFn(),
  });

  const genMut = useMutation({
    mutationFn: () => {
      if (insufficient) {
        throw new Error(
          `Créditos insuficientes. Você tem ${balance} e precisa de ${cost}.`,
        );
      }
      return generateFn({ data: { spread, question: question.trim() || null } });
    },
    onSuccess: (res) => {
      setCurrent(res);
      toast.success("Leitura revelada.");
      qc.invalidateQueries({ queryKey: ["tarot-readings"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => emitCreditsChanged(),
  });

  const pdfMut = useMutation({
    mutationFn: (id: string) => exportFn({ data: { id } }),
    onSuccess: (res) => {
      if (res.signedUrl) {
        window.open(res.signedUrl, "_blank");
        toast.success(res.cached ? "PDF aberto." : "PDF gerado.");
      }
      qc.invalidateQueries({ queryKey: ["tarot-readings"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => emitCreditsChanged(),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Leitura removida.");
      qc.invalidateQueries({ queryKey: ["tarot-readings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Oráculo</p>
        <h1 className="font-serif text-3xl lg:text-5xl shimmer-text flex items-center gap-3">
          <Sparkles className="size-7 text-gold" /> Tarot dos Arcanos
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Sorteio dos 22 Arcanos Maiores com interpretação personalizada por IA.
          Cada leitura é salva no seu histórico e pode ser exportada em PDF.
        </p>
      </header>

      {/* Spread chooser */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.values(SPREADS)).map((s) => {
          const active = spread === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSpread(s.id as SpreadId)}
              className={`text-left rounded-xl border p-5 transition-colors ${
                active
                  ? "border-gold bg-gold/10"
                  : "border-border bg-card/40 hover:border-gold/40"
              }`}
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {s.count} carta{s.count > 1 ? "s" : ""}
              </div>
              <div className="font-serif text-lg text-stardust mt-1">{s.label}</div>
              <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {s.positions.join(" · ")}
              </div>
              <div className="mt-3">
                <CreditCostBadge
                  action={COST_BY_SPREAD[s.id as SpreadId]}
                  showBalance={false}
                />
              </div>
            </button>
          );
        })}
      </section>

      {/* Question + draw */}
      <section className="glass-card rounded-2xl p-5 lg:p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="q">Pergunta (opcional)</Label>
          <Textarea
            id="q"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ex: O que preciso compreender sobre meu próximo passo?"
            rows={3}
            maxLength={500}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => genMut.mutate()}
            disabled={genMut.isPending || insufficient || overview.isLoading}
            className="bg-gradient-to-r from-gold to-amber-400 text-background hover:opacity-90"
          >
            {genMut.isPending ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="size-4 mr-2" />
            )}
            Sortear cartas e revelar leitura
          </Button>
          <CreditCostBadge action={costAction} />
        </div>
        {insufficient && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <AlertTriangle className="size-5 text-amber-400 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-amber-200">
                Créditos insuficientes para esta leitura.
              </p>
              <p className="text-muted-foreground">
                Você tem <span className="font-mono">{balance}</span> e precisa de{" "}
                <span className="font-mono">{cost}</span> créditos para{" "}
                {SPREADS[spread].label}.
              </p>
            </div>
            <Button asChild size="sm" className="bg-gold text-background hover:opacity-90">
              <Link to="/addons">
                <ShoppingCart className="size-4 mr-2" /> Comprar créditos
              </Link>
            </Button>
          </div>
        )}
      </section>

      {/* Result */}
      {current && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {current.cards.map((c, i) => (
              <div
                key={i}
                className="rounded-xl border border-gold/30 bg-secondary/40 p-3 text-center"
              >
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {c.position}
                </div>
                <div
                  className={`font-serif text-base mt-1 text-gold ${
                    c.reversed ? "rotate-180 inline-block" : ""
                  }`}
                  title={c.reversed ? "Invertida" : "Em pé"}
                >
                  {c.card.name}
                </div>
                {c.reversed && (
                  <div className="text-[10px] text-amber-400 mt-1">invertida</div>
                )}
              </div>
            ))}
          </div>

          <article className="prose prose-invert prose-sm max-w-none glass-card rounded-2xl p-5 lg:p-6">
            <h2 className="font-serif text-gold">Visão geral</h2>
            <p>{current.interpretation.summary}</p>
            {current.interpretation.perCard.map((p, i) => (
              <div key={i}>
                <h3 className="font-serif text-gold">
                  {p.position} — {p.card}
                </h3>
                <p>{p.reading}</p>
              </div>
            ))}
            <h2 className="font-serif text-gold">Conselho</h2>
            <p>{current.interpretation.advice}</p>
            <blockquote className="border-l-2 border-gold pl-3 italic">
              {current.interpretation.affirmation}
            </blockquote>
          </article>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                setSpread("three");
                setCurrent(null);
                genMut.mutate();
              }}
              disabled={
                genMut.isPending ||
                overview.isLoading ||
                (overview.data
                  ? balance < (overview.data.costs?.["tarot_three"]?.amount ?? 0)
                  : false)
              }
              className="bg-gradient-to-r from-gold to-amber-400 text-background hover:opacity-90"
            >
              {genMut.isPending ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="size-4 mr-2" />
              )}
              Nova tiragem (passado · presente · futuro)
            </Button>
            <CreditCostBadge action="tarot_three" />

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
            <CreditCostBadge action="tarot_pdf" />
          </div>
        </section>
      )}

      {/* History */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl text-stardust flex items-center gap-2">
          <History className="size-5 text-gold" /> Suas leituras
        </h2>
        {history.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !history.data?.length ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma leitura ainda. Faça sua primeira tiragem acima.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {history.data.map((r) => (
              <Card key={r.id} className="bg-card/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-serif text-gold">
                    {SPREADS[r.spread as SpreadId]?.label ?? r.spread}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {r.question && (
                    <p className="text-xs text-muted-foreground italic line-clamp-2">
                      “{r.question}”
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
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => delMut.mutate(r.id)}
                      disabled={delMut.isPending}
                    >
                      <Trash2 className="size-3 mr-1" /> Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
