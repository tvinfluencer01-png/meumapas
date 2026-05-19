import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Users, Plus, Pencil, Trash2, Star, StarOff, Phone, Mail, Tag,
  Sparkles, Lock, ShoppingCart, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  listClientProfiles, upsertClientProfile, deleteClientProfile, setActiveClientProfile,
} from "@/lib/client-profiles.functions";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Cosmic AI" }] }),
  component: ClientesPage,
});

type ClientProfile = {
  id: string;
  full_name: string;
  birth_date: string;
  birth_time: string | null;
  time_unknown: boolean;
  city: string;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  email: string | null;
  phone: string | null;
  tags: string[];
  notes: string | null;
  avatar_url: string | null;
};

function ClientesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listClientProfiles);
  const upsertFn = useServerFn(upsertClientProfile);
  const deleteFn = useServerFn(deleteClientProfile);
  const activateFn = useServerFn(setActiveClientProfile);

  const { data, isLoading } = useQuery({
    queryKey: ["client-profiles"],
    queryFn: () => listFn(),
  });

  const [editing, setEditing] = useState<ClientProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<ClientProfile | null>(null);
  const [search, setSearch] = useState("");

  const profiles = (data?.profiles ?? []) as ClientProfile[];
  const activeId = data?.active_client_profile_id ?? null;
  const hasAddon = !!data?.has_addon;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) =>
      [p.full_name, p.email, p.phone, p.city, ...(p.tags ?? [])]
        .filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [profiles, search]);

  const activateMut = useMutation({
    mutationFn: (id: string | null) => activateFn({ data: { id } }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["client-profiles"] });
      qc.invalidateQueries({ queryKey: ["active-subject"] });
      toast.success(id ? "Cliente ativo selecionado." : "Modo perfil pessoal ativado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-profiles"] });
      qc.invalidateQueries({ queryKey: ["active-subject"] });
      toast.success("Cliente removido.");
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    if (!hasAddon && profiles.length >= 1) {
      toast.error("Assine o add-on Astrólogo & Numerólogo para cadastrar clientes ilimitados.");
      return;
    }
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(p: ClientProfile) {
    setEditing(p);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="size-6 text-gold" />
          <div>
            <h1 className="text-2xl font-serif shimmer-text">Clientes</h1>
            <p className="text-sm text-muted-foreground">
              Cadastre os perfis dos seus clientes e gere mapa, numerologia, oráculo e relatórios para cada um.
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" /> Novo cliente
        </Button>
      </header>

      {!hasAddon && (
        <Card className="border-gold/30 bg-gradient-to-br from-gold/5 to-card">
          <CardHeader>
            <div className="flex items-center gap-2 text-gold">
              <Sparkles className="size-5" />
              <CardTitle className="font-serif">Add-on Astrólogo & Numerólogo</CardTitle>
            </div>
            <CardDescription>
              Sem o add-on você pode cadastrar 1 cliente. Assine para gerenciar clientes
              ilimitados, com mapa, numerologia, relatórios temáticos, oráculo e tarot
              contextualizados — tudo ilimitado por cliente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="gap-2">
              <Link to="/addons">
                <ShoppingCart className="size-4" /> Ver add-on (R$ 99,90/mês)
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, e-mail, telefone, cidade, tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {activeId && (
          <Button
            variant="outline" size="sm"
            onClick={() => activateMut.mutate(null)}
            disabled={activateMut.isPending}
          >
            <StarOff className="size-4 mr-2" /> Voltar ao perfil pessoal
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          {profiles.length === 0
            ? "Nenhum cliente cadastrado ainda. Clique em \"Novo cliente\" para começar."
            : "Nenhum cliente corresponde à busca."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const isActive = p.id === activeId;
            return (
              <Card key={p.id} className={isActive ? "border-gold/50 shadow-md shadow-gold/10" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="font-serif text-lg truncate">{p.full_name}</CardTitle>
                      <CardDescription>
                        {new Date(p.birth_date + "T00:00:00").toLocaleDateString("pt-BR")}
                        {p.birth_time && !p.time_unknown ? ` · ${p.birth_time.slice(0,5)}` : ""}
                        {" · "}{p.city}
                      </CardDescription>
                    </div>
                    {isActive && (
                      <Badge className="bg-gold text-background hover:bg-gold shrink-0">Ativo</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {p.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="size-3.5 shrink-0" /> <span className="truncate">{p.email}</span>
                    </div>
                  )}
                  {p.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="size-3.5 shrink-0" /> {p.phone}
                    </div>
                  )}
                  {p.tags && p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {p.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="gap-1 text-[10px]">
                          <Tag className="size-3" />{t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-3">
                    {!isActive ? (
                      <Button
                        size="sm" variant="default" className="gap-1"
                        onClick={() => activateMut.mutate(p.id)}
                        disabled={activateMut.isPending}
                      >
                        <Star className="size-3.5" /> Ativar
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled className="gap-1">
                        <Star className="size-3.5 fill-gold text-gold" /> Em uso
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)} className="gap-1">
                      <Pencil className="size-3.5" /> Editar
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={() => setDeleting(p)}
                    >
                      <Trash2 className="size-3.5" /> Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ProfileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSubmit={async (payload) => {
          try {
            await upsertFn({ data: payload });
            qc.invalidateQueries({ queryKey: ["client-profiles"] });
            qc.invalidateQueries({ queryKey: ["active-subject"] });
            toast.success(editing ? "Cliente atualizado." : "Cliente criado.");
            setDialogOpen(false);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Erro ao salvar");
          }
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove permanentemente o cliente "{deleting?.full_name}".
              Os relatórios já gerados continuam acessíveis no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMut.mutate(deleting.id)}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProfileDialog({
  open, onOpenChange, editing, onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ClientProfile | null;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {editing ? "Editar cliente" : "Novo cliente"}
          </DialogTitle>
          <DialogDescription>
            Dados de nascimento alimentam o mapa astral e a numerologia. CRM é opcional.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const tagsStr = String(f.get("tags") || "").trim();
            const tags = tagsStr ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean) : [];
            const time_unknown = f.get("time_unknown") === "on";
            const latStr = String(f.get("latitude") || "").trim();
            const lonStr = String(f.get("longitude") || "").trim();
            const payload: Record<string, unknown> = {
              id: editing?.id,
              full_name: String(f.get("full_name") || ""),
              birth_date: String(f.get("birth_date") || ""),
              birth_time: time_unknown ? null : (String(f.get("birth_time") || "") || null),
              time_unknown,
              city: String(f.get("city") || ""),
              country: String(f.get("country") || "") || null,
              latitude: latStr ? Number(latStr) : null,
              longitude: lonStr ? Number(lonStr) : null,
              timezone: String(f.get("timezone") || "") || null,
              email: String(f.get("email") || "") || null,
              phone: String(f.get("phone") || "") || null,
              tags,
              notes: String(f.get("notes") || "") || null,
            };
            setSubmitting(true);
            try { await onSubmit(payload); } finally { setSubmitting(false); }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo *" required>
              <Input name="full_name" defaultValue={editing?.full_name ?? ""} required />
            </Field>
            <Field label="Data de nascimento *" required>
              <Input name="birth_date" type="date" defaultValue={editing?.birth_date ?? ""} required />
            </Field>
            <Field label="Hora de nascimento">
              <Input name="birth_time" type="time" defaultValue={editing?.birth_time?.slice(0,5) ?? ""} />
            </Field>
            <Field label=" ">
              <label className="flex items-center gap-2 text-sm pt-2">
                <Checkbox
                  id="time_unknown" name="time_unknown"
                  defaultChecked={editing?.time_unknown ?? false}
                />
                <span>Hora desconhecida</span>
              </label>
            </Field>
            <Field label="Cidade *" required>
              <Input name="city" defaultValue={editing?.city ?? ""} required />
            </Field>
            <Field label="País">
              <Input name="country" defaultValue={editing?.country ?? ""} />
            </Field>
            <Field label="Latitude">
              <Input name="latitude" type="number" step="any" defaultValue={editing?.latitude ?? ""} />
            </Field>
            <Field label="Longitude">
              <Input name="longitude" type="number" step="any" defaultValue={editing?.longitude ?? ""} />
            </Field>
            <Field label="Fuso (ex.: America/Sao_Paulo)">
              <Input name="timezone" defaultValue={editing?.timezone ?? ""} />
            </Field>
            <Field label="E-mail">
              <Input name="email" type="email" defaultValue={editing?.email ?? ""} />
            </Field>
            <Field label="Telefone">
              <Input name="phone" defaultValue={editing?.phone ?? ""} />
            </Field>
            <Field label="Tags (separe por vírgula)">
              <Input name="tags" defaultValue={(editing?.tags ?? []).join(", ")} />
            </Field>
          </div>
          <Field label="Anotações">
            <Textarea name="notes" rows={3} defaultValue={editing?.notes ?? ""} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando…" : (editing ? "Salvar alterações" : "Criar cliente")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className={required ? "" : "text-muted-foreground"}>{label}</Label>
      {children}
    </div>
  );
}
