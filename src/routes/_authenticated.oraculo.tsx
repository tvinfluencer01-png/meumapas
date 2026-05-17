import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/oraculo")({
  component: OraculoPage,
  head: () => ({ meta: [{ title: "Oráculo IA — Cosmic AI" }] }),
});

function OraculoPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-gold">IA Espiritual</p>
        <h1 className="font-serif text-3xl lg:text-5xl mt-2 shimmer-text">Oráculo</h1>
        <p className="mt-2 text-muted-foreground">
          Em breve: converse com uma IA que conhece seu mapa, seus números e sua história.
        </p>
      </header>

      <div className="glass-card rounded-2xl p-12 text-center">
        <MessageCircle className="size-12 text-gold mx-auto mb-4" />
        <p className="text-stardust font-serif text-xl">O Oráculo está se preparando</p>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Na próxima fase ativaremos a conversa cinematográfica com streaming, memória contextual e
          interpretações personalizadas baseadas no seu mapa astral.
        </p>
        <div className="inline-flex items-center gap-2 mt-6 text-xs text-gold">
          <Sparkles className="size-3.5" /> Fase 5 do roadmap
        </div>
      </div>
    </div>
  );
}
