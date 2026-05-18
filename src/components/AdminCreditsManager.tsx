import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Search, Plus, Minus, History, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { listAdminUsers } from "@/lib/admin.functions";
import {
  adminAdjustCredits,
  adminApplyCreditPackage,
  adminGetUserCredits,
  adminListCreditHistory,
  adminListCreditPackages,
  adminRefundCredits,
} from "@/lib/credits.functions";
import {
  CreditHistoryFilters,
  CreditHistoryTable,
  toIsoRange,
  useHistoryFiltersState,
} from "@/components/CreditHistoryTable";

export function AdminCreditsManager() {
  const listFn = useServerFn(listAdminUsers);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ id: string; email: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users-credits", search],
    queryFn: () => listFn({ data: { search, page: 1 } }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="size-5 text-gold" /> Gerenciar créditos
        </CardTitle>
        <CardDescription>
          Adicione ou remova créditos de qualquer usuário. Toda movimentação fica registrada
          no histórico de transações.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por e-mail ou nome…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            maxLength={120}
          />
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-sm">Carregando…</div>
        ) : !data?.users.length ? (
          <div className="text-muted-foreground text-sm">Nenhum usuário encontrado.</div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Usuário</th>
                  <th className="px-3 py-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">{u.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setSelected({ id: u.id, email: u.email, name: u.full_name || "" })
                        }
                      >
                        <Coins className="size-3 mr-1" /> Gerenciar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <CreditsDialog
              userId={selected.id}
              userLabel={selected.name || selected.email}
              onDone={() => setSelected(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CreditsDialog({
  userId,
  userLabel,
  onDone,
}: {
  userId: string;
  userLabel: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const getFn = useServerFn(adminGetUserCredits);
  const adjustFn = useServerFn(adminAdjustCredits);
  const historyFn = useServerFn(adminListCreditHistory);
  const pkgListFn = useServerFn(adminListCreditPackages);
  const applyPkgFn = useServerFn(adminApplyCreditPackage);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-credits", userId],
    queryFn: () => getFn({ data: { user_id: userId } }),
  });

  const { data: pkgData } = useQuery({
    queryKey: ["admin-credit-packages"],
    queryFn: () => pkgListFn(),
  });

  const [filters, setFilters] = useHistoryFiltersState();

  const {
    data: history,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["admin-credit-history", userId, filters],
    queryFn: () =>
      historyFn({
        data: { user_id: userId, ...toIsoRange(filters), limit: 200 },
      }),
  });

  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState("");

  const mut = useMutation({
    mutationFn: (sign: 1 | -1) =>
      adjustFn({
        data: {
          user_id: userId,
          amount: sign * Math.abs(parseInt(amount || "0", 10)),
          reason: reason.trim(),
        },
      }),
    onSuccess: (res, sign) => {
      toast.success(
        sign > 0
          ? `Créditos adicionados. Novo saldo: ${res.balance}`
          : `Créditos removidos. Novo saldo: ${res.balance}`,
      );
      setAmount("");
      setReason("");
      refetch();
      refetchHistory();
      qc.invalidateQueries({ queryKey: ["addons-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(sign: 1 | -1) {
    const n = parseInt(amount || "0", 10);
    if (!n || n <= 0) return toast.error("Informe uma quantidade positiva.");
    if (!reason.trim()) return toast.error("Informe um motivo.");
    mut.mutate(sign);
  }

  const refundFn = useServerFn(adminRefundCredits);
  const refundMut = useMutation({
    mutationFn: (vars: { tx_id: string; action: string; amount: number; reason: string }) =>
      refundFn({
        data: {
          user_id: userId,
          action: vars.action,
          amount: vars.amount,
          reason: vars.reason,
          original_tx_id: vars.tx_id,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Estorno realizado: +${res.amount} créditos`);
      refetch();
      refetchHistory();
      qc.invalidateQueries({ queryKey: ["addons-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleRefund(tx: {
    id: string;
    amount: number;
    kind: string;
    action?: string | null;
  }) {
    const action = tx.action || tx.kind;
    const reason = window.prompt(
      `Motivo do estorno desta cobrança (${action})?`,
      "Falha na geração / cancelamento",
    );
    if (!reason || !reason.trim()) return;
    refundMut.mutate({
      tx_id: tx.id,
      action,
      amount: Math.abs(tx.amount),
      reason: reason.trim(),
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Coins className="size-5 text-gold" /> Créditos — {userLabel}
        </DialogTitle>
        <DialogDescription>
          Saldo atual:{" "}
          <span className="font-mono text-foreground">
            {isLoading ? "…" : data?.balance ?? 0}
          </span>{" "}
          créditos
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="amt">Quantidade</Label>
          <Input
            id="amt"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Ex: 10"
          />
        </div>
        <div>
          <Label htmlFor="rsn">Motivo</Label>
          <Input
            id="rsn"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: cortesia, ajuste manual"
            maxLength={240}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={() => submit(-1)}
          disabled={mut.isPending}
        >
          <Minus className="size-4 mr-1" /> Remover
        </Button>
        <Button onClick={() => submit(1)} disabled={mut.isPending}>
          <Plus className="size-4 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="border-t border-border pt-3 space-y-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <History className="size-3" /> Histórico detalhado
        </div>
        <CreditHistoryFilters
          value={filters}
          onChange={setFilters}
          actions={(history?.transactions ?? []).map((t) => t.action || t.kind)}
        />
        <CreditHistoryTable
          transactions={history?.transactions ?? []}
          loading={historyLoading}
          onRefund={handleRefund}
        />
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={onDone}>
          Fechar
        </Button>
      </div>
    </>
  );
}
