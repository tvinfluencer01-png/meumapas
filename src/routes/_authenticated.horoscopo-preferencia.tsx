import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Clock, Calendar, Sparkles, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getMyHoroscopeSubscription,
  saveHoroscopeSubscriptionPreference,
} from "@/lib/horoscope-plans.functions";
import { BR_CITIES } from "@/lib/br-cities";

type Search = { sid?: string; status?: string };

export const Route = createFileRoute("/_authenticated/horoscopo-preferencia")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    sid: typeof s.sid === "string" ? s.sid : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
  }),
  head: () => ({ meta: [{ title: "Sua preferência — Horóscopo Diário" }] }),
  component: PreferenciaPage,
});

const WEEKDAYS = [
  { v: 0, l: "Domingo" },
  { v: 1, l: "Segunda" },
  { v: 2, l: "Terça" },
  { v: 3, l: "Quarta" },
  { v: 4, l: "Quinta" },
  { v: 5, l: "Sexta" },
  { v: 6, l: "Sábado" },
];

function PreferenciaPage() {
  const { sid, status } = useSearch({ from: "/_authenticated/horoscopo-preferencia" });
  const navigate = useNavigate();
  const getSubFn = useServerFn(getMyHoroscopeSubscription);
  const saveFn = useServerFn(saveHoroscopeSubscriptionPreference);

  const { data, isLoading } = useQuery({
    queryKey: ["my-horoscope-sub", sid],
    queryFn: () => (sid ? getSubFn({ data: { id: sid } }) : Promise.resolve({ subscription: null })),
    enabled: !!sid,
    refetchInterval: (q) => {
      const s = (q.state.data as any)?.subscription?.status;
      return s === "pending" ? 3000 : false;
    },
  });

  const [frequency, setFrequency] = useState<"daily" | "alternate" | "weekly">("daily");
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(30);
  const [weekday, setWeekday] = useState(1);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          frequency,
          send_local_hour: hour,
          send_local_minute: minute,
          send_weekday: frequency === "weekly" ? weekday : null,
        },
      }),
    onSuccess: () => {
      toast.success("Preferência salva! Você começará a receber conforme escolheu.");
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Auto-save default silently if user skips? We show button; if user navigates away, defaults apply on cron.
  useEffect(() => {
    // Nothing — defaults are daily 8:30 already.
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-gold" />
      </div>
    );
  }

  const sub = (data as any)?.subscription;
  const isPending = status === "pending" || sub?.status === "pending";
  const isActive = sub?.status === "active";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-3">
        <div className="mx-auto size-14 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center">
          {isActive ? (
            <CheckCircle2 className="size-7 text-gold" />
          ) : (
            <Sparkles className="size-7 text-gold" />
          )}
        </div>
        <h1 className="font-serif text-3xl shimmer-text">
          {isActive ? "Assinatura confirmada! ✨" : isPending ? "Estamos confirmando seu pagamento" : "Sua preferência de envio"}
        </h1>
        <p className="text-muted-foreground">
          {isActive
            ? "Escolha com que frequência quer receber seu horóscopo. Se pular esta etapa, enviamos diariamente às 8h30."
            : isPending
              ? "Assim que o Mercado Pago confirmar, você já pode ajustar sua periodicidade aqui. Enquanto isso, deixe pronto:"
              : "Ajuste como quer receber seu horóscopo no WhatsApp."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Periodicidade</CardTitle>
          <CardDescription>Padrão: diariamente às 8h30.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={frequency} onValueChange={(v) => setFrequency(v as any)} className="space-y-3">
            <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-gold/40">
              <RadioGroupItem value="daily" id="f-daily" className="mt-0.5" />
              <div>
                <Label htmlFor="f-daily" className="cursor-pointer font-medium">Diariamente</Label>
                <p className="text-xs text-muted-foreground">Sua leitura todos os dias no horário escolhido.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-gold/40">
              <RadioGroupItem value="alternate" id="f-alt" className="mt-0.5" />
              <div>
                <Label htmlFor="f-alt" className="cursor-pointer font-medium">Dia sim, dia não</Label>
                <p className="text-xs text-muted-foreground">Uma leitura a cada 2 dias — para acompanhar sem sobrecarregar.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-gold/40">
              <RadioGroupItem value="weekly" id="f-week" className="mt-0.5" />
              <div>
                <Label htmlFor="f-week" className="cursor-pointer font-medium">Semanalmente</Label>
                <p className="text-xs text-muted-foreground">Uma leitura mais completa uma vez por semana.</p>
              </div>
            </label>
          </RadioGroup>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Clock className="size-4" /> Horário (hora local)</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} max={23} value={hour} onChange={(e) => setHour(Math.max(0, Math.min(23, Number(e.target.value) || 0)))} className="w-20" />
                <span>:</span>
                <Input type="number" min={0} max={59} value={minute} onChange={(e) => setMinute(Math.max(0, Math.min(59, Number(e.target.value) || 0)))} className="w-20" />
              </div>
            </div>
            {frequency === "weekly" && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Calendar className="size-4" /> Dia da semana</Label>
                <Select value={String(weekday)} onValueChange={(v) => setWeekday(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((w) => (
                      <SelectItem key={w.v} value={String(w.v)}>{w.l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              size="lg"
              className="flex-1 bg-gold text-background hover:bg-gold/90 font-semibold"
              disabled={save.isPending || !isActive}
              onClick={() => save.mutate()}
            >
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : "Salvar preferência"}
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard">Pular (usar padrão)</Link>
            </Button>
          </div>

          {!isActive && (
            <p className="text-xs text-center text-muted-foreground">
              O botão libera assim que o pagamento for confirmado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
