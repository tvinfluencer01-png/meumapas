import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Save, Phone, Loader2, BellRing, Mail, Send, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSystemGlobalSettings, saveSystemGlobalSettings, sendSystemAlertTest } from "@/lib/admin.functions";

export function AdminGlobalSettings() {
  const qc = useQueryClient();
  const getSettingsFn = useServerFn(getSystemGlobalSettings);
  const saveSettingsFn = useServerFn(saveSystemGlobalSettings);
  const sendTestFn = useServerFn(sendSystemAlertTest);
  const [severity, setSeverity] = useState<"critical" | "warning" | "info">("warning");
  const [lastTest, setLastTest] = useState<Awaited<ReturnType<typeof sendSystemAlertTest>> | null>(null);

  const [whatsapp, setWhatsapp] = useState("");
  const [alertEmail, setAlertEmail] = useState("");
  const [alertWhatsapp, setAlertWhatsapp] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-global-settings"],
    queryFn: () => getSettingsFn(),
  });

  useEffect(() => {
    if (data) {
      setWhatsapp(data.whatsapp_number || "");
      setAlertEmail(data.alert_email || "");
      setAlertWhatsapp(data.alert_whatsapp || "");
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: (vars: { whatsapp_number?: string; alert_email?: string | null; alert_whatsapp?: string | null }) =>
      saveSettingsFn({ data: vars }),
    onSuccess: () => {
      toast.success("Configurações salvas.");
      qc.invalidateQueries({ queryKey: ["admin-global-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testMut = useMutation({
    mutationFn: () => sendTestFn({ data: { severity } }),
    onSuccess: (res) => {
      setLastTest(res);
      const parts: string[] = [];
      if (res.email.attempted) parts.push(`Email: ${res.email.ok ? "enviado" : "falhou"}`);
      if (res.whatsapp.attempted) parts.push(`WhatsApp: ${res.whatsapp.ok ? "enviado" : "falhou"}`);
      const anyOk = res.email.ok || res.whatsapp.ok;
      (anyOk ? toast.success : toast.error)(`Teste de alerta — ${parts.join(" · ") || "nenhum canal configurado"}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="size-5 text-gold" /> Configurações da Landing Page
          </CardTitle>
          <CardDescription>
            Configure informações globais exibidas para visitantes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="size-4 animate-spin" /> Carregando configurações...
            </div>
          ) : (
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp de Contato (Botão flutuante)</Label>
                <div className="flex gap-2">
                  <Input
                    id="whatsapp"
                    placeholder="Ex: 5511999999999"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
                    maxLength={20}
                  />
                  <Button
                    onClick={() => saveMut.mutate({ whatsapp_number: whatsapp })}
                    disabled={saveMut.isPending}
                    className="bg-gold text-primary-foreground hover:bg-gold-glow shrink-0"
                  >
                    {saveMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4 mr-2" />}
                    Salvar
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Insira apenas números com código do país (DDI) e área (DDD).
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="size-5 text-gold" /> Alertas do Sistema
          </CardTitle>
          <CardDescription>
            Receba avisos automáticos por e-mail e WhatsApp quando ocorrerem falhas críticas
            (ex.: job do horóscopo diário com <code>processed: 0</code> ou <code>delivered: 0</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="size-4 animate-spin" /> Carregando...
            </div>
          ) : (
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="alert_email" className="flex items-center gap-2">
                  <Mail className="size-4" /> E-mail para alertas
                </Label>
                <Input
                  id="alert_email"
                  type="email"
                  placeholder="alertas@seudominio.com"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  maxLength={255}
                />
                <p className="text-[10px] text-muted-foreground italic">
                  Requer SMTP configurado. Se vazio, usa o e-mail do super admin.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alert_whatsapp" className="flex items-center gap-2">
                  <Phone className="size-4" /> WhatsApp para alertas
                </Label>
                <Input
                  id="alert_whatsapp"
                  placeholder="Ex: 5511999999999"
                  value={alertWhatsapp}
                  onChange={(e) => setAlertWhatsapp(e.target.value.replace(/\D/g, ""))}
                  maxLength={20}
                />
                <p className="text-[10px] text-muted-foreground italic">
                  Requer Evolution API ou Twilio configurado. Formato E.164 (DDI + DDD + número).
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    saveMut.mutate({
                      alert_email: alertEmail || null,
                      alert_whatsapp: alertWhatsapp || null,
                    })
                  }
                  disabled={saveMut.isPending}
                  className="bg-gold text-primary-foreground hover:bg-gold-glow"
                >
                  {saveMut.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                  Salvar destinos
                </Button>

                <div className="flex items-center gap-2">
                  <Select value={severity} onValueChange={(v) => setSeverity(v as "critical" | "warning" | "info")}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => testMut.mutate()}
                    disabled={testMut.isPending || (!alertEmail && !alertWhatsapp)}
                  >
                    {testMut.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Send className="size-4 mr-2" />}
                    Testar alertas
                  </Button>
                </div>
              </div>

              {lastTest && (
                <div className="rounded-md border border-border bg-card/40 p-3 space-y-2 text-xs">
                  <div className="font-medium">Resultado do último teste ({lastTest.severity.toUpperCase()})</div>
                  <div className="flex items-start gap-2">
                    {lastTest.email.ok ? <CheckCircle2 className="size-4 text-emerald-400 mt-0.5" /> : <XCircle className="size-4 text-destructive mt-0.5" />}
                    <div>
                      <div>Email → {lastTest.email.to || "—"}</div>
                      {lastTest.email.error && <div className="text-destructive">{lastTest.email.error}</div>}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    {lastTest.whatsapp.ok ? <CheckCircle2 className="size-4 text-emerald-400 mt-0.5" /> : <XCircle className="size-4 text-destructive mt-0.5" />}
                    <div>
                      <div>WhatsApp → {lastTest.whatsapp.to || "—"} {lastTest.whatsapp.provider ? `(${lastTest.whatsapp.provider})` : ""}</div>
                      {lastTest.whatsapp.error && <div className="text-destructive">{lastTest.whatsapp.error}</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
