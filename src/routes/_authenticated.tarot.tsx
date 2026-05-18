import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreditCostBadge } from "@/components/CreditCostBadge";

export const Route = createFileRoute("/_authenticated/tarot")({
  component: TarotPage,
  head: () => ({ meta: [{ title: "Tarot — Cosmic AI" }] }),
});

const DECK = [
  "O Mago", "A Sacerdotisa", "A Imperatriz", "O Imperador", "O Hierofante",
  "Os Enamorados", "O Carro", "A Força", "O Eremita", "A Roda da Fortuna",
  "A Justiça", "O Enforcado", "A Morte", "A Temperança", "O Diabo",
  "A Torre", "A Estrela", "A Lua", "O Sol", "O Julgamento", "O Mundo", "O Louco",
];

function drawThree() {
  const pool = [...DECK];
  const out: string[] = [];
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function TarotPage() {
  const [cards, setCards] = useState<string[] | null>(null);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl shimmer-text flex items-center gap-2">
          <Sparkles className="size-6 text-gold" /> Tarot
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Concentre-se em uma pergunta e revele três cartas: passado, presente e futuro.
          Cada leitura consome créditos da sua conta.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card/50 backdrop-blur p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg">Nova leitura — 3 cartas</h2>
            <p className="text-xs text-muted-foreground">
              Revise o custo e seu saldo antes de iniciar.
            </p>
          </div>
          <CreditCostBadge action="tarot_reading" />
        </div>

        <Button
          onClick={() => setCards(drawThree())}
          className="bg-gradient-to-r from-gold to-amber-400 text-background hover:opacity-90"
        >
          <Wand2 className="size-4 mr-2" /> Iniciar leitura
        </Button>
      </section>

      {cards && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {["Passado", "Presente", "Futuro"].map((pos, i) => (
            <div
              key={pos}
              className="rounded-xl border border-gold/30 bg-secondary/40 p-5 text-center space-y-2"
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{pos}</div>
              <div className="font-serif text-xl text-gold">{cards[i]}</div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
