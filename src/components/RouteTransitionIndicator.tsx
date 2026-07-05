import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

/**
 * Indicador de transição de rotas — barra superior + overlay leve com o logo
 * enquanto a próxima rota está carregando (loaders, code-split chunks, etc).
 */
export function RouteTransitionIndicator() {
  const isLoading = useRouterState({
    select: (s) => s.status === "pending" || s.isLoading || s.isTransitioning,
  });

  // Debounce para evitar flash em navegações instantâneas
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!isLoading) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), 120);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (!show) return null;

  return (
    <>
      {/* Barra de progresso indeterminada no topo */}
      <div
        className="fixed inset-x-0 top-0 z-[90] h-0.5 overflow-hidden bg-transparent pointer-events-none"
        aria-hidden
      >
        <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-gold to-transparent animate-route-progress" />
      </div>

      {/* Overlay sutil com logo pulsante */}
      <div
        role="status"
        aria-label="Carregando"
        className="fixed bottom-6 right-6 z-[90] flex items-center gap-2 rounded-full border bg-card/80 px-3 py-2 shadow-lg backdrop-blur animate-fade-in pointer-events-none"
      >
        <Logo sizeClassName="size-5" animation="loading" />
        <span className="text-xs text-muted-foreground">Carregando…</span>
      </div>
    </>
  );
}
