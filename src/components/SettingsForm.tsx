import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink, Eye, EyeOff, Save, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLovableApiKeyStatus } from "@/lib/admin.functions";

function OnlineBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
      <span className="size-1.5 rounded-full bg-white animate-pulse" />
      Online
    </span>
  );
}

export function SettingsForm() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showLovableKey, setShowLovableKey] = useState(false);
  const [showCustomKey, setShowCustomKey] = useState(false);
  const [showAstroKey, setShowAstroKey] = useState(false);
  const [form, setForm] = useState({
    preferred_engine: "swiss_ephemeris",
    astrology_api_user_id: "",
    astrology_api_key: "",
    ai_provider: "lovable",
    custom_ai_key: "",
    custom_ai_model: "openai/gpt-5",
  });

  const { data } = useQuery({
    queryKey: ["settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_settings").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const fetchLovableKey = useServerFn(getLovableApiKeyStatus);
  const { data: lovableKeyStatus } = useQuery({
    queryKey: ["lovable-api-key-status"],
    queryFn: () => fetchLovableKey(),
    retry: false,
  });

  useEffect(() => {
    if (data) {
      setForm({
        preferred_engine: data.preferred_engine ?? "swiss_ephemeris",
        astrology_api_user_id: data.astrology_api_user_id ?? "",
        astrology_api_key: data.astrology_api_key ?? "",
        ai_provider: data.ai_provider ?? "lovable",
        custom_ai_key: data.custom_ai_key ?? "",
        custom_ai_model: data.custom_ai_model ?? "openai/gpt-5",
      });
    }
  }, [data]);

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        ...form,
        astrology_api_user_id: form.astrology_api_user_id || null,
        astrology_api_key: form.astrology_api_key || null,
        custom_ai_key: form.custom_ai_key || null,
      });
      if (error) throw error;
      toast.success("Configurações salvas.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const astrologyOnline =
    form.preferred_engine === "swiss_ephemeris" ||
    (form.preferred_engine === "astrology_api" && !!form.astrology_api_user_id && !!form.astrology_api_key);

  const lovableConfigured = !!lovableKeyStatus?.configured;
  const customConfigured = !!form.custom_ai_key && !!form.custom_ai_model;

  const providerOnline =
    form.ai_provider === "lovable" ? lovableConfigured : customConfigured;

  function maskKey(k: string) {
    if (!k) return "";
    if (k.length <= 12) return "•".repeat(k.length);
    return `${k.slice(0, 6)}${"•".repeat(Math.max(8, k.length - 12))}${k.slice(-4)}`;
  }

  return (
    <div className="space-y-6">
      {/* Astrology engine */}
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl text-gold">Engine de Astrologia</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Padrão: <strong>Swiss Ephemeris</strong> (gratuito, executado em nossos servidores).
              Opcionalmente conecte a <strong>AstrologyAPI</strong> para casas Placidus exatas e relatórios pré-formatados.
            </p>
          </div>
          {astrologyOnline && <OnlineBadge />}
        </div>

        <div>
          <Label className="text-stardust">Engine preferido</Label>
          <Select value={form.preferred_engine} onValueChange={(v) => setForm({ ...form, preferred_engine: v })}>
            <SelectTrigger className="mt-1 bg-input border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="swiss_ephemeris">Swiss Ephemeris (padrão, grátis)</SelectItem>
              <SelectItem value="astrology_api">AstrologyAPI (chaves abaixo)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Sparkles className="size-4 text-gold mt-0.5 shrink-0" />
            <div className="text-sm text-stardust">
              <strong>Como conectar a AstrologyAPI:</strong>
              <ol className="list-decimal list-inside mt-1 text-muted-foreground space-y-1">
                <li>Crie uma conta em <ExtLink href="https://astrologyapi.com">astrologyapi.com</ExtLink></li>
                <li>No dashboard, copie seu <em>User ID</em> e <em>API Key</em></li>
                <li>Cole abaixo e salve — o Cosmic AI usará a API quando o engine acima estiver selecionado</li>
              </ol>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-stardust text-xs">User ID</Label>
              <Input value={form.astrology_api_user_id}
                onChange={(e) => setForm({ ...form, astrology_api_user_id: e.target.value })}
                className="mt-1 bg-input border-border" placeholder="123456" />
            </div>
            <div>
              <Label className="text-stardust text-xs">API Key</Label>
              <div className="relative mt-1">
                <Input type={showAstroKey ? "text" : "password"} value={form.astrology_api_key}
                  onChange={(e) => setForm({ ...form, astrology_api_key: e.target.value })}
                  className="bg-input border-border pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowAstroKey((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-stardust"
                  aria-label={showAstroKey ? "Ocultar chave" : "Mostrar chave"}>
                  {showAstroKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI provider */}
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl text-gold">Inteligência Espiritual (IA)</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Padrão: <strong>Lovable AI Gateway</strong> (Gemini/GPT integrados). Ou traga sua própria chave.
            </p>
          </div>
          {providerOnline && <OnlineBadge />}
        </div>

        <div>
          <Label className="text-stardust">Provedor</Label>
          <Select value={form.ai_provider} onValueChange={(v) => setForm({ ...form, ai_provider: v })}>
            <SelectTrigger className="mt-1 bg-input border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lovable">
                Lovable AI (padrão){lovableConfigured ? " · online" : ""}
              </SelectItem>
              <SelectItem value="openai">
                OpenAI (BYO key){form.ai_provider === "openai" && customConfigured ? " · online" : ""}
              </SelectItem>
              <SelectItem value="anthropic">
                Anthropic Claude (BYO key){form.ai_provider === "anthropic" && customConfigured ? " · online" : ""}
              </SelectItem>
              <SelectItem value="google">
                Google Gemini (BYO key){form.ai_provider === "google" && customConfigured ? " · online" : ""}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {form.ai_provider === "lovable" && (
          <div className="rounded-xl border border-emerald-600/30 bg-emerald-600/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-emerald-500" />
                <span className="text-sm text-stardust font-medium">Lovable AI Gateway</span>
              </div>
              {lovableConfigured && <OnlineBadge />}
            </div>
            <p className="text-xs text-muted-foreground">
              Chave gerenciada pela Lovable e provisionada automaticamente. Acessa Gemini, GPT e outros modelos integrados.
            </p>
            <div>
              <Label className="text-stardust text-xs">LOVABLE_API_KEY</Label>
              <div className="relative mt-1">
                <Input
                  readOnly
                  type="text"
                  value={
                    lovableKeyStatus?.key
                      ? showLovableKey
                        ? lovableKeyStatus.key
                        : maskKey(lovableKeyStatus.key)
                      : lovableConfigured
                        ? "••••••••••••"
                        : "(não configurada)"
                  }
                  className="bg-input border-border pr-10 font-mono text-xs"
                />
                {lovableKeyStatus?.key && (
                  <button type="button" onClick={() => setShowLovableKey((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-stardust"
                    aria-label={showLovableKey ? "Ocultar chave" : "Mostrar chave"}>
                    {showLovableKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {form.ai_provider !== "lovable" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-stardust text-xs">Modelo</Label>
              <Input value={form.custom_ai_model}
                onChange={(e) => setForm({ ...form, custom_ai_model: e.target.value })}
                className="mt-1 bg-input border-border" placeholder="gpt-5 / claude-opus / gemini-2.5-pro" />
            </div>
            <div>
              <Label className="text-stardust text-xs">API Key</Label>
              <div className="relative mt-1">
                <Input type={showCustomKey ? "text" : "password"} value={form.custom_ai_key}
                  onChange={(e) => setForm({ ...form, custom_ai_key: e.target.value })}
                  className="bg-input border-border pr-10" placeholder="sk-..." />
                <button type="button" onClick={() => setShowCustomKey((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-stardust"
                  aria-label={showCustomKey ? "Ocultar chave" : "Mostrar chave"}>
                  {showCustomKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          Links rápidos:{" "}
          <ExtLink href="https://platform.openai.com/api-keys">OpenAI keys</ExtLink>{" · "}
          <ExtLink href="https://console.anthropic.com/settings/keys">Anthropic keys</ExtLink>{" · "}
          <ExtLink href="https://aistudio.google.com/app/apikey">Google AI keys</ExtLink>
        </div>
      </section>

      <Button onClick={save} disabled={saving}
        className="bg-gold text-primary-foreground hover:bg-gold-glow">
        <Save className="size-4 mr-2" /> {saving ? "Salvando..." : "Salvar configurações"}
      </Button>
    </div>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-gold hover:underline inline-flex items-center gap-1">
      {children} <ExternalLink className="size-3" />
    </a>
  );
}
