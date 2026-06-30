import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Download, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Starfield } from "@/components/Starfield";
import { getOrderByToken } from "@/lib/product-orders.functions";

export const Route = createFileRoute("/r/$token")({
  component: ReportAccessPage,
});

function ReportAccessPage() {
  const { token } = Route.useParams();
  const getFn = useServerFn(getOrderByToken);
  const { data, isLoading, error } = useQuery({
    queryKey: ["order-token", token],
    queryFn: () => getFn({ data: { token } }),
    refetchInterval: 15_000,
  });

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Starfield count={60} className="fixed" />
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/40">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo sizeClassName="size-10" animation="float" />
          <span className="font-serif text-lg shimmer-text">Código Cósmico</span>
        </Link>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-16">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Carregando…</div>
        ) : error || !data ? (
          <Card className="border-destructive/40">
            <CardContent className="p-8 text-center">
              <h1 className="font-serif text-2xl text-destructive mb-2">Link inválido</h1>
              <p className="text-muted-foreground">Este link não existe ou expirou.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-gold/40">
            <CardContent className="p-8">
              <div className="inline-flex items-center gap-2 mb-4 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs text-gold">
                <Sparkles className="size-3" /> Seu relatório
              </div>
              <h1 className="font-serif text-3xl shimmer-text mb-4">{data.landing?.title ?? "Relatório"}</h1>

              {data.status === "delivered" && data.pdf_url ? (
                <>
                  <p className="text-stardust mb-6">Seu relatório está pronto. Baixe abaixo.</p>
                  <Button size="lg" asChild className="w-full">
                    <a href={data.pdf_url} target="_blank" rel="noreferrer" download>
                      <Download className="size-4 mr-2" /> Baixar PDF
                    </a>
                  </Button>
                </>
              ) : data.status === "paid" || data.status === "processing" ? (
                <div className="text-center space-y-3">
                  <Clock className="size-10 text-gold mx-auto animate-pulse" />
                  <p className="font-serif text-xl text-gold">Pagamento confirmado!</p>
                  <p className="text-muted-foreground">
                    Estamos gerando seu relatório. Você receberá um email assim que estiver pronto —
                    geralmente em até 24h.
                  </p>
                </div>
              ) : data.status === "pending_payment" ? (
                <p className="text-amber-300">Aguardando confirmação do pagamento…</p>
              ) : data.status === "failed" ? (
                <p className="text-destructive">Houve um problema com este pedido. Entre em contato com o suporte.</p>
              ) : (
                <p className="text-muted-foreground">Status: {data.status}</p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
