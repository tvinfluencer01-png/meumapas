import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Save, Send, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSmtpSettings, saveSmtpSettings, sendSmtpTest, type SmtpSettings } from "@/lib/smtp.functions";

const EMPTY: SmtpSettings = {
  id: null,
  provider: "custom",
  host: "",
  port: 587,
  secure: false,
  username: "",
  password: "",
  from_email: "",
  from_name: "",
  reply_to: null,
  enabled: false,
};

const GMAIL_PRESET = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
};

export function AdminSmtp() {
  const getFn = useServerFn(getSmtpSettings);
  const saveFn = useServerFn(saveSmtpSettings);
  const testFn = useServerFn(sendSmtpTest);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["smtp-settings"],
    queryFn: () => getFn(),
  });

  const [form, setForm] = useState<SmtpSettings>(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const [testTo, setTestTo] = useState("");

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const applyGmailPreset = () => {
    setForm((f) => ({
      ...f,
      provider: "gmail",
      host: GMAIL_PRESET.host,
      port: GMAIL_PRESET.port,
      secure: GMAIL_PRESET.secure,
    }));
  };

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          id: form.id,
          provider: form.provider,
          host: form.host,
          port: form.port,
          secure: form.secure,
          username: form.username,
          password: form.password,
          from_email: form.from_email,
          from_name: form.from_name,
          reply_to: form.reply_to || null,
          enabled: form.enabled,
        },
      }),
    onSuccess: () => {
      toast.success("Configuração SMTP salva!");
      qc.invalidateQueries({ queryKey: ["smtp-settings"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar"),
  });

  const test = useMutation({
    mutationFn: () => testFn({ data: { to: testTo, subject: "Teste SMTP - Código Cósmico", body: "Este é um e-mail de teste enviado pelo painel administrativo." } }),
    onSuccess: () => toast.success(`E-mail de teste enviado para ${testTo}`),
    onError: (e: any) => toast.error(e?.message ?? "Falha no envio de teste"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gold">
          <Mail className="size-5" /> Configuração de E-mail (SMTP)
        </CardTitle>
        <CardDescription>
          Configure um servidor SMTP para envio de e-mails do sistema. Suporte a Gmail
          (use uma <strong>Senha de App</strong> em myaccount.google.com/apppasswords) ou
          qualquer servidor SMTP customizado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Carregando…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provedor</Label>
                <Select
                  value={form.provider}
                  onValueChange={(v: "gmail" | "custom") => {
                    if (v === "gmail") {
                      setForm((f) => ({ ...f, provider: "gmail", ...GMAIL_PRESET }));
                    } else {
                      setForm((f) => ({ ...f, provider: "custom" }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail</SelectItem>
                    <SelectItem value="custom">SMTP customizado</SelectItem>
                  </SelectContent>
                </Select>
                {form.provider === "gmail" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyGmailPreset}
                  >
                    Aplicar preset Gmail
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Ativo</Label>
                <div className="flex items-center gap-3 h-10">
                  <Switch
                    checked={form.enabled}
                    onCheckedChange={(v) => setForm({ ...form, enabled: v })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {form.enabled ? "Envios habilitados" : "Envios desativados"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Host SMTP</Label>
                <Input
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Porta</Label>
                <Input
                  type="number"
                  min={1}
                  max={65535}
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: Number(e.target.value) || 587 })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
              <div>
                <Label>Conexão segura (SSL/TLS)</Label>
                <p className="text-xs text-muted-foreground">
                  Ative para porta 465. Para 587 (STARTTLS) deixe desligado.
                </p>
              </div>
              <Switch
                checked={form.secure}
                onCheckedChange={(v) => setForm({ ...form, secure: v })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder={form.provider === "gmail" ? "seu-email@gmail.com" : "usuário SMTP"}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {form.provider === "gmail" ? "Senha de App (16 caracteres)" : "Senha"}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((s) => !s)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {form.provider === "gmail" && (
                  <p className="text-xs text-muted-foreground">
                    Gere uma Senha de App em{" "}
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noreferrer"
                      className="text-gold underline"
                    >
                      myaccount.google.com/apppasswords
                    </a>
                    . Requer verificação em duas etapas ativa.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do remetente</Label>
                <Input
                  value={form.from_name}
                  onChange={(e) => setForm({ ...form, from_name: e.target.value })}
                  placeholder="Código Cósmico"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail do remetente (From)</Label>
                <Input
                  type="email"
                  value={form.from_email}
                  onChange={(e) => setForm({ ...form, from_email: e.target.value })}
                  placeholder="noreply@seudominio.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reply-To (opcional)</Label>
              <Input
                type="email"
                value={form.reply_to ?? ""}
                onChange={(e) => setForm({ ...form, reply_to: e.target.value || null })}
                placeholder="contato@seudominio.com"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2">
                <Save className="size-4" />
                {save.isPending ? "Salvando…" : "Salvar configuração"}
              </Button>
            </div>

            <div className="border-t border-border/60 pt-4 space-y-3">
              <div>
                <h4 className="font-medium text-gold">Enviar e-mail de teste</h4>
                <p className="text-xs text-muted-foreground">
                  Salve a configuração antes. O teste usa os dados salvos no banco.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="destinatario@exemplo.com"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                />
                <Button
                  onClick={() => test.mutate()}
                  disabled={test.isPending || !testTo}
                  variant="outline"
                  className="gap-2"
                >
                  <Send className="size-4" />
                  {test.isPending ? "Enviando…" : "Enviar teste"}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
