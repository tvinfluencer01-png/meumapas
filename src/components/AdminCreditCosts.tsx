import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Save, Plus, Trash2 } from "lucide-react";
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
import { toast } from "sonner";
import { confirmDialog } from "@/components/system-feedback";
import {
  adminListCreditCosts,
  adminUpsertCreditCost,
  adminDeleteCreditCost,
} from "@/lib/credits.functions";

type Row = {
  action: string;
  amount: number;
  label: string;
  description: string | null;
  updated_at?: string | null;
};

export function AdminCreditCosts() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListCreditCosts);
  const upsertFn = useServerFn(adminUpsertCreditCost);
  const deleteFn = useServerFn(adminDeleteCreditCost);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-credit-costs"],
    queryFn: () => listFn(),
  });

  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (data?.costs) setRows(data.costs as Row[]);
  }, [data]);

  const [draft, setDraft] = useState<Row>({
    action: "",
    amount: 1,
    label: "",
    description: "",
  });

  const upsertMut = useMutation({
    mutationFn: (r: Row) =>
      upsertFn({
        data: {
          action: r.action.trim(),
          amount: Number(r.amount) || 0,
          label: r.label.trim(),
          description: r.description?.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Custo salvo.");
      qc.invalidateQueries({ queryKey: ["admin-credit-costs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (action: string) => deleteFn({ data: { action } }),
    onSuccess: () => {
      toast.success("Ação removida.");
      qc.invalidateQueries({ queryKey: ["admin-credit-costs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function updateRow(idx: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function removeRow(action: string) {
    const ok = await confirmDialog({
      title: "Remover esta ação?",
      description: `O custo da ação "${action}" será removido. O sistema usará o valor padrão (ou 0).`,
      confirmText: "Remover",
      destructive: true,
    });
    if (ok) deleteMut.mutate(action);
  }

  function addNew() {
    if (!draft.action.trim() || !draft.label.trim()) {
      return toast.error("Informe a chave e o nome da ação.");
    }
    upsertMut.mutate(draft);
    setDraft({ action: "", amount: 1, label: "", description: "" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="size-5 text-gold" /> Custos por ação
        </CardTitle>
        <CardDescription>
          Defina quantos créditos cada ação consome: respostas do oráculo,
          relatórios em PDF, mapa astral, leitura de tarot, etc. Use 0 para
          tornar a ação gratuita.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Carregando…</div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Chave</th>
                  <th className="px-3 py-2 font-medium">Nome</th>
                  <th className="px-3 py-2 font-medium">Descrição</th>
                  <th className="px-3 py-2 font-medium w-24">Custo</th>
                  <th className="px-3 py-2 font-medium text-right w-40">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.action} className="border-t border-border align-top">
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {r.action}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={r.label}
                        onChange={(e) => updateRow(i, { label: e.target.value })}
                        onKeyDown={(e) => e.stopPropagation()}
                        maxLength={120}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={r.description ?? ""}
                        onChange={(e) =>
                          updateRow(i, { description: e.target.value })
                        }
                        onKeyDown={(e) => e.stopPropagation()}
                        maxLength={500}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        inputMode="numeric"
                        value={String(r.amount)}
                        onChange={(e) =>
                          updateRow(i, {
                            amount: Math.max(
                              0,
                              parseInt(e.target.value.replace(/[^0-9]/g, "") || "0", 10),
                            ),
                          })
                        }
                        onKeyDown={(e) => e.stopPropagation()}
                        className="w-20 text-right font-mono"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          onClick={() => upsertMut.mutate(r)}
                          disabled={upsertMut.isPending}
                        >
                          <Save className="size-3 mr-1" /> Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeRow(r.action)}
                          disabled={deleteMut.isPending}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      Nenhuma ação configurada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-border pt-5">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Plus className="size-4" /> Nova ação
          </h3>
          <div className="grid gap-3 md:grid-cols-[160px_1fr_1fr_100px_auto]">
            <div>
              <Label htmlFor="na-key">Chave</Label>
              <Input
                id="na-key"
                placeholder="ex: tarot_3cards"
                value={draft.action}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    action: e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase(),
                  }))
                }
                onKeyDown={(e) => e.stopPropagation()}
                maxLength={64}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <Label htmlFor="na-label">Nome</Label>
              <Input
                id="na-label"
                placeholder="ex: Tarot 3 Cartas"
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                onKeyDown={(e) => e.stopPropagation()}
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="na-desc">Descrição</Label>
              <Input
                id="na-desc"
                placeholder="O que essa ação faz"
                value={draft.description ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
                onKeyDown={(e) => e.stopPropagation()}
                maxLength={500}
              />
            </div>
            <div>
              <Label htmlFor="na-amount">Custo</Label>
              <Input
                id="na-amount"
                inputMode="numeric"
                value={String(draft.amount)}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    amount: Math.max(
                      0,
                      parseInt(e.target.value.replace(/[^0-9]/g, "") || "0", 10),
                    ),
                  }))
                }
                onKeyDown={(e) => e.stopPropagation()}
                className="text-right font-mono"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addNew} disabled={upsertMut.isPending}>
                <Plus className="size-4 mr-1" /> Adicionar
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Chaves usadas pelo sistema:{" "}
            <span className="font-mono">oracle_message</span>,{" "}
            <span className="font-mono">report_personality</span>,{" "}
            <span className="font-mono">report_love</span>,{" "}
            <span className="font-mono">report_career</span>,{" "}
            <span className="font-mono">report_spiritual</span>,{" "}
            <span className="font-mono">tarot_reading</span>,{" "}
            <span className="font-mono">astro_chart</span>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
