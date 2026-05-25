import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2, Plus, Trash2, Lock, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAddonsOverview } from "@/lib/addons.functions";
import { generateBusinessReport } from "@/lib/business.functions";

export const Route = createFileRoute("/_authenticated/mapa-empresarial")({
  component: BusinessMapPage,
});

type Partner = { full_name: string; birth_date: string; role: string };

function BusinessMapPage() {
  const overviewFn = useServerFn(getAddonsOverview);
  const generateFn = useServerFn(generateBusinessReport);
  const { data: overview } = useQuery({
    queryKey: ["addons-overview-bm"],
    queryFn: () => overviewFn(),
  });

  const hasAddon = !!overview?.subscriptions?.some(
    (s) => s.addon_id === "sub_business_map" && s.status === "active",
  );

  const [companyName, setCompanyName] = useState("");
  const [founding, setFounding] = useState("");
  const [industry, setIndustry] = useState("");
  const [notes, setNotes] = useState("");
  const [partners, setPartners] = useState<Partner[]>([
    { full_name: "", birth_date: "", role: "" },
  ]);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ signedUrl: string | null; title: string } | null>(null);

  if (!hasAddon) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <Lock className="size-12 text-gold mx-auto" />
        <h1 className="text-2xl font-serif text-gold">Mapa Empresarial</h1>
        <p className="text-muted-foreground">
          Análise estratégica profunda da sua empresa, sócios e ciclos do ano em PDF cinematográfico.
          Ative o add-on para gerar relatórios ilimitados.
        </p>
        <Button asChild>
          <Link to="/addons">Ver add-on (R$ 99,90/mês)</Link>
        </Button>
      </div>
    );
  }

  function updatePartner(i: number, field: keyof Partner, value: string) {
    setPartners((arr) => arr.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  }

  async function handleGenerate() {
    if (!companyName || !founding) {
      toast.error("Informe o nome e a data de fundação.");
      return;
    }
    const validPartners = partners.filter((p) => p.full_name && p.birth_date);
    if (validPartners.length === 0) {
      toast.error("Adicione pelo menos um sócio com nome e data de nascimento.");
      return;
    }
    setBusy(true);
    setProgress(0);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/_serverFn/src_lib_business_functions_ts--generateBusinessReport_createServerFn_handler", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          data: {
            company_name: companyName,
            founding_date: founding,
            industry: industry || null,
            notes: notes || null,
            partners: validPartners.map((p) => ({
              full_name: p.full_name,
              birth_date: p.birth_date,
              role: p.role || null,
            })),
          },
        }),
      });
      if (!res.ok || !res.body) {
        // Fallback: useServerFn direct call (non-streaming aggregation)
        const r: any = await generateFn({
          data: {
            company_name: companyName,
            founding_date: founding,
            industry: industry || null,
            notes: notes || null,
            partners: validPartners.map((p) => ({
              full_name: p.full_name,
              birth_date: p.birth_date,
              role: p.role || null,
            })),
          },
        } as any);
        if (r?.result) setResult({ signedUrl: r.result.signedUrl, title: r.result.title });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        for (const line of buf.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const j = JSON.parse(trimmed);
            if (j?.type === "progress") {
              setProgress(j.progress);
              setStep(j.step);
            } else if (j?.type === "done") {
              setProgress(100);
              setResult({ signedUrl: j.result?.signedUrl ?? null, title: j.result?.title ?? "Mapa Empresarial" });
            }
          } catch { /* partial line */ }
        }
        buf = buf.endsWith("\n") ? "" : buf.split("\n").pop() ?? "";
      }
      toast.success("Relatório gerado!");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Building2 className="size-7 text-gold" />
          <h1 className="text-2xl font-serif text-gold">Mapa Empresarial</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Análise profunda de empresa, sócios e ciclos anuais. PDF gerado no mesmo padrão dos relatórios premium.
        </p>
      </header>

      <div className="rounded-lg border border-gold/20 bg-secondary/30 p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Nome da empresa</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div>
            <Label>Data de fundação</Label>
            <Input type="date" value={founding} onChange={(e) => setFounding(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Setor (opcional)</Label>
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Ex: Tecnologia, Consultoria" />
          </div>
          <div className="sm:col-span-2">
            <Label>Notas internas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexto estratégico, dores atuais, objetivos do ano..."
              rows={3}
            />
          </div>
        </div>

        <div className="space-y-3 border-t border-border/60 pt-4">
          <div className="flex items-center justify-between">
            <Label>Sócios</Label>
            <Button
              type="button" size="sm" variant="outline"
              onClick={() => setPartners((a) => [...a, { full_name: "", birth_date: "", role: "" }])}
              disabled={partners.length >= 8}
            >
              <Plus className="size-3 mr-1" /> Adicionar
            </Button>
          </div>
          {partners.map((p, i) => (
            <div key={i} className="grid sm:grid-cols-[1fr_140px_140px_40px] gap-2 items-end">
              <Input placeholder="Nome completo" value={p.full_name} onChange={(e) => updatePartner(i, "full_name", e.target.value)} />
              <Input type="date" value={p.birth_date} onChange={(e) => updatePartner(i, "birth_date", e.target.value)} />
              <Input placeholder="Papel" value={p.role} onChange={(e) => updatePartner(i, "role", e.target.value)} />
              <Button
                type="button" size="icon" variant="ghost"
                onClick={() => setPartners((a) => a.filter((_, idx) => idx !== i))}
                disabled={partners.length <= 1}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <Button onClick={handleGenerate} disabled={busy} className="w-full">
          {busy ? (<><Loader2 className="size-4 animate-spin mr-2" /> Gerando...</>) : "Gerar Mapa Empresarial"}
        </Button>

        {busy && (
          <div className="space-y-2">
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-gradient-to-r from-gold to-amber-300 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{step}</p>
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-gold/30 bg-background/60 p-4 flex items-center justify-between">
            <div>
              <div className="font-serif text-gold">{result.title}</div>
              <div className="text-xs text-muted-foreground">Disponível também em Relatórios.</div>
            </div>
            {result.signedUrl && (
              <Button asChild>
                <a href={result.signedUrl} target="_blank" rel="noreferrer">
                  <Download className="size-4 mr-2" /> Baixar PDF
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
