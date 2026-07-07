import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Sun, Sparkles, ShieldCheck, MessageCircle, ArrowRight, Check, Star, Loader2 } from "lucide-react";
import { Starfield } from "@/components/Starfield";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getHoroscopeLandingSettings,
  submitHoroscopeLead,
} from "@/lib/horoscope-landing.functions";
import { HoroscopeTrialUsedDialog } from "@/components/HoroscopeTrialUsedDialog";
import { BR_CITIES } from "@/lib/br-cities";

export const Route = createFileRoute("/horoscopo-gratis")({
  head: () => ({
    meta: [
      { title: "Horóscopo Diário no WhatsApp — 7 dias grátis · Código Cósmico" },
      {
        name: "description",
        content:
          "Receba todas as manhãs uma leitura astrológica personalizada do seu signo no WhatsApp. 7 dias grátis, sem cartão, sem compromisso.",
      },
      { property: "og:title", content: "Horóscopo Diário no WhatsApp — 7 dias grátis" },
      {
        property: "og:description",
        content:
          "Sua manhã começa com uma mensagem do céu. Ative agora e ganhe 7 dias grátis do seu horóscopo diário.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HoroscopoGratisPage,
});

const FormSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome"),
  email: z.string().trim().email("E-mail inválido"),
  phone_e164: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{7,14}$/, "Ex: +5511999998888"),
  birth_date: z.string().optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: "É necessário aceitar para continuar." }),
  }),
});

type SuccessInfo = {
  whatsappUrl: string;
  whatsappNumber: string;
  keyword: string;
  activationCode: string;
  successMessage: string;
  ctaLabel: string;
};

function HoroscopoGratisPage() {
  const getSettingsFn = useServerFn(getHoroscopeLandingSettings);
  const submitFn = useServerFn(submitHoroscopeLead);

  const { data, isLoading } = useQuery({
    queryKey: ["horoscope-landing-settings"],
    queryFn: () => getSettingsFn(),
    staleTime: 5 * 60_000,
  });

  const settings = data?.settings;

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_e164: "+55",
    birth_date: "",
    consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [trialBlocked, setTrialBlocked] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = FormSchema.safeParse(form);
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const iss of parsed.error.issues) errs[iss.path.join(".")] = iss.message;
        setErrors(errs);
        throw new Error("Confira os campos destacados.");
      }
      setErrors({});
      return await submitFn({
        data: {
          full_name: parsed.data.full_name,
          email: parsed.data.email,
          phone_e164: parsed.data.phone_e164,
          birth_date: parsed.data.birth_date && parsed.data.birth_date.length === 10 ? parsed.data.birth_date : null,
          consent_marketing: true,
          source: "landing_horoscopo_gratis",
        },
      });
    },
    onSuccess: (r: any) => {
      if (r?.blocked) {
        setTrialBlocked(true);
        return;
      }
      setSuccess(r as SuccessInfo);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-gold" />
      </div>
    );
  }

  if (!settings.enabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-3">
          <Sun className="size-10 text-gold mx-auto" />
          <h1 className="font-serif text-2xl text-gold">Promoção temporariamente indisponível</h1>
          <p className="text-muted-foreground">
            Estamos ajustando alguns detalhes. Volte em breve — o horóscopo diário te espera.
          </p>
          <Button asChild variant="outline"><Link to="/">Voltar ao início</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased relative overflow-hidden">
      <Starfield />

      {/* Header */}
      <header className="relative z-10 border-b border-gold/10 bg-background/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="size-7" />
            <span className="font-serif text-lg shimmer-text">Código Cósmico</span>
          </Link>
          <Button asChild variant="ghost" size="sm" className="text-gold hover:bg-gold/10">
            <Link to="/">← Voltar</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-10 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Left: hero copy */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs text-gold">
              <Sparkles className="size-3.5" /> Oferta especial · 7 dias grátis
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight shimmer-text">
              <span className="block">Receba seu Horóscopo</span>
              <span className="block">Diário no WhatsApp</span>
              <span className="block">7 dias grátis</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {settings.hero_subtitle}
            </p>

            <ul className="space-y-3 pt-2">
              {[
                "Leitura personalizada do seu signo — todo dia às 7h",
                "Direto no seu WhatsApp, sem baixar nada",
                `${settings.trial_days} dias 100% grátis · sem cartão, sem compromisso`,
                "Cancele a qualquer momento respondendo SAIR",
              ].map((b) => (
                <li key={b} className="flex gap-3 items-start">
                  <Check className="size-5 text-gold shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-gold text-gold" />
                ))}
              </div>
              <span>+12.000 pessoas recebem diariamente</span>
            </div>

            <div className="rounded-lg border border-gold/20 bg-gold/5 p-4 text-sm flex gap-3">
              <ShieldCheck className="size-5 text-gold shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                Seus dados são protegidos pela LGPD. Enviamos mensagens apenas com seu
                consentimento explícito e você pode sair quando quiser.
              </p>
            </div>
          </div>

          {/* Right: form or success */}
          <div className="rounded-2xl border border-gold/30 bg-secondary/40 backdrop-blur p-6 sm:p-8 shadow-[0_0_60px_-10px_rgba(212,175,55,0.35)]">
            {success ? (
              <SuccessPanel info={success} trialDays={settings.trial_days} />
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation.mutate();
                }}
              >
                <div className="text-center pb-2">
                  <Sun className="size-8 text-gold mx-auto mb-2" />
                  <h2 className="font-serif text-2xl text-gold">Comece agora — é grátis</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Preencha e envie a mensagem de confirmação no WhatsApp.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Seu nome</Label>
                  <Input
                    id="full_name"
                    autoComplete="name"
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    placeholder="Ex: Maria Silva"
                  />
                  {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="voce@exemplo.com"
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone_e164">WhatsApp (com DDD e país)</Label>
                  <Input
                    id="phone_e164"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone_e164}
                    onChange={(e) => setForm((f) => ({ ...f, phone_e164: e.target.value }))}
                    placeholder="+5511999998888"
                  />
                  {errors.phone_e164 && <p className="text-xs text-destructive">{errors.phone_e164}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="birth_date">Data de nascimento <span className="text-muted-foreground">(opcional — pra detectar seu signo)</span></Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                  />
                </div>

                <label className="flex gap-3 items-start pt-2 cursor-pointer">
                  <Checkbox
                    checked={form.consent}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, consent: v === true }))}
                    className="mt-0.5"
                  />
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    {settings.consent_text}
                  </span>
                </label>
                {errors.consent && <p className="text-xs text-destructive">{errors.consent}</p>}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-gold text-background hover:bg-gold/90 font-semibold gap-2"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                  Quero meus 7 dias grátis
                </Button>

                <p className="text-[11px] text-center text-muted-foreground">
                  Ao continuar, você concorda com nossos Termos e a Política de Privacidade.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Como funciona */}
        <section className="mt-16 lg:mt-24">
          <h2 className="font-serif text-2xl lg:text-3xl text-center text-gold mb-8">
            Como funciona
          </h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { n: "1", t: "Preencha o cadastro", d: "Nome, e-mail e WhatsApp em menos de 30 segundos." },
              { n: "2", t: "Confirme no WhatsApp", d: "Toque no botão e envie a mensagem pré-pronta pra confirmar." },
              { n: "3", t: "Receba amanhã cedo", d: `Por ${settings.trial_days} dias, seu horóscopo chega toda manhã.` },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-gold/20 bg-secondary/30 p-5 text-center">
                <div className="mx-auto size-10 rounded-full border border-gold/40 bg-gold/10 text-gold font-serif text-lg flex items-center justify-center mb-3">{s.n}</div>
                <h3 className="font-medium mb-1">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ curto */}
        <section className="mt-16 max-w-2xl mx-auto space-y-4">
          <h2 className="font-serif text-xl text-gold text-center">Dúvidas rápidas</h2>
          {[
            { q: "Preciso pagar alguma coisa?", a: `Não. Você recebe ${settings.trial_days} dias 100% grátis e pode continuar assinando depois se quiser.` },
            { q: "Como cancelo?", a: "Basta responder SAIR no WhatsApp a qualquer momento." },
            { q: "Vocês vão me mandar spam?", a: "Não. Enviamos apenas o horóscopo diário no horário combinado. Nada de propaganda invasiva." },
          ].map((f) => (
            <details key={f.q} className="rounded-lg border border-gold/15 bg-secondary/20 p-4 group">
              <summary className="cursor-pointer font-medium text-foreground/90 flex items-center justify-between">
                {f.q}
                <span className="text-gold group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="text-sm text-muted-foreground mt-2">{f.a}</p>
            </details>
          ))}
        </section>
      </main>

      <footer className="relative z-10 border-t border-gold/10 mt-16 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Código Cósmico · <Link to="/" className="hover:text-gold">Home</Link>
      </footer>

      <HoroscopeTrialUsedDialog open={trialBlocked} onOpenChange={setTrialBlocked} />
    </div>
  );
}

function SuccessPanel({ info, trialDays }: { info: SuccessInfo; trialDays: number }) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto size-14 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center">
        <MessageCircle className="size-7 text-gold" />
      </div>
      <h2 className="font-serif text-2xl text-gold">Falta só 1 passo!</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">{info.successMessage}</p>

      <div className="rounded-lg border border-gold/30 bg-background/60 p-4 text-left space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Número:</span>
          <span className="font-mono text-gold">{info.whatsappNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Mensagem:</span>
          <span className="font-mono text-gold">{info.keyword} {info.activationCode}</span>
        </div>
      </div>

      <Button
        asChild
        size="lg"
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold gap-2"
      >
        <a href={info.whatsappUrl} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="size-5" />
          {info.ctaLabel}
        </a>
      </Button>

      <p className="text-xs text-muted-foreground">
        Assim que enviar, o sistema confirma automaticamente e você começa a receber
        o horóscopo amanhã de manhã por {trialDays} dias.
      </p>
    </div>
  );
}
