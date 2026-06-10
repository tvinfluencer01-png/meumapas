import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Lock, User as UserIcon, ArrowLeft, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { Starfield } from "@/components/Starfield";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso — Cosmic AI" },
      { name: "description", content: "Acesse sua jornada cósmica. Entre ou crie sua conta no Cosmic AI." },
    ],
  }),
  component: AuthPage,
});

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(80),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});
const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

const SIGNIN_STEPS = [
  "Alinhando suas energias...",
  "Consultando os astros...",
  "Verificando sua identidade cósmica...",
  "Abrindo o portal estelar...",
];
const SIGNUP_STEPS = [
  "Tecendo sua assinatura cósmica...",
  "Registrando sua entrada no universo...",
  "Preparando sua jornada estelar...",
  "Acendendo sua constelação...",
];

function AuthPage() {
  const nav = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [submitting, setSubmitting] = useState(false);
  const [statusStep, setStatusStep] = useState(0);
  const [statusMode, setStatusMode] = useState<"signin" | "signup">("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    if (!loading && session) nav({ to: "/dashboard" });
  }, [session, loading, nav]);

  useEffect(() => {
    if (!submitting) {
      setStatusStep(0);
      return;
    }
    const steps = statusMode === "signup" ? SIGNUP_STEPS : SIGNIN_STEPS;
    const id = setInterval(() => {
      setStatusStep((s) => (s + 1) % steps.length);
    }, 1400);
    return () => clearInterval(id);
  }, [submitting, statusMode]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setStatusMode(mode);
    setStatusStep(0);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse(form);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: parsed.data.name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Bem-vindo ao Cosmic AI.");
      } else {
        const parsed = signInSchema.safeParse(form);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na autenticação");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setStatusMode("signin");
    setStatusStep(0);
    setSubmitting(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/dashboard",
      });
      if (r.error) throw r.error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao entrar com Google");
      setSubmitting(false);
    }
  }

  const activeSteps = statusMode === "signup" ? SIGNUP_STEPS : SIGNIN_STEPS;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Starfield count={120} />
      <div className="absolute inset-0 nebula-bg pointer-events-none" />

      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card rounded-2xl px-8 py-10 gold-glow flex flex-col items-center gap-5 max-w-sm mx-4 text-center">
            <div className="relative">
              <Logo sizeClassName="size-20" animation="loading" />
              <Loader2 className="absolute -inset-3 size-[6.5rem] text-gold/40 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="font-serif text-lg shimmer-text">
                {statusMode === "signup" ? "Criando sua conta" : "Entrando"}
              </p>
              <p key={statusStep} className="text-sm text-stardust animate-fade-in min-h-[1.25rem]">
                {activeSteps[statusStep]}
              </p>
            </div>
            <div className="flex gap-1.5">
              {activeSteps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-all ${
                    i === statusStep ? "bg-gold w-4" : "bg-gold/30"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <Link
        to="/"
        className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors"
      >
        <ArrowLeft className="size-4" /> Voltar
      </Link>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md glass-card rounded-2xl p-8 gold-glow">
          <div className="flex flex-col items-center text-center">
            <Logo sizeClassName="size-20" animation="float" className="mb-3" />
            <h1 className="font-serif text-3xl shimmer-text">Cosmic AI</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signin" ? "Reconecte-se à sua jornada." : "Comece sua jornada cósmica."}
            </p>
          </div>

          <form onSubmit={handleEmail} className="mt-8 space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name" className="text-stardust">Nome completo</Label>
                <div className="relative mt-1">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="name" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="pl-9 bg-input border-border" placeholder="Como você assina"
                    required maxLength={80}
                  />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-stardust">E-mail</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="email" type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="pl-9 bg-input border-border" placeholder="voce@exemplo.com"
                  required autoComplete="email" maxLength={255}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password" className="text-stardust">Senha</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="password" type="password" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pl-9 bg-input border-border" placeholder="••••••••"
                  required autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  minLength={mode === "signup" ? 8 : 1} maxLength={72}
                />
              </div>
            </div>

            <Button type="submit" disabled={submitting}
              className="w-full bg-gold text-primary-foreground hover:bg-gold-glow transition-all font-medium">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : (mode === "signin" ? "Entrar" : "Criar conta")}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>

          <Button onClick={handleGoogle} disabled={submitting} variant="outline"
            className="w-full border-border bg-secondary/40 hover:bg-secondary text-stardust">
            <svg className="size-4 mr-2" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 11v3.2h7.4c-.3 1.6-2.2 4.8-7.4 4.8-4.4 0-8-3.6-8-8s3.6-8 8-8c2.5 0 4.2 1.1 5.2 2l3.5-3.4C18.5 1.6 15.5 0 12 0 5.4 0 0 5.4 0 12s5.4 12 12 12c6.9 0 11.5-4.8 11.5-11.6 0-.8-.1-1.4-.2-2H12z"/></svg>
            Continuar com Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Não tem conta? " : "Já tem uma conta? "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-gold hover:underline">
              {mode === "signin" ? "Criar agora" : "Entrar"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
