import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { PdfBrandingForm } from "@/components/PdfBrandingForm";
import { SettingsForm } from "@/components/SettingsForm";
import { SectionLamp } from "@/components/SectionLamp";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Configurações</p>
        <h1 className="font-serif text-3xl lg:text-4xl mt-2 shimmer-text flex items-center gap-3 flex-wrap">
          <SettingsIcon className="size-7 text-gold" /> Preferências da sua conta
          <SectionLamp
            sectionKey="configuracoes"
            title="Configurações"
            why="Aqui você ajusta a identidade dos seus PDFs, provedores de IA e ativa só os add-ons que deseja usar."
            how="Personalize logo/marca dos relatórios e configure suas chaves de IA (OpenAI, Anthropic, Google) na aba IA."
            purpose="Manter o sistema do seu jeito, com sua identidade e seus provedores de IA."
          />
        </h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Personalize a experiência do Código Cósmico. Add-ons ficam desativados por
          padrão — ative apenas o que você quiser usar.
        </p>
      </header>

      <Tabs
        value={tab}
        onValueChange={(v) => navigate({ search: { tab: v as "conta" | "ia" } })}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="conta">Conta & PDF</TabsTrigger>
          <TabsTrigger value="ia">IA (BYOK)</TabsTrigger>
        </TabsList>
        <TabsContent value="conta" className="pt-6">
          <PdfBrandingForm />
        </TabsContent>
        <TabsContent value="ia" className="pt-6">
          <SettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

