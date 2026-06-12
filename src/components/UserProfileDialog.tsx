import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, User as UserIcon, KeyRound, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const schema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  birth_time: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UserProfileDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    birth_date: "",
    birth_time: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["user-profile-dialog", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const [{ data: profile }, { data: births }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle(),
        supabase
          .from("birth_data")
          .select("id, full_name, birth_date, birth_time, is_primary, created_at")
          .eq("user_id", user!.id)
          .order("is_primary", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      const birth = births?.[0] ?? null;
      return { profile, birth };
    },
  });

  useEffect(() => {
    if (!open || !user) return;
    setForm({
      full_name: data?.birth?.full_name ?? data?.profile?.full_name ?? "",
      email: user.email ?? "",
      birth_date: data?.birth?.birth_date ?? "",
      birth_time: (data?.birth?.birth_time ?? "").slice(0, 5),
    });
  }, [open, user, data]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      // 1. Profile
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ full_name: parsed.data.full_name })
        .eq("id", user.id);
      if (pErr) throw pErr;

      // 2. Birth data (upsert primary)
      if (data?.birth?.id) {
        const { error: bErr } = await supabase
          .from("birth_data")
          .update({
            full_name: parsed.data.full_name,
            birth_date: parsed.data.birth_date,
            birth_time: parsed.data.birth_time || null,
            is_primary: true,
          })
          .eq("id", data.birth.id);
        if (bErr) throw bErr;
        // Garante apenas um registro primário
        await supabase
          .from("birth_data")
          .update({ is_primary: false })
          .eq("user_id", user.id)
          .neq("id", data.birth.id);
      } else {
        // Desmarca quaisquer outros primários antes de inserir
        await supabase
          .from("birth_data")
          .update({ is_primary: false })
          .eq("user_id", user.id);
        const { error: bErr } = await supabase.from("birth_data").insert({
          user_id: user.id,
          full_name: parsed.data.full_name,
          birth_date: parsed.data.birth_date,
          birth_time: parsed.data.birth_time || null,
          city: "—",
          is_primary: true,
        });
        if (bErr) throw bErr;
      }

      // 3. Email (only if changed)
      if (parsed.data.email !== user.email) {
        const { error: eErr } = await supabase.auth.updateUser({ email: parsed.data.email });
        if (eErr) throw eErr;
        toast.info("Enviamos um link de confirmação para o novo e-mail.");
      }

      toast.success("Perfil atualizado!");
      qc.invalidateQueries({ queryKey: ["birth"] });
      qc.invalidateQueries({ queryKey: ["user-profile-dialog"] });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-xl text-gold">
            <UserIcon className="size-5" /> Meu perfil
          </DialogTitle>
          <DialogDescription>
            Atualize seu nome, e-mail e dados de nascimento usados nos cálculos.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="size-6 animate-spin text-gold" />
          </div>
        ) : (
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary/40">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="senha">
                <KeyRound className="size-3.5 mr-1.5" /> Senha
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="mt-4">
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <Label htmlFor="up_name" className="text-stardust">Nome completo</Label>
                  <Input
                    id="up_name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    maxLength={120}
                    className="mt-1 bg-input border-border"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="up_email" className="text-stardust">E-mail</Label>
                  <Input
                    id="up_email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    maxLength={255}
                    className="mt-1 bg-input border-border"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="up_date" className="text-stardust">Nascimento</Label>
                    <Input
                      id="up_date"
                      type="date"
                      value={form.birth_date}
                      max={new Date().toISOString().slice(0, 10)}
                      min="1900-01-01"
                      onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                      className="mt-1 bg-input border-border"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="up_time" className="text-stardust">Horário</Label>
                    <Input
                      id="up_time"
                      type="time"
                      step={60}
                      value={form.birth_time}
                      onChange={(e) => setForm({ ...form, birth_time: e.target.value })}
                      className="mt-1 bg-input border-border"
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-gold text-primary-foreground hover:bg-gold-glow"
                  >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            <TabsContent value="senha" className="mt-4">
              <PasswordForm onDone={() => onOpenChange(false)} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

const passwordSchema = z
  .object({
    new_password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres")
      .max(72, "A senha é muito longa"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "As senhas não conferem",
    path: ["confirm_password"],
  });

function PasswordForm({ onDone }: { onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ new_password: "", confirm_password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: parsed.data.new_password,
      });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      setForm({ new_password: "", confirm_password: "" });
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar senha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="up_new_pwd" className="text-stardust">Nova senha</Label>
        <div className="relative mt-1">
          <Input
            id="up_new_pwd"
            type={show ? "text" : "password"}
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            minLength={8}
            maxLength={72}
            className="bg-input border-border pr-10"
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gold"
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
      </div>
      <div>
        <Label htmlFor="up_confirm_pwd" className="text-stardust">Confirmar nova senha</Label>
        <Input
          id="up_confirm_pwd"
          type={show ? "text" : "password"}
          value={form.confirm_password}
          onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
          minLength={8}
          maxLength={72}
          className="mt-1 bg-input border-border"
          autoComplete="new-password"
          required
        />
      </div>

      <DialogFooter className="gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={saving}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="bg-gold text-primary-foreground hover:bg-gold-glow"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Alterar senha"}
        </Button>
      </DialogFooter>
    </form>
  );
}
