// FASE 4D — Admin: Gamificação (Níveis, Badges, Missões, Leaderboard).
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listLevels, upsertLevel, deleteLevel,
  listBadges, upsertBadge, deleteBadge,
  listMissions, upsertMission, deleteMission,
  getLeaderboard,
} from "../gamification.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Trash2, Pencil, Plus, Loader2, Trophy, Medal, Target, Layers } from "lucide-react";
import { toast } from "sonner";

const brl = (c: number) => `R$ ${((c ?? 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// ═══════════════════════════ Levels ═══════════════════════════
export function LevelsSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(listLevels);
  const upsertFn = useServerFn(upsertLevel);
  const delFn = useServerFn(deleteLevel);
  const { data, isLoading } = useQuery({ queryKey: ["aff-levels"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const save = useMutation({
    mutationFn: (payload: any) => upsertFn({ data: payload }),
    onSuccess: () => { toast.success("Nível salvo"); qc.invalidateQueries({ queryKey: ["aff-levels"] }); setOpen(false); setEdit(null); },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["aff-levels"] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><Layers className="size-5" /> Níveis</h2>
          <p className="text-sm text-muted-foreground">Faixas de progressão do afiliado (bônus em basis points).</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEdit(null); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> Novo nível</Button></DialogTrigger>
          <LevelDialog initial={edit} onSave={(p) => save.mutate(p)} saving={save.isPending} />
        </Dialog>
      </div>

      {isLoading ? <Loader2 className="animate-spin" /> : (
        <div className="grid gap-2">
          {(data ?? []).map((l: any) => (
            <Card key={l.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-6 h-6 rounded-full" style={{ background: l.color ?? "#D4AF37" }} />
                <div className="flex-1">
                  <div className="font-medium">{l.name} <span className="text-xs text-muted-foreground">({l.slug})</span></div>
                  <div className="text-xs text-muted-foreground">
                    ≥ {l.min_points} pts • ≥ {brl(l.min_revenue_cents)} • ≥ {l.min_conversions} conv • bônus +{(l.commission_bonus_bps / 100).toFixed(2)}%
                  </div>
                </div>
                <Badge variant={l.active ? "default" : "secondary"}>{l.active ? "Ativo" : "Inativo"}</Badge>
                <Button size="icon" variant="ghost" onClick={() => { setEdit(l); setOpen(true); }}><Pencil className="size-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(l.id)}><Trash2 className="size-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function LevelDialog({ initial, onSave, saving }: any) {
  const [f, setF] = useState({
    id: initial?.id, slug: initial?.slug ?? "",
    name: initial?.name ?? "", description: initial?.description ?? "",
    min_points: initial?.min_points ?? 0, min_revenue_cents: initial?.min_revenue_cents ?? 0,
    min_conversions: initial?.min_conversions ?? 0, commission_bonus_bps: initial?.commission_bonus_bps ?? 0,
    color: initial?.color ?? "#D4AF37", icon: initial?.icon ?? "medal",
    sort_order: initial?.sort_order ?? 1, active: initial?.active ?? true,
  });
  const n = (v: string) => Number(v || 0);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Editar nível" : "Novo nível"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Slug</Label><Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></div>
          <div><Label>Nome</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        </div>
        <div><Label>Descrição</Label><Textarea rows={2} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Min. Pontos</Label><Input type="number" value={f.min_points} onChange={(e) => setF({ ...f, min_points: n(e.target.value) })} /></div>
          <div><Label>Min. Receita (centavos)</Label><Input type="number" value={f.min_revenue_cents} onChange={(e) => setF({ ...f, min_revenue_cents: n(e.target.value) })} /></div>
          <div><Label>Min. Conversões</Label><Input type="number" value={f.min_conversions} onChange={(e) => setF({ ...f, min_conversions: n(e.target.value) })} /></div>
          <div><Label>Bônus (bps)</Label><Input type="number" value={f.commission_bonus_bps} onChange={(e) => setF({ ...f, commission_bonus_bps: n(e.target.value) })} /></div>
          <div><Label>Ordem</Label><Input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: n(e.target.value) })} /></div>
          <div><Label>Cor</Label><Input type="color" value={f.color ?? "#D4AF37"} onChange={(e) => setF({ ...f, color: e.target.value })} /></div>
        </div>
        <div className="flex items-center gap-2"><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /><span className="text-sm">Ativo</span></div>
      </div>
      <DialogFooter><Button onClick={() => onSave(f)} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}</Button></DialogFooter>
    </DialogContent>
  );
}

// ═══════════════════════════ Badges ═══════════════════════════
export function BadgesSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBadges);
  const upsertFn = useServerFn(upsertBadge);
  const delFn = useServerFn(deleteBadge);
  const { data, isLoading } = useQuery({ queryKey: ["aff-badges"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const save = useMutation({
    mutationFn: (payload: any) => upsertFn({ data: payload }),
    onSuccess: () => { toast.success("Badge salvo"); qc.invalidateQueries({ queryKey: ["aff-badges"] }); setOpen(false); setEdit(null); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["aff-badges"] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><Medal className="size-5" /> Badges</h2>
          <p className="text-sm text-muted-foreground">Conquistas concedidas automaticamente ao atingir critérios.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEdit(null); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> Novo badge</Button></DialogTrigger>
          <BadgeDialog initial={edit} onSave={(p) => save.mutate(p)} saving={save.isPending} />
        </Dialog>
      </div>
      {isLoading ? <Loader2 className="animate-spin" /> : (
        <div className="grid gap-2 md:grid-cols-2">
          {(data ?? []).map((b: any) => (
            <Card key={b.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded flex items-center justify-center text-white text-xs" style={{ background: b.color ?? "#D4AF37" }}>{b.slug.slice(0, 2)}</div>
                <div className="flex-1">
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.description}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Critério: <code>{JSON.stringify(b.criteria)}</code> • +{b.points_reward} pts • <span className="capitalize">{b.rarity}</span></div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => { setEdit(b); setOpen(true); }}><Pencil className="size-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(b.id)}><Trash2 className="size-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function BadgeDialog({ initial, onSave, saving }: any) {
  const [f, setF] = useState({
    id: initial?.id, slug: initial?.slug ?? "",
    name: initial?.name ?? "", description: initial?.description ?? "",
    icon: initial?.icon ?? "sparkles", color: initial?.color ?? "#D4AF37",
    criteria_metric: initial?.criteria?.metric ?? "conversions",
    criteria_gte: initial?.criteria?.gte ?? 1,
    points_reward: initial?.points_reward ?? 0,
    rarity: initial?.rarity ?? "common", active: initial?.active ?? true,
  });
  const submit = () => onSave({
    id: f.id, slug: f.slug, name: f.name, description: f.description,
    icon: f.icon, color: f.color, points_reward: Number(f.points_reward),
    rarity: f.rarity, active: f.active,
    criteria: { metric: f.criteria_metric, gte: Number(f.criteria_gte) },
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Editar badge" : "Novo badge"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Slug</Label><Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></div>
          <div><Label>Nome</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        </div>
        <div><Label>Descrição</Label><Textarea rows={2} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label>Métrica</Label>
            <Select value={f.criteria_metric} onValueChange={(v) => setF({ ...f, criteria_metric: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conversions">Conversões</SelectItem>
                <SelectItem value="revenue_cents">Receita (cents)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>≥</Label><Input type="number" value={f.criteria_gte} onChange={(e) => setF({ ...f, criteria_gte: Number(e.target.value) })} /></div>
          <div><Label>Pontos</Label><Input type="number" value={f.points_reward} onChange={(e) => setF({ ...f, points_reward: Number(e.target.value) })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Raridade</Label>
            <Select value={f.rarity} onValueChange={(v) => setF({ ...f, rarity: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["common", "uncommon", "rare", "epic", "legendary"].map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Cor</Label><Input type="color" value={f.color ?? "#D4AF37"} onChange={(e) => setF({ ...f, color: e.target.value })} /></div>
        </div>
        <div className="flex items-center gap-2"><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /><span className="text-sm">Ativo</span></div>
      </div>
      <DialogFooter><Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}</Button></DialogFooter>
    </DialogContent>
  );
}

// ═══════════════════════════ Missions ═══════════════════════════
export function MissionsSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMissions);
  const upsertFn = useServerFn(upsertMission);
  const delFn = useServerFn(deleteMission);
  const { data, isLoading } = useQuery({ queryKey: ["aff-missions"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const save = useMutation({
    mutationFn: (p: any) => upsertFn({ data: p }),
    onSuccess: () => { toast.success("Missão salva"); qc.invalidateQueries({ queryKey: ["aff-missions"] }); setOpen(false); setEdit(null); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["aff-missions"] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><Target className="size-5" /> Missões</h2>
          <p className="text-sm text-muted-foreground">Desafios com recompensa em pontos e/ou bônus em dinheiro.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEdit(null); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> Nova missão</Button></DialogTrigger>
          <MissionDialog initial={edit} onSave={(p) => save.mutate(p)} saving={save.isPending} />
        </Dialog>
      </div>
      {isLoading ? <Loader2 className="animate-spin" /> : (
        <div className="grid gap-2">
          {(data ?? []).map((m: any) => (
            <Card key={m.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium">{m.title} <Badge variant="outline" className="ml-2 capitalize">{m.mission_type}</Badge></div>
                  <div className="text-xs text-muted-foreground">Meta: {m.goal_value} {m.goal_metric} • Recompensa: {m.points_reward} pts + {brl(m.bonus_cents)}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(m.starts_at).toLocaleString("pt-BR")} → {new Date(m.ends_at).toLocaleString("pt-BR")}</div>
                </div>
                <Badge variant={m.active ? "default" : "secondary"}>{m.active ? "Ativa" : "Inativa"}</Badge>
                <Button size="icon" variant="ghost" onClick={() => { setEdit(m); setOpen(true); }}><Pencil className="size-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(m.id)}><Trash2 className="size-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function toLocalInput(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function MissionDialog({ initial, onSave, saving }: any) {
  const [f, setF] = useState({
    id: initial?.id,
    slug: initial?.slug ?? "",
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    mission_type: initial?.mission_type ?? "weekly",
    goal_metric: initial?.goal_metric ?? "conversions",
    goal_value: initial?.goal_value ?? 10,
    points_reward: initial?.points_reward ?? 100,
    bonus_cents: initial?.bonus_cents ?? 0,
    starts_at: toLocalInput(initial?.starts_at),
    ends_at: toLocalInput(initial?.ends_at ?? new Date(Date.now() + 7 * 864e5).toISOString()),
    active: initial?.active ?? true,
  });
  const submit = () => onSave({
    ...f,
    goal_value: Number(f.goal_value),
    points_reward: Number(f.points_reward),
    bonus_cents: Number(f.bonus_cents),
    starts_at: new Date(f.starts_at).toISOString(),
    ends_at: new Date(f.ends_at).toISOString(),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Editar missão" : "Nova missão"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Slug</Label><Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></div>
          <div><Label>Título</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        </div>
        <div><Label>Descrição</Label><Textarea rows={2} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Tipo</Label>
            <Select value={f.mission_type} onValueChange={(v) => setF({ ...f, mission_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["daily", "weekly", "monthly", "campaign"].map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Métrica</Label>
            <Select value={f.goal_metric} onValueChange={(v) => setF({ ...f, goal_metric: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conversions">Conversões</SelectItem>
                <SelectItem value="revenue_cents">Receita (cents)</SelectItem>
                <SelectItem value="clicks">Cliques</SelectItem>
                <SelectItem value="signups">Cadastros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label>Meta</Label><Input type="number" value={f.goal_value} onChange={(e) => setF({ ...f, goal_value: Number(e.target.value) })} /></div>
          <div><Label>Pontos</Label><Input type="number" value={f.points_reward} onChange={(e) => setF({ ...f, points_reward: Number(e.target.value) })} /></div>
          <div><Label>Bônus (cents)</Label><Input type="number" value={f.bonus_cents} onChange={(e) => setF({ ...f, bonus_cents: Number(e.target.value) })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Início</Label><Input type="datetime-local" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} /></div>
          <div><Label>Fim</Label><Input type="datetime-local" value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} /></div>
        </div>
        <div className="flex items-center gap-2"><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /><span className="text-sm">Ativa</span></div>
      </div>
      <DialogFooter><Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}</Button></DialogFooter>
    </DialogContent>
  );
}

// ═══════════════════════════ Leaderboard ═══════════════════════════
export function LeaderboardSection() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "alltime">("monthly");
  const [metric, setMetric] = useState<"revenue" | "conversions" | "points">("revenue");
  const fn = useServerFn(getLeaderboard);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["aff-leaderboard", period, metric],
    queryFn: () => fn({ data: { period, metric } }),
  });
  const rows = (data?.rankings ?? []) as any[];
  const fmt = (v: number) => metric === "revenue" ? brl(v) : String(v);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><Trophy className="size-5" /> Ranking</h2>
          <p className="text-sm text-muted-foreground">Top afiliados em tempo real por período e métrica.</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Hoje</SelectItem>
              <SelectItem value="weekly">Semana</SelectItem>
              <SelectItem value="monthly">Mês</SelectItem>
              <SelectItem value="alltime">Total</SelectItem>
            </SelectContent>
          </Select>
          <Select value={metric} onValueChange={(v: any) => setMetric(v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Receita</SelectItem>
              <SelectItem value="conversions">Conversões</SelectItem>
              <SelectItem value="points">Pontos</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>{isFetching ? <Loader2 className="size-4 animate-spin" /> : "Atualizar"}</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-6"><Loader2 className="animate-spin" /></div> : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">Sem dados para o período.</div>
          ) : (
            <div className="divide-y">
              {rows.map((r) => (
                <div key={r.affiliate_id} className="flex items-center gap-3 p-3">
                  <div className="w-10 text-center font-bold">
                    {r.position === 1 ? "🥇" : r.position === 2 ? "🥈" : r.position === 3 ? "🥉" : `#${r.position}`}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{r.display_name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{r.code}</div>
                  </div>
                  <div className="font-mono">{fmt(r.value)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
