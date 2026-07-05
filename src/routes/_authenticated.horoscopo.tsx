import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Sun, Lock, Send, User, AlertTriangle } from "lucide-react";
import { SectionLamp } from "@/components/SectionLamp";
import {
  getMyHoroscopeSubscription,
  updateMyHoroscopeSubscription,
  sendTestHoroscopeWhatsapp,
} from "@/lib/horoscope.functions";

export const Route = createFileRoute("/_authenticated/horoscopo")({
  component: HoroscopoPage,
});

function HoroscopoPage() {
  const getFn = useServerFn(getMyHoroscopeSubscription);
  const updateFn = useServerFn(updateMyHoroscopeSubscription);
  const testFn = useServerFn(sendTestHoroscopeWhatsapp);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["horoscope-sub"],
    queryFn: () => getFn(),
  });

  const [enabled, setEnabled] = useState(true);
  const [chEmail, setChEmail] = useState(true);
  const [chWA, setChWA] = useState(true);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "alternate">("daily");
  const [sendHour, setSendHour] = useState<number>(7);
  const [sendMinute, setSendMinute] = useState<number>(0);
  const [sendWeekday, setSendWeekday] = useState<number>(1);

  useEffect(() => {
    if (!data) return;
    const s: any = data.sub;
    setEnabled(s?.enabled ?? true);
    setChEmail(s?.channel_email ?? true);
    setChWA(s?.channel_whatsapp ?? true);
    setEmail(s?.email ?? data.defaults.email ?? "");
    setPhone(s?.phone_e164 ?? data.defaults.phone_e164 ?? "");
    setFrequency((s?.frequency as any) ?? "daily");
    setSendHour(s?.send_local_hour ?? 7);
    setSendMinute(s?.send_local_minute ?? 0);
    setSendWeekday(s?.send_weekday ?? 1);
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          enabled,
          channel_email: chEmail,
          channel_whatsapp: chWA,
          email: email || null,
          phone_e164: phone || null,
          frequency,
          send_local_hour: sendHour,
          send_local_minute: sendMinute,
          send_weekday: frequency === "weekly" ? sendWeekday : null,
        },
      }),
    onSuccess: () => {
      toast.success("Preferências salvas para o contexto ativo!");
      qc.invalidateQueries({ queryKey: ["horoscope-sub"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar"),
  });

  const testMutation = useMutation({
    mutationFn: () => testFn({ data: { phone_e164: phone } }),
    onSuccess: (r: any) =>
      toast.success(`Teste enviado via ${r?.provider ?? "WhatsApp"}!`),
    onError: (e: any) => toast.error(e?.message ?? "Falha ao enviar teste"),
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  if (!data?.addonActive) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <Lock className="size-12 text-gold mx-auto" />
        <h1 className="text-2xl font-serif text-gold">Horóscopo Diário</h1>
        <p className="text-muted-foreground">
          Ative o add-on Horóscopo Diário para receber, todo dia às 7h (BRT),
          uma previsão personalizada do seu signo no WhatsApp e no e-mail.
        </p>
        <Button asChild>
          <Link to="/addons">Ver add-on (R$ 19,90/mês)</Link>
        </Button>
      </div>
    );
  }

  const ctx = data.context;
  const detectedSign = ctx?.detectedSign ?? null;

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Sun className="size-7 text-gold" />
          <h1 className="text-2xl font-serif text-gold inline-flex items-center gap-3 flex-wrap">
            Horóscopo Diário
            <SectionLamp
              sectionKey="horoscopo"
              title="Horóscopo Diário"
              why="Pequenas leituras diárias mantêm você sintonizado com a energia do dia sem precisar abrir o sistema."
              how="Ative o add-on, defina seu WhatsApp/e-mail e signo. Toda manhã às 7h (BRT) chega sua previsão personalizada."
              purpose="Começar o dia consciente dos trânsitos que influenciam você e agir alinhado a eles."
            />
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Cada contexto ativo tem suas próprias preferências. As mensagens saem todo dia às 7h (BRT).
        </p>
      </header>

      {/* Contexto ativo + signo detectado */}
      <div className="rounded-lg border border-gold/30 bg-gold/5 p-4 flex items-start gap-3">
        <User className="size-5 text-gold mt-0.5" />
        <div className="flex-1 space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Contexto ativo {ctx?.kind === "client" ? "(cliente)" : "(você)"}
          </div>
          <div className="text-base">
            {ctx?.fullName ?? "Sem nome cadastrado"}
            {ctx?.birthDate && (
              <span className="text-muted-foreground"> · {new Date(ctx.birthDate + "T00:00:00").toLocaleDateString("pt-BR")}</span>
            )}
          </div>
          {detectedSign ? (
            <div className="text-sm">
              Signo detectado: <span className="font-medium text-gold">{detectedSign}</span>
            </div>
          ) : (
            <div className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="size-4" /> Sem data de nascimento — cadastre no perfil ou cliente ativo.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gold/20 bg-secondary/30 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Envios ativos</Label>
            <p className="text-xs text-muted-foreground">Pause ou retome quando quiser.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className={`grid gap-3 ${frequency === "weekly" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Periodicidade</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diariamente</SelectItem>
                <SelectItem value="weekly">Semanalmente</SelectItem>
                <SelectItem value="alternate">Dia sim, dia não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Horário (BRT)</Label>
            <Select
              value={`${sendHour}:${sendMinute}`}
              onValueChange={(v) => {
                const [h, m] = v.split(":").map(Number);
                setSendHour(h);
                setSendMinute(m);
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {Array.from({ length: 48 }, (_, i) => {
                  const h = Math.floor(i / 2);
                  const m = (i % 2) * 30;
                  return (
                    <SelectItem key={`${h}:${m}`} value={`${h}:${m}`}>
                      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {frequency === "weekly" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Dia da semana</Label>
              <Select value={String(sendWeekday)} onValueChange={(v) => setSendWeekday(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Domingo</SelectItem>
                  <SelectItem value="1">Segunda-feira</SelectItem>
                  <SelectItem value="2">Terça-feira</SelectItem>
                  <SelectItem value="3">Quarta-feira</SelectItem>
                  <SelectItem value="4">Quinta-feira</SelectItem>
                  <SelectItem value="5">Sexta-feira</SelectItem>
                  <SelectItem value="6">Sábado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>


        <div className="space-y-3 border-t border-border/60 pt-4">
          <div className="flex items-center justify-between">
            <Label>WhatsApp</Label>
            <Switch checked={chWA} onCheckedChange={setChWA} />
          </div>
          <Input
            placeholder="+5511999998888"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={!chWA}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={
              testMutation.isPending ||
              !chWA ||
              !phone ||
              !detectedSign
            }
            onClick={() => testMutation.mutate()}
          >
            <Send className="size-4" />
            {testMutation.isPending ? "Enviando teste..." : "Enviar teste no WhatsApp"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Envia agora uma mensagem de teste com o horóscopo de hoje para o número acima.
          </p>
        </div>

        <div className="space-y-3 border-t border-border/60 pt-4">
          <div className="flex items-center justify-between">
            <Label>E-mail</Label>
            <Switch checked={chEmail} onCheckedChange={setChEmail} />
          </div>
          <Input
            type="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!chEmail}
          />
        </div>

        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !detectedSign}
          className="w-full"
        >
          {mutation.isPending ? "Salvando..." : "Salvar preferências"}
        </Button>
      </div>
    </div>
  );
}
