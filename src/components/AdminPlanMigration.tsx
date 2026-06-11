import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRightLeft, Search, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { migrateUserAddon, adminListAllActiveSubscriptions } from "@/lib/admin.functions";
import { listAdminAddons } from "@/lib/addon-settings.functions";
import { confirmDialog } from "@/components/system-feedback";

export function AdminPlanMigration() {
  const qc = useQueryClient();
  const listSubsFn = useServerFn(adminListAllActiveSubscriptions);
  const listAddonsFn = useServerFn(listAdminAddons);
  const migrateFn = useServerFn(migrateUserAddon);

  const [search, setSearch] = useState("");
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [newAddonId, setNewAddonId] = useState("");
  const [preserveDates, setPreserveDates] = useState(true);

  const { data: subs, isLoading: loadingSubs } = useQuery({
    queryKey: ["admin-all-active-subs"],
    queryFn: () => listSubsFn(),
  });

  const { data: addons, isLoading: loadingAddons } = useQuery({
    queryKey: ["admin-addons"],
    queryFn: () => listAddonsFn(),
  });

  const migrateMut = useMutation({
    mutationFn: (vars: { target_user_id: string; old_addon_id: string; new_addon_id: string; preserve_dates: boolean }) =>
      migrateFn({ data: vars }),
    onSuccess: () => {
      toast.success("Plano migrado com sucesso.");
      setSelectedSub(null);
      setNewAddonId("");
      qc.invalidateQueries({ queryKey: ["admin-all-active-subs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredSubs = (subs || []).filter(s => 
    s.addon_id.toLowerCase().includes(search.toLowerCase()) || 
    (s.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleMigrate() {
    if (!selectedSub || !newAddonId) return;

    const newAddonName = addons?.find(a => a.addon_id === newAddonId)?.effective.name || newAddonId;

    const ok = await confirmDialog({
      title: "Confirmar migração de plano?",
      description: `O usuário ${selectedSub.full_name || selectedSub.user_id} será movido de "${selectedSub.addon_id}" para "${newAddonName}".`,
      confirmText: "Migrar Agora",
    });

    if (ok) {
      migrateMut.mutate({
        target_user_id: selectedSub.user_id,
        old_addon_id: selectedSub.addon_id,
        new_addon_id: newAddonId,
        preserve_dates: preserveDates,
      });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="size-5 text-gold" /> Assinaturas Ativas
          </CardTitle>
          <CardDescription>
            Busque o usuário ou plano que deseja migrar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input 
            placeholder="Buscar por nome ou plano..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          
          <div className="rounded-md border border-border max-h-[400px] overflow-y-auto">
            {loadingSubs ? (
              <div className="p-10 text-center text-muted-foreground"><Loader2 className="size-6 animate-spin mx-auto mb-2" /> Carregando...</div>
            ) : filteredSubs.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">Nenhuma assinatura encontrada.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Usuário</th>
                    <th className="px-3 py-2 text-left">Plano Atual</th>
                    <th className="px-3 py-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSubs.map(s => (
                    <tr key={s.id} className={selectedSub?.id === s.id ? "bg-gold/5" : ""}>
                      <td className="px-3 py-2 font-medium">{s.full_name || "Sem nome"}</td>
                      <td className="px-3 py-2 text-xs font-mono">{s.addon_id}</td>
                      <td className="px-3 py-2 text-right">
                        <Button 
                          size="sm" 
                          variant={selectedSub?.id === s.id ? "secondary" : "outline"}
                          onClick={() => setSelectedSub(s)}
                        >
                          Selecionar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className={!selectedSub ? "opacity-60 grayscale pointer-events-none" : "border-gold/30"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-5 text-gold" /> Configurar Migração
          </CardTitle>
          <CardDescription>
            Escolha o novo destino para o usuário selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedSub && (
            <div className="p-3 rounded-lg bg-secondary/30 border border-border flex items-start gap-3">
              <AlertCircle className="size-5 text-gold shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Migrando usuário:</p>
                <p className="text-xs text-muted-foreground">{selectedSub.full_name} ({selectedSub.user_id})</p>
                <p className="text-xs text-muted-foreground mt-1">Plano de origem: <span className="font-mono">{selectedSub.addon_id}</span></p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Novo Plano de Destino</Label>
            <Select value={newAddonId} onValueChange={setNewAddonId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o novo plano..." />
              </SelectTrigger>
              <SelectContent>
                {addons?.filter(a => a.addon_id !== selectedSub?.addon_id).map(a => (
                  <SelectItem key={a.addon_id} value={a.addon_id}>
                    {a.effective.name} ({a.addon_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="space-y-0.5">
              <Label>Preservar Ciclo de Faturamento</Label>
              <p className="text-xs text-muted-foreground italic">
                Mantém a data de expiração atual do plano. Se desativado, inicia um novo ciclo agora.
              </p>
            </div>
            <Switch checked={preserveDates} onCheckedChange={setPreserveDates} />
          </div>

          <Button 
            className="w-full bg-gold text-primary-foreground hover:bg-gold-glow"
            disabled={!newAddonId || migrateMut.isPending}
            onClick={handleMigrate}
          >
            {migrateMut.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle2 className="size-4 mr-2" />}
            Executar Migração
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
