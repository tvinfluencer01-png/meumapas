import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Eye, EyeOff, Save, Sparkles, RefreshCw, AlertTriangle, ArrowUp, ArrowDown, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLovableApiKeyStatus, testAstrologyCredentials } from "@/lib/admin.functions";

const AI_PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI (BYO key)",
  lovable: "Lovable AI Gateway",
  anthropic: "Anthropic Claude (BYO key)",
  google: "Google Gemini (BYO key)",
};
const DEFAULT_ORDER = ["openai", "lovable", "anthropic", "google"];

function normalizeOrder(order: string[] | null | undefined, current?: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const source = [
    ...(current ? [current] : []),
    ...(order ?? []),
    ...DEFAULT_ORDER,
  ];
  for (const id of source) {
    if (AI_PROVIDER_LABELS[id] && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}



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
  const [testingAstro, setTestingAstro] = useState(false);
  const [astroStatus, setAstroStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [showLovableKey, setShowLovableKey] = useState(false);
  const [showCustomKey, setShowCustomKey] = useState(false);
  const [showAstroKey, setShowAstroKey] = useState(false);
  const [form, setForm] = useState({
    preferred_engine: "swiss_ephemeris",
    astrology_api_user_id: "",
    astrology_api_key: "",
    ai_provider: "openai",
    ai_provider_order: DEFAULT_ORDER,
    custom_ai_key: "",
    custom_ai_model: "openai/gpt-5.5",
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
  const testAstroFn = useServerFn(testAstrologyCredentials);

  const { data: lovableKeyStatus } = useQuery({
    queryKey: ["lovable-api-key-status"],
    queryFn: () => fetchLovableKey(),
    retry: false,
  });

  useEffect(() => {
    if (data) {
      const order = normalizeOrder(data.ai_provider_order as string[] | null, data.ai_provider ?? undefined);
      setForm({
        preferred_engine: data.preferred_engine ?? "swiss_ephemeris",
        astrology_api_user_id: data.astrology_api_user_id ?? "",
        astrology_api_key: data.astrology_api_key ?? "",
        ai_provider: order[0] ?? "openai",
        ai_provider_order: order,
        custom_ai_key: data.custom_ai_key ?? "",
        custom_ai_model: data.custom_ai_model ?? "openai/gpt-5.5",
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

  async function testAstro() {
    if (!form.astrology_api_user_id || !form.astrology_api_key) {
      toast.error("Informe User ID e API Key para testar.");
      return;
    }
    setTestingAstro(true);
    setAstroStatus(null);
    try {
      const res = await testAstroFn({
        data: {
          userId: form.astrology_api_user_id,
          apiKey: form.astrology_api_key,
        },
      });
      setAstroStatus({ ok: true, message: res.message });
      toast.success(res.message);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao testar";
      setAstroStatus({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setTestingAstro(false);
    }
  }

  const astrologyOnline =
    form.preferred_engine === "swiss_ephemeris" ||
    (form.preferred_engine === "astrology_api" && astroStatus?.ok);

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
          <Select 
            value={form.preferred_engine} 
            onValueChange={(v) => setForm(prev => ({ ...prev, preferred_engine: v }))}
          >
            <SelectTrigger className="mt-1 bg-input border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="swiss_ephemeris">Swiss Ephemeris (padrão, grátis)</SelectItem>
              <SelectItem value="astrology_api">AstrologyAPI (chaves abaixo)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={`rounded-xl border p-4 space-y-4 transition-colors ${
          form.preferred_engine === "astrology_api" 
            ? "border-gold/40 bg-gold/10" 
            : "border-gold/20 bg-gold/5 opacity-60"
        }`}>
          <div className="flex items-start gap-2">
            <Sparkles className="size-4 text-gold mt-0.5 shrink-0" />
            <div className="text-sm text-stardust">
              <strong>Como conectar a AstrologyAPI:</strong>
              <ol className="list-decimal list-inside mt-1 text-muted-foreground space-y-1">
                <li>Crie uma conta em <ExtLink href="https://astrologyapi.com">astrologyapi.com</ExtLink></li>
                <li>No dashboard, copie seu <em>User ID</em> e <em>API Key</em></li>
                <li>Cole abaixo e salve — o Código Cósmico usará a API quando o engine acima estiver selecionado</li>
              </ol>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-stardust text-xs">User ID</Label>
              <Input 
                value={form.astrology_api_user_id}
                disabled={form.preferred_engine === "swiss_ephemeris"}
                onChange={(e) => setForm(prev => ({ ...prev, astrology_api_user_id: e.target.value }))}
                onKeyDown={(e) => e.stopPropagation()}
                className="mt-1 bg-input border-border" 
                placeholder="123456" 
              />
            </div>
            <div>
              <Label className="text-stardust text-xs">API Key</Label>
              <div className="relative mt-1">
                <Input 
                  type={showAstroKey ? "text" : "password"} 
                  value={form.astrology_api_key}
                  disabled={form.preferred_engine === "swiss_ephemeris"}
                  onChange={(e) => setForm(prev => ({ ...prev, astrology_api_key: e.target.value }))}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="bg-input border-border pr-10" 
                  placeholder="••••••••" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowAstroKey((s) => !s)}
                  disabled={form.preferred_engine === "swiss_ephemeris"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-stardust"
                  aria-label={showAstroKey ? "Ocultar chave" : "Mostrar chave"}
                >
                  {showAstroKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <div className="text-xs">
              {astroStatus && (
                <div className={`flex items-center gap-1.5 ${astroStatus.ok ? "text-emerald-500" : "text-destructive"}`}>
                  {astroStatus.ok ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
                  {astroStatus.message}
                </div>
              )}
            </div>
            <Button 
              type="button"
              variant="outline" 
              size="sm"
              disabled={testingAstro || form.preferred_engine === "swiss_ephemeris"}
              onClick={testAstro}
              className="gap-2 border-gold/30 hover:bg-gold/10"
            >
              <RefreshCw className={`size-3 ${testingAstro ? "animate-spin" : ""}`} />
              {testingAstro ? "Testando..." : "Testar conexão"}
            </Button>
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
          <div className="flex items-center justify-between gap-3">
            <Label className="text-stardust">Ordem dos provedores</Label>
            <span className="text-[11px] text-muted-foreground">1º = padrão · demais = fallback em caso de falha</span>
          </div>
          <ul className="mt-2 space-y-2">
            {form.ai_provider_order.map((id, idx) => {
              const isDefault = idx === 0;
              const online =
                id === "lovable" ? lovableConfigured : (form.ai_provider === id && customConfigured);
              const move = (dir: -1 | 1) => {
                const next = [...form.ai_provider_order];
                const j = idx + dir;
                if (j < 0 || j >= next.length) return;
                [next[idx], next[j]] = [next[j], next[idx]];
                setForm({ ...form, ai_provider_order: next, ai_provider: next[0] });
              };
              const setAsDefault = () => {
                if (isDefault) return;
                const next = [id, ...form.ai_provider_order.filter((p) => p !== id)];
                setForm({ ...form, ai_provider_order: next, ai_provider: next[0] });
              };
              return (
                <li
                  key={id}
                  className={`flex items-center gap-2 rounded-lg border p-2.5 ${
                    isDefault ? "border-gold/50 bg-gold/10" : "border-border bg-input/40"
                  }`}
                >
                  <span className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    isDefault ? "bg-gold text-primary-foreground" : "bg-secondary text-stardust"
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stardust truncate">
                      {AI_PROVIDER_LABELS[id]}
                      {isDefault && <span className="ml-2 text-[10px] uppercase tracking-wider text-gold">padrão</span>}
                      {online && <span className="ml-2 text-[10px] uppercase tracking-wider text-emerald-500">online</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {isDefault ? "Usado primeiro" : `Fallback ${idx}`}
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={setAsDefault}
                    disabled={isDefault}
                    className="h-8 px-2 text-gold hover:bg-gold/10 disabled:opacity-40"
                    title="Definir como padrão">
                    <Star className={`size-4 ${isDefault ? "fill-gold" : ""}`} />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => move(-1)}
                    disabled={idx === 0} className="h-8 px-2 disabled:opacity-40" title="Subir">
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => move(1)}
                    disabled={idx === form.ai_provider_order.length - 1}
                    className="h-8 px-2 disabled:opacity-40" title="Descer">
                    <ArrowDown className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Se o provedor padrão falhar, o sistema tenta o próximo da lista automaticamente.
          </p>
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
                onKeyDown={(e) => e.stopPropagation()}
                className="mt-1 bg-input border-border" placeholder="gpt-5 / claude-opus / gemini-2.5-pro" />
            </div>
            <div>
              <Label className="text-stardust text-xs">API Key</Label>
              <div className="relative mt-1">
                <Input type={showCustomKey ? "text" : "password"} value={form.custom_ai_key}
                  onChange={(e) => setForm({ ...form, custom_ai_key: e.target.value })}
                  onKeyDown={(e) => e.stopPropagation()}
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
