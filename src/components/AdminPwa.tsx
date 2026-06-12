import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Smartphone, Save, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPwaSettings, savePwaSettings, type PwaSettings } from "@/lib/pwa.functions";

const DEFAULTS: PwaSettings = {
  id: null,
  name: "Código Cósmico",
  short_name: "Cósmico",
  description: "Mapa Astral, Numerologia e IA Espiritual",
  theme_color: "#1a1430",
  background_color: "#0a0814",
  icon_url: "",
  icon_512_url: "",
  display: "standalone",
  start_url: "/",
  orientation: "portrait",
  enabled: true,
};

export function AdminPwa() {
  const getFn = useServerFn(getPwaSettings);
  const saveFn = useServerFn(savePwaSettings);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["pwa-settings"], queryFn: () => getFn() });
  const [form, setForm] = useState<PwaSettings>(DEFAULTS);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (payload: PwaSettings) =>
      saveFn({
        data: {
          id: payload.id,
          name: payload.name,
          short_name: payload.short_name,
          description: payload.description,
          theme_color: payload.theme_color,
          background_color: payload.background_color,
          icon_url: payload.icon_url,
          icon_512_url: payload.icon_512_url,
          display: payload.display as any,
          start_url: payload.start_url,
          orientation: payload.orientation as any,
          enabled: payload.enabled,
        },
      }),
    onSuccess: () => {
      toast.success("Configurações do PWA salvas.");
      qc.invalidateQueries({ queryKey: ["pwa-settings"] });
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao salvar."),
  });

  const set = <K extends keyof PwaSettings>(k: K, v: PwaSettings[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="size-5" /> Personalização do PWA
        </CardTitle>
        <CardDescription>
          Configure o app instalável (Progressive Web App): nome, ícone, cores e comportamento.
          As alterações refletem no manifest público{" "}
          <a
            href="/api/public/manifest/webmanifest"
            target="_blank"
            rel="noreferrer"
            className="underline inline-flex items-center gap-1"
          >
            /api/public/manifest/webmanifest <ExternalLink className="size-3" />
          </a>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="font-medium">PWA habilitado</div>
                <div className="text-xs text-muted-foreground">
                  Quando ativo, o manifest e o ícone de instalação ficam disponíveis.
                </div>
              </div>
              <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome do app</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nome curto (home screen)</Label>
                <Input value={form.short_name} onChange={(e) => set("short_name", e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cor do tema</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={form.theme_color}
                    onChange={(e) => set("theme_color", e.target.value)}
                    className="w-16 p-1"
                  />
                  <Input
                    value={form.theme_color}
                    onChange={(e) => set("theme_color", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor de fundo (splash)</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={form.background_color}
                    onChange={(e) => set("background_color", e.target.value)}
                    className="w-16 p-1"
                  />
                  <Input
                    value={form.background_color}
                    onChange={(e) => set("background_color", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Ícone 192×192 (URL)</Label>
                <Input
                  placeholder="https://… ou deixe vazio p/ padrão"
                  value={form.icon_url}
                  onChange={(e) => set("icon_url", e.target.value)}
                />
                {form.icon_url && (
                  <img
                    src={form.icon_url}
                    alt="Ícone 192"
                    className="size-16 rounded border"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Ícone 512×512 (URL)</Label>
                <Input
                  placeholder="https://… ou deixe vazio p/ padrão"
                  value={form.icon_512_url}
                  onChange={(e) => set("icon_512_url", e.target.value)}
                />
                {form.icon_512_url && (
                  <img
                    src={form.icon_512_url}
                    alt="Ícone 512"
                    className="size-16 rounded border"
                  />
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Modo de exibição</Label>
                <Select value={form.display} onValueChange={(v) => set("display", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standalone">Standalone (app)</SelectItem>
                    <SelectItem value="fullscreen">Tela cheia</SelectItem>
                    <SelectItem value="minimal-ui">UI mínima</SelectItem>
                    <SelectItem value="browser">Navegador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Orientação</Label>
                <Select value={form.orientation} onValueChange={(v) => set("orientation", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Retrato</SelectItem>
                    <SelectItem value="landscape">Paisagem</SelectItem>
                    <SelectItem value="any">Qualquer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>URL inicial</Label>
                <Input value={form.start_url} onChange={(e) => set("start_url", e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="gap-2">
                <Save className="size-4" /> {save.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
