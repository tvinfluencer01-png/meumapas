import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PdfBrandingForm } from "@/components/PdfBrandingForm";
import { SettingsForm } from "@/components/SettingsForm";
import { SectionLamp } from "@/components/SectionLamp";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getAddonByokRequired } from "@/lib/addon-settings.functions";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfiguracoesPage,
  head: () => ({ meta: [{ title: "Configurações — Código Cósmico" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (typeof s.tab === "string" ? s.tab : "conta") as "conta" | "ia",
  }),
});

function ConfiguracoesPage() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const byokFn = useServerFn(getAddonByokRequired);
  const { data: byok } = useQuery({
    queryKey: ["byok-required", "sub_astrologer_numerologist"],
    queryFn: () => byokFn({ data: { addon_id: "sub_astrologer_numerologist" } }),
  });
  const byokEnabled = !!byok?.required;
  const activeTab = byokEnabled ? tab : "conta";

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Configurações</p>
        <h1 className="font-serif text-3xl lg:text-4xl mt-2 shimmer-text flex items-center gap-3 flex-wrap">
          <SettingsIcon className="size-7 text-gold" /> Preferências da sua conta
          <SectionLamp
            sectionKey="configuracoes"
            title="Configurações"
            why="Aqui você ajusta a identidade dos seus PDFs e, quando o administrador exigir, suas próprias chaves de IA (BYOK)."
            how="Personalize logo/marca dos relatórios. A aba IA (BYOK) só aparece quando o administrador ativou a exigência de chave própria."
            purpose="Manter o sistema do seu jeito — quando BYOK está desligado, o sistema usa as credenciais globais automaticamente."
          />
        </h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          {byokEnabled
            ? "O administrador ativou BYOK para o seu plano — configure suas chaves de IA na aba IA (BYOK)."
            : "As chaves de IA são gerenciadas pelo sistema. Você não precisa configurar nada."}
        </p>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(v) => navigate({ search: { tab: v as "conta" | "ia" } })}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="conta">Conta & PDF</TabsTrigger>
          {byokEnabled && <TabsTrigger value="ia">IA (BYOK)</TabsTrigger>}
        </TabsList>
        <TabsContent value="conta" className="pt-6">
          <PdfBrandingForm />
        </TabsContent>
        {byokEnabled && (
          <TabsContent value="ia" className="pt-6">
            <SettingsForm />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}


