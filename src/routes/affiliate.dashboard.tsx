import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyAffiliate, regenerateApiKey } from "@/modules/affiliate/affiliate.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MousePointerClick, TrendingUp, Wallet, RefreshCw, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/affiliate/dashboard")({
  component: AffiliateDashboard,
  head: () => ({ meta: [{ title: "Painel do Afiliado" }] }),
});

function AffiliateDashboard() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<null | boolean>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/auth", replace: true });
      else setAuthed(true);
    });
  }, [navigate]);

  if (authed === null) return <div className="p-8">Carregando…</div>;
  return <DashboardInner />;
}

function DashboardInner() {
  const fetchFn = useServerFn(getMyAffiliate);
  const regenFn = useServerFn(regenerateApiKey);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-affiliate"],
    queryFn: () => fetchFn(),
  });
  const [newKey, setNewKey] = useState<string | null>(null);
  const regenMut = useMutation({
    mutationFn: () => regenFn(),
    onSuccess: (res: any) => {
      setNewKey(res.apiKey);
      toast.success("Nova API Key gerada — copie agora.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-8">Carregando…</div>;

  if (!data?.profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Você ainda não é afiliado</CardTitle>
            <CardDescription>Cadastre-se para começar a ganhar comissões.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><Link to="/affiliate/register">Cadastrar-me</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const p = data.profile as any;
  const s = data.stats!;
  const code = p.affiliate_code;
  const refUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/affiliate/r/${code.toLowerCase()}`;

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif shimmer-text flex items-center gap-2">
            <Sparkles className="size-5 text-gold" /> Painel do Afiliado
          </h1>
          <p className="text-sm text-muted-foreground">Olá, {p.full_name}.</p>
        </div>
        <Badge variant="outline" className="text-xs">Status: {p.status}</Badge>
      </header>

      {p.status !== "approved" && (
        <Card className="border-yellow-500/40">
          <CardHeader>
            <CardTitle className="text-yellow-500">Cadastro em análise</CardTitle>
            <CardDescription>
              Seu cadastro precisa ser aprovado antes de iniciar conversões. Você ainda pode preparar seu link.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard icon={MousePointerClick} label="Cliques" value={String(s.clicks)} />
        <StatCard icon={TrendingUp} label="Conversões" value={String(s.conversions)} />
        <StatCard icon={Wallet} label="Pendente" value={`R$ ${(s.pendingCents / 100).toFixed(2)}`} />
        <StatCard icon={Wallet} label="Total pago" value={`R$ ${(s.paidCents / 100).toFixed(2)}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seu link de divulgação</CardTitle>
          <CardDescription>Compartilhe e ganhe sobre cada conversão.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="text-xs flex-1 break-all border rounded-md p-2">{refUrl}</code>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(refUrl); toast.success("Copiado"); }}>
              <Copy className="size-3" />
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={refUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-3" /></a>
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Código: <span className="font-mono">{code}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segurança & API</CardTitle>
          <CardDescription>Regenere sua API Key. A chave atual deixará de funcionar imediatamente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {newKey && (
            <div className="border-gold/40 border rounded-md p-3 bg-gold/5">
              <div className="text-[11px] uppercase tracking-wider text-gold mb-1">Nova API Key (mostrada apenas uma vez)</div>
              <code className="text-xs break-all">{newKey}</code>
            </div>
          )}
          <Button onClick={() => regenMut.mutate()} disabled={regenMut.isPending}>
            <RefreshCw className="size-4 mr-2" /> Gerar nova API Key
          </Button>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button variant="ghost" onClick={() => refetch()}>Atualizar dados</Button>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5 flex items-center gap-3">
        <Icon className="size-6 text-gold" />
        <div>
          <div className="text-xs uppercase text-muted-foreground">{label}</div>
          <div className="text-xl font-serif">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
