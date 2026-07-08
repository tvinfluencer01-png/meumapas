import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Eye, EyeOff, Save, Sparkles, RefreshCw, AlertTriangle, ArrowUp, ArrowDown, Star, ChevronDown, ChevronRight, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { testAstrologyCredentials } from "@/lib/admin.functions";
import { listProviderModels, testProvider } from "@/lib/ai-providers.functions";

type ChatProviderId = "openai" | "anthropic" | "google" | "groq" | "mistral" | "openrouter";

const AI_PROVIDER_LABELS: Record<ChatProviderId, string> = {
  openai: "OpenAI (BYO key) — pago",
  anthropic: "Anthropic Claude (BYO key) — pago",
  google: "Google Gemini (BYO key) — grátis",
  groq: "Groq — Llama/Mixtral (grátis)",
  mistral: "Mistral AI (grátis)",
  openrouter: "OpenRouter — Llama/Gemini free (grátis)",
};

const AI_PROVIDER_LINKS: Record<ChatProviderId, { url: string; label: string; tutorial: string }> = {
  openai: {
    url: "https://platform.openai.com/api-keys",
    label: "Obter chave OpenAI",
    tutorial: "1) Crie conta em platform.openai.com  2) Adicione crédito em Billing  3) Vá em API Keys → Create new secret key  4) Cole aqui.",
  },
  anthropic: {
    url: "https://console.anthropic.com/settings/keys",
    label: "Obter chave Anthropic",
    tutorial: "1) Crie conta em console.anthropic.com  2) Adicione crédito em Plans & Billing  3) Settings → API Keys → Create Key  4) Cole aqui.",
  },
  google: {
    url: "https://aistudio.google.com/app/apikey",
    label: "Obter chave Google AI",
    tutorial: "1) Acesse aistudio.google.com/app/apikey  2) Create API key  3) Escolha um projeto  4) Copie e cole aqui. Tier gratuito generoso.",
  },
  groq: {
    url: "https://console.groq.com/keys",
    label: "Obter chave Groq (grátis)",
    tutorial: "1) Crie conta em console.groq.com  2) API Keys → Create API Key  3) Cole aqui. Ultra-rápido, gratuito com limite diário.",
  },
  mistral: {
    url: "https://console.mistral.ai/api-keys",
    label: "Obter chave Mistral (grátis)",
    tutorial: "1) Crie conta em console.mistral.ai  2) API Keys → Create new key  3) Ative o plano Experiment (grátis)  4) Cole aqui.",
  },
  openrouter: {
    url: "https://openrouter.ai/keys",
    label: "Obter chave OpenRouter (grátis)",
    tutorial: "1) Crie conta em openrouter.ai  2) Keys → Create Key  3) Cole aqui. Modelos com sufixo :free são gratuitos.",
  },
};

const DEFAULT_ORDER: ChatProviderId[] = ["openai", "anthropic", "google", "groq", "mistral", "openrouter"];

type ImageProviderId =
  | "img_pollinations"
  | "img_huggingface"
  | "img_together"
  | "img_openai"
  | "img_stability"
  | "img_replicate";

const IMAGE_PROVIDERS: Array<{
  id: ImageProviderId;
  label: string;
  tier: "grátis" | "pago";
  keyRequired: boolean;
  url: string;
  linkLabel: string;
  tutorial: string;
  placeholder: string;
}> = [
  {
    id: "img_pollinations",
    label: "Pollinations.ai",
    tier: "grátis",
    keyRequired: false,
    url: "https://pollinations.ai",
    linkLabel: "Saiba mais",
    tutorial: "Sem chave. Gere imagens via URL pública: https://image.pollinations.ai/prompt/{seu-prompt}",
    placeholder: "Não requer chave",
  },
  {
    id: "img_huggingface",
    label: "Hugging Face (SDXL/FLUX)",
    tier: "grátis",
    keyRequired: true,
    url: "https://huggingface.co/settings/tokens",
    linkLabel: "Obter token HF (grátis)",
    tutorial: "1) Crie conta em huggingface.co  2) Settings → Access Tokens → New token (role: read)  3) Cole aqui. Inference API grátis com fila.",
    placeholder: "hf_...",
  },
  {
    id: "img_together",
    label: "Together AI (FLUX schnell)",
    tier: "grátis",
    keyRequired: true,
    url: "https://api.together.ai/settings/api-keys",
    linkLabel: "Obter chave Together",
    tutorial: "1) Crie conta em together.ai (ganha US$5 grátis)  2) Settings → API Keys → Create key  3) Cole aqui.",
    placeholder: "tgp_...",
  },
  {
    id: "img_openai",
    label: "OpenAI (gpt-image-1 / DALL·E 3)",
    tier: "pago",
    keyRequired: true,
    url: "https://platform.openai.com/api-keys",
    linkLabel: "Obter chave OpenAI",
    tutorial: "Mesma chave da OpenAI Chat. Modelos gpt-image-1 e dall-e-3 consomem crédito por imagem.",
    placeholder: "sk-...",
  },
  {
    id: "img_stability",
    label: "Stability AI (SD3 / SDXL)",
    tier: "pago",
    keyRequired: true,
    url: "https://platform.stability.ai/account/keys",
    linkLabel: "Obter chave Stability",
    tutorial: "1) Crie conta em platform.stability.ai  2) Adicione créditos  3) Account → Keys → Create API Key  4) Cole aqui.",
    placeholder: "sk-...",
  },
  {
    id: "img_replicate",
    label: "Replicate (FLUX pro / Ideogram)",
    tier: "pago",
    keyRequired: true,
    url: "https://replicate.com/account/api-tokens",
    linkLabel: "Obter token Replicate",
    tutorial: "1) Crie conta em replicate.com  2) Adicione método de pagamento  3) Account → API tokens → Create token  4) Cole aqui.",
    placeholder: "r8_...",
  },
];

function normalizeOrder(order: string[] | null | undefined, current?: string): ChatProviderId[] {
  const seen = new Set<string>();
  const out: ChatProviderId[] = [];
  const source: string[] = [
    ...(current ? [current] : []),
    ...(order ?? []),
    ...DEFAULT_ORDER,
  ];
  for (const id of source) {
    if ((id in AI_PROVIDER_LABELS) && !seen.has(id)) {
      seen.add(id);
      out.push(id as ChatProviderId);
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
  
  const [showCustomKey, setShowCustomKey] = useState(false);
  const [showAstroKey, setShowAstroKey] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [providerModels, setProviderModels] = useState<Record<string, string[]>>({});
  const [providerBusy, setProviderBusy] = useState<Record<string, "listing" | "testing" | null>>({});
  const [providerStatus, setProviderStatus] = useState<Record<string, { ok: boolean; message: string } | null>>({});
  const listModelsFn = useServerFn(listProviderModels);
  const testProviderFn = useServerFn(testProvider);

  async function loadModels(id: string, key?: string) {
    setProviderBusy((b) => ({ ...b, [id]: "listing" }));
    try {
      const res = await listModelsFn({ data: { provider: id as ChatProviderId, key: key ?? null } });
      if (res.ok) setProviderModels((m) => ({ ...m, [id]: res.models }));
      else toast.error(`Modelos ${id}: ${res.error}`);
    } finally {
      setProviderBusy((b) => ({ ...b, [id]: null }));
    }
  }

  async function runTest(id: string, key?: string, model?: string) {
    setProviderBusy((b) => ({ ...b, [id]: "testing" }));
    setProviderStatus((s) => ({ ...s, [id]: null }));
    try {
      const res = await testProviderFn({ data: { provider: id as ChatProviderId, key: key ?? null, model: model ?? null } });
      setProviderStatus((s) => ({ ...s, [id]: { ok: res.ok, message: res.message } }));
      res.ok ? toast.success(`${id}: ${res.message}`) : toast.error(`${id}: ${res.message}`);
    } finally {
      setProviderBusy((b) => ({ ...b, [id]: null }));
    }
  }

  async function checkAllProviders(providers: string[], cfgMap: Record<string, { enabled?: boolean; key?: string; model?: string }>) {
    await Promise.all(
      providers.map(async (id) => {
        const cfg = cfgMap[id] ?? {};
        if (cfg.enabled === false) return;
        setProviderBusy((b) => ({ ...b, [id]: "testing" }));
        try {
          const res = await testProviderFn({ data: { provider: id as ChatProviderId, key: cfg.key ?? null, model: cfg.model ?? null } });
          setProviderStatus((s) => ({ ...s, [id]: { ok: res.ok, message: res.message } }));
        } catch {
          setProviderStatus((s) => ({ ...s, [id]: { ok: false, message: "erro" } }));
        } finally {
          setProviderBusy((b) => ({ ...b, [id]: null }));
        }
      })
    );
  }
  const [form, setForm] = useState({
    preferred_engine: "swiss_ephemeris",
    astrology_api_user_id: "",
    astrology_api_key: "",
    ai_provider: "openai",
    ai_provider_order: DEFAULT_ORDER as ChatProviderId[],
    custom_ai_key: "",
    custom_ai_model: "openai/gpt-5.5",
    ai_providers_config: {} as Record<string, { enabled?: boolean; key?: string; model?: string }>,
  });

  const { data } = useQuery({
    queryKey: ["settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_settings").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const testAstroFn = useServerFn(testAstrologyCredentials);

  

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
        ai_providers_config: ((data as { ai_providers_config?: Record<string, { enabled?: boolean; key?: string; model?: string }> }).ai_providers_config) ?? {},
      });
      const cfgMap = ((data as { ai_providers_config?: Record<string, { enabled?: boolean; key?: string; model?: string }> }).ai_providers_config) ?? {};
      void checkAllProviders(order, cfgMap);
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

  const customConfigured = !!form.custom_ai_key && !!form.custom_ai_model;
  const providerOnline = customConfigured;

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
              Configure ao menos uma chave (OpenAI, Anthropic ou Google) abaixo. O sistema usa a primeira disponível e cai para as demais em fallback.
            </p>
          </div>
          {providerOnline && <OnlineBadge />}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <Label className="text-stardust">Ordem dos provedores</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => checkAllProviders(form.ai_provider_order, form.ai_providers_config)}
                className="text-[11px] text-gold hover:underline"
              >
                Verificar status
              </button>
              <span className="text-[11px] text-muted-foreground">1º = padrão · demais = fallback</span>
            </div>
          </div>
          <ul className="mt-2 space-y-2">
            {form.ai_provider_order.map((id, idx) => {
              const isDefault = idx === 0;
              const status = providerStatus[id];
              const checking = providerBusy[id] === "testing";
              const online = status
                ? status.ok
                : (form.ai_provider === id && customConfigured);
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
              const cfg = form.ai_providers_config[id] ?? {};
              const enabled = cfg.enabled !== false;
              const expanded = expandedProvider === id;
              const updateCfg = (patch: Partial<{ enabled: boolean; key: string; model: string }>) => {
                setForm({
                  ...form,
                  ai_providers_config: {
                    ...form.ai_providers_config,
                    [id]: { ...cfg, ...patch },
                  },
                });
              };
              return (
                <li
                  key={id}
                  className={`rounded-lg border ${
                    isDefault ? "border-gold/50 bg-gold/10" : "border-border bg-input/40"
                  } ${!enabled ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-2 p-2.5">
                    <span className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isDefault ? "bg-gold text-primary-foreground" : "bg-secondary text-stardust"
                    }`}>
                      {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedProvider(expanded ? null : id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="text-sm text-stardust truncate flex items-center gap-1">
                        {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                        {AI_PROVIDER_LABELS[id]}
                        {isDefault && <span className="ml-2 text-[10px] uppercase tracking-wider text-gold">padrão</span>}
                        {!enabled && <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">desativado</span>}
                        {enabled && checking && <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">verificando…</span>}
                        {enabled && !checking && status && (
                          <span className={`ml-2 text-[10px] uppercase tracking-wider ${status.ok ? "text-emerald-500" : "text-destructive"}`}>
                            {status.ok ? "online" : "offline"}
                          </span>
                        )}
                        {enabled && !checking && !status && online && <span className="ml-2 text-[10px] uppercase tracking-wider text-emerald-500">online</span>}
                      </div>
                      <div className="text-[11px] text-muted-foreground pl-4">
                        {isDefault ? "Usado primeiro" : `Fallback ${idx}`}
                      </div>
                    </button>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => updateCfg({ enabled: v })}
                      aria-label="Ativar provedor"
                    />
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
                  </div>
                  {expanded && (
                    <div className="border-t border-border/50 p-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <div className="flex items-center justify-between">
                            <Label className="text-stardust text-xs">Modelo</Label>
                            <button
                              type="button"
                              onClick={() => loadModels(id, cfg.key)}
                              disabled={providerBusy[id] === "listing"}
                              className="text-[10px] text-gold hover:underline disabled:opacity-40 inline-flex items-center gap-1"
                            >
                              <RefreshCw className={`size-3 ${providerBusy[id] === "listing" ? "animate-spin" : ""}`} />
                              Puxar modelos
                            </button>
                          </div>
                          {providerModels[id]?.length ? (
                            <Select value={cfg.model ?? ""} onValueChange={(v) => updateCfg({ model: v })}>
                              <SelectTrigger className="mt-1 bg-input border-border h-8 text-xs">
                                <SelectValue placeholder="Selecione um modelo" />
                              </SelectTrigger>
                              <SelectContent>
                                {providerModels[id].map((m) => (
                                  <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={cfg.model ?? ""}
                              onChange={(e) => updateCfg({ model: e.target.value })}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="mt-1 bg-input border-border h-8 text-xs"
                              placeholder={
                                id === "openai" ? "gpt-4o-mini" :
                                id === "anthropic" ? "claude-3-5-sonnet-latest" :
                                id === "google" ? "gemini-2.5-flash" :
                                "google/gemini-3-flash-preview"
                              }
                            />
                          )}
                        </div>
                        <div>
                          <Label className="text-stardust text-xs">API Key</Label>
                          <Input
                            type="password"
                            value={cfg.key ?? ""}
                            onChange={(e) => updateCfg({ key: e.target.value })}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="mt-1 bg-input border-border h-8 text-xs"
                            placeholder="sk-..."
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px]">
                          {providerStatus[id] && (
                            <span className={`inline-flex items-center gap-1 ${providerStatus[id]?.ok ? "text-emerald-500" : "text-destructive"}`}>
                              {providerStatus[id]?.ok ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
                              {providerStatus[id]?.message}
                            </span>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={providerBusy[id] === "testing"}
                          onClick={() => runTest(id, cfg.key, cfg.model)}
                          className="gap-1.5 border-gold/30 hover:bg-gold/10 h-7 text-xs"
                        >
                          <Zap className={`size-3 ${providerBusy[id] === "testing" ? "animate-pulse" : ""}`} />
                          {providerBusy[id] === "testing" ? "Testando..." : "Testar"}
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Se o provedor padrão falhar, o sistema tenta o próximo da lista automaticamente.
          </p>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-stardust text-xs">Modelo padrão (compatível com o provedor selecionado)</Label>
            <Input value={form.custom_ai_model}
              onChange={(e) => setForm({ ...form, custom_ai_model: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
              className="mt-1 bg-input border-border" placeholder="gpt-5 / claude-opus / gemini-2.5-pro" />
          </div>
          <div>
            <Label className="text-stardust text-xs">API Key do provedor padrão</Label>
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
        <div className="text-xs text-muted-foreground">
          Links rápidos:{" "}
          <ExtLink href={AI_PROVIDER_LINKS.openai.url}>OpenAI</ExtLink>{" · "}
          <ExtLink href={AI_PROVIDER_LINKS.anthropic.url}>Anthropic</ExtLink>{" · "}
          <ExtLink href={AI_PROVIDER_LINKS.google.url}>Google</ExtLink>{" · "}
          <ExtLink href={AI_PROVIDER_LINKS.groq.url}>Groq (grátis)</ExtLink>{" · "}
          <ExtLink href={AI_PROVIDER_LINKS.mistral.url}>Mistral (grátis)</ExtLink>{" · "}
          <ExtLink href={AI_PROVIDER_LINKS.openrouter.url}>OpenRouter (grátis)</ExtLink>
        </div>
      </section>

      {/* Image generation providers */}
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="font-serif text-xl text-gold">Geração de Imagens (IA)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure provedores para gerar ilustrações. Free ou pagos — a chave salva aqui será usada quando o
            recurso de imagens for acionado. Cada provedor tem seu tutorial rápido e link para pegar a API.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {IMAGE_PROVIDERS.map((p) => {
            const cfg = form.ai_providers_config[p.id] ?? {};
            const enabled = cfg.enabled !== false;
            const updateCfg = (patch: Partial<{ enabled: boolean; key: string; model: string }>) => {
              setForm({
                ...form,
                ai_providers_config: {
                  ...form.ai_providers_config,
                  [p.id]: { ...cfg, ...patch },
                },
              });
            };
            return (
              <div
                key={p.id}
                className={`rounded-lg border p-3 space-y-2 ${
                  p.tier === "grátis" ? "border-emerald-500/30 bg-emerald-500/5" : "border-gold/30 bg-gold/5"
                } ${!enabled ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm text-stardust font-medium flex items-center gap-2">
                      {p.label}
                      <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        p.tier === "grátis" ? "bg-emerald-600/80 text-white" : "bg-gold/80 text-primary-foreground"
                      }`}>
                        {p.tier}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{p.tutorial}</p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => updateCfg({ enabled: v })}
                    aria-label="Ativar provedor de imagem"
                  />
                </div>
                {p.keyRequired && (
                  <Input
                    type="password"
                    value={cfg.key ?? ""}
                    onChange={(e) => updateCfg({ key: e.target.value })}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="bg-input border-border h-8 text-xs"
                    placeholder={p.placeholder}
                  />
                )}
                <div className="text-[11px]">
                  <ExtLink href={p.url}>{p.linkLabel}</ExtLink>
                </div>
              </div>
            );
          })}
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
