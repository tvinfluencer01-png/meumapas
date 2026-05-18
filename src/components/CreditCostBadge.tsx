import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Coins, AlertTriangle, Info } from "lucide-react";
import { getMyCreditsOverview } from "@/lib/credits.functions";
import { CREDITS_CHANGED_EVENT } from "@/lib/credits-events";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  /** Ação a ser cobrada (ex: "oracle_message", "astro_chart", "report_love"). */
  action: string;
  /** Texto antes do custo. Default: "Custo estimado". */
  label?: string;
  className?: string;
  /** Mostra o saldo do usuário ao lado do custo. */
  showBalance?: boolean;
  /** Texto curto exibido quando a ação é gratuita (cost <= 0). */
  freeText?: string;
};

// Texto humanizado para cada ação conhecida (fallback no tooltip).
const ACTION_HINTS: Record<string, { item: string; what: string }> = {
  oracle_message: {
    item: "Cada pergunta enviada ao Oráculo IA",
    what: "Consome créditos por mensagem respondida (não por caractere).",
  },
  astro_chart: {
    item: "Geração / recálculo do Mapa Astral",
    what: "Cobra uma vez por cálculo completo via Swiss Ephemeris.",
  },
  tarot_reading: {
    item: "Leitura de Tarot (3 cartas)",
    what: "Cobra uma vez por leitura iniciada.",
  },
  report_personality: {
    item: "Relatório PDF — Mapa da Personalidade",
    what: "Cobra uma vez ao gerar o PDF completo.",
  },
  report_love: {
    item: "Relatório PDF — Amor & Relacionamentos",
    what: "Cobra uma vez ao gerar o PDF completo.",
  },
  report_career: {
    item: "Relatório PDF — Carreira & Propósito",
    what: "Cobra uma vez ao gerar o PDF completo.",
  },
  report_spiritual: {
    item: "Relatório PDF — Caminho Espiritual",
    what: "Cobra uma vez ao gerar o PDF completo.",
  },
};

/**
 * Mostra "Custo estimado: N créd. · Saldo: N" antes de uma ação cobrável,
 * com tooltip explicando o que está sendo cobrado e como o valor é definido.
 */
export function CreditCostBadge({
  action,
  label = "Custo estimado",
  className,
  showBalance = true,
  freeText = "Gratuito",
}: Props) {
  const overviewFn = useServerFn(getMyCreditsOverview);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-credits-overview"],
    queryFn: () => overviewFn(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const handler = () =>
      qc.invalidateQueries({ queryKey: ["my-credits-overview"] });
    window.addEventListener(CREDITS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(CREDITS_CHANGED_EVENT, handler);
  }, [qc]);

  if (isLoading || !data) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
          className,
        )}
      >
        <Coins className="size-3" /> …
      </span>
    );
  }

  const entry = data.costs[action];
  const cost = entry?.amount ?? 0;
  const balance = data.balance;
  const insufficient = cost > 0 && balance < cost;
  const hint = ACTION_HINTS[action];
  const itemLabel = entry?.label || hint?.item || action;
  const itemDesc =
    entry?.description ||
    hint?.what ||
    "Esta ação consome créditos da sua conta quando concluída.";

  const TooltipBody = (
    <TooltipContent className="max-w-xs space-y-1.5 text-xs leading-relaxed">
      <p className="font-semibold text-foreground">{itemLabel}</p>
      <p className="text-muted-foreground">{itemDesc}</p>
      <div className="pt-1 border-t border-border/60 space-y-0.5 text-muted-foreground">
        <p>
          <span className="text-foreground font-mono">{cost}</span>{" "}
          {cost === 1 ? "crédito" : "créditos"} por execução
          {cost <= 0 ? " (gratuito)" : ""}.
        </p>
        <p>
          Saldo atual:{" "}
          <span className="text-foreground font-mono">{balance}</span>
        </p>
        <p className="text-[10px] opacity-80">
          Valores configurados pelo administrador. O débito ocorre ao concluir a
          ação; falhas geram estorno automático.
        </p>
      </div>
    </TooltipContent>
  );

  if (cost <= 0) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs text-emerald-500 cursor-help",
                className,
              )}
            >
              <Coins className="size-3" /> {freeText}
              <Info className="size-3 opacity-70" />
            </span>
          </TooltipTrigger>
          {TooltipBody}
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex flex-wrap items-center gap-1.5 text-xs cursor-help",
              insufficient ? "text-destructive" : "text-muted-foreground",
              className,
            )}
          >
            <Coins className="size-3" />
            <span>
              {label}:{" "}
              <span className="font-mono text-foreground">{cost}</span>{" "}
              {cost === 1 ? "crédito" : "créditos"}
            </span>
            {showBalance && (
              <span className="text-muted-foreground">
                · Saldo:{" "}
                <span
                  className={cn(
                    "font-mono",
                    insufficient ? "text-destructive" : "text-foreground",
                  )}
                >
                  {balance}
                </span>
              </span>
            )}
            <Info className="size-3 opacity-70" />
            {insufficient && (
              <Link
                to="/addons"
                className="inline-flex items-center gap-1 underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                <AlertTriangle className="size-3" /> comprar créditos
              </Link>
            )}
          </span>
        </TooltipTrigger>
        {TooltipBody}
      </Tooltip>
    </TooltipProvider>
  );
}
