import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

/**
 * Indicador de transição de rotas — barra superior + overlay com o logo
 * enquanto a próxima rota está carregando (loaders, code-split chunks, etc).
 *
 * Aparece imediatamente para dar feedback em rotas pesadas (ex.: /admin),
 * cujo bundle demora a baixar/parsear e "trava" a UI por alguns instantes.
 */
export function RouteTransitionIndicator() {
  const isLoading = useRouterState({
    select: (s) => s.status === "pending" || s.isLoading || s.isTransitioning,
  });

  // Pequeno debounce só para navegações muito rápidas evitarem flash.
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!isLoading) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), 40);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (!show) return null;

  return (
    <>
      {/* Barra de progresso indeterminada no topo */}
      <div
        className="fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-transparent pointer-events-none"
        aria-hidden
      >
        <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-gold to-transparent animate-route-progress" />
      </div>

      {/* Overlay cinematográfico com logo pulsante */}
      <div
        role="status"
        aria-label="Carregando"
        className="fixed inset-0 z-[95] flex flex-col items-center justify-center gap-4 bg-background/70 backdrop-blur-sm animate-fade-in pointer-events-none"
      >
        <div className="relative">
          <div className="absolute inset-0 -m-6 rounded-full nebula-bg animate-splash-halo" aria-hidden />
          <Logo sizeClassName="size-16" animation="loading" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs uppercase tracking-eyebrow text-gold">Carregando</span>
          <span className="text-sm text-muted-foreground font-serif italic">preparando o cosmos…</span>
        </div>
      </div>
    </>
  );
}
