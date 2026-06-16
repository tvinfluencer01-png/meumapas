import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { PdfBrandingForm } from "@/components/PdfBrandingForm";
import { SectionLamp } from "@/components/SectionLamp";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfiguracoesPage,
  head: () => ({ meta: [{ title: "Configurações — Código Cósmico" }] }),
});

function ConfiguracoesPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Configurações</p>
        <h1 className="font-serif text-3xl lg:text-4xl mt-2 shimmer-text flex items-center gap-3">
          <SettingsIcon className="size-7 text-gold" /> Preferências da sua conta
        </h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Personalize a experiência do Código Cósmico. Add-ons ficam desativados por
          padrão — ative apenas o que você quiser usar.
        </p>
      </header>

      <PdfBrandingForm />
    </div>
  );
}
