import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { registerAffiliate } from "@/modules/affiliate/affiliate.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { isValidCpf, normalizeCpf } from "@/modules/affiliate/lib/cpf";

export const Route = createFileRoute("/affiliate/register")({
  component: AffiliateRegisterPage,
  head: () => ({
    meta: [
      { title: "Cadastro de Afiliado — Affiliate Center" },
      { name: "description", content: "Torne-se afiliado e ganhe comissões divulgando o Mapa Astral." },
    ],
  }),
});

function AffiliateRegisterPage() {
  const navigate = useNavigate();
  const registerFn = useServerFn(registerAffiliate);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    whatsapp: "",
    cpf: "",
    password: "",
    passwordConfirm: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [created, setCreated] = useState<null | {
    affiliateCode: string;
    status: string;
    credentials: { apiKey: string; token: string };
  }>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function validate(): string | null {
    if (form.fullName.trim().length < 3) return "Informe seu nome completo.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Email inválido.";
    const wa = form.whatsapp.replace(/\D/g, "");
    if (wa.length < 10 || wa.length > 13) return "WhatsApp inválido (com DDD).";
    if (!isValidCpf(form.cpf)) return "CPF inválido.";
    if (form.password.length < 8) return "A senha deve ter ao menos 8 caracteres.";
    if (form.password !== form.passwordConfirm) return "As senhas não conferem.";
    return null;
  }

  const mut = useMutation({
    mutationFn: () => {
      const err = validate();
      if (err) return Promise.reject(new Error(err));
      return registerFn({
        data: {
          ...form,
          cpf: normalizeCpf(form.cpf),
          whatsapp: form.whatsapp.replace(/\D/g, ""),
        },
      });
    },
    onSuccess: (res: any) => {
      setCreated({
        affiliateCode: res.affiliateCode,
        status: res.status,
        credentials: res.credentials,
      });
      toast.success("Cadastro realizado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function copy(label: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  if (created) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-xl w-full border-gold/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-gold" /> Cadastro concluído
            </CardTitle>
            <CardDescription>
              {created.status === "approved"
                ? "Sua conta já está ativa. Guarde suas credenciais — elas só aparecem uma vez."
                : "Aguardando aprovação manual. Você receberá uma notificação. Mesmo assim, guarde suas credenciais agora."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CredentialRow label="Código do afiliado" value={created.affiliateCode} copied={copied} onCopy={copy} />
            <CredentialRow label="API Key" value={created.credentials.apiKey} copied={copied} onCopy={copy} />
            <CredentialRow label="Token" value={created.credentials.token} copied={copied} onCopy={copy} />
            <div className="flex justify-end pt-3 gap-2">
              <Button variant="outline" asChild><Link to="/">Voltar</Link></Button>
              <Button onClick={() => navigate({ to: "/affiliate/dashboard" })}>Ir para o painel</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-lg w-full border-gold/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-gold" /> Programa de Afiliados
          </CardTitle>
          <CardDescription>Preencha seus dados para se cadastrar. Aprovação conforme política.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Nome completo" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
          <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} />
          <Field label="CPF" value={form.cpf} onChange={(v) => setForm({ ...form, cpf: v })} />
          <div>
            <Label>Senha</Label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Confirmar senha</Label>
            <div className="relative">
              <Input
                type={showPw2 ? "text" : "password"}
                value={form.passwordConfirm}
                onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
              />
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setShowPw2(!showPw2)}>
                {showPw2 ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <Button
            className="w-full bg-gold text-primary-foreground hover:bg-gold-glow"
            disabled={mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? "Enviando…" : "Cadastrar-me como Afiliado"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Já é afiliado? <Link to="/affiliate/login" className="text-gold underline">Entrar</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type ?? "text"} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function CredentialRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: string | null;
  onCopy: (label: string, value: string) => void;
}) {
  return (
    <div className="border rounded-md p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2 mt-1">
        <code className="text-xs flex-1 break-all">{value}</code>
        <Button size="sm" variant="outline" onClick={() => onCopy(label, value)}>
          {copied === label ? <Check className="size-3" /> : <Copy className="size-3" />}
        </Button>
      </div>
    </div>
  );
}
