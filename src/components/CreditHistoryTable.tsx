import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CreditTx = {
  id: string;
  amount: number;
  kind: string;
  action?: string | null;
  reference: string | null;
  balance_before: number | null;
  balance_after: number | null;
  created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
  oracle_message: "Oráculo",
  report_personality: "Relatório Personalidade",
  report_love: "Relatório Amor",
  report_career: "Relatório Carreira",
  report_spiritual: "Relatório Espiritual",
  tarot_reading: "Tarot",
  astro_chart: "Mapa Astral",
  admin_grant: "Crédito (admin)",
  admin_revoke: "Débito (admin)",
  welcome_bonus: "Boas-vindas",
};

export function actionLabel(action: string | null | undefined, kind: string) {
  const key = action || kind;
  return ACTION_LABELS[key] ?? key;
}

export type HistoryFilters = {
  action: string;
  from: string;
  to: string;
};

export function CreditHistoryFilters({
  value,
  onChange,
  actions,
}: {
  value: HistoryFilters;
  onChange: (v: HistoryFilters) => void;
  actions: string[];
}) {
  const opts = useMemo(
    () =>
      Array.from(
        new Set([
          ...Object.keys(ACTION_LABELS),
          ...actions.filter(Boolean),
        ]),
      ),
    [actions],
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <Label className="text-xs flex items-center gap-1">
          <Filter className="size-3" /> Ação
        </Label>
        <Select
          value={value.action || "__all"}
          onValueChange={(v) =>
            onChange({ ...value, action: v === "__all" ? "" : v })
          }
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todas as ações</SelectItem>
            {opts.map((a) => (
              <SelectItem key={a} value={a}>
                {actionLabel(a, a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">De</Label>
        <Input
          type="date"
          className="h-9"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs">Até</Label>
        <Input
          type="date"
          className="h-9"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </div>
    </div>
  );
}

export function CreditHistoryTable({
  transactions,
  loading,
  onRefund,
}: {
  transactions: CreditTx[];
  loading?: boolean;
  onRefund?: (tx: CreditTx) => void;
}) {
  if (loading) {
    return <div className="text-sm text-muted-foreground py-6">Carregando…</div>;
  }
  if (!transactions.length) {
    return (
      <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-md">
        Nenhuma movimentação encontrada.
      </div>
    );
  }
  const isRefunded = (t: CreditTx) =>
    !!t.id &&
    transactions.some(
      (r) => r.amount > 0 && (r.reference ?? "").includes(`origin=${t.id}`),
    );
  return (
    <div className="rounded-md border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Data</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead className="text-right">Custo</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Saldo antes</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Saldo depois</TableHead>
            <TableHead className="hidden md:table-cell">Referência</TableHead>
            {onRefund && <TableHead className="text-right">Estorno</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => {
            const positive = t.amount >= 0;
            const refunded = isRefunded(t);
            return (
              <TableRow key={t.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {positive ? (
                      <ArrowUpCircle className="size-4 text-emerald-500" />
                    ) : (
                      <ArrowDownCircle className="size-4 text-destructive" />
                    )}
                    <span className="font-medium">
                      {actionLabel(t.action, t.kind)}
                    </span>
                  </div>
                </TableCell>
                <TableCell
                  className={
                    "text-right font-mono " +
                    (positive ? "text-emerald-500" : "text-destructive")
                  }
                >
                  {positive ? "+" : ""}
                  {t.amount}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground hidden sm:table-cell">
                  {t.balance_before ?? "—"}
                </TableCell>
                <TableCell className="text-right font-mono hidden sm:table-cell">
                  {t.balance_after ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground truncate max-w-[280px] hidden md:table-cell">
                  {t.reference ?? "—"}
                </TableCell>
                {onRefund && (
                  <TableCell className="text-right">
                    {!positive && !refunded ? (
                      <button
                        type="button"
                        onClick={() => onRefund(t)}
                        className="text-xs text-primary hover:underline"
                      >
                        Estornar
                      </button>
                    ) : refunded ? (
                      <span className="text-xs text-muted-foreground">
                        Estornado
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function useHistoryFiltersState() {
  return useState<HistoryFilters>({ action: "", from: "", to: "" });
}

export function toIsoRange(filters: HistoryFilters) {
  return {
    action: filters.action || null,
    from: filters.from ? new Date(filters.from + "T00:00:00").toISOString() : null,
    to: filters.to ? new Date(filters.to + "T23:59:59").toISOString() : null,
  };
}
