import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Pencil, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { confirmDialog } from "@/components/system-feedback";
import {
  adminListCreditPackages,
  adminUpsertCreditPackage,
  adminDeleteCreditPackage,
} from "@/lib/credits.functions";
import type { CreditTx } from "@/components/CreditHistoryTable";

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  credits: number;
  price_cents: number;
  currency: string;
  active: boolean;
  sort_order: number;
};

const empty: Pkg = {
  id: "",
  name: "",
  description: "",
  credits: 10,
  price_cents: 1990,
  currency: "BRL",
  active: true,
  sort_order: 0,
};

function formatPrice(cents: number, currency: string) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  });
}

export function AdminCreditPackages() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListCreditPackages);
  const upsertFn = useServerFn(adminUpsertCreditPackage);
  const deleteFn = useServerFn(adminDeleteCreditPackage);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-credit-packages"],
    queryFn: () => listFn(),
  });

  const [editing, setEditing] = useState<Pkg | null>(null);

  const upsertMut = useMutation({
    mutationFn: (p: Pkg) =>
      upsertFn({
        data: {
          id: p.id || undefined,
          name: p.name.trim(),
          description: p.description?.trim() || null,
          credits: p.credits,
          price_cents: p.price_cents,
          currency: p.currency || "BRL",
          active: p.active,
          sort_order: p.sort_order,
        },
      }),
    onSuccess: () => {
      toast.success("Pacote salvo.");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-credit-packages"] });
      qc.invalidateQueries({ queryKey: ["credit-packages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Pacote removido.");
      qc.invalidateQueries({ queryKey: ["admin-credit-packages"] });
      qc.invalidateQueries({ queryKey: ["credit-packages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-5 text-gold" /> Pacotes de créditos
            </CardTitle>
            <CardDescription>
              Configure pacotes avulsos vendidos pelo super admin. O saldo é lançado
              automaticamente no usuário escolhido em &quot;Gerenciar créditos&quot;.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setEditing({ ...empty })}>
            <Plus className="size-4 mr-1" /> Novo pacote
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : !data?.packages.length ? (
          <div className="text-sm text-muted-foreground">
            Nenhum pacote cadastrado ainda.
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Pacote</th>
                  <th className="px-3 py-2 font-medium text-right">Créditos</th>
                  <th className="px-3 py-2 font-medium text-right">Preço</th>
                  <th className="px-3 py-2 font-medium text-center">Ativo</th>
                  <th className="px-3 py-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.packages.map((p: Pkg | CreditTx | any) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">{p.name}</div>
                      {p.description && (
                        <div className="text-xs text-muted-foreground">
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{p.credits}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatPrice(p.price_cents, p.currency)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {p.active ? (
                        <span className="text-xs text-emerald-500">Ativo</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Inativo</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setEditing({
                              ...empty,
                              ...p,
                              description: p.description ?? "",
                            })
                          }
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const ok = await confirmDialog({
                              title: "Remover pacote?",
                              description: `O pacote "${p.name}" deixará de aparecer para venda.`,
                              confirmText: "Remover",
                              destructive: true,
                            });
                            if (ok) deleteMut.mutate(p.id);
                          }}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {editing.id ? "Editar pacote" : "Novo pacote"}
                </DialogTitle>
                <DialogDescription>
                  Defina nome, quantidade de créditos e preço cobrado.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="pkg-name">Nome</Label>
                  <Input
                    id="pkg-name"
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    maxLength={120}
                  />
                </div>
                <div>
                  <Label htmlFor="pkg-desc">Descrição</Label>
                  <Textarea
                    id="pkg-desc"
                    rows={2}
                    value={editing.description ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, description: e.target.value })
                    }
                    maxLength={500}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="pkg-credits">Créditos</Label>
                    <Input
                      id="pkg-credits"
                      inputMode="numeric"
                      value={String(editing.credits)}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          credits: parseInt(e.target.value.replace(/\D/g, "") || "0", 10),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="pkg-price">Preço (R$)</Label>
                    <Input
                      id="pkg-price"
                      inputMode="decimal"
                      value={(editing.price_cents / 100).toFixed(2)}
                      onChange={(e) => {
                        const v = e.target.value.replace(",", ".");
                        const n = Math.round(parseFloat(v || "0") * 100);
                        setEditing({
                          ...editing,
                          price_cents: Number.isFinite(n) ? Math.max(0, n) : 0,
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pkg-order">Ordem</Label>
                    <Input
                      id="pkg-order"
                      inputMode="numeric"
                      value={String(editing.sort_order)}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          sort_order: parseInt(e.target.value.replace(/\D/g, "") || "0", 10),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    id="pkg-active"
                    checked={editing.active}
                    onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                  />
                  <Label htmlFor="pkg-active" className="text-sm">
                    Pacote ativo (disponível para venda)
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (!editing.name.trim()) {
                      return toast.error("Informe o nome do pacote.");
                    }
                    if (editing.credits <= 0) {
                      return toast.error("Créditos devem ser maiores que zero.");
                    }
                    upsertMut.mutate(editing);
                  }}
                  disabled={upsertMut.isPending}
                >
                  <Save className="size-4 mr-1" />
                  {upsertMut.isPending ? "Salvando…" : "Salvar"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
