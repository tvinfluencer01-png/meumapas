import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Sun, Lock, Send } from "lucide-react";
import {
  getMyHoroscopeSubscription,
  updateMyHoroscopeSubscription,
  sendTestHoroscopeWhatsapp,
  SUN_SIGNS,
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
  const [sign, setSign] = useState<string>("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!data) return;
    const s = data.sub;
    setEnabled(s?.enabled ?? true);
    setChEmail(s?.channel_email ?? true);
    setChWA(s?.channel_whatsapp ?? true);
    setSign(s?.sun_sign ?? "");
    setEmail(s?.email ?? data.defaults.email ?? "");
    setPhone(s?.phone_e164 ?? data.defaults.phone_e164 ?? "");
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          enabled,
          channel_email: chEmail,
          channel_whatsapp: chWA,
          sun_sign: sign as any,
          email: email || null,
          phone_e164: phone || null,
        },
      }),
    onSuccess: () => {
      toast.success("Preferências salvas!");
      qc.invalidateQueries({ queryKey: ["horoscope-sub"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar"),
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

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Sun className="size-7 text-gold" />
          <h1 className="text-2xl font-serif text-gold">Horóscopo Diário</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Configurações de envio. As mensagens saem todo dia às 7h (horário de Brasília).
        </p>
      </header>

      <div className="rounded-lg border border-gold/20 bg-secondary/30 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Envios ativos</Label>
            <p className="text-xs text-muted-foreground">Pause ou retome quando quiser.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div>
          <Label>Seu signo solar</Label>
          <Select value={sign} onValueChange={setSign}>
            <SelectTrigger><SelectValue placeholder="Escolha o signo" /></SelectTrigger>
            <SelectContent>
              {SUN_SIGNS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          disabled={mutation.isPending || !sign}
          className="w-full"
        >
          {mutation.isPending ? "Salvando..." : "Salvar preferências"}
        </Button>
      </div>
    </div>
  );
}
