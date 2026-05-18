import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Coins, AlertTriangle } from "lucide-react";
import { getMyCreditsOverview } from "@/lib/credits.functions";
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

/**
 * Mostra "Custo estimado: N créd. · Saldo: N" antes de uma ação cobrável.
 * Indica se o saldo é insuficiente e linka para a página de pacotes.
 */
export function CreditCostBadge({
  action,
  label = "Custo estimado",
  className,
  showBalance = true,
  freeText = "Gratuito",
}: Props) {
  const overviewFn = useServerFn(getMyCreditsOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["my-credits-overview"],
    queryFn: () => overviewFn(),
    staleTime: 30_000,
  });

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

  const cost = data.costs[action]?.amount ?? 0;
  const balance = data.balance;
  const insufficient = cost > 0 && balance < cost;

  if (cost <= 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-emerald-500",
          className,
        )}
      >
        <Coins className="size-3" /> {freeText}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-1.5 text-xs",
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
      {insufficient && (
        <Link
          to="/addons"
          className="inline-flex items-center gap-1 underline underline-offset-2"
        >
          <AlertTriangle className="size-3" /> comprar créditos
        </Link>
      )}
    </span>
  );
}
