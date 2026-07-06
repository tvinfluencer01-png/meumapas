import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  resendAffiliateVerification,
  verifyAffiliateWhatsapp,
} from "@/modules/affiliate/affiliate.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Sparkles, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/affiliate/login")({
  component: AffiliateLoginPage,
  head: () => ({
    meta: [
      { title: "Login do Afiliado — Affiliate Center" },
      { name: "description", content: "Acesse o painel exclusivo do Programa de Afiliados." },
    ],
  }),
});

function AffiliateLoginPage() {
  const navigate = useNavigate();
  const resendFn = useServerFn(resendAffiliateVerification);
  const verifyFn = useServerFn(verifyAffiliateWhatsapp);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState<
    null | { affiliateId: string; whatsappMasked: string }
  >(null);
  const [code, setCode] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Informe email e senha.");
      return;
    }
    setLoading(true);
    try {
      const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !signIn.user) throw new Error(error?.message || "Falha no login.");

      // Verifica que a conta é de afiliado
      const { data: profile } = await supabase
        .from("affiliate_profiles" as any)
        .select("id, status, whatsapp, whatsapp_verified_at")
        .eq("user_id", signIn.user.id)
        .maybeSingle();

      if (!profile) {
        await supabase.auth.signOut();
        toast.error("Esta conta não é de afiliado. Cadastre-se no Programa de Afiliados.");
        return;
      }

      const p = profile as any;
      if (!p.whatsapp_verified_at) {
        // Bloqueia acesso até confirmar WhatsApp.
        await supabase.auth.signOut();
        try {
          const res: any = await resendFn({ data: { affiliateId: p.id } });
          setNeedsVerification({
            affiliateId: p.id,
            whatsappMasked: res.whatsappMasked ?? "seu WhatsApp",
          });
          toast.warning("Confirme seu WhatsApp para liberar o acesso. Enviamos um novo código.");
        } catch (err: any) {
          setNeedsVerification({
            affiliateId: p.id,
            whatsappMasked: String(p.whatsapp ?? "").replace(/\D/g, "").replace(/^(\d{2})\d+(\d{2})$/, "$1****$2"),
          });
          toast.error(err?.message ?? "Solicite um novo código de confirmação.");
        }
        return;
      }

      const status = p.status;
      if (status && status !== "approved" && status !== "active") {
        toast.warning("Sua conta de afiliado ainda não foi aprovada. Você poderá navegar, mas ações ficam limitadas.");
      } else {
        toast.success("Bem-vindo(a) de volta!");
      }
      navigate({ to: "/affiliate/dashboard", replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!/^\d{6}$/.test(code) || !needsVerification) {
      toast.error("Digite o código de 6 dígitos.");
      return;
    }
    setLoading(true);
    try {
      await verifyFn({ data: { affiliateId: needsVerification.affiliateId, code } });
      toast.success("WhatsApp confirmado! Faça login novamente.");
      setNeedsVerification(null);
      setCode("");
    } catch (err: any) {
      toast.error(err?.message ?? "Código inválido.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!needsVerification) return;
    try {
      await resendFn({ data: { affiliateId: needsVerification.affiliateId } });
      toast.success("Novo código enviado pelo WhatsApp.");
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao reenviar código.");
    }
  }



  async function handleReset() {
    if (!email) {
      toast.error("Informe seu email para recuperar a senha.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Enviamos um link de recuperação para seu email.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-background to-background/80">
      <Card className="max-w-md w-full border-gold/40 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-gold" /> Login do Afiliado
          </CardTitle>
          <CardDescription>
            Acesso exclusivo ao painel do Programa de Afiliados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <Label>Email</Label>
              <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Senha</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-gold text-primary-foreground hover:bg-gold-glow"
              disabled={loading}
            >
              {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Entrar no painel
            </Button>
            <div className="flex items-center justify-between text-xs pt-1">
              <button type="button" onClick={handleReset} className="text-muted-foreground hover:text-gold underline">
                Esqueci a senha
              </button>
              <Link to="/affiliate/register" className="text-gold hover:underline">
                Cadastrar-me
              </Link>
            </div>
            <p className="text-[11px] text-center text-muted-foreground pt-2">
              Ainda não é afiliado?{" "}
              <Link to="/affiliate/register" className="text-gold underline">Criar conta de afiliado</Link>.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
