import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Save, ShieldCheck, Wallet } from "lucide-react";
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
import {
  getMercadoPagoSettings,
  saveMercadoPagoSettings,
  testMercadoPagoCredentials,
} from "@/lib/admin.functions";

export function MercadoPagoForm() {
  const qc = useQueryClient();
  const getFn = useServerFn(getMercadoPagoSettings);
  const saveFn = useServerFn(saveMercadoPagoSettings);
  const testFn = useServerFn(testMercadoPagoCredentials);

  const { data, isLoading } = useQuery({
    queryKey: ["mercado-pago-settings"],
    queryFn: () => getFn(),
  });

  const [publicKey, setPublicKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!data) return;
    setPublicKey(data.public_key);
    setEnvironment(data.environment);
    setEnabled(data.enabled);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          public_key: publicKey,
          access_token: accessToken,
          webhook_secret: webhookSecret,
          environment,
          enabled,
        },
      }),
    onSuccess: () => {
      toast.success("Configurações do Mercado Pago salvas.");
      setAccessToken("");
      setWebhookSecret("");
      qc.invalidateQueries({ queryKey: ["mercado-pago-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testMut = useMutation({
    mutationFn: () => testFn({ data: { access_token: accessToken } }),
    onSuccess: (r) => {
      toast.success(`Conectado como ${r.nickname || r.email || "conta verificada"}.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="size-5 text-gold" /> Integração com Mercado Pago
          </CardTitle>
          <CardDescription>
            Configure as credenciais para processar pagamentos de créditos e add-ons.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mini tutorial */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <ShieldCheck className="size-4 text-gold" /> Como obter suas credenciais
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
              <li>
                Acesse o painel de desenvolvedores do Mercado Pago e faça login com sua
                conta.
              </li>
              <li>
                Crie uma aplicação em <strong>"Suas integrações"</strong> (escolha
                "Pagamentos online").
              </li>
              <li>
                Em <strong>Credenciais de produção</strong> copie o{" "}
                <code className="text-foreground">Public Key</code> e o{" "}
                <code className="text-foreground">Access Token</code>.
              </li>
              <li>
                Para testes, utilize as <strong>Credenciais de teste</strong> e marque o
                ambiente como <em>Sandbox</em> abaixo.
              </li>
              <li>
                (Opcional) Configure um <strong>Webhook</strong> e cole aqui o secret
                gerado para validar notificações.
              </li>
            </ol>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild variant="outline" size="sm">
                <a
                  href="https://www.mercadopago.com.br/developers/panel/app"
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir painel de aplicações <ExternalLink className="ml-1 size-3.5" />
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a
                  href="https://www.mercadopago.com.br/developers/pt/docs/your-integrations/credentials"
                  target="_blank"
                  rel="noreferrer"
                >
                  Documentação de credenciais <ExternalLink className="ml-1 size-3.5" />
                </a>
              </Button>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Integração ativa</p>
              <p className="text-xs text-muted-foreground">
                {data?.has_access_token
                  ? "Access Token salvo com segurança."
                  : "Nenhum Access Token configurado ainda."}
                {data?.updated_at
                  ? ` Última atualização: ${new Date(data.updated_at).toLocaleString()}.`
                  : ""}
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Ambiente</Label>
              <Select
                value={environment}
                onValueChange={(v) => setEnvironment(v as "sandbox" | "production")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (testes)</SelectItem>
                  <SelectItem value="production">Produção (pagamentos reais)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mp-public">Public Key</Label>
              <Input
                id="mp-public"
                placeholder="APP_USR-xxxx ou TEST-xxxx"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <p className="text-xs text-muted-foreground">
                Usada no checkout (lado do navegador).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mp-token">
                Access Token {data?.has_access_token && (
                  <span className="text-xs text-emerald-600 inline-flex items-center gap-1 ml-1">
                    <CheckCircle2 className="size-3" /> salvo
                  </span>
                )}
              </Label>
              <Input
                id="mp-token"
                type="password"
                placeholder={data?.has_access_token ? "•••••••••• (deixe vazio para manter)" : "APP_USR-xxxx ou TEST-xxxx"}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Mantido apenas no servidor. Nunca é exposto ao navegador.
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="mp-webhook">
                Webhook Secret (opcional){" "}
                {data?.has_webhook_secret && (
                  <span className="text-xs text-emerald-600 inline-flex items-center gap-1 ml-1">
                    <CheckCircle2 className="size-3" /> salvo
                  </span>
                )}
              </Label>
              <Input
                id="mp-webhook"
                type="password"
                placeholder={data?.has_webhook_secret ? "•••••••••• (deixe vazio para manter)" : "Secret de validação do webhook"}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              className="gap-2"
            >
              <Save className="size-4" />
              {saveMut.isPending ? "Salvando…" : "Salvar configurações"}
            </Button>
            <Button
              variant="outline"
              onClick={() => testMut.mutate()}
              disabled={testMut.isPending}
              className="gap-2"
            >
              <ShieldCheck className="size-4" />
              {testMut.isPending ? "Testando…" : "Testar credenciais"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
