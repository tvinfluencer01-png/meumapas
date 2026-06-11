import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Calendar, Clock, MapPin, Globe, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createMercadoPagoCheckout } from "@/lib/addons.functions";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
  head: () => ({ meta: [{ title: "Onboarding — Código Cósmico" }] }),
});

const schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  birth_time: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  time_unknown: z.boolean(),
  city: z.string().trim().min(2).max(120),
  country: z.string().trim().max(120).optional().or(z.literal("")),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().max(60),
});

function OnboardingPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [redirectingToPayment, setRedirectingToPayment] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    birth_date: "",
    birth_time: "",
    time_unknown: false,
    city: "",
    country: "Brasil",
    latitude: -23.5505,
    longitude: -46.6333,
    timezone: "America/Sao_Paulo",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      const { error: bdErr } = await supabase.from("birth_data").insert({
        user_id: user.id,
        full_name: parsed.data.full_name,
        birth_date: parsed.data.birth_date,
        birth_time: parsed.data.time_unknown ? null : (parsed.data.birth_time || null),
        time_unknown: parsed.data.time_unknown,
        city: parsed.data.city,
        country: parsed.data.country || null,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        timezone: parsed.data.timezone,
        is_primary: true,
      });
      if (bdErr) throw bdErr;

      const { error: pErr } = await supabase
        .from("profiles")
        .update({ full_name: parsed.data.full_name, onboarding_completed: true })
        .eq("id", user.id);
      if (pErr) throw pErr;

      toast.success("Pronto! Sua jornada cósmica começa agora.");
      nav({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <Logo sizeClassName="size-20" animation="float" className="mx-auto mb-3" />
        <h1 className="font-serif text-4xl shimmer-text">O Universo precisa te conhecer</h1>
        <p className="mt-3 text-muted-foreground">
          Esses dados desenham seu mapa astral, sua numerologia e calibram a IA Oráculo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 lg:p-8 space-y-5">
        <div>
          <Label className="text-stardust">Nome completo de nascimento</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Como consta no registro" required maxLength={120}
            className="mt-1 bg-input border-border" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="birth_date" className="text-stardust flex items-center gap-2 text-sm">
              <Calendar className="size-4" /> Data de nascimento
            </Label>
            <Input
              id="birth_date"
              type="date"
              value={form.birth_date}
              required
              max={new Date().toISOString().slice(0, 10)}
              min="1900-01-01"
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              className="mt-1 h-12 text-base bg-input border-border appearance-none [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              inputMode="numeric"
            />
          </div>
          <div>
            <Label htmlFor="birth_time" className="text-stardust flex items-center gap-2 text-sm">
              <Clock className="size-4" /> Hora
            </Label>
            <Input
              id="birth_time"
              type="time"
              value={form.birth_time}
              disabled={form.time_unknown}
              step={60}
              onChange={(e) => setForm({ ...form, birth_time: e.target.value })}
              className="mt-1 h-12 text-base bg-input border-border appearance-none [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:cursor-pointer disabled:opacity-50"
              inputMode="numeric"
            />
            <label
              htmlFor="time_unknown"
              className="mt-2 flex items-center gap-2 text-sm text-muted-foreground min-h-11 cursor-pointer select-none"
            >
              <Checkbox
                id="time_unknown"
                checked={form.time_unknown}
                onCheckedChange={(v) => setForm({ ...form, time_unknown: !!v, birth_time: v ? "" : form.birth_time })}
                className="size-5"
              />
              Não sei minha hora exata
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-stardust flex items-center gap-2"><MapPin className="size-4" /> Cidade</Label>
            <Input value={form.city} required maxLength={120}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="mt-1 bg-input border-border" placeholder="São Paulo" />
          </div>
          <div>
            <Label className="text-stardust flex items-center gap-2"><Globe className="size-4" /> País</Label>
            <Input value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="mt-1 bg-input border-border" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-stardust text-xs">Latitude</Label>
            <Input type="number" step="0.0001" value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })}
              className="mt-1 bg-input border-border" />
          </div>
          <div>
            <Label className="text-stardust text-xs">Longitude</Label>
            <Input type="number" step="0.0001" value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })}
              className="mt-1 bg-input border-border" />
          </div>
          <div>
            <Label className="text-stardust text-xs">Fuso (IANA)</Label>
            <Input value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="mt-1 bg-input border-border" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Dica: pesquise as coordenadas da sua cidade no Google. Em breve, a geocodificação será automática.
        </p>

        <Button type="submit" disabled={submitting}
          className="w-full bg-gold text-primary-foreground hover:bg-gold-glow font-medium">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : "Iniciar minha jornada"}
        </Button>
      </form>
    </div>
  );
}
